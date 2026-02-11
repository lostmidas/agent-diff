# 🤖 agent-diff

![agent-diff cover](assets/cover.png)

A CLI tool for detecting onchain behavioral changes in Base wallet addresses.

## 🎯 Problem

Builders routinely make trust decisions about agent addresses based on stale or fragmented information. There is no lightweight, consistent way to answer: "What has changed about this agent's onchain behavior since the last time anyone looked?"

## 📦 What It Does

`agent-diff` observes onchain behavior for a given address on Base, summarizes it into a bounded snapshot, compares the current snapshot to a prior reference snapshot (baseline), and surfaces material behavioral changes between the two.

It produces a **diff**, not a verdict.

### Snapshot Captures

- Contract addresses interacted with
- Token approval events (new/revoked)
- Transaction volume patterns (daily average, trend direction)
- Gas usage patterns

### Lookback Window

Snapshots summarize the last **30 days** of activity OR the last **1,000 transactions**, whichever is fewer.

## 🚫 What It Does NOT Do

This tool is **not**:
- A security or risk scoring system
- A trust, reputation, or safety oracle
- A monitoring or alerting service
- A replacement for audits, multisig, sandboxing, or human review
- A malware or exploit detection system

It does **not**:
- Assess risk or security
- Issue safety verdicts or scores
- Determine intent (benign vs malicious)
- Provide recommendations
- Claim to prevent exploits or fund loss

A "no changes detected" result means only that observed behavior matches the previously recorded snapshot. It does **not** mean the address is safe.

## 🧠 How It Works

### Baseline Model

- The **first time** an address is checked, a baseline snapshot is created
- That baseline is **global per address** and stored locally
- Subsequent checks compare the current snapshot to the stored baseline
- Baselines are **immutable** once created (no automatic updates or manual resets in v1)

### Diff Generation

The tool compares the baseline snapshot to the current snapshot and reports:
- New contract interactions (present now, absent at baseline)
- Removed contract interactions (present at baseline, absent now)
- Changes in token approval scope
- Transaction volume shifts greater than ±50%

### Stale Baseline Warning

If a baseline is older than 12 months, the report includes: "Baseline is X months old. Changes may reflect normal evolution."

### Insufficient Data

If an address has fewer than 10 transactions, the system shows: "Insufficient data for baseline."

## 🛠️ Installation

```bash
npm install -g agent-diff
```

Or clone and install locally:

```bash
git clone https://github.com/yourusername/agent-diff.git
cd agent-diff
npm install
npm run build
npm link
```

## ⚙️ Environment Setup

Create a `.env` file in the project root:

```bash
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
```

You can obtain a free Alchemy API key at [alchemy.com](https://www.alchemy.com/).

If no `.env` is provided, the tool defaults to the public Base RPC endpoint (`https://mainnet.base.org`), which may be rate-limited.

## 🚀 Usage

Check an address for behavioral changes:

```bash
agent-diff check 0x1234567890123456789012345678901234567890
```

On first run, a baseline is created. On subsequent runs, a diff is generated.

## 📊 Example Output

### First Run (Baseline Creation)

```
Diff Report for 0x1234567890123456789012345678901234567890
Status: No changes detected

New Contract Interactions
None.

Removed Contract Interactions
None.

Token Approval Changes
New: None.
Revoked: None.

Transaction Volume Changes
Percent change: 0%
Significance: Not significant

Disclaimer: This report shows behavioral changes, not risk. Changes require user judgment.
```

### Subsequent Run (Changes Detected)

```
Diff Report for 0x1234567890123456789012345678901234567890
Status: Changes detected

New Contract Interactions
- 0xabcd1234abcd1234abcd1234abcd1234abcd1234
- 0xef567890ef567890ef567890ef567890ef567890

Removed Contract Interactions
None.

Token Approval Changes
New: 0xusdc -> [0xspender123]
Revoked: None.

Transaction Volume Changes
Percent change: +75%
Significance: Significant

Disclaimer: This report shows behavioral changes, not risk. Changes require user judgment.
```

## ⚠️ Limitations

### Scope

- **Base only**: Only works with Base mainnet addresses
- **Onchain only**: Does not analyze offchain activity, GitHub commits, or social signals
- **Pattern detection only**: Does not detect exploits, malware, or malicious intent
- **Bounded lookback**: Only analyzes the last 30 days or 1,000 transactions

### Baseline Constraints

- **Immutable baselines**: Once created, baselines cannot be updated or reset in v1
- **Global baselines**: One baseline per address, shared across all users
- **No re-baselining**: If the first baseline is noisy or flawed, it cannot be corrected

### RPC Limitations

- Public RPC endpoints may be rate-limited
- RPC unavailability will cause the tool to fail with: "Data unavailable. Try again later."

### Token Standards

- Only supports standard ERC20 approval events
- Does not detect ERC721, ERC1155, or custom token standards

## 🗺️ Roadmap

### Planned

- Improved baseline staleness handling
- Support for comparing multiple addresses
- Export diffs to JSON format

### Not Planned

- Multi-chain support (Base-only by design)
- Risk scoring or safety verdicts
- Real-time monitoring or alerting
- Offchain activity analysis

## 🤝 Contributing

Contributions are welcome. Please open an issue or pull request.

When contributing:
- Respect the non-goals and scope constraints defined in `agent.md`
- Ensure all tests pass (`npm test`)
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
