import { SnapshotGenerator, InsufficientDataError } from "../snapshot/snapshot-generator";
import { type AnalyzedTransactions } from "../analyzer/transaction-analyzer";

describe("SnapshotGenerator", () => {
  const generator = new SnapshotGenerator();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-15T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("generates snapshot from analyzed transactions", () => {
    const analyzed: AnalyzedTransactions = {
      contractInteractions: ["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222"],
      approvalEvents: [
        {
          tokenAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          owner: "0x0000000000000000000000000000000000000001",
          spender: "0x0000000000000000000000000000000000000002",
          value: "100",
          transactionHash: "0xhash1",
          timestamp: 1735689600,
        },
      ],
      dailyTransactionVolume: {
        "2026-01-01": 4,
        "2026-01-02": 4,
        "2026-01-03": 4,
      },
      gasUsage: {
        averageGasUsed: "21000",
        pattern: "low",
      },
    };

    const snapshot = generator.generateSnapshot("0x1234567890123456789012345678901234567890", analyzed);

    expect(snapshot.address).toBe("0x1234567890123456789012345678901234567890");
    expect(snapshot.lookbackWindow.transactionCount).toBe(12);
    expect(snapshot.contractInteractions.size).toBe(2);
    expect(snapshot.tokenApprovals.size).toBe(1);
    expect(snapshot.gasUsage.averageGasUsed).toBe(21000);
    expect(snapshot.gasUsage.pattern).toBe("low");
  });

  test("throws InsufficientDataError when fewer than 10 transactions are present", () => {
    const analyzed: AnalyzedTransactions = {
      contractInteractions: [],
      approvalEvents: [],
      dailyTransactionVolume: {
        "2026-01-01": 3,
        "2026-01-02": 3,
        "2026-01-03": 3,
      },
      gasUsage: {
        averageGasUsed: "21000",
        pattern: "low",
      },
    };

    expect(() => generator.generateSnapshot("0x1234567890123456789012345678901234567890", analyzed)).toThrow(
      InsufficientDataError,
    );
  });

  test("calculates daily average and trend direction", () => {
    const analyzed: AnalyzedTransactions = {
      contractInteractions: [],
      approvalEvents: [],
      dailyTransactionVolume: {
        "2026-01-01": 2,
        "2026-01-02": 4,
        "2026-01-03": 6,
      },
      gasUsage: {
        averageGasUsed: "500000",
        pattern: "medium",
      },
    };

    const snapshot = generator.generateSnapshot("0x1234567890123456789012345678901234567890", analyzed);

    expect(snapshot.volumeMetrics.dailyAverage).toBe(4);
    expect(snapshot.volumeMetrics.trendDirection).toBe("increasing");
  });
});
