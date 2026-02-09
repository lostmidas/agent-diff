import { Command } from "commander";
import { isAddress } from "ethers";
import { BaseRpcClient } from "../rpc/base-client";
import { TransactionAnalyzer } from "../analyzer/transaction-analyzer";
import { SnapshotGenerator, InsufficientDataError } from "../snapshot/snapshot-generator";
import { BaselineStore } from "../storage/baseline-store";
import { DiffEngine } from "../diff/diff-engine";
import { DiffFormatter } from "../formatter/diff-formatter";

const program = new Command();

program.name("agent-diff");

program
  .command("check <address>")
  .description("Generate an onchain behavior diff for a Base address")
  .action(async (address: string) => {
    if (!isAddress(address)) {
      console.error("Unable to generate diff");
      process.exitCode = 1;
      return;
    }

    const rpcClient = new BaseRpcClient();
    const analyzer = new TransactionAnalyzer();
    const snapshotGenerator = new SnapshotGenerator();
    const baselineStore = new BaselineStore();
    const diffEngine = new DiffEngine();
    const formatter = new DiffFormatter();

    try {
      const rawTransactions = await rpcClient.fetchTransactions(address);
      const analyzedTransactions = await analyzer.analyze(rawTransactions);
      const currentSnapshot = snapshotGenerator.generateSnapshot(address, analyzedTransactions);

      let baseline = await baselineStore.getBaseline(address);
      if (baseline === null) {
        await baselineStore.saveBaseline(address, currentSnapshot);
        baseline = await baselineStore.getBaseline(address);
      }

      if (baseline === null) {
        throw new Error("Unable to generate diff");
      }

      const diff = diffEngine.generateDiff(baseline, currentSnapshot);
      const report = formatter.format(diff);
      console.log(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (message === "Data unavailable. Try again later.") {
        console.error("Data unavailable. Try again later.");
        process.exitCode = 1;
        return;
      }

      if (error instanceof InsufficientDataError || message === "Insufficient data for baseline") {
        console.error("Insufficient data for baseline");
        process.exitCode = 1;
        return;
      }

      console.error("Unable to generate diff");
      process.exitCode = 1;
    }
  });

void program.parseAsync(process.argv);
