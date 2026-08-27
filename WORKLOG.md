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

  ## Day 5 — Aug 24

**Done**
- Ground truth for the three fixtures, hand-written from the source documents.

**Findings**
- Found a corrupted fixture: sample-01 still had the 10-digit NSS from
  yesterday's mutation test. Ground truth caught it before measurement did.
- Ground truth is itself fallible. When accuracy drops, the first question is
  "which of the two is wrong?", not "what did the model get wrong?".
- It cannot be model-generated: using the model to verify the model would
  always score 100%. Human reading is the only valid source.

  ## Day 6 — Aug 25

**Done**
- Evaluation harness: flatten → compare → report. Field-level accuracy with
  path-addressed mismatches, tolerance-based numeric comparison, documented
  text normalization, and detection of invented rows.
- Disk cache for extractions. Separated library from entry point after
  discovering top-level code in an imported module fires on every import.

**Result: 84/84 fields, 100% across 3 fixtures.**

**Findings**
- First run showed 98.8%. The single failure was MY fixture, not the model:
  a corrupted NSS left over from a mutation test. Ground truth is fallible;
  the first question on a mismatch is which side is wrong.
- On sample-02 the model produced a confidently-worded but self-contradictory
  explanation in `anomalies` (claimed a mismatch and disproved it in the same
  sentence). Deterministic validation gave the correct answer in two lines.
  Model explanations are plausible text, not verified reasoning.
- Next: narrow `anomalies` to reading problems only. Arithmetic belongs to
  the validator.

  ## Day 7 — Aug 26

**Done**
- PDF generation from fixtures. Text-layer extraction (route A, pdfjs).
  Image rendering + vision extraction (route B).
- Added MALFORMED_EXTRACTION guard: it caught a schema-violating response
  on the first vision run.

**Findings — the important one**
- Route A (text): 100% field accuracy, deterministic, ~1.7k input tokens.
- Route B (vision, Haiku): catastrophic. Visual character confusions
  (D→O, 6→8, 6→G), transposed contribution columns, a hallucinated employee
  built from a split row's amounts, and schema violations (`locations`
  returned as a serialized string). Two runs at temperature 0 produced
  DIFFERENT output — determinism does not survive the vision path.
- My hypothesis was that vision would win by preserving layout. The data
  says otherwise. Route A wins decisively when a text layer exists.
- Most alarming: stated subtotal and grand total came out correct both times,
  so reconciliation validation would have PASSED on fabricated employee data.
  This is the structural blind spot, demonstrated rather than argued.

**Open**
- `scale: 4` produced identical input token count as `scale: 2` — the option
  did not take effect. Re-test resolution properly.
- Test Sonnet on the vision path; Haiku may simply be the wrong tier for images.

## Day 8 — Aug 27

**Done**
- Made `renderPdfToImages` take `scale` as a parameter instead of hardcoding
  it, and re-ran route B on Sonnet 5 instead of Haiku.

**Findings — the important one**
- Day 7's "vision is broken" conclusion was wrong in its framing: the failure
  is model-tier specific, not inherent to the route. Sonnet 5 extracts the
  same document at 100% field accuracy over vision. Haiku 4.5 is simply the
  wrong tier for reading an image of a payroll table.

  | Route                    | Accuracy | Determinism |
  |---------------------------|----------|-------------------------------|
  | A — text (Haiku 4.5)      | 100%     | identical output, 2 runs at temp 0 |
  | B — vision (Haiku 4.5)    | catastrophic (misreads, hallucinated employee, schema violation) | different output, 2 runs at temp 0 |
  | B — vision (Sonnet 5)     | 100%     | structured fields byte-identical, 3 runs (temp 0 unavailable — see below); `anomalies` prose varied every run |

- Separately: resolution was never the lever. `scale: 2` and `scale: 4`
  produce identical input token counts (3,044 both times) despite the
  rendered PNG genuinely differing per scale — 52 KB at scale 2 vs. 120 KB
  at scale 4, confirmed by logging page size. So local rendering is working
  correctly; the downsampling happens API-side, after upload. Raising render
  scale burns local render time and bandwidth for nothing. Dropped the
  scale-tuning idea entirely.

- `temperature: 0` is also absent from the Sonnet 5 vision call, but not by
  choice: Sonnet 5 rejects the parameter outright with a 400 error. Removing
  it was mandatory, not an oversight left over from debugging.
- Ran the same Sonnet 5 vision extraction three times to settle Day 7's
  non-determinism question on this tier. All 25 structured fields were
  byte-identical across all three runs. The free-text `anomalies`
  descriptions differed every time (output tokens: 796 / 808 / 811).
  Design rule: never key, compare, or diff on model-generated prose — only
  on schema fields. This is exactly why `anomalies` is excluded from
  flatten/compare (see src/flatten.ts).

**Open**
- Route A remains the default recommendation: same accuracy, far fewer
  tokens, no per-tier model dependency to re-validate later.