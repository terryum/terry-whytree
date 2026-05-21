#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

ERRORS=0
fail() {
  echo "  FAIL: $1"
  ERRORS=$((ERRORS + 1))
}
pass() {
  echo "  PASS: $1"
}

echo "=== Privacy Check ==="

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  staged=$(git diff --cached --name-only)
else
  staged=$(git ls-files --cached)
fi

blocked_paths='(^|/)vault/Private/Whytree/(sessions/|profile\.md$|profile\.json$|agent-brief\.md$|evidence\.jsonl$)|(^|/)\.whytree/|(^|/)feedback\.jsonl$'
blocked=$(printf '%s\n' "$staged" | grep -E "$blocked_paths" || true)
if [ -n "$blocked" ]; then
  fail "Staged private Whytree output path(s):"
  printf '%s\n' "$blocked"
else
  pass "No staged private Whytree output paths"
fi

content_hits=""
while IFS= read -r file; do
  [ -n "$file" ] || continue
  case "$file" in
    *.md|*.json|*.jsonl|*.mjs|*.js|*.sh|*.txt|*.toml|*.yaml|*.yml) ;;
    *) continue ;;
  esac
  if git show ":$file" 2>/dev/null | grep -Eq '"parentIds"[[:space:]]*:|"childIds"[[:space:]]*:|"seedIds"[[:space:]]*:|"rootIds"[[:space:]]*:|"currentNodeId"[[:space:]]*:|"lastExperimentId"[[:space:]]*:'; then
    case "$file" in
      SKILL.md|test/*|scripts/whytree-sync.mjs) ;;
      *) content_hits="${content_hits}${file}"$'\n' ;;
    esac
  fi
done <<< "$staged"

if [ -n "$content_hits" ]; then
  fail "Staged file(s) look like raw Whytree JSON or generated private memory:"
  printf '%s' "$content_hits"
else
  pass "No staged raw Whytree data outside allowed source files"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo
  echo "Privacy check failed. Do not commit generated Terry Whytree memory."
  exit 1
fi

echo "All privacy checks passed."
