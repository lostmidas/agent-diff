# UX_CONTRACT.md

## Purpose

This document defines the **user interaction contract** for `agent-diff`.

It specifies:
- what the product shows
- how users interact with it
- what meanings the output does and does not imply
- where interaction explicitly stops

This contract is binding for implementation.  
Anything not explicitly allowed here is out of scope.

---

## Product Interaction Model

- The product is **on-demand**, not continuous.
- A user submits an **onchain address on Base**.
- The system returns a **single diff report**.
- There is no live monitoring, alerting, or background tracking in v1.

Each interaction is **stateless from the user’s perspective**.

---

## Baseline Model (Critical)

### Baseline Definition

- A **baseline** is a snapshot of observed onchain behavior for an address.
- The **first time an address is checked**, a baseline is created.
- That baseline is **global and shared** across all users.
- Subsequent checks compare the **current snapshot** to the stored baseline.

Users do **not** create personal baselines.

### Baseline Immutability (v1)

- Baselines do **not** update automatically.
- There is **no manual reset** in v1.
- There is **no re-baselining** logic in v1.

If a baseline is flawed, outdated, or noisy, the system does not correct it automatically.

This limitation must be visible to users.

---

## Snapshot Semantics (UX-Level)

From the user’s perspective:

- A snapshot summarizes behavior over the **last 30 days**, or **1,000 transactions**, whichever is fewer.
- It captures **patterns and categories**, not individual transactions.
- It is **not** a historical explorer.
- It is **not** a forensic audit.

Snapshots exist only to support **comparisons**, not deep inspection.

---

## Diff Semantics

A diff answers one question only:

**“What is observably different now compared to the baseline?”**

It does **not** answer:
- whether the address is safe
- whether behavior is malicious
- whether a change is good or bad

---

## Diff Content Rules

### Always Show

The diff must surface:

- New contract interactions (present now, absent at baseline)
- Removed contract interactions (present at baseline, absent now)
- Changes in token approval scope
- Transaction volume pattern changes greater than ±50%
- Meaningful shifts in onchain action categories

### Never Show

The diff must never include:

- Individual transaction hashes
- Exact timestamps
- Sender or recipient addresses
- Mempool or pending transaction data
- Gas price optimization metrics

### Neutral States (Only If True)

If applicable, the diff may show:

- “No changes detected”
- “Minimal activity (insufficient data for meaningful diff)”

---

## “No Changes Detected” State

If no meaningful differences exist, the UI must display a **neutral, calm state**.

Example copy (illustrative only):

- Status: No changes detected  
- Contract interactions: Unchanged  
- Token approvals: Unchanged  
- Transaction volume: Stable (~5 txns/day)  
- Gas patterns: Unchanged  

This state must:
- avoid reassurance language
- avoid implying safety or trust
- avoid celebratory or affirmative tone

---

## Insufficient Data Handling

If an address has **fewer than 10 transactions** at baseline creation:

- The system shows: “Insufficient data for baseline”
- A diff is not generated
- The user is told to check again later

If activity remains minimal at comparison time, the system may instead show:
“Minimal activity — no meaningful behavioral patterns detected.”

---

## Stale Baseline Handling

If a baseline is **older than 12 months**:

- A diff is still generated
- The UI must display a notice:  
  “Note: Baseline is X months old. Changes may reflect normal evolution.”

No automatic re-baselining occurs.

Users interpret staleness themselves.

---

## Interpretation Guidance (Required)

Every diff report must include a short **interpretation disclaimer**:

- The report shows **change**, not **risk**
- Changes require user judgment
- The product does not label behavior as safe, unsafe, benign, or malicious

The product surfaces information, not conclusions.

---

## Speed Requirement

The entire diff report must be understandable in **under 30 seconds** by the target user.

This implies:
- no more than 5–7 change categories
- concise descriptions (1–2 sentences per item)
- clear grouping (new / removed / unchanged)
- no unexplained jargon

If understanding takes longer than 30 seconds, the UI violates this contract.

---

## Explicit Non-Goals (UX)

The product does **not**:

- Provide risk scores
- Recommend actions
- Replace audits, explorers, or manual review
- Offer real-time alerts
- Track users or personalize baselines
- Claim security, safety, or trust guarantees

---

## Interaction Stop Point

After the diff is shown:

- The system does not guide next steps
- The system does not prompt investigation
- The system does not escalate or follow up

The user decides what to do next.

---

## Contract Lock

This UX contract is **locked for v1**.

Any change to:
- baseline behavior
- snapshot windows
- diff categories
- interpretation framing

requires explicit revision of this document before implementation.

No silent UX drift is permitted.