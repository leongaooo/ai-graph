import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSpec } from '../../tools/runtime/validate.mjs';

const demoDir = fileURLToPath(new URL('.', import.meta.url));
const spec = JSON.parse(readFileSync(resolve(demoDir, 'spec.json'), 'utf8'));
const source = readFileSync(resolve(demoDir, 'sources/incident-case.txt'), 'utf8');

const normal = validateSpec({ spec, baseDir: demoDir, sourceText: source });
if (!normal.ok) {
  console.error('基准 spec 未通过，无法做降级验证');
  console.error(JSON.stringify(normal.diagnostics, null, 2));
  process.exit(1);
}

const lines = source.split(/\r?\n/u);
const recoveryLine = lines.findIndex(line => line.includes('health_probe status=200') && line.includes('13:45:48.564Z'));
if (recoveryLine < 0) throw new Error('找不到恢复探测日志行');
const mutated = [...lines.slice(0, recoveryLine), ...lines.slice(recoveryLine + 1)].join('\n');

const result = validateSpec({ spec, baseDir: demoDir, sourceText: mutated });
const rules = result.diagnostics.map(item => item.rule);
const expected = rules.includes('sourceSha256') || rules.includes('supportedEvidence');

console.log(JSON.stringify({
  baselineOk: normal.ok,
  removedLine: lines[recoveryLine],
  mutatedOk: result.ok,
  rules,
  expectedFailure: expected,
  diagnostics: result.diagnostics.map(item => ({ rule: item.rule, path: item.path, ref: item.ref, repairHint: item.repairHint }))
}, null, 2));

if (result.ok || !expected) {
  console.error('删除恢复日志后没有失败，验收不通过');
  process.exit(1);
}
