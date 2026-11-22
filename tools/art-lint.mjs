import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultArt, defaultOut, renderScene, sha1 } from './build-scene.mjs';
import { canvas, layers, num, palette, weights } from './lib/ink.mjs';

function lint(artPath, outDir) {
  const artSource = readFileSync(artPath, 'utf8');
  const first = renderScene(JSON.parse(artSource));
  const second = renderScene(JSON.parse(artSource));
  const { scene } = first;
  const svg = readFileSync(join(outDir, scene.svg.file), 'utf8');
  const bytes = Buffer.byteLength(svg);
  const digest = sha1(svg);
  const colors = [...new Set([...svg.matchAll(/\b(?:fill|stroke)="(#[0-9a-f]+)"/gi)].map(match => match[1].toUpperCase()))].sort();
  const allowed = new Set(Object.values(palette));
  const area = canvas.width * canvas.height;
  const { metrics } = scene;
  const inside = ([left, top, right, bottom]) => left >= canvas.safe && top >= canvas.safe && right <= canvas.width - canvas.safe && bottom <= canvas.height - canvas.safe;
  const overflow = metrics.text.filter(line => !inside(line.box) || line.box[2] - line.box[0] > line.width + 0.01 || Array.from(line.text).length > line.maxChars);
  const outsideLayers = Object.entries(metrics.layerBounds).filter(([, box]) => !inside(box)).map(([name]) => name);
  const focusOffset = Math.hypot(...scene.focus.screen.map((value, axis) => value - scene.focus.thirdsAnchor[axis]));
  const ratio = value => num(value / area * 100);
  const inkWidths = [...new Set([...svg.matchAll(/\b(?:stroke-width|data-pen)="([0-9.]+)"/g)].map(match => Number(match[1])))];
  const grain = svg.match(/filter="url\(#paper-grain\)" opacity="([0-9.]+)"/);
  const checks = {
    bytes: bytes <= 80000,
    colors: colors.length === allowed.size && colors.every(color => allowed.has(color)),
    texture: metrics.textureArea / area <= 0.12 && (svg.match(/<pattern\b/g) ?? []).length === 1 && /id="dot45"[^>]*width="7" height="7" patternTransform="rotate\(45\)"/.test(svg) && (svg.match(/<feTurbulence\b/g) ?? []).length === 1 && !!grain && Number(grain[1]) <= 0.04,
    amber: metrics.amberArea / area <= 0.06,
    text: overflow.length === 0 && metrics.text.filter(line => line.kind === 'title').every(line => line.maxChars <= 12),
    subject: metrics.subjectArea / area >= 0.20 && metrics.subjectArea / area <= 0.55,
    safe: outsideLayers.length === 0,
    focus: focusOffset <= 60,
    layers: [...svg.matchAll(/<g id="([^"]+)"/g)].map(match => match[1]).join() === layers.join(),
    weights: inkWidths.length === weights.length && weights.every(weight => inkWidths.includes(weight)),
    noExternalAssets: !/<(?:image|foreignObject)\b|\bhref\s*=|@font-face/i.test(svg),
    noTemplate: !svg.includes('{{slot:'),
    deterministic: first.scene.svg.sha1 === second.scene.svg.sha1 && digest === first.scene.svg.sha1,
    sceneRecord: readFileSync(join(outDir, `${scene.id}.scene.json`), 'utf8') === `${JSON.stringify(scene, null, 2)}\n`,
  };
  return { ok: Object.values(checks).every(Boolean), id: scene.id, checks, bytes, colorCount: colors.length, colors,
    texturePercent: ratio(metrics.textureArea), amberPercent: ratio(metrics.amberArea), subjectPercent: ratio(metrics.subjectArea),
    subjectBounds: metrics.subjectBounds, focus: scene.focus.screen, focusAnchorDistance: num(focusOffset), textOverflow: overflow,
    outsideLayers, sha1: { file: digest, first: first.scene.svg.sha1, second: second.scene.svg.sha1 } };
}

const jsonOnly = process.argv.includes('--json');
const [artPath = defaultArt, outDir = defaultOut] = process.argv.slice(2).filter(arg => arg !== '--json');
let report;
try {
  report = lint(artPath, outDir);
} catch (error) {
  report = { ok: false, error: error.message };
}
console.log(JSON.stringify(report, null, 2));
if (!jsonOnly) {
  const summary = report.error ?? `大小 ${report.bytes} B｜色数 ${report.colorCount}｜半调覆盖 ${report.texturePercent}%｜主体包围盒 ${report.subjectPercent}%｜焦点 (${report.focus.join(', ')})｜文字溢出 ${report.textOverflow.length} 处｜琥珀 ${report.amberPercent}%`;
  console.log(`插画验收${report.ok ? '通过' : '失败'}：${summary}`);
  if (!report.ok && report.checks) console.log(`未通过：${Object.keys(report.checks).filter(check => !report.checks[check]).join('、')}`);
}
if (!report.ok) process.exitCode = 1;
