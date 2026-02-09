import { type AnalyzedTransactions, type GasUsagePattern } from "../analyzer/transaction-analyzer";

export type SnapshotTrendDirection = "increasing" | "decreasing" | "stable";

export type Snapshot = {
  address: string;
  timestamp: number;
  lookbackWindow: {
    startDate: Date;
    endDate: Date;
    transactionCount: number;
  };
  contractInteractions: Set<string>;
  tokenApprovals: Map<string, string[]>;
  volumeMetrics: {
    dailyAverage: number;
    trendDirection: SnapshotTrendDirection;
  };
  gasUsage: {
    averageGasUsed: number;
    pattern: GasUsagePattern;
  };
};

export class InsufficientDataError extends Error {
  constructor(message = "Insufficient data for baseline") {
    super(message);
    this.name = "InsufficientDataError";
  }
}

const MAX_LOOKBACK_DAYS = 30;
const MAX_LOOKBACK_TRANSACTIONS = 1000;
const MIN_TRANSACTIONS_REQUIRED = 10;

export class SnapshotGenerator {
  generateSnapshot(address: string, analyzed: AnalyzedTransactions): Snapshot {
    const now = new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);

    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - MAX_LOOKBACK_DAYS);
    cutoff.setUTCHours(0, 0, 0, 0);

    const volumeEntries = Object.entries(analyzed.dailyTransactionVolume)
      .filter(([day]) => new Date(`${day}T00:00:00.000Z`) >= cutoff)
      .sort(([a], [b]) => a.localeCompare(b));

    const totalTransactionsInWindow = volumeEntries.reduce((sum, [, count]) => sum + count, 0);
    const transactionCount = Math.min(totalTransactionsInWindow, MAX_LOOKBACK_TRANSACTIONS);

    if (transactionCount < MIN_TRANSACTIONS_REQUIRED) {
      throw new InsufficientDataError();
    }

    const startDate = volumeEntries.length > 0 ? new Date(`${volumeEntries[0][0]}T00:00:00.000Z`) : new Date(cutoff);
    const endDate =
      volumeEntries.length > 0 ? new Date(`${volumeEntries[volumeEntries.length - 1][0]}T23:59:59.999Z`) : new Date(now);

    return {
      address,
      timestamp: nowUnix,
      lookbackWindow: {
        startDate,
        endDate,
        transactionCount,
      },
      contractInteractions: new Set(analyzed.contractInteractions),
      tokenApprovals: this.buildTokenApprovalsMap(analyzed),
      volumeMetrics: {
        dailyAverage: this.calculateDailyAverage(volumeEntries, transactionCount),
        trendDirection: this.calculateTrendDirection(volumeEntries),
      },
      gasUsage: {
        averageGasUsed: Number(analyzed.gasUsage.averageGasUsed),
        pattern: analyzed.gasUsage.pattern,
      },
    };
  }

  private buildTokenApprovalsMap(analyzed: AnalyzedTransactions): Map<string, string[]> {
    const byToken = new Map<string, Set<string>>();

    for (const event of analyzed.approvalEvents) {
      const token = event.tokenAddress.toLowerCase();
      const spender = event.spender.toLowerCase();
      const existing = byToken.get(token) ?? new Set<string>();
      existing.add(spender);
      byToken.set(token, existing);
    }

    const result = new Map<string, string[]>();
    for (const [token, spenders] of byToken.entries()) {
      result.set(token, Array.from(spenders));
    }
    return result;
  }

  private calculateDailyAverage(volumeEntries: Array<[string, number]>, transactionCount: number): number {
    if (transactionCount === 0) {
      return 0;
    }
    const daysWithActivity = volumeEntries.length;
    if (daysWithActivity === 0) {
      return 0;
    }
    return transactionCount / daysWithActivity;
  }

  private calculateTrendDirection(volumeEntries: Array<[string, number]>): SnapshotTrendDirection {
    if (volumeEntries.length < 2) {
      return "stable";
    }

    const midpoint = Math.ceil(volumeEntries.length / 2);
    const firstHalf = volumeEntries.slice(0, midpoint);
    const secondHalf = volumeEntries.slice(midpoint);

    const firstAvg = this.average(firstHalf.map(([, count]) => count));
    const secondAvg = this.average(secondHalf.map(([, count]) => count));

    if (firstAvg === 0 && secondAvg === 0) {
      return "stable";
    }

    const changeRatio = firstAvg === 0 ? Number.POSITIVE_INFINITY : (secondAvg - firstAvg) / firstAvg;
    if (changeRatio > 0.1) {
      return "increasing";
    }
    if (changeRatio < -0.1) {
      return "decreasing";
    }
    return "stable";
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
