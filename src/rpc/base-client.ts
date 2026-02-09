import { JsonRpcProvider, isAddress, type TransactionReceiptParams, type TransactionResponse } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

export type RawTransaction = {
  hash: string;
  to: string | null;
  from: string;
  value: string;
  gasUsed: string;
  timestamp: number;
};

export type TransactionLookback = {
  maxDays: number;
  maxTransactions: number;
};

const DEFAULT_LOOKBACK: TransactionLookback = {
  maxDays: 30,
  maxTransactions: 1000,
};

const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";

export class BaseRpcClient {
  private readonly provider: JsonRpcProvider;

  constructor(rpcUrl = process.env.BASE_RPC_URL ?? DEFAULT_BASE_RPC_URL) {
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  async fetchTransactions(
    address: string,
    lookback: TransactionLookback = DEFAULT_LOOKBACK,
  ): Promise<RawTransaction[]> {
    if (!isAddress(address)) {
      throw new Error("Invalid Base address.");
    }

    const normalizedAddress = address.toLowerCase();
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - lookback.maxDays * 24 * 60 * 60;
    const collected: RawTransaction[] = [];

    try {
      let currentBlockNumber = await this.provider.getBlockNumber();

      while (currentBlockNumber >= 0 && collected.length < lookback.maxTransactions) {
        const block = await this.provider.getBlock(currentBlockNumber, true);
        if (!block) {
          break;
        }

        if (block.timestamp < cutoffTimestamp) {
          break;
        }

        for (const tx of block.prefetchedTransactions as TransactionResponse[]) {
          const fromMatches = tx.from.toLowerCase() === normalizedAddress;
          const toMatches = tx.to?.toLowerCase() === normalizedAddress;
          if (!fromMatches && !toMatches) {
            continue;
          }

          const receipt = await this.provider.getTransactionReceipt(tx.hash);
          if (!receipt) {
            continue;
          }

          collected.push(this.toRawTransaction(tx.hash, tx.to, tx.from, tx.value, receipt, block.timestamp));
          if (collected.length >= lookback.maxTransactions) {
            break;
          }
        }

        currentBlockNumber -= 1;
      }

      return collected;
    } catch {
      throw new Error("Data unavailable. Try again later.");
    }
  }

  private toRawTransaction(
    hash: string,
    to: string | null,
    from: string,
    value: bigint,
    receipt: TransactionReceiptParams,
    timestamp: number,
  ): RawTransaction {
    return {
      hash,
      to,
      from,
      value: value.toString(),
      gasUsed: receipt.gasUsed.toString(),
      timestamp,
    };
  }
}
