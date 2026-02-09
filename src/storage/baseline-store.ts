import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import * as path from "node:path";
import { constants as fsConstants } from "node:fs";
import { type Snapshot } from "../snapshot/snapshot-generator";

type SerializedSnapshot = {
  address: string;
  timestamp: number;
  lookbackWindow: {
    startDate: string;
    endDate: string;
    transactionCount: number;
  };
  contractInteractions: string[];
  tokenApprovals: Array<[string, string[]]>;
  volumeMetrics: {
    dailyAverage: number;
    trendDirection: "increasing" | "decreasing" | "stable";
  };
  gasUsage: {
    averageGasUsed: number;
    pattern: "high" | "medium" | "low";
  };
};

type SerializedBaseline = {
  address: string;
  createdAt: string;
  snapshot: SerializedSnapshot;
};

export type Baseline = {
  address: string;
  createdAt: Date;
  snapshot: Snapshot;
};

export class BaselineStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BaselineStorageError";
  }
}

const DEFAULT_BASELINE_DIR = path.resolve(process.cwd(), "data", "baselines");

export class BaselineStore {
  private readonly baselineDir: string;

  constructor(baselineDir = DEFAULT_BASELINE_DIR) {
    this.baselineDir = baselineDir;
  }

  async getBaseline(address: string): Promise<Baseline | null> {
    await this.ensureDirectory();
    const filePath = this.getBaselinePath(address);

    try {
      const fileContents = await readFile(filePath, "utf8");
      const parsed = JSON.parse(fileContents) as SerializedBaseline;
      return this.deserializeBaseline(parsed);
    } catch (error) {
      if (this.isFileMissingError(error)) {
        return null;
      }
      throw new BaselineStorageError(`Failed to read baseline for ${address}: ${this.errorMessage(error)}`);
    }
  }

  async saveBaseline(address: string, snapshot: Snapshot): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.getBaselinePath(address);

    try {
      await access(filePath, fsConstants.F_OK);
      throw new BaselineStorageError(`Baseline already exists for ${address}.`);
    } catch (error) {
      if (!(error instanceof BaselineStorageError) && !this.isFileMissingError(error)) {
        throw new BaselineStorageError(`Failed to check baseline for ${address}: ${this.errorMessage(error)}`);
      }
    }

    const baseline: Baseline = {
      address,
      createdAt: new Date(snapshot.timestamp * 1000),
      snapshot,
    };

    try {
      const serialized = JSON.stringify(this.serializeBaseline(baseline), null, 2);
      await writeFile(filePath, serialized, "utf8");
    } catch (error) {
      throw new BaselineStorageError(`Failed to save baseline for ${address}: ${this.errorMessage(error)}`);
    }
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await mkdir(this.baselineDir, { recursive: true });
    } catch (error) {
      throw new BaselineStorageError(`Failed to prepare baseline directory: ${this.errorMessage(error)}`);
    }
  }

  private getBaselinePath(address: string): string {
    return path.join(this.baselineDir, `${address.toLowerCase()}.json`);
  }

  private serializeBaseline(baseline: Baseline): SerializedBaseline {
    return {
      address: baseline.address,
      createdAt: baseline.createdAt.toISOString(),
      snapshot: {
        address: baseline.snapshot.address,
        timestamp: baseline.snapshot.timestamp,
        lookbackWindow: {
          startDate: baseline.snapshot.lookbackWindow.startDate.toISOString(),
          endDate: baseline.snapshot.lookbackWindow.endDate.toISOString(),
          transactionCount: baseline.snapshot.lookbackWindow.transactionCount,
        },
        contractInteractions: Array.from(baseline.snapshot.contractInteractions),
        tokenApprovals: Array.from(baseline.snapshot.tokenApprovals.entries()),
        volumeMetrics: baseline.snapshot.volumeMetrics,
        gasUsage: baseline.snapshot.gasUsage,
      },
    };
  }

  private deserializeBaseline(serialized: SerializedBaseline): Baseline {
    return {
      address: serialized.address,
      createdAt: new Date(serialized.createdAt),
      snapshot: {
        address: serialized.snapshot.address,
        timestamp: serialized.snapshot.timestamp,
        lookbackWindow: {
          startDate: new Date(serialized.snapshot.lookbackWindow.startDate),
          endDate: new Date(serialized.snapshot.lookbackWindow.endDate),
          transactionCount: serialized.snapshot.lookbackWindow.transactionCount,
        },
        contractInteractions: new Set(serialized.snapshot.contractInteractions),
        tokenApprovals: new Map(serialized.snapshot.tokenApprovals),
        volumeMetrics: serialized.snapshot.volumeMetrics,
        gasUsage: serialized.snapshot.gasUsage,
      },
    };
  }

  private isFileMissingError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown filesystem error";
  }
}
