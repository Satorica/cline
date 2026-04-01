---
name: query-plcopen-part1
description: Query PLCopen Part 1 FB spec from local JSON and use it as the source of truth for answering questions and generating ST code.
---

# Query PLCopen Part 1

Use this skill when the user asks about PLCopen Part 1 function blocks, pin contracts, or requests ST code that must comply with the project's PLCopen contract.

## Source of Truth

- Primary spec file (must be read first): `./.agents/skills/query-plcopen-part1/plcopen_part_1_function.json`
- Treat this JSON as authoritative for:
  - FB names
  - Input/Output/InOut pin names
  - Pin data types
  - Behavioral notes

If a requested FB is not present in the JSON, explicitly say it is not found in the current Part 1 dataset and proceed conservatively.

## Required Workflow

1. Read the JSON spec file.
2. Locate the target FB(s) by exact `name` match first; if not found, try close-name matching and report assumptions.
3. Build the answer/code directly from the matched entry fields: `description`, `inputs`, `outputs`, `inouts`, `notes`.
4. For every technical claim, anchor it to the spec entry content (do not invent undocumented pins).

## Answering Questions

When user asks conceptual or API questions:

- Return concise, structured content:
  - FB purpose
  - Interface contract (inputs/outputs/inouts)
  - Key behavior notes and caveats
- Include the evidence path: `./.agents/skills/query-plcopen-part1/plcopen_part_1_function.json`
- If the user compares multiple FBs, present a side-by-side contract comparison.

## Code Generation Rules (ST)

When user asks to generate or edit PLC ST code:

- Enforce exact FB and pin names from the JSON entries.
- Preserve PLCopen execute semantics (rising-edge style for command FBs where applicable).
- Do not output empty output bindings like `Done => ,`.
- If status outputs are needed later, declare variables and bind outputs explicitly.
- Keep generated logic configurable via variables/parameters, not by renaming FB contracts.
- If a required pin/type detail is missing in JSON, keep contract-valid defaults and mark as configurable variable.

## Conflict Handling

If user instructions conflict with PLCopen contract in the JSON:

- State the conflict clearly.
- Keep contract-compliant names/signatures in generated code.
- Offer a compliant alternative implementation.

## Output Style

- For Q&A: concise explanation with contract bullets.
- For code requests: output complete compilable ST block requested by user (program-level by default unless mapping is requested).
- Always prioritize correctness to the local JSON spec over generic PLC memory.
