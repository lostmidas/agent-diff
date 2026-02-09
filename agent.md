# agent.md

## Project: agent-diff

A minimal tool for detecting **onchain behavioral changes** for crypto agents on **Base**.

---

## 1. Project Definition (Locked)

### Who this is for
Crypto builders, developers, and technically literate operators who integrate or monitor **crypto agents** (e.g. trading agents, DeFi automation, execution agents) that operate via onchain addresses on Base.

### Problem it solves
Builders routinely make trust decisions about agent addresses based on **stale or fragmented information**:
- past experience (“it worked before”)
- GitHub activity
- recent onchain transactions viewed manually in a block explorer

There is no lightweight, consistent way to answer:
> “What has **changed** about this agent’s onchain behavior since the last time anyone looked?”

### What this project does
This tool:
- observes onchain behavior for a given address on Base
- summarizes behavior into a bounded snapshot
- compares the current snapshot to a prior reference snapshot (“baseline”)
- surfaces **material behavioral changes** between the two

It produces a **diff**, not a verdict.

### What defines success (v1)
- A user can input an address
- The system produces a clear, bounded diff of onchain behavioral changes
- The output is understandable in **under 30 seconds**
- The tool does not infer intent, risk, or safety

### Smallest acceptable version
- Base only
- Address-based input
- Snapshot + diff output
- Predefined change categories only
- No alerts, no scores, no recommendations

---

## 2. Non-Goals (Hard Constraints)

This project is **not**:
- a security or risk scoring system
- a trust, reputation, or safety oracle
- a monitoring or alerting service
- a replacement for audits, multisig, sandboxing, or human review
- a full analytics dashboard
- a general-purpose block explorer
- a platform or marketplace

The following are explicitly **out of scope for v1**:
- automatic safety verdicts (safe / unsafe)
- exploit detection
- malware detection
- intent inference
- continuous monitoring or alerts
- historical deep dives beyond the snapshot window
- offchain activity analysis
- ERC-8004 or identity inference
- multi-chain support

If a feature attempts to answer:
> “Is this agent safe or trustworthy?”

It must be rejected.

---

## 3. Core Concept Definitions

### Agent (v1 definition)
An **agent** is any onchain address on Base that:
- submits transactions programmatically
- interacts with smart contracts
- is used as part of an automated or semi-automated system

This tool does **not** verify whether an address is “actually an AI agent.”
Any Base address may be checked.

### Snapshot
A snapshot is a **summarized representation of observed onchain behavior** over a bounded lookback window.

A snapshot captures:
- patterns and categories
- not individual transactions

### Diff
A diff is a comparison between:
- a previously recorded snapshot (“baseline”)
- a newly generated snapshot (“current”)

The diff surfaces **what changed**, not why it changed.

---

## 4. Snapshot Semantics (v1)

### Lookback window
A snapshot summarizes:
- the **last 30 days** of activity  
  **or**
- the **last 1,000 transactions**, whichever is fewer

### Snapshot captures
- Contract addresses interacted with
- Token approval events (new / revoked)
- Transaction volume patterns (daily average, trend direction)
- Gas usage patterns (high-level)

### Snapshot does NOT capture
- Individual transaction hashes
- Exact timestamps
- Mempool or pending data
- Offchain behavior
- Activity outside the lookback window

---

## 5. Diff Content Rules (v1)

### Always show
- New contract interactions (present in current, not baseline)
- Removed contract interactions (present in baseline, not current)
- Changes in token approval scope
- Transaction volume pattern shifts greater than **±50%**

### Neutral states (show only if true)
- “No changes detected”
- “Minimal activity (insufficient data for meaningful diff)”

### Never show
- Raw transaction lists
- Sender / recipient breakdowns
- Exact gas prices
- Optimization or performance metrics
- Speculative or inferred conclusions

---

## 6. Baseline Semantics (Critical)

### What a baseline is
A baseline is a **reference snapshot**, not a declaration of correctness or safety.

It represents:
- previously observed onchain behavior
- within a defined lookback window
- summarized into predefined categories

It does NOT represent:
- a “known good” state
- a trusted or approved state
- a guarantee of safety

### Baseline creation
- The **first time an address is checked**, a baseline snapshot is created
- That baseline is **global per address**
- Subsequent checks compare against the same baseline

### Baseline updates (v1 policy)
- Baselines are immutable once created
- No automatic updates
- No manual reset in v1
- Re-baselining is explicitly out of scope for v1

### Stale baseline handling
If a baseline is **older than 12 months**:
- The diff is still generated normally
- The UI must display:
  > “Note: Baseline is [X] months old. Changes may reflect normal evolution.”
- No automatic re-baselining occurs

---

## 7. Insufficient Data Handling

If an address has fewer than **10 transactions** at baseline creation:
- System shows: “Insufficient data for baseline”
- Diff remains unavailable until sufficient activity exists
- No partial or misleading diffs are shown

---

## 8. Error Handling (v1)

- If Base RPC is unavailable:
  - Show: “Data unavailable. Try again later.”
- If diff computation fails:
  - Show: “Unable to generate diff.”
- Never show partial or incomplete diffs

---

## 9. Explicit Scope Clarification (Read Carefully)

This project **does not** determine whether an agent is safe, trustworthy, or malicious.

It does **not**:
- assess risk or security
- issue safety verdicts or scores
- determine intent (benign vs malicious)
- replace audits, sandboxing, multisig, or human judgment
- claim to prevent exploits or fund loss

This project **only**:
- observes onchain behavior for a given address on Base
- summarizes that behavior into a bounded snapshot
- compares the current snapshot to a prior reference snapshot (“baseline”)
- surfaces **material behavioral changes** between the two

The output is **descriptive, not prescriptive**.

Any interpretation of whether a change is expected, acceptable, or risky is explicitly left to the user.

A “no changes detected” result means only:
> “Observed behavior matches the previously recorded snapshot.”

It does **not** mean:
> “This address is safe.”

---

## 10. Design Principles

- Clarity over completeness
- Signal over speculation
- Change detection over risk interpretation
- Bounded scope over extensibility

If a proposed feature violates these principles, it must not be implemented.

---

## 11. Execution Rules for the LLM (Cursor)

The LLM acts as an **executor**, not a product designer.

Rules:
- Plan before coding
- Respect all constraints in this file and UX_CONTRACT.md
- If instructions conflict, stop and ask
- Do not infer or add features not explicitly defined
- Do not expand scope “for usefulness”

---

## 12. Constraint Lock Rule

All constraints in this file are **locked** for the duration of the build.

Changes require:
- explicit acknowledgment
- deliberate decision
- documentation in the decision log

Silent drift is not allowed.