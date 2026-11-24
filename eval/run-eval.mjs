import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateSpec } from '../tools/runtime/validate.mjs';
import { compileSpec } from '../tools/runtime/compile.mjs';

const root = process.cwd();
const fixtureDir = resolve(root, 'eval/fixtures');
const expectedDir = resolve(root, 'eval/expected');
const reportDir = resolve(root, 'eval/reports');
const baseSources = {
  pr: resolve(root, 'demos/pr-change/sources/pr.diff'),
  incident: resolve(root, 'demos/incident-state/sources/incident-case.txt')
};

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));

function setPath(target, path, value) {
  let cursor = target;
  for (const key of path.slice(0, -1)) cursor = cursor[key];
  cursor[path.at(-1)] = value;
}

function appendPath(target, path, value) {
  let cursor = target;
  for (const key of path) cursor = cursor[key];
  cursor.push(value);
}

function rehashSource(spec, sourceText) {
  const sha256 = value => createHash('sha256').update(value).digest('hex');
  const lines = sourceText.split(/\r?\n/u);
  for (const source of spec.sources ?? []) {
    source.sha256 = sha256(sourceText);
    for (const locator of source.locators ?? []) {
      const excerpt = lines.slice(locator.lineStart - 1, locator.lineEnd).join('\n');
      locator.textHash = sha256(excerpt);
      locator.excerpt = excerpt;
    }
  }
}

function applyRepair(spec, sourceText, operations) {
  const repaired = clone(spec);
  let text = sourceText;
  for (const operation of operations) {
    if (operation.op === 'rehash-source') {
      rehashSource(repaired, text);
    } else if (operation.op === 'set') {
      setPath(repaired, operation.path, operation.value);
    } else if (operation.op === 'append') {
      appendPath(repaired, operation.path, operation.value);
    } else {
      throw new Error(`未知 repair op：${operation.op}`);
    }
  }
  return { spec: repaired, sourceText: text };
}

function matchesExpectation(result, expected) {
  if (expected.ok) return result.ok === true;
  if (result.ok) return false;
  return result.diagnostics.some(item => {
    if (item.rule !== expected.rule) return false;
    if (expected.path && item.path !== expected.path) return false;
    if (expected.ref && item.ref !== expected.ref) return false;
    return true;
  });
}

function summarizeFailure(result, expected) {
  return {
    expected,
    ok: result.ok,
    diagnostics: result.diagnostics.map(item => ({ rule: item.rule, path: item.path, ref: item.ref, message: item.message })).slice(0, 8)
  };
}

const rows = [];
const categories = new Map();

for (const file of readdirSync(fixtureDir).filter(name => name.endsWith('.json')).sort()) {
  const id = file.replace(/\.json$/u, '');
  const spec = readJson(join(fixtureDir, file));
  const expected = readJson(join(expectedDir, file));
  const base = expected.base ?? 'pr';
  let sourceText = readFileSync(baseSources[base], 'utf8');
  if (expected.source_mutation?.op === 'append') sourceText += expected.source_mutation.value;

  const started = Date.now();
  const first = validateSpec({ spec, sourceText });
  const firstMatched = matchesExpectation(first, expected.expect ?? expected);
  const firstExpected = expected.expect ?? expected;

  let compile = null;
  if (firstExpected.ok) {
    const outDir = mkdtempSync(join(tmpdir(), `ai-graph-eval-${id}-`));
    try {
      compile = compileSpec({ spec, sourceText, outDir, profile: 'desktop' });
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }

  let repair = { attempted: false, ok: null };
  if (!firstExpected.ok && Array.isArray(expected.repair) && expected.repair.length > 0) {
    const repaired = applyRepair(spec, sourceText, expected.repair);
    const second = validateSpec({ spec: repaired.spec, sourceText: repaired.sourceText });
    repair = { attempted: true, ok: second.ok, diagnostics: second.ok ? [] : second.diagnostics.map(item => ({ rule: item.rule, path: item.path })) };
  }

  const passed = firstMatched && (!firstExpected.ok || compile?.ok === true);
  const category = expected.category ?? 'uncategorized';
  if (!categories.has(category)) categories.set(category, { total: 0, passed: 0 });
  categories.get(category).total += 1;
  if (passed) categories.get(category).passed += 1;

  rows.push({
    id,
    category,
    passed,
    firstOk: first.ok,
    expected: firstExpected,
    matched: firstMatched,
    compileOk: compile ? compile.ok : null,
    compileHashes: compile?.hashes ?? null,
    repair,
    durationMs: Date.now() - started,
    failure: passed ? null : summarizeFailure(first, firstExpected)
  });
}

const total = rows.length;
const passed = rows.filter(row => row.passed).length;
const failing = rows.filter(row => !row.passed);
const repairEligible = rows.filter(row => row.repair.attempted).length;
const repaired = rows.filter(row => row.repair.attempted && row.repair.ok).length;
const noSource = rows.filter(row => row.expected.rule === 'supportedEvidence' && /^(entities|relations|claims)\[/u.test(row.expected.path ?? ''));
const stale = rows.filter(row => row.category === 'stale-source');

const report = {
  generatedAt: new Date().toISOString(),
  total,
  passed,
  failed: total - passed,
  passRate: total ? passed / total : 0,
  categories: Object.fromEntries([...categories.entries()].map(([key, value]) => [key, { ...value, passRate: value.total ? value.passed / value.total : 0 }])),
  capture: {
    noSourceSupported: { total: noSource.length, captured: noSource.filter(row => row.matched).length },
    staleSource: { total: stale.length, rejected: stale.filter(row => row.matched).length }
  },
  repair: {
    harness: 'deterministic patch harness (not an LLM)',
    eligible: repairEligible,
    repaired,
    rate: repairEligible ? repaired / repairEligible : 0,
    maxCalls: 2
  },
  rows,
  failures: failing.map(row => ({ id: row.id, category: row.category, expected: row.expected, actual: row.failure }))
};

mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(reportDir, 'latest.md'), `# Eval Report\n\n- Total: ${total}\n- Passed: ${passed}\n- Failed: ${total - passed}\n- No-source supported captured: ${report.capture.noSourceSupported.captured}/${report.capture.noSourceSupported.total}\n- Stale source rejected: ${report.capture.staleSource.rejected}/${report.capture.staleSource.total}\n- Deterministic repair: ${repaired}/${repairEligible} (${(report.repair.rate * 100).toFixed(1)}%)\n\n${[...categories.entries()].map(([key, value]) => `- ${key}: ${value.passed}/${value.total}`).join('\n')}\n`);

console.log(JSON.stringify({
  total,
  passed,
  failed: total - passed,
  passRate: report.passRate,
  capture: report.capture,
  repair: report.repair,
  categories: report.categories,
  failures: report.failures.map(item => item.id)
}, null, 2));

if (passed !== total) process.exitCode = 1;
