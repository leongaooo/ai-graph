import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lintVisualSpec } from './visual-spec-lint.mjs';
import { buildState } from './lib/state-layout.mjs';
import { buildSequence } from './lib/sequence-layout.mjs';
import { canvas, esc, layout, palette, paper, typeBlock } from './lib/ink.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const defaultArt = join(root, 'art/agent-delivery-gate.visual.json');
export const defaultOut = join(root, 'out');
const layers = ['paper', 'grid', 'env', 'subject', 'prop', 'type', 'texture'];
const sha1 = value => createHash('sha1').update(value).digest('hex');
const num = value => Number(value.toFixed(2));
const screenPoint = (x, y) => [x, 0, -y];
const screenCoords = ([x, y]) => `${num(x)} ${num(y)}`;

function rect(x, y, width, height) {
  return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

function rect3d(x, y, width, height) {
  return rect(x, y, width, height).map(([px, py]) => screenPoint(px, py));
}

function contrastRatio(foreground, background) {
  const channel = value => {
    const normalized = parseInt(value, 16) / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance = color => 0.2126 * channel(color.slice(1, 3)) + 0.7152 * channel(color.slice(3, 5)) + 0.0722 * channel(color.slice(5, 7));
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return num((light + 0.05) / (dark + 0.05));
}

function semanticStatus(spec, ref) {
  for (const collection of ['entities', 'relations', 'claims', 'unknowns', 'inferences', 'metrics']) {
    const item = (spec[collection] ?? []).find(entry => entry.id === ref);
    if (item) return collection === 'unknowns' ? 'unknown' : collection === 'inferences' ? 'inferred' : item.status ?? 'supported';
  }
  throw new Error(`找不到语义引用：${ref}`);
}

function render(art, outDir, semanticReport) {
  const draw = layout({ origin: [0, 0], angles: [0, 0] }, art.seed);
  const stock = paper(art.seed);
  const semanticIds = new Set([
    ...(art.entities ?? []), ...(art.relations ?? []), ...(art.claims ?? []),
    ...(art.unknowns ?? []), ...(art.inferences ?? []), ...(art.metrics ?? [])
  ].map(item => item.id));
  const elements = [];

  const addElement = ({ id, ref, kind, bbox, status = semanticStatus(art, ref), lineStyle = 'solid', label }) => {
    if (!semanticIds.has(ref)) throw new Error(`元素引用不存在：${ref}`);
    elements.push({ id, ref, kind, status, lineStyle, bbox: bbox.map(num), ...(label ? { label } : {}) });
  };

  const emitRect = ({ x, y, width, height, fill, stroke = 'none', strokeWidth = 0, dash = '', radius = 0, dataRef, status = 'supported', role }) => {
    draw.emit(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ''} data-ref="${esc(dataRef)}" data-status="${esc(status)}"${role ? ` data-role="${esc(role)}"` : ''}/>`);
  };

  const emitLine = ({ points, color, width = 1.4, dash = '', dataRef, status = 'supported', role = 'edge' }) => {
    const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${screenCoords(point)}`).join('');
    draw.emit(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''} data-ref="${esc(dataRef)}" data-status="${esc(status)}" data-role="${esc(role)}"/>`);
  };

  const arrowHead = ({ x, y, dataRef, status = 'supported', color = palette.teal }) => {
    draw.layer('subject');
    draw.poly([screenPoint(x, y), screenPoint(x - 10, y - 5), screenPoint(x - 10, y + 5)], { fill: color, dataRef, status, role: 'arrowhead' });
    draw.line(screenPoint(x, y), screenPoint(x - 8, y - 4), { color, width: 0.7, dataRef, status, role: 'arrowhead' });
    draw.line(screenPoint(x, y), screenPoint(x - 8, y + 4), { color, width: 0.7, dataRef, status, role: 'arrowhead' });
  };

  const horizontalArrow = ({ id, ref, startX, endX, label, labelX, color = palette.teal, status = semanticStatus(art, ref), dash = '', lineStyle = dash ? 'dashed' : 'solid' }) => {
    draw.layer('subject');
    emitLine({ points: [[startX, 280], [endX, 280]], color, width: 1.4, dash, dataRef: ref, status });
    arrowHead({ x: endX, y: 280, dataRef: ref, status, color });
    draw.layer('type');
    typeBlock(draw, label, { x: labelX, y: 262, width: 70, size: 11, maxChars: 8, fill: color, dataRef: ref, status, role: 'edge-label' });
    addElement({ id, ref, kind: 'arrow', bbox: [startX, 268, endX + 4, 292], status, lineStyle, label });
  };

  const card = ({ number, ref, title, role, x, chipRef, chipText, unknownText }) => {
    const y = 220;
    const width = 190;
    const height = 120;
    const status = semanticStatus(art, ref);
    draw.layer('subject');
    emitRect({ x, y, width, height, fill: '#FFFFFF', stroke: palette.ink, strokeWidth: 1, dataRef: ref, status, role: 'card' });
    emitRect({ x, y, width, height: 3, fill: palette.teal, dataRef: ref, status, role: 'card-accent' });
    draw.layer('type');
    typeBlock(draw, number, { x: x + 14, y: y + 20, width: 30, size: 10, maxChars: 4, kind: 'mono', fill: palette.tone, dataRef: ref, status, role: 'step' });
    typeBlock(draw, title, { x: x + 14, y: y + 52, width: 162, size: 18, maxChars: 20, fill: palette.ink, dataRef: ref, status, role: 'card-title' });
    typeBlock(draw, role, { x: x + 14, y: y + 76, width: 162, size: 12, maxChars: 22, fill: palette.tone, dataRef: ref, status, role: 'card-role' });
    addElement({ id: `card-${ref}`, ref, kind: 'card', bbox: [x, y, x + width, y + height], status, label: title });
    if (chipRef) {
      draw.layer('type');
      const chipWidth = chipText.length > 8 ? 82 : 72;
      emitRect({ x: x + 14, y: y + 94, width: chipWidth, height: 18, fill: palette.paper, stroke: palette.teal, strokeWidth: 1, radius: 9, dataRef: chipRef, status: 'supported', role: 'metric' });
      typeBlock(draw, chipText, { x: x + 22, y: y + 107, width: 150, size: 11, maxChars: 18, fill: palette.teal, dataRef: chipRef, status: 'supported', role: 'metric-label' });
      addElement({ id: `metric-${chipRef}`, ref: chipRef, kind: 'metric', bbox: [x + 14, y + 94, x + 14 + chipWidth, y + 112], status: 'supported', label: chipText });
    }
    if (unknownText) {
      typeBlock(draw, '未知', { x: x + 146, y: y + 20, width: 30, size: 9, maxChars: 4, fill: palette.amber, dataRef: 'gate-failure', status: 'unknown', role: 'unknown-label' });
      addElement({ id: 'unknown-gate-label', ref: 'gate-failure', kind: 'unknown', bbox: [x + 146, y + 10, x + 176, y + 24], status: 'unknown', lineStyle: 'dashed', label: '未知' });
      typeBlock(draw, unknownText, { x, y: y + 136, width: 190, size: 9, maxChars: 18, fill: palette.amber, dataRef: 'gate-failure', status: 'unknown', role: 'unknown-note' });
      addElement({ id: 'unknown-gate-note', ref: 'gate-failure', kind: 'unknown', bbox: [x, y + 126, x + 190, y + 140], status: 'unknown', lineStyle: 'dashed', label: unknownText });
    }
  };

  draw.layer('paper');
  draw.emit(stock.base);

  draw.layer('type');
  typeBlock(draw, '技术文章解释图 · 2026-11-21', { x: 52, y: 52, width: 300, size: 10, maxChars: 30, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'eyebrow' });
  typeBlock(draw, art.copy.title, { x: 52, y: 90, width: 660, size: 30, lineHeight: 36, maxChars: 28, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'title' });
  typeBlock(draw, '一次 OCR 上传，为什么要经过五层？', { x: 54, y: 148, width: 590, size: 14, maxChars: 28, fill: palette.teal, dataRef: 'c-main', status: 'supported', role: 'subtitle' });

  draw.layer('env');
  emitLine({ points: [[900, 60], [948, 60]], color: palette.teal, width: 2, dataRef: 'cloud-server', status: 'supported', role: 'context-accent' });
  draw.layer('type');
  typeBlock(draw, '运行环境', { x: 900, y: 84, width: 120, size: 12, maxChars: 8, fill: palette.tone, dataRef: 'cloud-server', status: 'supported', role: 'context-label' });
  typeBlock(draw, '2C2G / 3.6G', { x: 900, y: 108, width: 180, size: 13, maxChars: 16, fill: palette.ink, dataRef: 'm-size-label', status: 'supported', role: 'metric' });
  addElement({ id: 'context-environment', ref: 'cloud-server', kind: 'context', bbox: [900, 58, 1080, 112], status: 'supported', label: '运行环境' });
  addElement({ id: 'metric-m-size-label', ref: 'm-size-label', kind: 'metric', bbox: [900, 94, 1080, 112], status: 'supported', label: '2C2G / 3.6G' });

  card({ number: '01', ref: 'reader-browser', title: '浏览器', role: '打开受控入口', x: 40 });
  card({ number: '02', ref: 'dynamic-gate', title: '动态口令门禁', role: '先验证，再进入', x: 258, chipRef: 'm-ttl', chipText: 'TTL 1 小时', unknownText: '未知：无效口令页面行为' });
  card({ number: '03', ref: 'app', title: 'OCR 工作台', role: '上传图片，调用识别', x: 476 });
  card({ number: '04', ref: 'reverse-proxy', title: '反向代理', role: '透传 multipart 请求', x: 694, chipRef: 'm-upload', chipText: 'body 801KB' });
  card({ number: '05', ref: 'systemd-service', title: 'OCR 服务', role: 'systemd 托管运行', x: 912, chipRef: 'm-duration', chipText: '识别 26 秒' });

  horizontalArrow({ id: 'arrow-r-enter', ref: 'r-enter', startX: 236, endX: 252, label: '进入', labelX: 220 });
  horizontalArrow({ id: 'arrow-r-allow', ref: 'r-allow', startX: 454, endX: 470, label: '放行', labelX: 438 });
  horizontalArrow({ id: 'arrow-r-upload', ref: 'r-upload', startX: 672, endX: 688, label: '上传', labelX: 656 });
  horizontalArrow({ id: 'arrow-r-forward', ref: 'r-forward', startX: 890, endX: 906, label: '透传', labelX: 874 });

  draw.layer('prop');
  emitRect({ x: 980, y: 370, width: 122, height: 36, fill: palette.teal, radius: 18, dataRef: 'tokens', status: 'supported', role: 'result-pill' });
  draw.layer('type');
  typeBlock(draw, '真实 tokens', { x: 996, y: 393, width: 96, size: 12, maxChars: 14, fill: palette.paper, dataRef: 'tokens', status: 'supported', role: 'result-label' });
  addElement({ id: 'pill-tokens', ref: 'tokens', kind: 'pill', bbox: [980, 370, 1102, 406], status: 'supported', label: '真实 tokens' });
  draw.layer('subject');
  emitLine({ points: [[1007, 340], [1007, 370]], color: palette.teal, width: 1.4, dataRef: 'r-return', status: 'supported' });
  arrowHead({ x: 1007, y: 370, dataRef: 'r-return', status: 'supported' });
  draw.layer('type');
  typeBlock(draw, '约 26 秒', { x: 1110, y: 363, width: 78, size: 10, maxChars: 10, fill: palette.tone, dataRef: 'm-duration', status: 'supported', role: 'metric-note' });
  addElement({ id: 'arrow-r-return', ref: 'r-return', kind: 'arrow', bbox: [999, 332, 1015, 378], status: 'supported', label: '返回 tokens' });
  addElement({ id: 'metric-m-duration-note', ref: 'm-duration', kind: 'metric', bbox: [1110, 352, 1188, 366], status: 'supported', label: '约 26 秒' });

  draw.layer('subject');
  emitLine({ points: [[980, 388], [135, 388], [135, 340]], color: palette.teal, width: 1.4, dataRef: 'r-display', status: 'supported' });
  arrowHead({ x: 135, y: 340, dataRef: 'r-display', status: 'supported' });
  draw.layer('type');
  typeBlock(draw, '结果原路返回', { x: 520, y: 402, width: 160, size: 11, maxChars: 12, fill: palette.teal, dataRef: 'r-display', status: 'supported', role: 'edge-label' });
  addElement({ id: 'arrow-r-display', ref: 'r-display', kind: 'arrow', bbox: [127, 332, 988, 396], status: 'supported', label: '结果原路返回' });

  draw.layer('prop');
  emitRect({ x: 476, y: 470, width: 350, height: 64, fill: palette.paper, stroke: palette.amber, strokeWidth: 1.4, dash: '8 6', radius: 2, dataRef: 'proxy-failure', status: 'supported', role: 'failure' });
  draw.layer('type');
  typeBlock(draw, '反例：代理提前消费请求体', { x: 492, y: 496, width: 318, size: 12, maxChars: 30, fill: palette.amber, dataRef: 'proxy-failure', status: 'supported', role: 'failure-label' });
  typeBlock(draw, '→ 上游收到空 body', { x: 492, y: 520, width: 318, size: 12, maxChars: 24, fill: palette.amber, dataRef: 'proxy-failure', status: 'supported', role: 'failure-label' });
  addElement({ id: 'box-proxy-failure', ref: 'proxy-failure', kind: 'failure', bbox: [476, 470, 826, 534], status: 'supported', lineStyle: 'dashed', label: '反例：代理提前消费请求体 → 上游收到空 body' });
  draw.layer('subject');
  emitLine({ points: [[789, 340], [789, 380]], color: palette.amber, width: 1.4, dash: '8 6', dataRef: 'r-body-fail', status: 'supported' });
  emitLine({ points: [[789, 396], [789, 470]], color: palette.amber, width: 1.4, dash: '8 6', dataRef: 'r-body-fail', status: 'supported' });
  draw.layer('type');
  typeBlock(draw, '失败分支', { x: 805, y: 438, width: 70, size: 10, maxChars: 8, fill: palette.amber, dataRef: 'r-body-fail', status: 'supported', role: 'edge-label' });
  addElement({ id: 'arrow-r-body-fail', ref: 'r-body-fail', kind: 'arrow', bbox: [781, 332, 797, 478], status: 'supported', lineStyle: 'dashed', label: '失败分支' });

  draw.layer('type');
  typeBlock(draw, '门禁只管口令，代理只管转发，应用只管 OCR；任何一层多做一步，链路就断。', { x: 52, y: 590, width: 1095, size: 15, maxChars: 80, fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'conclusion' });
  typeBlock(draw, '把一台 2C2G 的云服务器配成对外交付的 Demo 出口 · 行 2–56 · 12 条证据', { x: 52, y: 646, width: 680, size: 10, maxChars: 80, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'source' });
  typeBlock(draw, '实线 文中事实 · 虚线 反例 / 未说明', { x: 850, y: 646, width: 300, size: 10, maxChars: 30, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'legend' });

  draw.layer('texture');
  draw.emit(stock.grain);

  const textOverflow = draw.text.filter(line => line.box[0] < 32 || line.box[1] < 24 || line.box[2] > canvas.width - 12 || line.box[3] > canvas.height - 5 || line.box[2] - line.box[0] > line.width + 0.01);
  if (textOverflow.length) throw new Error(`文字超框：${textOverflow.map(line => line.text).join('、')}`);
  const contrast = {
    ink: contrastRatio(palette.ink, palette.paper),
    tone: contrastRatio(palette.tone, palette.paper),
    teal: contrastRatio(palette.teal, palette.paper),
    amberText: contrastRatio(palette.amber, palette.paper)
  };
  if (contrast.ink < 4.5 || contrast.tone < 4.5 || contrast.teal < 4.5) throw new Error(`文字对比度不足：${JSON.stringify(contrast)}`);

  const format = entries => entries.map(entry => `    ${entry}`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="scene-title scene-desc" xml:lang="zh-CN">
  <title id="scene-title">${esc(art.source.title)}</title>
  <desc id="scene-desc">${esc(art.intent)}</desc>
  <defs>${stock.defs}</defs>
${layers.map(layer => `  <g id="${layer}">\n${format(draw.groups[layer])}\n  </g>`).join('\n')}
</svg>\n`;
  const scene = {
    version: 2,
    id: art.id,
    grammar: art.view.grammar,
    seed: art.seed,
    canvas: { width: canvas.width, height: canvas.height, viewBox: `0 0 ${canvas.width} ${canvas.height}` },
    source: art.source,
    focus: art.view.focus,
    elements,
    metrics: { textCount: draw.text.length, textOverflow, contrast, evidenceCount: art.evidence.length },
    svg: { file: `${art.id}.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) }
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${art.id}.svg`), svg);
  writeFileSync(join(outDir, `${art.id}.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  writeFileSync(join(outDir, `${art.id}.semantic-report.json`), `${JSON.stringify(semanticReport, null, 2)}\n`);
  return scene;
}

function renderMobile(art, outDir, semanticReport) {
  const width = 390;
  const height = 860;
  const draw = layout({ origin: [0, 0], angles: [0, 0] }, art.seed);
  const stock = paper(art.seed);
  const semanticIds = new Set([
    ...(art.entities ?? []), ...(art.relations ?? []), ...(art.claims ?? []),
    ...(art.unknowns ?? []), ...(art.inferences ?? []), ...(art.metrics ?? [])
  ].map(item => item.id));
  const elements = [];
  const addElement = ({ id, ref, kind, bbox, status = semanticStatus(art, ref), lineStyle = 'solid', label }) => {
    if (!semanticIds.has(ref)) throw new Error(`移动版元素引用不存在：${ref}`);
    elements.push({ id, ref, kind, status, lineStyle, bbox: bbox.map(num), ...(label ? { label } : {}) });
  };
  const emitRect = ({ x, y, width: rectWidth, height: rectHeight, fill, stroke = 'none', strokeWidth = 0, dash = '', radius = 0, dataRef, status = 'supported', role }) => {
    draw.emit(`<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ''} data-ref="${esc(dataRef)}" data-status="${esc(status)}"${role ? ` data-role="${esc(role)}"` : ''}/>`);
  };
  const emitLine = ({ points, color, width: lineWidth = 1.2, dash = '', dataRef, status = 'supported', role = 'edge' }) => {
    const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${screenCoords(point)}`).join('');
    draw.emit(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''} data-ref="${esc(dataRef)}" data-status="${esc(status)}" data-role="${esc(role)}"/>`);
  };
  const downArrowHead = ({ x, y, dataRef, status = 'supported', color = palette.teal }) => {
    draw.layer('subject');
    draw.poly([screenPoint(x, y), screenPoint(x - 4, y - 8), screenPoint(x + 4, y - 8)], { fill: color, dataRef, status, role: 'arrowhead' });
    draw.line(screenPoint(x, y), screenPoint(x - 3, y - 7), { color, width: 0.7, dataRef, status, role: 'arrowhead' });
    draw.line(screenPoint(x, y), screenPoint(x + 3, y - 7), { color, width: 0.7, dataRef, status, role: 'arrowhead' });
  };
  const upArrowHead = ({ x, y, dataRef, status = 'supported', color = palette.teal }) => {
    draw.layer('subject');
    draw.poly([screenPoint(x, y), screenPoint(x - 4, y + 8), screenPoint(x + 4, y + 8)], { fill: color, dataRef, status, role: 'arrowhead' });
    draw.line(screenPoint(x, y), screenPoint(x - 3, y + 7), { color, width: 0.7, dataRef, status, role: 'arrowhead' });
    draw.line(screenPoint(x, y), screenPoint(x + 3, y + 7), { color, width: 0.7, dataRef, status, role: 'arrowhead' });
  };
  const verticalArrow = ({ id, ref, startY, endY, label, labelY }) => {
    const status = semanticStatus(art, ref);
    draw.layer('subject');
    emitLine({ points: [[195, startY], [195, endY]], color: palette.teal, width: 1.2, dataRef: ref, status });
    downArrowHead({ x: 195, y: endY, dataRef: ref, status });
    draw.layer('type');
    typeBlock(draw, label, { x: 210, y: labelY, width: 64, size: 9, maxChars: 6, fill: palette.teal, dataRef: ref, status, role: 'edge-label' });
    addElement({ id, ref, kind: 'arrow', bbox: [188, startY, 274, endY + 4], status, label });
  };
  const card = ({ number, ref, title, role, y, chipRef, chipText, unknown }) => {
    const x = 32;
    const cardWidth = 326;
    const cardHeight = 82;
    const status = semanticStatus(art, ref);
    draw.layer('subject');
    emitRect({ x, y, width: cardWidth, height: cardHeight, fill: '#FFFFFF', stroke: palette.ink, strokeWidth: 1, dataRef: ref, status, role: 'card' });
    emitRect({ x, y, width: cardWidth, height: 3, fill: palette.teal, dataRef: ref, status, role: 'card-accent' });
    draw.layer('type');
    typeBlock(draw, number, { x: 46, y: y + 14, width: 22, size: 8, maxChars: 3, kind: 'mono', fill: palette.tone, dataRef: ref, status, role: 'step' });
    typeBlock(draw, title, { x: 46, y: y + 34, width: 270, size: 16, maxChars: 20, fill: palette.ink, dataRef: ref, status, role: 'card-title' });
    typeBlock(draw, role, { x: 46, y: y + 54, width: 280, size: 10.5, maxChars: 32, fill: palette.tone, dataRef: ref, status, role: 'card-role' });
    addElement({ id: `mobile-card-${ref}`, ref, kind: 'card', bbox: [x, y, x + cardWidth, y + cardHeight], status, label: title });
    if (chipRef) {
      const chipWidth = chipText.length > 8 ? 82 : 72;
      draw.layer('type');
      emitRect({ x: 46, y: y + 58, width: chipWidth, height: 16, fill: palette.paper, stroke: palette.teal, strokeWidth: 1, radius: 8, dataRef: chipRef, status: 'supported', role: 'metric' });
      typeBlock(draw, chipText, { x: 53, y: y + 70, width: 120, size: 9, maxChars: 16, fill: palette.teal, dataRef: chipRef, status: 'supported', role: 'metric-label' });
      addElement({ id: `mobile-metric-${chipRef}`, ref: chipRef, kind: 'metric', bbox: [46, y + 58, 46 + chipWidth, y + 74], status: 'supported', label: chipText });
    }
    if (unknown) {
      typeBlock(draw, '未知', { x: 322, y: y + 14, width: 28, size: 8, maxChars: 4, fill: palette.amber, dataRef: 'gate-failure', status: 'unknown', role: 'unknown-label' });
      addElement({ id: 'mobile-unknown-gate-label', ref: 'gate-failure', kind: 'unknown', bbox: [320, y + 6, 350, y + 18], status: 'unknown', lineStyle: 'dashed', label: '未知' });
    }
  };

  draw.layer('paper');
  emitRect({ x: 0, y: 0, width, height, fill: palette.paper, dataRef: 'c-main', status: 'supported', role: 'background' });
  draw.layer('type');
  typeBlock(draw, '技术文章解释图 · 2026-11-21', { x: 16, y: 30, width: 250, size: 8, maxChars: 30, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'eyebrow' });
  typeBlock(draw, '把一台 2C2G 的云服务器\n配成能对外交付的\nDemo 出口', { x: 16, y: 58, width: 358, size: 22, lineHeight: 28, maxChars: 24, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'title' });
  typeBlock(draw, '一次 OCR 上传，为什么要经过五层？', { x: 16, y: 140, width: 358, size: 11, maxChars: 28, fill: palette.teal, dataRef: 'c-main', status: 'supported', role: 'subtitle' });

  card({ number: '01', ref: 'reader-browser', title: '浏览器', role: '打开受控入口', y: 160 });
  card({ number: '02', ref: 'dynamic-gate', title: '动态口令门禁', role: '先验证，再进入', y: 260, chipRef: 'm-ttl', chipText: 'TTL 1 小时', unknown: true });
  card({ number: '03', ref: 'app', title: 'OCR 工作台', role: '上传图片，调用识别', y: 360 });
  card({ number: '04', ref: 'reverse-proxy', title: '反向代理', role: '透传 multipart 请求', y: 460, chipRef: 'm-upload', chipText: 'body 801KB' });
  card({ number: '05', ref: 'systemd-service', title: 'OCR 服务', role: 'systemd 托管运行', y: 560, chipRef: 'm-duration', chipText: '识别 26 秒' });

  verticalArrow({ id: 'mobile-arrow-r-enter', ref: 'r-enter', startY: 242, endY: 260, label: '进入', labelY: 254 });
  verticalArrow({ id: 'mobile-arrow-r-allow', ref: 'r-allow', startY: 342, endY: 360, label: '放行', labelY: 354 });
  verticalArrow({ id: 'mobile-arrow-r-upload', ref: 'r-upload', startY: 442, endY: 460, label: '上传', labelY: 454 });
  verticalArrow({ id: 'mobile-arrow-r-forward', ref: 'r-forward', startY: 542, endY: 560, label: '透传', labelY: 554 });

  draw.layer('prop');
  emitRect({ x: 232, y: 674, width: 126, height: 32, fill: palette.teal, radius: 16, dataRef: 'tokens', status: 'supported', role: 'result-pill' });
  draw.layer('type');
  typeBlock(draw, '真实 tokens', { x: 248, y: 695, width: 106, size: 11, maxChars: 14, fill: palette.paper, dataRef: 'tokens', status: 'supported', role: 'result-label' });
  addElement({ id: 'mobile-pill-tokens', ref: 'tokens', kind: 'pill', bbox: [232, 674, 358, 706], status: 'supported', label: '真实 tokens' });
  draw.layer('subject');
  emitLine({ points: [[195, 642], [195, 674]], color: palette.teal, width: 1.2, dataRef: 'r-return', status: 'supported' });
  downArrowHead({ x: 195, y: 674, dataRef: 'r-return', status: 'supported' });
  draw.layer('type');
  typeBlock(draw, '约 26 秒', { x: 240, y: 664, width: 90, size: 9, maxChars: 10, fill: palette.tone, dataRef: 'm-duration', status: 'supported', role: 'metric-note' });
  addElement({ id: 'mobile-arrow-r-return', ref: 'r-return', kind: 'arrow', bbox: [188, 634, 204, 682], status: 'supported', label: '返回 tokens' });
  addElement({ id: 'mobile-metric-m-duration-note', ref: 'm-duration', kind: 'metric', bbox: [240, 654, 330, 668], status: 'supported', label: '约 26 秒' });

  draw.layer('subject');
  emitLine({ points: [[232, 690], [16, 690], [16, 242]], color: palette.teal, width: 1.2, dataRef: 'r-display', status: 'supported' });
  upArrowHead({ x: 16, y: 242, dataRef: 'r-display', status: 'supported' });
  draw.layer('type');
  typeBlock(draw, '结果原路返回', { x: 40, y: 706, width: 150, size: 9, maxChars: 14, fill: palette.teal, dataRef: 'r-display', status: 'supported', role: 'edge-label' });
  addElement({ id: 'mobile-arrow-r-display', ref: 'r-display', kind: 'arrow', bbox: [8, 234, 240, 698], status: 'supported', label: '结果原路返回' });

  draw.layer('prop');
  emitRect({ x: 48, y: 730, width: 294, height: 54, fill: palette.paper, stroke: palette.amber, strokeWidth: 1.2, dash: '7 5', radius: 2, dataRef: 'proxy-failure', status: 'supported', role: 'failure' });
  draw.layer('type');
  typeBlock(draw, '反例：代理提前消费请求体', { x: 62, y: 754, width: 270, size: 10, maxChars: 30, fill: palette.amber, dataRef: 'proxy-failure', status: 'supported', role: 'failure-label' });
  typeBlock(draw, '→ 上游收到空 body', { x: 62, y: 774, width: 270, size: 10, maxChars: 24, fill: palette.amber, dataRef: 'proxy-failure', status: 'supported', role: 'failure-label' });
  addElement({ id: 'mobile-box-proxy-failure', ref: 'proxy-failure', kind: 'failure', bbox: [48, 730, 342, 784], status: 'supported', lineStyle: 'dashed', label: '反例：代理提前消费请求体 → 上游收到空 body' });
  draw.layer('subject');
  emitLine({ points: [[358, 520], [372, 520]], color: palette.amber, width: 1.2, dash: '7 5', dataRef: 'r-body-fail', status: 'supported' });
  emitLine({ points: [[372, 520], [372, 730]], color: palette.amber, width: 1.2, dash: '7 5', dataRef: 'r-body-fail', status: 'supported' });
  emitLine({ points: [[372, 730], [342, 730]], color: palette.amber, width: 1.2, dash: '7 5', dataRef: 'r-body-fail', status: 'supported' });
  draw.layer('type');
  typeBlock(draw, '失败分支', { x: 250, y: 724, width: 58, size: 8, maxChars: 8, fill: palette.amber, dataRef: 'r-body-fail', status: 'supported', role: 'edge-label' });
  addElement({ id: 'mobile-arrow-r-body-fail', ref: 'r-body-fail', kind: 'arrow', bbox: [358, 520, 372, 730], status: 'supported', lineStyle: 'dashed', label: '失败分支' });

  draw.layer('type');
  typeBlock(draw, '门禁只管口令，代理只管转发，应用只管 OCR；', { x: 16, y: 810, width: 358, size: 12, maxChars: 34, fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'conclusion' });
  typeBlock(draw, '任何一层多做一步，链路就断。', { x: 16, y: 828, width: 358, size: 12, maxChars: 24, fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'conclusion' });
  typeBlock(draw, '行 2–56 · 12 条证据', { x: 16, y: 846, width: 170, size: 8, maxChars: 24, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'source' });
  typeBlock(draw, '实线 事实 · 虚线 反例/未说明', { x: 210, y: 846, width: 164, size: 8, maxChars: 24, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'legend' });

  draw.layer('texture');
  draw.emit(`<rect width="${width}" height="${height}" fill="${palette.paper}" filter="url(#paper-grain)" opacity="0.032"/>`);
  const textOverflow = draw.text.filter(line => line.box[0] < 12 || line.box[1] < 12 || line.box[2] > width - 12 || line.box[3] > height - 2 || line.box[2] - line.box[0] > line.width + 0.01);
  if (textOverflow.length) throw new Error(`移动版文字超框：${textOverflow.map(line => line.text).join('、')}`);
  const contrast = {
    ink: contrastRatio(palette.ink, palette.paper),
    tone: contrastRatio(palette.tone, palette.paper),
    teal: contrastRatio(palette.teal, palette.paper),
    amberText: contrastRatio(palette.amber, palette.paper)
  };
  if (contrast.ink < 4.5 || contrast.tone < 4.5 || contrast.teal < 4.5) throw new Error(`移动版文字对比度不足：${JSON.stringify(contrast)}`);
  const format = entries => entries.map(entry => `    ${entry}`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="mobile-scene-title mobile-scene-desc" xml:lang="zh-CN">
  <title id="mobile-scene-title">${esc(art.source.title)}</title>
  <desc id="mobile-scene-desc">${esc(art.intent)}</desc>
  <defs>${stock.defs}</defs>
${layers.map(layer => `  <g id="${layer}">\n${format(draw.groups[layer])}\n  </g>`).join('\n')}
</svg>\n`;
  const maxContentY = Math.max(...draw.text.map(item => item.box[3]), ...elements.map(item => item.bbox[3]));
  const scene = {
    version: 2,
    id: `${art.id}.mobile`,
    grammar: art.view.grammar,
    seed: art.seed,
    canvas: { width, height, viewBox: `0 0 ${width} ${height}` },
    source: art.source,
    focus: art.view.focus,
    elements,
    metrics: { textCount: draw.text.length, textOverflow, contrast, evidenceCount: art.evidence.length, maxContentY: num(maxContentY), maxHeight: height, semanticChecks: semanticReport.checks },
    svg: { file: `${art.id}.mobile.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) }
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${art.id}.mobile.svg`), svg);
  writeFileSync(join(outDir, `${art.id}.mobile.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  return scene;
}

export function build(artPath = defaultArt, outDir = defaultOut, options = {}) {
  const absoluteArt = resolve(artPath);
  const raw = readFileSync(absoluteArt, 'utf8');
  let art = null;
  try {
    art = JSON.parse(raw);
  } catch {
    // 让 lint 统一产出可读的 idUnique 错误报告，而不是在这里抛裸 JSON.parse。
  }
  const semanticReport = options.semanticReport ?? lintVisualSpec(absoluteArt);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${art?.id ?? 'visual-spec'}.semantic-report.json`), `${JSON.stringify(semanticReport, null, 2)}\n`);
  if (!semanticReport.ok) throw new Error(`语义门禁失败：${semanticReport.errors.map(error => `${error.rule} ${error.path}`).join('；')}`);
  if (!art) throw new Error('spec JSON 解析失败');
  if (['state', 'timeline'].includes(art.view?.grammar)) {
    return buildState(art, outDir, semanticReport);
  }
  // 第一份样本保留原有定制构图，避免改变已验证的 artifact hash；
  // 其余 sequence spec 走数据驱动布局，按 view.order / elements 生成。
  if (art.id === 'agent-delivery-gate') {
    return { desktop: render(art, outDir, semanticReport), mobile: renderMobile(art, outDir, semanticReport) };
  }
  return buildSequence(art, outDir, semanticReport);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = build(process.argv[2], process.argv[3]);
    console.log(JSON.stringify({
      desktop: { file: result.desktop.svg.file, bytes: result.desktop.svg.bytes, sha1: result.desktop.svg.sha1, elements: result.desktop.elements.length, textOverflow: result.desktop.metrics.textOverflow.length, maxHeight: result.desktop.canvas.height },
      mobile: { file: result.mobile.svg.file, bytes: result.mobile.svg.bytes, sha1: result.mobile.svg.sha1, elements: result.mobile.elements.length, textOverflow: result.mobile.metrics.textOverflow.length, maxHeight: result.mobile.canvas.height, maxContentY: result.mobile.metrics.maxContentY }
    }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
