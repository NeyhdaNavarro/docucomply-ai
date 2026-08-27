## Schema descriptions are prompt, not documentation

The model reads field descriptions during tool use, so they are written to
define extraction behavior rather than to document the schema for humans.

| Before | After |
|---|---|
| `"Location subtotal."` | `"Subtotal as printed for this location. Copy it, never compute it."` |
| `"NSS."` | `"11-digit NSS. Keep leading zeros. Never reformat."` |

The first version invites the model to correct the source document. The second
keeps transcription and validation as separate responsibilities: the model
records what the document claims, and deterministic code decides whether that
claim holds.

This mattered on the inconsistent-totals fixture, where the printed subtotal
(6,000.00) does not match the sum of its own employee rows (6,735.85). With the
"copy it" instruction the model transcribed 6,000.00 and the validator caught
the discrepancy. Had the model recalculated, the inconsistency would have
disappeared before validation ever saw it.

## `anomalies`: making inference visible

The field was added after observing that the model could correctly reconstruct
malformed sections of a document without declaring that it had inferred
anything. That is the dangerous case: a wrong inference looks identical to a
right one, and the output carries no signal either way.

The schema description enumerates what counts as inference rather than asking
for it in the abstract:

> Every place where you had to infer, reconstruct or disambiguate rather than
> read a value directly. Report split rows, run-together numbers, values in
> unexpected positions, unclear characters, or anything you resolved by
> reasoning about context. An empty array means every value was read verbatim.

A shorter instruction — "report any anomalies" — produced nothing. The model
does not share a definition of "anomalous" until one is given.

**Result on the malformed fixture:** the model reported the row split across
two lines and the stray identifier inside the subtotal line, both accurately
described. It did **not** report two run-together amounts it had also needed to
separate. Coverage improved; it is not complete. The model reports what it
judges anomalous, and its threshold is not the same as mine.

Two further observations from testing: free-text descriptions vary between
otherwise identical runs, and on one fixture the model produced a confidently
worded explanation that contradicted its own figures within the same sentence.

`anomalies` is therefore treated as a signal for human review, never as
business logic. Every rule that must hold lives in deterministic code.

## `missingFields`, `temperature: 0` and forced `tool_choice`

Three settings, each reducing a different risk.

**`missingFields`** gives the model somewhere to declare absence. Without it, a
schema with required fields pressures the model to produce *something* for
every one of them, and inventing a plausible value is the path of least
resistance. The description instructs it to list any required field that is
absent or unreadable rather than guessing. This makes the output distinguish
between a value actually read from the document and a value that could not be
obtained and needs review.

**`temperature: 0`** on the text route: extraction needs no creativity, and
repeatable behavior across runs is what makes evaluation possible at all. Note
that this reduces variability rather than guaranteeing mathematical determinism.
On Sonnet 5 the parameter is rejected outright — testing without it showed
structured fields byte-identical across three runs while free-text `anomalies`
descriptions differed each time. Stability is not uniform across a response.

**Forced `tool_choice`** removes the model's option to answer in prose. Rather
than hoping for JSON in a text reply, the response must arrive through the
declared tool and satisfy its schema:

```text
Document → LLM → declared tool → schema → structured data
```

None of the three guarantees the extraction is *correct* — they constrain its
shape, not its fidelity. That is why deterministic validation and ground-truth
comparison sit downstream of all of them.

