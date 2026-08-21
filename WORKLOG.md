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