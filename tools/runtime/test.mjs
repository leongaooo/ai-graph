import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSpec } from './compile.mjs';
import { querySpec } from './query.mjs';
import { validateSpec } from './validate.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const art = name => resolve(root, 'art', name);
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed++;
    failures.push({ name, message: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

const sequencePath = art('agent-delivery-gate.visual.json');
const statePath = art('automation-equipment-state.visual.json');
const sequence = readJson(sequencePath);
const state = readJson(statePath);
const outDir = mkdtempSync(join(tmpdir(), 'ai-graph-runtime-test-'));

test('sequence validate 12/12', () => {
  const result = validateSpec({ specPath: sequencePath });
  assert(result.ok, `validate 失败：${JSON.stringify(result.diagnostics)}`);
  assert(Object.values(result.checks).every(Boolean), '存在未通过的门禁');
  assert(result.summary.evidence === 12, `evidence=${result.summary.evidence}`);
  assert(result.summary.entities === 10, `entities=${result.summary.entities}`);
});

test('state validate 12/12', () => {
  const result = validateSpec({ specPath: statePath });
  assert(result.ok, `validate 失败：${JSON.stringify(result.diagnostics)}`);
  assert(Object.values(result.checks).every(Boolean), '存在未通过的门禁');
  assert(result.summary.evidence === 14, `evidence=${result.summary.evidence}`);
  assert(result.summary.entities === 27, `entities=${result.summary.entities}`);
});

test('sequence compile deterministic hashes', () => {
  const result = compileSpec({ specPath: sequencePath, outDir });
  assert(result.ok, `compile 失败：${JSON.stringify(result.diagnostics)}`);
  assert(result.artifacts.desktop.hash === '36e384c361264a07b8b95072d9309c87733ae0b7', `desktop hash=${result.artifacts.desktop.hash}`);
  assert(result.hashes.desktop === result.artifacts.desktop.hash, 'top-level desktop hash 不一致');
  assert(result.artifacts.mobile.hash === '721ede46ab7eb5c04fca3157c34665ad36d1b3af', `mobile hash=${result.artifacts.mobile.hash}`);
  assert(result.artifacts.desktop.textOverflow === 0, '桌面文字越界');
  assert(result.artifacts.mobile.textOverflow === 0, '移动文字越界');
});

test('state compile deterministic hashes', () => {
  const result = compileSpec({ specPath: statePath, outDir });
  assert(result.ok, `compile 失败：${JSON.stringify(result.diagnostics)}`);
  assert(result.artifacts.desktop.hash === 'fffc6aa607e6943d061eb72045f1eb33c309135b', `desktop hash=${result.artifacts.desktop.hash}`);
  assert(result.artifacts.mobile.hash === '77e51e57637f3f2a5b4a4385e6f2b4c4cd4b5061', `mobile hash=${result.artifacts.mobile.hash}`);
  assert(result.artifacts.mobile.maxContentY <= 860, `mobile maxContentY=${result.artifacts.mobile.maxContentY}`);
});

test('sequence main path uses view.order', () => {
  const result = querySpec({ specPath: sequencePath, scenePath: join(outDir, 'agent-delivery-gate.scene.json'), query: { type: 'main_path' } });
  assert(result.ok, 'query 失败');
  assert(result.answer.kind === 'sequence-view-order', `kind=${result.answer.kind}`);
  assert(result.answer.nodes.map(node => node.id).join(' → ') === 'reader-browser → dynamic-gate → app → reverse-proxy → systemd-service → tokens', JSON.stringify(result.answer.nodes));
});

test('state main path uses loop steps and feedback', () => {
  const result = querySpec({ specPath: statePath, scenePath: join(outDir, 'automation-equipment-state.scene.json'), query: { type: 'main_path' } });
  assert(result.ok, 'query 失败');
  assert(result.answer.kind === 'state-loop', `kind=${result.answer.kind}`);
  assert(result.answer.nodes.length === 6, `steps=${result.answer.nodes.length}`);
  assert(result.answer.feedback?.ref === 'r-loop-6', JSON.stringify(result.answer.feedback));
});

test('query unknown edges and node evidence', () => {
  const unknown = querySpec({ specPath: sequencePath, scenePath: join(outDir, 'agent-delivery-gate.scene.json'), query: { type: 'unknown_edges' } });
  assert(unknown.ok, 'unknown_edges 失败');
  assert(unknown.answer.relations.length >= 1, '没有 unknown 关系');
  const evidence = querySpec({ specPath: sequencePath, scenePath: join(outDir, 'agent-delivery-gate.scene.json'), query: { type: 'node_evidence', ref: 'reverse-proxy' } });
  assert(evidence.ok, 'node_evidence 失败');
  assert(evidence.answer.evidence.length === 2, `evidence=${evidence.answer.evidence.length}`);
  assert(evidence.answer.unanswerable === undefined, '不应 unanswerable');
});

test('query acceptance maps viewElementId', () => {
  const result = querySpec({ specPath: sequencePath, scenePath: join(outDir, 'agent-delivery-gate.scene.json'), query: { type: 'acceptance', id: 'q2' } });
  assert(result.ok, 'acceptance 失败');
  const ids = result.answer.elements.map(element => element.viewElementId);
  assert(ids.includes('edge-r-body-fail'), `viewElementIds=${ids.join(',')}`);
  assert(ids.includes('node-proxy-failure'), `viewElementIds=${ids.join(',')}`);
});

test('multi-source validate keeps 3 sources', () => {
  const researchPath = resolve(root, 'demos/research-claims/spec.json');
  const result = validateSpec({ specPath: researchPath });
  assert(result.ok, `validate 失败：${JSON.stringify(result.diagnostics)}`);
  assert(Array.isArray(result.sources) && result.sources.length === 3, `sources=${JSON.stringify(result.sources)}`);
  assert(result.summary.evidence === 18, `evidence=${result.summary.evidence}`);
});

test('multi-source compile deterministic hash', () => {
  const researchPath = resolve(root, 'demos/research-claims/spec.json');
  const result = compileSpec({ specPath: researchPath, outDir, profile: 'desktop' });
  assert(result.ok, `compile 失败：${JSON.stringify(result.diagnostics)}`);
  assert(result.artifacts.desktop.hash === '0c026bc6bf336579d1ad1270927e0849416ca1a6', `desktop hash=${result.artifacts.desktop.hash}`);
  assert(Array.isArray(result.sources) && result.sources.length === 3, `sources=${JSON.stringify(result.sources)}`);
});

test('negative: evidence textHash mismatch', () => {
  const bad = clone(sequence);
  bad.evidence[0].textHash = '0'.repeat(64);
  const result = validateSpec({ spec: bad, baseDir: root });
  assert(!result.ok, '应当失败');
  assert(result.diagnostics.some(item => item.rule === 'supportedEvidence'), JSON.stringify(result.diagnostics));
  assert(result.diagnostics.some(item => item.ref === 'e-title'), JSON.stringify(result.diagnostics));
});

test('negative: unsupported grammar', () => {
  const bad = clone(sequence);
  bad.view.grammar = 'hierarchy';
  const result = validateSpec({ spec: bad, baseDir: root });
  assert(!result.ok, '应当失败');
  assert(result.diagnostics.some(item => item.rule === 'grammarSupported'), JSON.stringify(result.diagnostics));
});

test('negative: unknown solid line', () => {
  const bad = clone(state);
  bad.unknowns[0].lineStyle = 'solid';
  const result = validateSpec({ spec: bad, baseDir: root });
  assert(!result.ok, '应当失败');
  assert(result.diagnostics.some(item => item.rule === 'unknownNotSolid'), JSON.stringify(result.diagnostics));
});

test('negative: state element missing', () => {
  const bad = clone(state);
  bad.view.elements = bad.view.elements.filter(element => element.id !== 'state-fault');
  const result = validateSpec({ spec: bad, baseDir: root });
  assert(!result.ok, '应当失败');
  assert(result.diagnostics.some(item => item.rule === 'stateLayoutRefs'), JSON.stringify(result.diagnostics));
});

test('negative: stale source hash', () => {
  const bad = clone(sequence);
  bad.source.sha256 = '0'.repeat(64);
  const result = validateSpec({ spec: bad, baseDir: root });
  assert(!result.ok, '应当失败');
  assert(result.diagnostics.some(item => item.rule === 'sourceSha256'), JSON.stringify(result.diagnostics));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  for (const failure of failures) console.log(`- ${failure.name}: ${failure.message}`);
  rmSync(outDir, { recursive: true, force: true });
  process.exit(1);
}
rmSync(outDir, { recursive: true, force: true });
