#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PROFILE="$TMP_DIR/profile.json"
EVIDENCE="$TMP_DIR/evidence.jsonl"

pass() {
  echo "  PASS: $1"
}

fail() {
  echo "  FAIL: $1" >&2
  exit 1
}

echo "=== Identity Graph Test ==="

cat > "$PROFILE" <<'JSON'
{
  "schemaVersion": 1,
  "updatedAt": "",
  "terryBrief": "brief",
  "coreValues": ["autonomy"],
  "careerDecisionPrinciples": ["prefer field evidence"],
  "innerTensions": ["autonomy vs responsibility"],
  "liveExperiments": ["one small test"],
  "openQuestions": ["what changes next?"],
  "evidenceIds": ["wt-260527-001"]
}
JSON

node "$REPO_ROOT/scripts/identity-graph.mjs" --migrate --profile "$PROFILE" >/dev/null
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (p.schemaVersion !== 2) process.exit(1);
if (!p.identityGraph || !Array.isArray(p.identityGraph.nodes)) process.exit(1);
if (!p.identityGraph.nodes.some((n) => n.type === "Policy")) process.exit(1);
' "$PROFILE" || fail "profile migration did not produce schemaVersion 2 identity graph"
pass "Migrates legacy profile.json to schemaVersion 2"

printf '%s\n' '{"id":"wt-260527-001","ts":"2026-05-27T00:00:00.000Z","treeSlug":"test","kind":"value_claim","summary":"Paraphrased evidence only.","sourceRef":"session","confidence":0.7,"validContexts":[],"privacyLevel":"private","links":[]}' > "$EVIDENCE"
node "$REPO_ROOT/scripts/identity-graph.mjs" --validate --profile "$PROFILE" --evidence "$EVIDENCE" >/dev/null
pass "Valid profile and evidence pass validation"

V2_NO_POLICY="$TMP_DIR/v2-no-policy.json"
cat > "$V2_NO_POLICY" <<'JSON'
{
  "schemaVersion": 2,
  "updatedAt": "",
  "terryBrief": "",
  "identityGraph": {
    "schemaVersion": 1,
    "nodes": [],
    "edges": []
  },
  "identityGraphSummary": {},
  "legacyProfile": {}
}
JSON
node "$REPO_ROOT/scripts/identity-graph.mjs" --migrate --profile "$V2_NO_POLICY" >/dev/null
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!p.identityGraph.nodes.some((n) => n.id === "policy-agent-authority-default")) process.exit(1);
' "$V2_NO_POLICY" || fail "existing v2 profile did not receive default authority policy"
pass "Existing v2 profiles receive default authority policy"

BAD_PROFILE="$TMP_DIR/bad-profile.json"
cp "$PROFILE" "$BAD_PROFILE"
node -e '
const fs = require("fs");
const file = process.argv[1];
const p = JSON.parse(fs.readFileSync(file, "utf8"));
p.identityGraph.edges.push({ from: "missing-a", to: "missing-b", type: "serves" });
fs.writeFileSync(file, JSON.stringify(p, null, 2));
' "$BAD_PROFILE"
if node "$REPO_ROOT/scripts/identity-graph.mjs" --validate --profile "$BAD_PROFILE" --evidence "$EVIDENCE" >/dev/null 2>&1; then
  fail "invalid edge endpoints passed validation"
fi
pass "Invalid graph edges fail validation"

BAD_EVIDENCE="$TMP_DIR/bad-evidence.jsonl"
printf '%s\n' '{"id":"wt-260527-002","ts":"2026-05-27T00:00:00.000Z","treeSlug":"test","kind":"value_claim","summary":"bad","rawQuote":"do not store this"}' > "$BAD_EVIDENCE"
if node "$REPO_ROOT/scripts/identity-graph.mjs" --validate --profile "$PROFILE" --evidence "$BAD_EVIDENCE" >/dev/null 2>&1; then
  fail "raw transcript evidence passed validation"
fi
pass "Raw transcript-like evidence fields fail validation"

TREE_HOME="$TMP_DIR/whytree"
OUT_DIR="$TMP_DIR/out"
mkdir -p "$TREE_HOME"
printf 'test-tree\n' > "$TREE_HOME/.current"
cat > "$TREE_HOME/test-tree.json" <<'JSON'
{
  "schemaVersion": 1,
  "name": "Test Tree",
  "nodes": {
    "seed-1": {
      "id": "seed-1",
      "label": "test seed",
      "type": "seed",
      "parentIds": [],
      "childIds": [],
      "createdAt": "2026-05-27T00:00:00.000Z"
    }
  },
  "rootIds": ["seed-1"],
  "seedIds": ["seed-1"],
  "currentNodeId": null,
  "lastExperimentId": null,
  "createdAt": "2026-05-27T00:00:00.000Z",
  "updatedAt": "2026-05-27T00:00:00.000Z",
  "purpose": null
}
JSON

WHYTREE_SYNC_HOME="$TREE_HOME" WHYTREE_SYNC_OUT="$OUT_DIR" node "$REPO_ROOT/scripts/whytree-sync.mjs" --current >/dev/null
node -e '
const fs = require("fs");
const profile = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (profile.schemaVersion !== 2) process.exit(1);
' "$OUT_DIR/profile.json" || fail "whytree-sync did not initialize profile.json v2"
pass "whytree-sync initializes identity graph memory pack"

echo "All identity graph checks passed."
