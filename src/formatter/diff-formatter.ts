import { type Diff } from "../diff/diff-engine";

const REQUIRED_DISCLAIMER = "This report shows behavioral changes, not risk. Changes require user judgment.";
const STALE_BASELINE_MONTHS = 12;

export class DiffFormatter {
  format(diff: Diff): string {
    const lines: string[] = [];

    lines.push(`Diff Report for ${diff.address}`);
    lines.push(`Status: ${this.statusLabel(diff.status)}`);

    if (diff.baselineAge > STALE_BASELINE_MONTHS) {
      lines.push(`Baseline Context: Baseline is ${diff.baselineAge} months old. Changes may reflect normal evolution.`);
    }

    lines.push("");
    lines.push("New Contract Interactions");
    lines.push(this.formatContracts(diff.changes.newContracts, diff.status));

    lines.push("");
    lines.push("Removed Contract Interactions");
    lines.push(this.formatContracts(diff.changes.removedContracts, diff.status));

    lines.push("");
    lines.push("Token Approval Changes");
    lines.push(this.formatTokenApprovals(diff));

    lines.push("");
    lines.push("Transaction Volume Changes");
    lines.push(this.formatVolume(diff));

    lines.push("");
    lines.push(`Disclaimer: ${REQUIRED_DISCLAIMER}`);

    return lines.join("\n");
  }

  private statusLabel(status: Diff["status"]): string {
    if (status === "changes_detected") {
      return "Changes detected";
    }
    if (status === "no_changes") {
      return "No changes detected";
    }
    return "Insufficient data";
  }

  private formatContracts(contracts: string[], status: Diff["status"]): string {
    if (status === "insufficient_data") {
      return "Unavailable due to insufficient data.";
    }
    if (contracts.length === 0) {
      return "None.";
    }
    return contracts.map((address) => `- ${address}`).join("\n");
  }

  private formatTokenApprovals(diff: Diff): string {
    if (diff.status === "insufficient_data") {
      return "Unavailable due to insufficient data.";
    }

    const added = this.formatApprovalMap(diff.changes.tokenApprovalChanges.new);
    const revoked = this.formatApprovalMap(diff.changes.tokenApprovalChanges.revoked);

    const parts: string[] = [];
    parts.push(`New: ${added}`);
    parts.push(`Revoked: ${revoked}`);
    return parts.join("\n");
  }

  private formatApprovalMap(approvalMap: Map<string, string[]>): string {
    if (approvalMap.size === 0) {
      return "None.";
    }

    const entries = Array.from(approvalMap.entries()).map(([token, spenders]) => {
      if (spenders.length === 0) {
        return `${token} -> []`;
      }
      return `${token} -> [${spenders.join(", ")}]`;
    });

    return entries.join("; ");
  }

  private formatVolume(diff: Diff): string {
    if (diff.status === "insufficient_data") {
      return "Unavailable due to insufficient data.";
    }

    const percent = diff.changes.volumeChange.percentChange;
    const rounded = Math.round(percent * 100) / 100;
    const direction = rounded > 0 ? `+${rounded}%` : `${rounded}%`;
    const significance = diff.changes.volumeChange.significant ? "Significant" : "Not significant";

    return `Percent change: ${direction}\nSignificance: ${significance}`;
  }
}
