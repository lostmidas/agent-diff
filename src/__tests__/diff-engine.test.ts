import { DiffEngine, type Diff } from "../diff/diff-engine";
import { type Snapshot } from "../snapshot/snapshot-generator";
import { type Baseline } from "../storage/baseline-store";

function makeSnapshot(overrides?: Partial<Snapshot>): Snapshot {
  return {
    address: "0x1234567890123456789012345678901234567890",
    timestamp: 1738368000,
    lookbackWindow: {
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-31T23:59:59.999Z"),
      transactionCount: 20,
    },
    contractInteractions: new Set<string>(["0x1111111111111111111111111111111111111111"]),
    tokenApprovals: new Map<string, string[]>([
      ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", ["0x0000000000000000000000000000000000000001"]],
    ]),
    volumeMetrics: {
      dailyAverage: 10,
      trendDirection: "stable",
    },
    gasUsage: {
      averageGasUsed: 21000,
      pattern: "low",
    },
    ...overrides,
  };
}

function makeBaseline(snapshot: Snapshot, createdAt: Date): Baseline {
  return {
    address: snapshot.address,
    createdAt,
    snapshot,
  };
}

describe("DiffEngine", () => {
  const engine = new DiffEngine();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("detects new and removed contract interactions", () => {
    const baselineSnapshot = makeSnapshot({
      contractInteractions: new Set(["0x1111111111111111111111111111111111111111"]),
    });
    const currentSnapshot = makeSnapshot({
      contractInteractions: new Set(["0x2222222222222222222222222222222222222222"]),
      volumeMetrics: { dailyAverage: 10, trendDirection: "stable" },
    });
    const baseline = makeBaseline(baselineSnapshot, new Date("2026-01-01T00:00:00.000Z"));

    const diff = engine.generateDiff(baseline, currentSnapshot);

    expect(diff.changes.newContracts).toEqual(["0x2222222222222222222222222222222222222222"]);
    expect(diff.changes.removedContracts).toEqual(["0x1111111111111111111111111111111111111111"]);
    expect(diff.status).toBe("changes_detected");
  });

  test("detects token approval changes (new and revoked)", () => {
    const baselineSnapshot = makeSnapshot({
      tokenApprovals: new Map([["0xtoken", ["0xspender1", "0xspender2"]]]),
      volumeMetrics: { dailyAverage: 10, trendDirection: "stable" },
    });
    const currentSnapshot = makeSnapshot({
      tokenApprovals: new Map([["0xtoken", ["0xspender2", "0xspender3"]]]),
      volumeMetrics: { dailyAverage: 10, trendDirection: "stable" },
    });
    const baseline = makeBaseline(baselineSnapshot, new Date("2026-01-01T00:00:00.000Z"));

    const diff = engine.generateDiff(baseline, currentSnapshot);

    expect(diff.changes.tokenApprovalChanges.new.get("0xtoken")).toEqual(["0xspender3"]);
    expect(diff.changes.tokenApprovalChanges.revoked.get("0xtoken")).toEqual(["0xspender1"]);
    expect(diff.status).toBe("changes_detected");
  });

  test("computes volume percent change and significant flag for > 50%", () => {
    const baselineSnapshot = makeSnapshot({
      volumeMetrics: { dailyAverage: 10, trendDirection: "stable" },
    });
    const currentSnapshot = makeSnapshot({
      volumeMetrics: { dailyAverage: 16, trendDirection: "increasing" },
    });
    const baseline = makeBaseline(baselineSnapshot, new Date("2026-01-01T00:00:00.000Z"));

    const diff = engine.generateDiff(baseline, currentSnapshot);

    expect(diff.changes.volumeChange.percentChange).toBeCloseTo(60, 5);
    expect(diff.changes.volumeChange.significant).toBe(true);
    expect(diff.status).toBe("changes_detected");
  });

  test("returns no_changes when no category has a material diff", () => {
    const baselineSnapshot = makeSnapshot({
      contractInteractions: new Set(["0x1111111111111111111111111111111111111111"]),
      tokenApprovals: new Map([["0xtoken", ["0xspender1"]]]),
      volumeMetrics: { dailyAverage: 10, trendDirection: "stable" },
    });
    const currentSnapshot = makeSnapshot({
      contractInteractions: new Set(["0x1111111111111111111111111111111111111111"]),
      tokenApprovals: new Map([["0xtoken", ["0xspender1"]]]),
      volumeMetrics: { dailyAverage: 12, trendDirection: "stable" },
    });
    const baseline = makeBaseline(baselineSnapshot, new Date("2026-01-01T00:00:00.000Z"));

    const diff = engine.generateDiff(baseline, currentSnapshot);

    expect(diff.changes.volumeChange.percentChange).toBeCloseTo(20, 5);
    expect(diff.changes.volumeChange.significant).toBe(false);
    expect(diff.status).toBe("no_changes");
  });

  test("computes baselineAge in months and indicates stale via age > 12", () => {
    const baselineSnapshot = makeSnapshot();
    const currentSnapshot = makeSnapshot();
    const baseline = makeBaseline(baselineSnapshot, new Date("2024-12-01T00:00:00.000Z"));

    const diff = engine.generateDiff(baseline, currentSnapshot);

    expect(diff.baselineAge).toBe(14);
    expect(diff.baselineAge > 12).toBe(true);
  });

  test("returns insufficient_data when either snapshot has fewer than 10 transactions", () => {
    const baselineSnapshot = makeSnapshot({
      lookbackWindow: {
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-31T23:59:59.999Z"),
        transactionCount: 9,
      },
    });
    const currentSnapshot = makeSnapshot();
    const baseline = makeBaseline(baselineSnapshot, new Date("2026-01-01T00:00:00.000Z"));

    const diff: Diff = engine.generateDiff(baseline, currentSnapshot);

    expect(diff.status).toBe("insufficient_data");
  });
});
