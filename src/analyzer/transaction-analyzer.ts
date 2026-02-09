import { JsonRpcProvider } from "ethers";
import { type RawTransaction } from "../rpc/base-client";

const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";
const ERC20_APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

export type RawLog = {
  address: string;
  topics: string[];
  data: string;
};

export type RawTransactionWithLogs = RawTransaction & {
  logs?: RawLog[];
};

export type ApprovalEvent = {
  tokenAddress: string;
  owner: string;
  spender: string;
  value: string;
  transactionHash: string;
  timestamp: number;
};

export type GasUsagePattern = "high" | "medium" | "low";

export type AnalyzedTransactions = {
  contractInteractions: string[];
  approvalEvents: ApprovalEvent[];
  dailyTransactionVolume: Record<string, number>;
  gasUsage: {
    averageGasUsed: string;
    pattern: GasUsagePattern;
  };
};

export class TransactionAnalyzer {
  private readonly provider: JsonRpcProvider;

  constructor(rpcUrl = process.env.BASE_RPC_URL ?? DEFAULT_BASE_RPC_URL) {
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  async analyze(transactions: RawTransactionWithLogs[]): Promise<AnalyzedTransactions> {
    const contractInteractions = new Set<string>();
    const approvalEvents: ApprovalEvent[] = [];
    const dailyTransactionVolume: Record<string, number> = {};
    const contractCache = new Map<string, boolean>();

    let gasSum = 0n;
    let gasCount = 0;

    for (const tx of transactions) {
      if (tx.to) {
        const toAddress = tx.to.toLowerCase();
        let isTargetContract = contractCache.get(toAddress);
        if (isTargetContract === undefined) {
          isTargetContract = await this.isContract(toAddress);
          contractCache.set(toAddress, isTargetContract);
        }
        if (isTargetContract) {
          contractInteractions.add(toAddress);
        }
      }

      const txLogs = tx.logs ?? [];
      const parsedApprovals = this.parseApprovalEvents(txLogs, tx.hash, tx.timestamp);
      approvalEvents.push(...parsedApprovals);

      const day = new Date(tx.timestamp * 1000).toISOString().slice(0, 10);
      dailyTransactionVolume[day] = (dailyTransactionVolume[day] ?? 0) + 1;

      gasSum += BigInt(tx.gasUsed);
      gasCount += 1;
    }

    const averageGasUsed = gasCount > 0 ? gasSum / BigInt(gasCount) : 0n;

    return {
      contractInteractions: Array.from(contractInteractions),
      approvalEvents,
      dailyTransactionVolume,
      gasUsage: {
        averageGasUsed: averageGasUsed.toString(),
        pattern: this.getGasUsagePattern(averageGasUsed),
      },
    };
  }

  async isContract(address: string): Promise<boolean> {
    const code = await this.provider.getCode(address);
    return code !== "0x";
  }

  parseApprovalEvents(logs: RawLog[], transactionHash: string, timestamp: number): ApprovalEvent[] {
    const approvals: ApprovalEvent[] = [];

    for (const log of logs) {
      if (log.topics.length !== 3) {
        continue;
      }
      if (log.topics[0].toLowerCase() !== ERC20_APPROVAL_TOPIC) {
        continue;
      }
      if (!log.data.startsWith("0x")) {
        continue;
      }

      try {
        const owner = this.topicToAddress(log.topics[1]);
        const spender = this.topicToAddress(log.topics[2]);
        const value = BigInt(log.data).toString();

        approvals.push({
          tokenAddress: log.address.toLowerCase(),
          owner,
          spender,
          value,
          transactionHash,
          timestamp,
        });
      } catch {
        continue;
      }
    }

    return approvals;
  }

  private topicToAddress(topic: string): string {
    const normalized = topic.toLowerCase();
    if (!normalized.startsWith("0x") || normalized.length !== 66) {
      throw new Error("Invalid topic format for indexed address");
    }
    return `0x${normalized.slice(26)}`;
  }

  private getGasUsagePattern(averageGasUsed: bigint): GasUsagePattern {
    if (averageGasUsed <= 100_000n) {
      return "low";
    }
    if (averageGasUsed <= 500_000n) {
      return "medium";
    }
    return "high";
  }
}
