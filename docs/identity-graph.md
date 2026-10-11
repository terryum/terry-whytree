# Identity Graph Memory

## Purpose

WhyTree keeps the tree as the conversational surface and stores durable self-knowledge as a local temporal identity graph. The graph is not a claim that the user has a fixed identity. It is a set of evidence-linked hypotheses that can be confirmed, weakened, contradicted, or scoped to a role and context.

## Storage

- `~/.whytree/*.json`: existing session tree files. Keep schemaVersion 1 for compatibility.
- `profile.json`: rolling structured identity graph and compact summaries.
- `evidence.jsonl`: append-only evidence records. Store paraphrased evidence only, not raw transcript excerpts.
- `profile.md` and `agent-brief.md`: human-readable mirrors for future agents.

## Profile JSON v2

The profile has `schemaVersion: 2` and an `identityGraph` object:

```json
{
  "schemaVersion": 2,
  "updatedAt": "ISO 8601",
  "terryBrief": "",
  "identityGraph": {
    "schemaVersion": 1,
    "nodes": [],
    "edges": []
  },
  "identityGraphSummary": {},
  "legacyProfile": {}
}
```

Allowed node types:

`Episode`, `Value`, `Need`, `Goal`, `Fear`, `Constraint`, `Role`, `Construct`, `IdentityClaim`, `Decision`, `Experiment`, `Outcome`, `Policy`.

Allowed edge types:

`evidenced_by`, `serves`, `conflicts_with`, `synergizes_with`, `valid_in_context`, `belongs_to_role`, `updated_by`, `invalidated_by`, `chose_over`, `avoided_because`, `authorizes_agent_to`.

Each node should include:

`id`, `type`, `label`, `summary`, `confidence`, `stability`, `status`, `validContexts`, `roleScopes`, `privacyLevel`, `firstSeenAt`, `lastConfirmedAt`, `evidenceIds`.

## Evidence JSONL v2

Each line is one JSON object:

```json
{
  "id": "wt-YYYYMMDD-001",
  "ts": "ISO 8601",
  "treeSlug": "active-tree",
  "kind": "value_claim",
  "summary": "Paraphrased evidence only.",
  "sourceRef": "session",
  "confidence": 0.7,
  "validContexts": [],
  "privacyLevel": "private",
  "links": []
}
```

Allowed `kind` values:

`session_summary`, `value_claim`, `identity_claim`, `construct`, `decision_record`, `experiment_result`, `authority_policy`, `contradiction`, `context_note`.

Never store raw transcript text, long quotes, local private paths, or tree JSON in evidence records.

## Extraction Rules

- Treat every new self-understanding as a hypothesis, not a final truth.
- Prefer low or medium confidence for one-session claims unless the user explicitly confirms a recurring pattern.
- Keep contradictions. Represent them as `conflicts_with` edges or `contradiction` evidence, not as errors to resolve.
- Scope claims to roles and contexts when possible.
- Decay or supersede stale claims by setting `status` and linking them with `updated_by` or `invalidated_by`.
- Preserve the short conversational UX. Do graph extraction after the Commitment Arc, not by adding a long questionnaire.

## Method Map

- WhyTree / Value-Focused Thinking: map means and fundamental objectives.
- Self-Determination Theory: mark autonomy, competence, and relatedness needs when they clearly appear.
- Schwartz values: represent value priority, compatibility, and conflict.
- Narrative identity: preserve chapters, turning points, future-self images, and recurring storylines as identity claims or episodes.
- Repertory Grid: extract personal bipolar constructs from comparisons.
- Motivational Interviewing: track ambivalence, readiness, and resistance as session state or evidence.
- ACT: connect values to committed actions and outcome reviews.

## Decision Memo Contract

Decision support should produce a memo, not an autonomous decision. Include:

- Long-term value fit.
- Short-term desire fit.
- Responsibility and relationship cost.
- Hard boundaries.
- Regret risk.
- Claims with weak or conflicting evidence.
- What the agent is uncertain about.
- One final question the human should answer before deciding.

Default authority policy:

- AI may decide low-stakes ordering and draft reflection notes.
- AI must ask before career, relationship-sensitive, organizational, or major spending decisions.
- AI must only advise for legal, medical, family-critical, and major financial decisions.
