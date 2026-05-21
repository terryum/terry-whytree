---
name: whytree
description: Terry's Codex port of Why Tree. Use for $whytree, guided purpose-discovery sessions, purpose-tree maintenance in ~/.whytree, Commitment Arc follow-up, and syncing Why Tree digests to Terry's Obsidian vault.
---

# $whytree

Use `/Users/terrytaewoongum/Codes/personal/terry-whytree/SKILL.md` as the source of truth, adapting Claude-specific instructions to Codex.

## Codex Overrides

- Invoke this as `$whytree`; if the source says `/whytree`, treat it as `$whytree`.
- Resolve all referenced files relative to `/Users/terrytaewoongum/Codes/personal/terry-whytree`.
- Run the preamble with:
  ```bash
  bash /Users/terrytaewoongum/Codes/personal/terry-whytree/preamble.sh
  ```
- For demo mode, read `DEMO_MODE.md` from the repo and use the same repo-local preamble path.
- Ignore the Claude Sonnet model guard. Codex is the intended runtime for this port.
- Keep the source operating rules: one question at a time, never show raw JSON/node IDs/file paths, and render only user-facing tree visualizations.
- Store and update tree JSON in `~/.whytree` using the schema in the source skill.
- After the Commitment Arc closes, sync the current tree with:
  ```bash
  node /Users/terrytaewoongum/Codes/personal/terry-whytree/scripts/whytree-sync.mjs --current
  ```
- Then update the generated Obsidian note's narrative sections in Korean, preserving the generated Purpose/tree block.

## Terry Context

- Obsidian digest directory: `/Users/terrytaewoongum/Codes/personal/terry-obsidian/vault/Private/Whytree`
- Existing trees are already in `~/.whytree`; do not migrate or rename them unless Terry explicitly asks.
- This port intentionally keeps the current Why Tree method unchanged. Personal upgrades should be made in a later phase.
