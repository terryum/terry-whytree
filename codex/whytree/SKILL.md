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
- At session start, read only Whytree private memory if present: `profile.md` and `agent-brief.md` in the Obsidian digest directory. Do not automatically search Facebook, posts, papers, or surveys.
- After the Commitment Arc closes, sync the current tree with:
  ```bash
  node /Users/terrytaewoongum/Codes/personal/terry-whytree/scripts/whytree-sync.mjs --current
  ```
- Then update the generated Obsidian session note plus `profile.md`, `profile.json`, `agent-brief.md`, and `evidence.jsonl` in Korean, preserving the generated Purpose/tree block.
- Never commit or publish generated Whytree private memory files.

## Terry Context

- Obsidian digest directory: `/Users/terrytaewoongum/Codes/personal/terry-obsidian/vault/Private/Whytree`
- Generated memory files are local-only and gitignored in `terry-obsidian`.
- Existing trees are already in `~/.whytree`; do not migrate or rename them unless Terry explicitly asks.
- This port keeps the core Why Tree method, but adds Terry-specific local memory dataization.
