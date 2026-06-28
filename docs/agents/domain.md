# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root
- `docs/adr/` for ADRs that touch the area being changed

If any of these files do not exist, proceed silently. The `/domain-modeling` skill creates them lazily when terms or decisions get resolved.

## File structure

This is a single-context repo:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding.
