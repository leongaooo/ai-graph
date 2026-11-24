import { compileSpec } from './compile.mjs';
import { querySpec } from './query.mjs';
import { validateSpec } from './validate.mjs';

const [command, ...args] = process.argv.slice(2);

const usage = `用法：
  node tools/runtime/cli.mjs validate <spec.json>
  node tools/runtime/cli.mjs compile <spec.json> [outDir] [both|desktop|mobile]
  node tools/runtime/cli.mjs query <spec.json> <scene.json> <type> [ref|id|text]
`;

if (!command || command === '--help' || command === '-h') {
  console.error(usage);
  process.exit(command ? 0 : 2);
}

if (command === 'validate') {
  const specPath = args[0];
  if (!specPath) {
    console.error(usage);
    process.exit(2);
  }
  const result = validateSpec({ specPath });
  console.log(JSON.stringify({
    ok: result.ok,
    specId: result.specId,
    source: result.source,
    checks: result.checks,
    summary: result.summary,
    diagnostics: result.diagnostics,
    warnings: result.warnings
  }, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (command === 'compile') {
  const specPath = args[0];
  if (!specPath) {
    console.error(usage);
    process.exit(2);
  }
  const outDir = args[1] ?? 'out';
  const profile = args[2] ?? 'both';
  const result = compileSpec({ specPath, outDir, profile });
  const artifacts = result.artifacts
    ? Object.fromEntries(Object.entries(result.artifacts).map(([key, value]) => [key, {
      svg: value.svg,
      scene: value.scene,
      report: value.report,
      hash: value.hash,
      elementCount: value.elementCount,
      textOverflow: value.textOverflow,
      maxContentY: value.maxContentY
    }]))
    : undefined;
  console.log(JSON.stringify({
    ok: result.ok,
    specId: result.specId,
    grammar: result.grammar,
    source: result.source,
    artifacts,
    hashes: result.hashes,
    evidenceCounts: result.evidenceIndex
      ? { desktop: result.evidenceIndex.desktop.length, mobile: result.evidenceIndex.mobile.length }
      : undefined,
    diagnostics: result.diagnostics,
    warnings: result.warnings
  }, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (command === 'query') {
  const specPath = args[0];
  const scenePath = args[1];
  const type = args[2] ?? 'main_path';
  const value = args[3];
  if (!specPath) {
    console.error(usage);
    process.exit(2);
  }
  const query = { type };
  if (type === 'node_evidence') query.ref = value;
  if (type === 'reachable') query.from = value;
  if (type === 'element') query.id = value;
  if (type === 'acceptance') query.id = value;
  if (type === 'search') query.text = value;
  const result = querySpec({ specPath, scenePath, query });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

console.error(`未知命令：${command}\n${usage}`);
process.exit(2);
