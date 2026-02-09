import { type Snapshot } from "../snapshot/snapshot-generator";
import { type Baseline } from "../storage/baseline-store";

export type Diff = {
  address: string;
  baselineAge: number;
  changes: {
    newContracts: string[];
    removedContracts: string[];
    tokenApprovalChanges: {
      new: Map<string, string[]>;
      revoked: Map<string, string[]>;
    };
    volumeChange: {
      percentChange: number;
      significant: boolean;
    };
  };
  status: "changes_detected" | "no_changes" | "insufficient_data";
};

const MIN_TRANSACTIONS_REQUIRED = 10;
const SIGNIFICANT_VOLUME_CHANGE_PERCENT = 50;
const STALE_BASELINE_MONTHS = 12;

export class DiffEngine {
  generateDiff(baseline: Baseline, currentSnapshot: Snapshot): Diff {
    const baselineTransactionCount = baseline.snapshot.lookbackWindow.transactionCount;
    const currentTransactionCount = currentSnapshot.lookbackWindow.transactionCount;
    if (baselineTransactionCount < MIN_TRANSACTIONS_REQUIRED || currentTransactionCount < MIN_TRANSACTIONS_REQUIRED) {
      return {
        address: currentSnapshot.address,
        baselineAge: this.calculateBaselineAgeMonths(baseline.createdAt),
        changes: {
          newContracts: [],
          removedContracts: [],
          tokenApprovalChanges: {
            new: new Map<string, string[]>(),
            revoked: new Map<string, string[]>(),
          },
          volumeChange: {
            percentChange: 0,
            significant: false,
          },
        },
        status: "insufficient_data",
      };
    }

    const newContracts = this.setDifference(currentSnapshot.contractInteractions, baseline.snapshot.contractInteractions);
    const removedContracts = this.setDifference(baseline.snapshot.contractInteractions, currentSnapshot.contractInteractions);
    const tokenApprovalChanges = this.diffTokenApprovals(baseline.snapshot.tokenApprovals, currentSnapshot.tokenApprovals);
    const volumeChange = this.calculateVolumeChange(
      baseline.snapshot.volumeMetrics.dailyAverage,
      currentSnapshot.volumeMetrics.dailyAverage,
    );
    const baselineAge = this.calculateBaselineAgeMonths(baseline.createdAt);
    const isBaselineStale = baselineAge > STALE_BASELINE_MONTHS;

    const hasChanges =
      newContracts.length > 0 ||
      removedContracts.length > 0 ||
      tokenApprovalChanges.new.size > 0 ||
      tokenApprovalChanges.revoked.size > 0 ||
      volumeChange.significant;

    return {
      address: currentSnapshot.address,
      baselineAge,
      changes: {
        newContracts,
        removedContracts,
        tokenApprovalChanges,
        volumeChange: {
          percentChange: volumeChange.percentChange,
          significant: isBaselineStale ? volumeChange.significant : volumeChange.significant,
        },
      },
      status: hasChanges ? "changes_detected" : "no_changes",
    };
  }

  private calculateBaselineAgeMonths(createdAt: Date): number {
    const now = new Date();
    const years = now.getUTCFullYear() - createdAt.getUTCFullYear();
    const months = now.getUTCMonth() - createdAt.getUTCMonth();
    const rawMonths = years * 12 + months;
    return rawMonths < 0 ? 0 : rawMonths;
  }

  private setDifference(source: Set<string>, target: Set<string>): string[] {
    const results: string[] = [];
    for (const item of source) {
      if (!target.has(item)) {
        results.push(item);
      }
    }
    return results;
  }

  private diffTokenApprovals(
    baselineApprovals: Map<string, string[]>,
    currentApprovals: Map<string, string[]>,
  ): { new: Map<string, string[]>; revoked: Map<string, string[]> } {
    const newlyApproved = new Map<string, string[]>();
    const revoked = new Map<string, string[]>();
    const tokenAddresses = new Set<string>([...baselineApprovals.keys(), ...currentApprovals.keys()]);

    for (const token of tokenAddresses) {
      const baselineSpenders = new Set<string>(baselineApprovals.get(token) ?? []);
      const currentSpenders = new Set<string>(currentApprovals.get(token) ?? []);

      const newSpenders = this.setDifference(currentSpenders, baselineSpenders);
      const revokedSpenders = this.setDifference(baselineSpenders, currentSpenders);

      if (newSpenders.length > 0) {
        newlyApproved.set(token, newSpenders);
      }
      if (revokedSpenders.length > 0) {
        revoked.set(token, revokedSpenders);
      }
    }

    return { new: newlyApproved, revoked };
  }

  private calculateVolumeChange(baselineDailyAverage: number, currentDailyAverage: number): {
    percentChange: number;
    significant: boolean;
  } {
    if (baselineDailyAverage === 0) {
      const percentChange = currentDailyAverage === 0 ? 0 : 100;
      return {
        percentChange,
        significant: Math.abs(percentChange) > SIGNIFICANT_VOLUME_CHANGE_PERCENT,
      };
    }

    const percentChange = ((currentDailyAverage - baselineDailyAverage) / baselineDailyAverage) * 100;
    return {
      percentChange,
      significant: Math.abs(percentChange) > SIGNIFICANT_VOLUME_CHANGE_PERCENT,
    };
  }
}
