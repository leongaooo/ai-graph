import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSpec } from '../../tools/runtime/validate.mjs';

const demoDir = fileURLToPath(new URL('.', import.meta.url));
const spec = JSON.parse(readFileSync(resolve(demoDir, 'spec.json'), 'utf8'));
const texts = spec.sources.map(source => readFileSync(resolve(demoDir, source.uri), 'utf8'));

const baseline = validateSpec({ spec, baseDir: demoDir, sourceTexts: texts });
if (!baseline.ok) {
  console.error('基准 spec 未通过，无法做 stale 验证');
  console.error(JSON.stringify(baseline.diagnostics, null, 2));
  process.exit(1);
}

const changed = texts[0].replace(
  '可视化大屏的价值，不在于它有多酷，而在于它能不能让重要信息被及时看见。',
  '可视化大屏的价值，主要在于它有多酷，而不在于信息是否被及时看见。'
);
if (changed === texts[0]) throw new Error('没有找到可替换的大屏结论行');

const mutatedTexts = [changed, texts[1], texts[2]];
const result = validateSpec({ spec, baseDir: demoDir, sourceTexts: mutatedTexts });
const rules = result.diagnostics.map(item => item.rule);
const staleEvidence = result.diagnostics.filter(item => item.rule === 'supportedEvidence').map(item => item.ref);
const expected = rules.includes('sourceSha256') && staleEvidence.includes('e-dash-conclusion');

console.log(JSON.stringify({
  baselineOk: baseline.ok,
  mutatedOk: result.ok,
  rules,
  staleEvidence,
  expectedFailure: expected,
  diagnostics: result.diagnostics.map(item => ({ rule: item.rule, path: item.path, ref: item.ref }))
}, null, 2));

if (result.ok || !expected) {
  console.error('来源更新后旧主张没有失效，验收不通过');
  process.exit(1);
}
