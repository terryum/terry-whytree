#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUT_DIR = path.join(
  os.homedir(),
  'Codes',
  'personal',
  'terry-obsidian',
  'vault',
  'Private',
  'Whytree',
);

const NODE_TYPES = new Set([
  'Episode',
  'Value',
  'Need',
  'Goal',
  'Fear',
  'Constraint',
  'Role',
  'Construct',
  'IdentityClaim',
  'Decision',
  'Experiment',
  'Outcome',
  'Policy',
]);

const EDGE_TYPES = new Set([
  'evidenced_by',
  'serves',
  'conflicts_with',
  'synergizes_with',
  'valid_in_context',
  'belongs_to_role',
  'updated_by',
  'invalidated_by',
  'chose_over',
  'avoided_because',
  'authorizes_agent_to',
]);

const EVIDENCE_KINDS = new Set([
  'session_summary',
  'value_claim',
  'identity_claim',
  'construct',
  'decision_record',
  'experiment_result',
  'authority_policy',
  'contradiction',
  'context_note',
]);

export function profileJsonTemplateV2(now = '') {
  return `${JSON.stringify(defaultProfileV2(now), null, 2)}\n`;
}

export function defaultProfileV2(now = '') {
  return {
    schemaVersion: 2,
    updatedAt: now,
    terryBrief: '',
    identityGraph: {
      schemaVersion: 1,
      nodes: [
        {
          id: 'policy-agent-authority-default',
          type: 'Policy',
          label: 'Default agent authority policy',
          summary: 'AI may draft, rank, and advise, but must not make high-stakes life, career, relationship, legal, medical, family-critical, or major financial decisions without explicit human confirmation.',
          confidence: 1,
          stability: 'high',
          status: 'active',
          validContexts: ['agent delegation'],
          roleScopes: [],
          privacyLevel: 'private',
          firstSeenAt: now,
          lastConfirmedAt: now,
          evidenceIds: [],
          data: {
            canDecideWithoutConfirmation: [
              'reading recommendations',
              'drafting reflection notes',
              'ranking low-stakes learning options',
            ],
            mustAskBeforeDeciding: [
              'career moves',
              'major spending',
              'relationship-sensitive communication',
              'organizational personnel decisions',
            ],
            adviseOnly: [
              'medical',
              'legal',
              'high-impact family decisions',
              'major financial commitments',
            ],
          },
        },
      ],
      edges: [],
    },
    identityGraphSummary: {
      values: [],
      needs: [],
      personalConstructs: [],
      decisionPrinciples: [],
      innerTensions: [],
      liveExperiments: [],
      openQuestions: [],
      authorityPolicy: 'Default agent authority policy',
    },
    legacyProfile: {
      personalityPersona: [],
      coreValues: [],
      lifeDirection: [],
      careerDecisionPrinciples: [],
      innerTensions: [],
      fearsAndAvoidancePatterns: [],
      workStyle: [],
      collaborationPreferences: [],
      liveExperiments: [],
      openQuestions: [],
      evidenceIds: [],
    },
  };
}

export function migrateProfileObject(input, now = '') {
  if (!isPlainObject(input)) return defaultProfileV2(now);
  if (input.schemaVersion === 2 && isPlainObject(input.identityGraph)) {
    return normalizeProfileV2(input, now);
  }

  const migrated = defaultProfileV2(now);
  migrated.terryBrief = stringOrEmpty(input.terryBrief);
  migrated.legacyProfile = {
    personalityPersona: stringArray(input.personalityPersona),
    coreValues: stringArray(input.coreValues),
    lifeDirection: stringArray(input.lifeDirection),
    careerDecisionPrinciples: stringArray(input.careerDecisionPrinciples),
    innerTensions: stringArray(input.innerTensions),
    fearsAndAvoidancePatterns: stringArray(input.fearsAndAvoidancePatterns),
    workStyle: stringArray(input.workStyle),
    collaborationPreferences: stringArray(input.collaborationPreferences),
    liveExperiments: stringArray(input.liveExperiments),
    openQuestions: stringArray(input.openQuestions),
    evidenceIds: stringArray(input.evidenceIds),
  };
  migrated.identityGraphSummary.values = [
    ...stringArray(input.coreValues),
    ...stringArray(input.lifeDirection),
  ];
  migrated.identityGraphSummary.decisionPrinciples = stringArray(input.careerDecisionPrinciples);
  migrated.identityGraphSummary.innerTensions = [
    ...stringArray(input.innerTensions),
    ...stringArray(input.fearsAndAvoidancePatterns),
  ];
  migrated.identityGraphSummary.liveExperiments = stringArray(input.liveExperiments);
  migrated.identityGraphSummary.openQuestions = stringArray(input.openQuestions);
  return migrated;
}

export function validateProfileObject(profile) {
  const errors = [];
  if (!isPlainObject(profile)) return ['profile must be an object'];
  if (profile.schemaVersion !== 2) errors.push('profile.schemaVersion must be 2');
  if (!isPlainObject(profile.identityGraph)) errors.push('identityGraph must be an object');

  const graph = isPlainObject(profile.identityGraph) ? profile.identityGraph : {};
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const nodeIds = new Set();

  for (const [index, node] of nodes.entries()) {
    if (!isPlainObject(node)) {
      errors.push(`identityGraph.nodes[${index}] must be an object`);
      continue;
    }
    if (!nonEmptyString(node.id)) errors.push(`identityGraph.nodes[${index}].id is required`);
    if (nodeIds.has(node.id)) errors.push(`duplicate identity graph node id: ${node.id}`);
    if (nonEmptyString(node.id)) nodeIds.add(node.id);
    if (!NODE_TYPES.has(node.type)) errors.push(`invalid node type for ${node.id || index}: ${node.type}`);
    if (!nonEmptyString(node.label)) errors.push(`identity graph node ${node.id || index} needs a label`);
    if (!Array.isArray(node.evidenceIds)) errors.push(`identity graph node ${node.id || index} evidenceIds must be an array`);
    if (typeof node.confidence !== 'number' || node.confidence < 0 || node.confidence > 1) {
      errors.push(`identity graph node ${node.id || index} confidence must be 0..1`);
    }
  }

  for (const [index, edge] of edges.entries()) {
    if (!isPlainObject(edge)) {
      errors.push(`identityGraph.edges[${index}] must be an object`);
      continue;
    }
    if (!nonEmptyString(edge.from)) errors.push(`identityGraph.edges[${index}].from is required`);
    if (!nonEmptyString(edge.to)) errors.push(`identityGraph.edges[${index}].to is required`);
    if (!EDGE_TYPES.has(edge.type)) errors.push(`invalid edge type at identityGraph.edges[${index}]: ${edge.type}`);
    if (nonEmptyString(edge.from) && !nodeIds.has(edge.from)) errors.push(`edge ${index} references missing from node: ${edge.from}`);
    if (nonEmptyString(edge.to) && !nodeIds.has(edge.to)) errors.push(`edge ${index} references missing to node: ${edge.to}`);
  }

  return errors;
}

export function validateEvidenceLines(raw) {
  const errors = [];
  const ids = new Set();
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());

  for (const [index, line] of lines.entries()) {
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      errors.push(`evidence line ${index + 1} is invalid JSON: ${error.message}`);
      continue;
    }
    if (!isPlainObject(record)) {
      errors.push(`evidence line ${index + 1} must be an object`);
      continue;
    }
    if (!nonEmptyString(record.id)) errors.push(`evidence line ${index + 1} id is required`);
    if (ids.has(record.id)) errors.push(`duplicate evidence id: ${record.id}`);
    if (nonEmptyString(record.id)) ids.add(record.id);
    if (!nonEmptyString(record.ts)) errors.push(`evidence ${record.id || index + 1} ts is required`);
    if (!EVIDENCE_KINDS.has(record.kind)) errors.push(`invalid evidence kind for ${record.id || index + 1}: ${record.kind}`);
    if (!nonEmptyString(record.summary)) errors.push(`evidence ${record.id || index + 1} summary is required`);
    if (record.rawQuote || record.transcript || record.content) {
      errors.push(`evidence ${record.id || index + 1} must not store raw transcript fields`);
    }
  }

  return errors;
}

export async function ensureProfileJsonV2(filePath, now = new Date().toISOString()) {
  let raw = '';
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, profileJsonTemplateV2(now), 'utf8');
    return { changed: true, profile: defaultProfileV2(now) };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`profile JSON is invalid: ${error.message}`);
  }

  const migrated = migrateProfileObject(parsed, now);
  const serialized = `${JSON.stringify(migrated, null, 2)}\n`;
  if (serialized !== raw) {
    await fs.writeFile(filePath, serialized, 'utf8');
    return { changed: true, profile: migrated };
  }
  return { changed: false, profile: migrated };
}

export async function validateFiles(profilePath, evidencePath) {
  const profileRaw = await fs.readFile(profilePath, 'utf8');
  const profile = JSON.parse(profileRaw);
  const errors = validateProfileObject(profile);

  try {
    const evidenceRaw = await fs.readFile(evidencePath, 'utf8');
    errors.push(...validateEvidenceLines(evidenceRaw));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  return errors;
}

function normalizeProfileV2(profile, now) {
  const base = defaultProfileV2(now);
  const graph = isPlainObject(profile.identityGraph) ? profile.identityGraph : {};
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : base.identityGraph.nodes;
  return {
    ...base,
    ...profile,
    schemaVersion: 2,
    identityGraph: {
      schemaVersion: 1,
      nodes: ensureDefaultPolicyNode(nodes, base.identityGraph.nodes[0]),
      edges: Array.isArray(graph.edges) ? graph.edges : [],
    },
    identityGraphSummary: {
      ...base.identityGraphSummary,
      ...(isPlainObject(profile.identityGraphSummary) ? profile.identityGraphSummary : {}),
    },
    legacyProfile: {
      ...base.legacyProfile,
      ...(isPlainObject(profile.legacyProfile) ? profile.legacyProfile : {}),
    },
  };
}

function ensureDefaultPolicyNode(nodes, policyNode) {
  if (nodes.some((node) => isPlainObject(node) && node.id === policyNode.id)) return nodes;
  return [policyNode, ...nodes];
}

function parseArgs(argv) {
  const args = {
    command: 'validate',
    outDir: process.env.WHYTREE_SYNC_OUT || DEFAULT_OUT_DIR,
    profilePath: null,
    evidencePath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--init' || arg === '--migrate' || arg === '--validate' || arg === '--summary') {
      args.command = arg.slice(2);
    } else if (arg === '--out') {
      args.outDir = requireValue(argv, ++i, '--out');
    } else if (arg === '--profile') {
      args.profilePath = requireValue(argv, ++i, '--profile');
    } else if (arg === '--evidence') {
      args.evidencePath = requireValue(argv, ++i, '--evidence');
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  args.profilePath ||= path.join(args.outDir, 'profile.json');
  args.evidencePath ||= path.join(args.outDir, 'evidence.jsonl');
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/identity-graph.mjs --init [--out <dir>]
  node scripts/identity-graph.mjs --migrate [--profile <profile.json>]
  node scripts/identity-graph.mjs --validate [--profile <profile.json>] [--evidence <evidence.jsonl>]
  node scripts/identity-graph.mjs --summary [--profile <profile.json>]`);
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value : '';
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'init' || args.command === 'migrate') {
    const result = await ensureProfileJsonV2(args.profilePath);
    console.log(JSON.stringify({ ok: true, changed: result.changed, profile: args.profilePath }, null, 2));
    return;
  }

  if (args.command === 'validate') {
    const errors = await validateFiles(args.profilePath, args.evidencePath);
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, profile: args.profilePath, evidence: args.evidencePath }, null, 2));
    return;
  }

  if (args.command === 'summary') {
    const profile = JSON.parse(await fs.readFile(args.profilePath, 'utf8'));
    const graph = profile.identityGraph || {};
    console.log(JSON.stringify({
      schemaVersion: profile.schemaVersion,
      nodes: Array.isArray(graph.nodes) ? graph.nodes.length : 0,
      edges: Array.isArray(graph.edges) ? graph.edges.length : 0,
      summary: profile.identityGraphSummary || {},
    }, null, 2));
    return;
  }

  throw new Error(`unsupported command: ${args.command}`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(`identity-graph: ${error.message}`);
    process.exit(1);
  });
}
