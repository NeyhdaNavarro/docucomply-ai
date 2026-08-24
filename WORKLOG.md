# Log — DocuComply AI

## Day 1 — Aug 20, 2026

**Done**
- Environment: Node 24, npm 11.17, Git 2.55, VS Code.
- Node project with Anthropic SDK. First call working.
- Public GitHub repo; secrets protected via .gitignore.

**Hit a snag**
- PowerShell blocks scripts by default (ExecutionPolicy). Resolved by setting `ExecutionPolicy` to `RemoteSigned` for the `CurrentUser` scope.
- Accidentally created files inside `node_modules` because that folder was selected in VS Code.
- Push failed with "Repository not found": I had configured the remote before actually creating the repo on GitHub.

**Learned**
- The API is stateless: each call is independent, with no memory.
- `content` is an array of blocks, not a string.
- Each response includes `usage` data showing input and output tokens.
- Output costs 5x more than input; `max_tokens` is a cost lever.
- Actual cost of a simple call using Haiku: $0.0004 USD.

## Day 2 — Aug 21, 2026

- Modeled locations as a level of their own: SUA groups employees by work
  location, which enables two-level total reconciliation (employees → location
  subtotal → grand total). Dropped CURP and INFONAVIT: not needed for the
  compliance check and fewer fields means less room for hallucination.

  ## Day 3 — Aug 22

**Done**
- Tool use extraction working end to end. Deterministic with temperature 0.
- Three fixtures: clean, inconsistent totals, malformed layout.

**Finding**
- On the malformed fixture the model correctly reconstructed a split row,
  separated two run-together amounts, and discarded a stray NSS inside the
  subtotal line — but reported nothing in missingFields. Silent inference is
  the core risk of LLM extraction: a wrong inference looks identical to a
  right one. A positional parser fails loudly; the model fails quietly.
  Mitigation: add an `anomalies` field AND deterministic validation. Neither
  is sufficient alone.

## Day 4 — Aug 23

**Done**
- Deterministic validation engine: two-level reconciliation, format rules
  (RFC, NSS, period), sanity checks, duplicate NSS detection.
- Added `anomalies` to the schema so the model declares what it inferred.
  Low confidence escalates to error; high/medium surface as warnings.

**Findings**
- Validation catches internal inconsistency only. A faithful-looking wrong
  extraction passes silently — structural blind spot, since the source
  document is never part of the comparison.
- The `anomalies` field closed part of that gap: on the malformed fixture the
  model now reports the split row and the stray NSS in the subtotal line. But
  it did NOT report two run-together amounts it also had to separate. The
  model reports what it judges anomalous; its threshold is not mine.
- Vague schema descriptions do not work. "Report anomalies" would not have
  produced this; the enumerated examples did.