#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WHYTREE_DIR = process.env.WHYTREE_SYNC_HOME || path.join(os.homedir(), '.whytree');
const OUT_DIR = process.env.WHYTREE_SYNC_OUT || path.join(
  os.homedir(),
  'Codes',
  'personal',
  'terry-obsidian',
  'vault',
  'Private',
  'Whytree',
);
const GENERATED_START = '<!-- whytree-sync:generated:start -->';
const GENERATED_END = '<!-- whytree-sync:generated:end -->';
const SESSION_DIR = path.join(OUT_DIR, 'sessions');
const PROFILE_MD = path.join(OUT_DIR, 'profile.md');
const PROFILE_JSON = path.join(OUT_DIR, 'profile.json');
const AGENT_BRIEF = path.join(OUT_DIR, 'agent-brief.md');
const EVIDENCE_JSONL = path.join(OUT_DIR, 'evidence.jsonl');
const NARRATIVE_SECTIONS = [
  '세션 요약',
  '새로 보인 자기 이해',
  '가치와 동기',
  '긴장/두려움/회피 패턴',
  '커리어와 삶의 의사결정 힌트',
  '다음까지 해볼 한 가지 (Experiment)',
  '미해결 질문',
  'Evidence',
  '메모',
];

function fail(message) {
  console.error(`whytree-sync: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { mode: 'current', slug: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--current') {
      args.mode = 'current';
    } else if (arg === '--all') {
      args.mode = 'all';
    } else if (arg === '--slug') {
      const slug = argv[++i];
      if (!slug) fail('--slug requires a value');
      args.mode = 'slug';
      args.slug = slug.replace(/\.json$/i, '');
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/whytree-sync.mjs [--current]
  node scripts/whytree-sync.mjs --slug <tree-slug>
  node scripts/whytree-sync.mjs --all

Environment:
  WHYTREE_SYNC_HOME  Override ~/.whytree for tests
  WHYTREE_SYNC_OUT   Override Terry's Obsidian Whytree memory directory for tests`);
}

async function readJson(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    fail(`cannot read tree: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`tree JSON is invalid: ${error.message}`);
  }
}

async function currentSlug() {
  try {
    return (await fs.readFile(path.join(WHYTREE_DIR, '.current'), 'utf8')).trim();
  } catch (error) {
    fail(`cannot read active tree marker: ${error.message}`);
  }
}

async function slugsFor(args) {
  if (args.mode === 'current') return [await currentSlug()];
  if (args.mode === 'slug') return [args.slug];

  const entries = await fs.readdir(WHYTREE_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name.slice(0, -'.json'.length))
    .sort();
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function nodesArray(tree) {
  if (!isPlainObject(tree.nodes)) return [];
  return Object.values(tree.nodes).filter(isPlainObject);
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function nodeLabel(node) {
  return typeof node?.label === 'string' && node.label.trim() ? node.label.trim() : '(빈 라벨)';
}

function alphaLabel(index) {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function renderTree(tree) {
  const nodes = isPlainObject(tree.nodes) ? tree.nodes : {};
  const seen = new Map();
  let letterIndex = 0;
  const lines = [];

  function renderNode(id, prefix) {
    const node = nodes[id];
    if (!node) return;

    if (seen.has(id)) {
      lines.push(`${prefix}-> ${seen.get(id)}. ${nodeLabel(node)} (see above)`);
      return;
    }

    const label = alphaLabel(letterIndex++);
    seen.set(id, label);
    const childIds = safeArray(node.childIds).filter((childId) => nodes[childId]);
    const convergenceMark = childIds.length >= 2 ? ' *' : '';
    lines.push(`${prefix}* ${label}. ${nodeLabel(node)}${convergenceMark}`);

    for (let i = 0; i < childIds.length; i++) {
      const childPrefix = `${prefix}${i === childIds.length - 1 ? '   ' : '|  '}`;
      renderNode(childIds[i], childPrefix);
    }
  }

  const rootIds = safeArray(tree.rootIds).filter((id) => nodes[id]);
  const roots = rootIds.length > 0 ? rootIds : nodesArray(tree)
    .filter((node) => safeArray(node.parentIds).length === 0)
    .map((node) => node.id)
    .filter((id) => typeof id === 'string');

  lines.push(`  ${tree.name || 'Why Tree'}`);
  lines.push('');
  for (let i = 0; i < roots.length; i++) {
    renderNode(roots[i], '  ');
  }
  if (roots.length === 0) lines.push('  (아직 기록된 노드가 없습니다.)');
  return lines.join('\n');
}

function kstParts(date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { year: parts.year, month: parts.month, day: parts.day };
}

function ymdKst(date) {
  const parts = kstParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function yymmddKst(date) {
  const parts = kstParts(date);
  return `${parts.year.slice(2)}${parts.month}${parts.day}`;
}

function dateForMode(tree, mode) {
  if (mode === 'current') return new Date();
  const source = typeof tree.updatedAt === 'string' ? tree.updatedAt : tree.createdAt;
  const date = source ? new Date(source) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function yamlString(value) {
  const str = value == null ? '' : String(value);
  return JSON.stringify(str);
}

function frontmatter(tree, slug, sessionDate) {
  const allNodes = nodesArray(tree);
  const purpose = typeof tree.purpose === 'string' ? tree.purpose.trim() : '';
  const experiment = experimentLabel(tree);
  const updatedAt = typeof tree.updatedAt === 'string' ? tree.updatedAt : '';

  return [
    '---',
    'type: whytree-session',
    'visibility: private',
    `session_date: ${sessionDate}`,
    `tree_slug: ${yamlString(slug)}`,
    `tree_name: ${yamlString(tree.name || slug)}`,
    `source_json_updated_at: ${yamlString(updatedAt)}`,
    `node_count: ${allNodes.length}`,
    `root_count: ${safeArray(tree.rootIds).length}`,
    `seed_count: ${safeArray(tree.seedIds).length}`,
    `purpose_sentence: ${yamlString(purpose)}`,
    `experiment: ${yamlString(experiment)}`,
    'key_concepts: []',
    '---',
  ].join('\n');
}

function experimentLabel(tree) {
  const id = typeof tree.lastExperimentId === 'string' ? tree.lastExperimentId : null;
  if (!id || !isPlainObject(tree.nodes) || !isPlainObject(tree.nodes[id])) return '';
  return nodeLabel(tree.nodes[id]);
}

function purposeBody(tree) {
  const purpose = typeof tree.purpose === 'string' ? tree.purpose.trim() : '';
  if (purpose) return purpose;
  return '아직 확정된 purpose 문장이 없습니다.';
}

function generatedBody(tree) {
  const title = tree.name || 'Why Tree';
  return [
    GENERATED_START,
    `# ${title}`,
    '',
    '## Purpose',
    '',
    purposeBody(tree),
    '',
    '## 트리 시각화',
    '',
    '```text',
    renderTree(tree),
    '```',
    GENERATED_END,
  ].join('\n');
}

function defaultSectionContent(section, tree) {
  if (section === '다음까지 해볼 한 가지 (Experiment)') {
    const experiment = experimentLabel(tree);
    return experiment ? `- ${experiment}` : '- 아직 기록된 실험이 없습니다.';
  }
  if (section === 'Evidence') {
    return '- 이번 세션에서 추가한 evidence ID를 여기에 적는다. 예: `wt-YYYYMMDD-001`';
  }
  if (section === '미해결 질문') return '- 다음 세션에서 이어서 확인한다.';
  return '- ';
}

function extractNarrative(existing) {
  const preserved = new Map();
  if (!existing) return preserved;

  const escaped = NARRATIVE_SECTIONS.map(escapeRegExp).join('|');
  const headingRe = new RegExp(`^## (${escaped})\\s*$`, 'gm');
  const matches = [...existing.matchAll(headingRe)];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const section = match[1];
    const contentStart = match.index + match[0].length;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : existing.length;
    const content = existing.slice(contentStart, contentEnd).replace(/^\n+|\s+$/g, '');
    if (content && content !== '-') preserved.set(section, content);
  }
  return preserved;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function narrativeBody(existing, tree) {
  const preserved = extractNarrative(existing);
  const lines = [];
  for (const section of NARRATIVE_SECTIONS) {
    const content = preserved.get(section) || defaultSectionContent(section, tree);
    lines.push(`## ${section}`, '', content, '');
  }
  return lines.join('\n').trimEnd();
}

function renderMarkdown(tree, slug, sessionDate, existing) {
  return [
    frontmatter(tree, slug, sessionDate),
    generatedBody(tree),
    '',
    narrativeBody(existing, tree),
    '',
  ].join('\n');
}

async function readExistingNote(outPath) {
  try {
    return await fs.readFile(outPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

function outputPath(slug, date) {
  return path.join(SESSION_DIR, `${yymmddKst(date)}-${slug}.md`);
}

async function writeIfMissing(filePath, content) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.writeFile(filePath, content, 'utf8');
  }
}

function profileMarkdownTemplate() {
  return `# Terry Whytree Profile

> Local-only private memory. Do not commit or publish this file.

## Terry brief

-

## Personality / persona

-

## Core values and life direction

-

## Career decision principles

-

## Inner tensions, fears, and avoidance patterns

-

## Work style and collaboration preferences

-

## Live experiments

-

## Open questions

-

## Evidence index

- Evidence lives in \`evidence.jsonl\`; cite IDs here when a profile claim depends on a specific session.
`;
}

function agentBriefTemplate() {
  return `# Terry Agent Brief

> Local-only private briefing for future AI agents. Do not commit or publish this file.

## Before helping Terry

-

## How Terry tends to think and decide

-

## What to respect

-

## Current direction

-

## Useful context links

- Whytree profile: [[profile]]
- Whytree sessions: [[sessions]]
`;
}

function profileJsonTemplate() {
  return `${JSON.stringify({
    schemaVersion: 1,
    updatedAt: '',
    terryBrief: '',
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
  }, null, 2)}\n`;
}

async function ensureMemoryPack() {
  await fs.mkdir(SESSION_DIR, { recursive: true });
  await writeIfMissing(PROFILE_MD, profileMarkdownTemplate());
  await writeIfMissing(PROFILE_JSON, profileJsonTemplate());
  await writeIfMissing(AGENT_BRIEF, agentBriefTemplate());
  await writeIfMissing(EVIDENCE_JSONL, '');
}

async function syncSlug(slug, mode) {
  await ensureMemoryPack();
  const treePath = path.join(WHYTREE_DIR, `${slug}.json`);
  const tree = await readJson(treePath);
  const date = dateForMode(tree, mode);
  const sessionDate = ymdKst(date);
  const outPath = outputPath(slug, date);
  const existing = await readExistingNote(outPath);
  const markdown = renderMarkdown(tree, slug, sessionDate, existing);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, markdown, 'utf8');
  return path.relative(REPO_ROOT, outPath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slugs = await slugsFor(args);
  if (slugs.length === 0) fail('no whytree JSON files found');

  const written = [];
  for (const slug of slugs) {
    written.push(await syncSlug(slug, args.mode));
  }

  console.log(JSON.stringify({
    ok: true,
    written,
    memoryPack: {
      sessionDir: path.relative(REPO_ROOT, SESSION_DIR),
      profile: path.relative(REPO_ROOT, PROFILE_MD),
      profileJson: path.relative(REPO_ROOT, PROFILE_JSON),
      agentBrief: path.relative(REPO_ROOT, AGENT_BRIEF),
      evidence: path.relative(REPO_ROOT, EVIDENCE_JSONL),
    },
  }, null, 2));
}

main().catch((error) => fail(error.stack || error.message));
