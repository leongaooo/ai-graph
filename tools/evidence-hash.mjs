import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [file, startArg, endArg] = process.argv.slice(2);
if (!file || !startArg || !endArg) {
  console.error('Usage: node tools/evidence-hash.mjs <article.mdx> <lineStart> <lineEnd>');
  process.exit(2);
}

const raw = readFileSync(resolve(file), 'utf8');
const lines = raw.split(/\r?\n/);
const lineStart = Number(startArg);
const lineEnd = Number(endArg);
if (!Number.isInteger(lineStart) || !Number.isInteger(lineEnd) || lineStart < 1 || lineEnd < lineStart || lineEnd > lines.length) {
  console.error(`Invalid line range: ${startArg}-${endArg}; file has ${lines.length} lines`);
  process.exit(2);
}

const sourceSha256 = createHash('sha256').update(raw).digest('hex');
const excerpt = lines.slice(lineStart - 1, lineEnd).join('\n');
const textHash = createHash('sha256').update(excerpt).digest('hex');

console.log(JSON.stringify({
  sourceSha256,
  lineStart,
  lineEnd,
  textHash,
  excerpt
}, null, 2));
