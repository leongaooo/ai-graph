import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const [specArg, sourceArg] = process.argv.slice(2);
if (!specArg) {
  console.error('用法：node tools/demo/fill-hashes.mjs <spec.json> [source.txt]');
  process.exit(2);
}

const specPath = resolve(specArg);
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');

const entries = Array.isArray(spec.sources)
  ? spec.sources.map(source => ({ source, locators: source.locators ?? [] }))
  : [{ source: spec.source, locators: spec.evidence ?? [] }];

if (!entries.length || entries.some(item => !item.source || !Array.isArray(item.locators))) {
  console.error('spec 必须包含 sources[].locators 或 source + evidence');
  process.exit(2);
}

if (sourceArg && entries.length > 1) {
  console.error('多来源 spec 不需要额外 source 参数；按 sources[].uri 逐个回填');
  process.exit(2);
}

const baseDir = dirname(specPath);
const results = [];
for (const [index, entry] of entries.entries()) {
  const source = entry.source;
  const sourcePath = sourceArg
    ? resolve(sourceArg)
    : resolve(baseDir, isAbsolute(source.uri ?? '') ? source.uri : (source.uri ?? ''));
  const sourceText = readFileSync(sourcePath, 'utf8');
  const lines = sourceText.split(/\r?\n/u);
  const sha256 = hash(sourceText);

  source.sha256 = sha256;
  for (const locator of entry.locators) {
    const start = Number(locator.lineStart);
    const end = Number(locator.lineEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > lines.length) {
      console.error(`非法行号：sources[${index}] ${locator.id} ${locator.lineStart}-${locator.lineEnd} / 共 ${lines.length} 行`);
      process.exit(1);
    }
    const excerpt = lines.slice(start - 1, end).join('\n');
    locator.textHash = hash(excerpt);
    locator.excerpt = excerpt;
  }

  results.push({ source: source.id ?? `source-${index + 1}`, path: sourcePath, sourceSha256: sha256, sourceLines: lines.length, locators: entry.locators.length });
}

writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
console.log(JSON.stringify({ spec: specPath, sources: results }, null, 2));
