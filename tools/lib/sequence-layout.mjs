import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canvas, esc, layout, palette, paper, typeBlock } from './ink.mjs';

const layers = ['paper', 'grid', 'env', 'subject', 'prop', 'type', 'texture'];
const sha1 = value => createHash('sha1').update(value).digest('hex');
const num = value => Number(value.toFixed(2));
const screenPoint = (x, y) => [x, 0, -y];
const screenCoords = ([x, y]) => `${num(x)} ${num(y)}`;

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

function semanticStatus(art, ref) {
  for (const collection of ['entities', 'relations', 'claims', 'unknowns', 'inferences', 'metrics']) {
    const item = (art[collection] ?? []).find(entry => entry.id === ref);
    if (item) return collection === 'unknowns' ? 'unknown' : collection === 'inferences' ? 'inferred' : item.status ?? 'supported';
  }
  throw new Error(`找不到语义引用：${ref}`);
}

function objectById(art) {
  return new Map([
    ...(art.entities ?? []),
    ...(art.relations ?? []),
    ...(art.claims ?? []),
    ...(art.unknowns ?? []),
    ...(art.inferences ?? []),
    ...(art.metrics ?? [])
  ].map(item => [item.id, item]));
}

function labelOf(art, ref) {
  const item = objectById(art).get(ref);
  return item?.label ?? item?.text ?? item?.id ?? ref;
}

function viewElement(art, id) {
  const item = (art.view?.elements ?? []).find(entry => entry.id === id);
  if (!item) throw new Error(`view.elements 缺少可见元素：${id}`);
  return item;
}

function makeScope(art) {
  const elements = [];
  const add = ({ id, kind, bbox, lineStyle, label }) => {
    const visible = viewElement(art, id);
    const status = semanticStatus(art, visible.ref);
    if (visible.status && visible.status !== status) {
      throw new Error(`可见元素状态与语义引用不一致：${id}`);
    }
    const resolvedLine = lineStyle ?? visible.lineStyle ?? 'solid';
    if (status === 'unknown' && resolvedLine === 'solid') {
      throw new Error(`未知元素不能使用实线：${id}`);
    }
    elements.push({
      id,
      ref: visible.ref,
      kind,
      status,
      lineStyle: resolvedLine,
      bbox: bbox.map(num),
      ...(label ? { label } : {})
    });
  };
  return { elements, add };
}

function assertCoverage(art, elements) {
  const used = new Set(elements.map(item => item.id));
  for (const item of art.view?.elements ?? []) {
    if (!used.has(item.id)) throw new Error(`可见元素没有进入布局：${item.id}`);
  }
}

function rect(draw, { x, y, width, height, fill, stroke = 'none', strokeWidth = 0, dash = '', radius = 0, dataRef, status = 'supported', role }) {
  draw.emit(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ''} data-ref="${esc(dataRef)}" data-status="${esc(status)}"${role ? ` data-role="${esc(role)}"` : ''}/>`);
}

function line(draw, { points, color, width = 1.2, dash = '', dataRef, status = 'supported', role = 'edge' }) {
  const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${screenCoords(point)}`).join('');
  draw.emit(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''} data-ref="${esc(dataRef)}" data-status="${esc(status)}" data-role="${esc(role)}"/>`);
}

function arrowHead(draw, { x, y, direction = 'right', color = palette.teal, dataRef, status = 'supported' }) {
  const points = direction === 'right'
    ? [[x, y], [x - 9, y - 4.5], [x - 9, y + 4.5]]
    : direction === 'down'
      ? [[x, y], [x - 4.5, y - 9], [x + 4.5, y - 9]]
      : [[x, y], [x + 9, y - 4.5], [x + 9, y + 4.5]];
  draw.layer('subject');
  draw.poly(points.map(point => screenPoint(...point)), { fill: color, dataRef, status, role: 'arrowhead' });
}

function statusColor(status) {
  return status === 'unknown' ? palette.amber : status === 'inferred' ? palette.tone : palette.teal;
}

function statusLabel(status) {
  return status === 'unknown' ? '未知' : status === 'inferred' ? '推断' : '有据';
}

function relationLabel(art, ref) {
  const relation = (art.relations ?? []).find(item => item.id === ref);
  return relation?.label ?? relation?.type ?? '关系';
}

function shortText(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function drawCard(art, scope, { draw, element, x, y, width, height, index, compact = false }) {
  const status = semanticStatus(art, element.ref);
  const color = statusColor(status);
  const label = labelOf(art, element.ref);
  draw.layer('subject');
  rect(draw, { x, y, width, height, fill: '#FFFFFF', stroke: palette.ink, strokeWidth: 1, dataRef: element.ref, status, role: 'sequence-card' });
  rect(draw, { x, y, width, height: 3, fill: color, dataRef: element.ref, status, role: 'sequence-card-accent' });
  draw.layer('type');
  typeBlock(draw, String(index).padStart(2, '0'), {
    x: x + 12, y: y + (compact ? 19 : 22), width: 24,
    size: compact ? 8 : 9, maxChars: 3, kind: 'mono', fill: palette.tone, dataRef: element.ref, status, role: 'step-index'
  });
  typeBlock(draw, shortText(label, compact ? 20 : 18), {
    x: x + 12, y: y + (compact ? 42 : 52), width: width - 24,
    size: compact ? 12 : 15, maxChars: compact ? 20 : 18, fill: palette.ink, dataRef: element.ref, status, role: 'card-title'
  });
  const roleText = objectById(art).get(element.ref)?.role;
  typeBlock(draw, roleText ? `${statusLabel(status)} · ${roleText}` : `${statusLabel(status)} · ${element.kind}`, {
    x: x + 12, y: y + (compact ? 60 : 80), width: width - 24,
    size: compact ? 8 : 9.5, maxChars: compact ? 28 : 24, fill: color, dataRef: element.ref, status, role: 'card-status'
  });
  scope.add({ id: element.id, kind: 'card', bbox: [x, y, x + width, y + height], label });
}

function drawSideCard(art, scope, { draw, element, x, y, width, height }) {
  const status = semanticStatus(art, element.ref);
  const color = statusColor(status);
  const label = labelOf(art, element.ref);
  draw.layer('subject');
  rect(draw, { x, y, width, height, fill: '#FFFFFF', stroke: color, strokeWidth: 1, dash: status === 'supported' ? '' : '7 5', radius: 2, dataRef: element.ref, status, role: 'side-card' });
  draw.layer('type');
  typeBlock(draw, shortText(label, 24), {
    x: x + 10, y: y + 22, width: width - 20,
    size: 11.5, maxChars: 24, fill: palette.ink, dataRef: element.ref, status, role: 'side-card-title'
  });
  const roleText = objectById(art).get(element.ref)?.role;
  typeBlock(draw, roleText ? `${statusLabel(status)} · ${roleText}` : `${statusLabel(status)} · ${element.kind}`, {
    x: x + 10, y: y + 42, width: width - 20,
    size: 8.5, maxChars: 30, fill: status === 'unknown' ? palette.ink : color, dataRef: element.ref, status, role: 'side-card-status'
  });
  scope.add({ id: element.id, kind: 'node', bbox: [x, y, x + width, y + height], label });
}

function drawEdge(art, scope, { draw, element, from, to, orientation = 'horizontal', y, compact = false }) {
  const status = semanticStatus(art, element.ref);
  const color = statusColor(status);
  const dash = element.lineStyle === 'dashed' || status === 'unknown' ? '7 5' : '';
  const label = shortText(relationLabel(art, element.ref), compact ? 6 : 8);
  let bbox;
  const width = compact ? 0.9 : 1.2;
  draw.layer('subject');
  if (orientation === 'horizontal') {
    const startX = from.x + from.width + 1;
    const endX = to.x - 1;
    const midY = y ?? from.y + from.height / 2;
    line(draw, { points: [[startX, midY], [endX, midY]], color, width, dash, dataRef: element.ref, status });
    arrowHead(draw, { x: endX, y: midY, color, dataRef: element.ref, status });
    bbox = [startX, midY - 10, endX + 2, midY + 12];
    if (!compact) {
      draw.layer('type');
      typeBlock(draw, label, { x: startX - 2, y: midY - 7, width: Math.max(20, endX - startX), size: 8, maxChars: 4, fill: color, dataRef: element.ref, status, role: 'edge-label' });
    }
  } else {
    const startX = from.x + from.width / 2;
    const startY = from.y + from.height;
    const endX = to.x + to.width / 2;
    const endY = to.y;
    line(draw, { points: [[startX, startY], [endX, endY]], color, width, dash, dataRef: element.ref, status });
    arrowHead(draw, { x: endX, y: endY, direction: 'down', color, dataRef: element.ref, status });
    bbox = [Math.min(startX, endX) - 4, startY, Math.max(startX, endX) + 4, endY];
    if (!compact) {
      draw.layer('type');
      typeBlock(draw, label, { x: Math.min(startX, endX) + 4, y: (startY + endY) / 2, width: 70, size: 8, maxChars: 6, fill: color, dataRef: element.ref, status, role: 'edge-label' });
    }
  }
  scope.add({ id: element.id, kind: 'arrow', bbox, label });
}

function mainPositions(art, { x, y, width, height, gap, columns }) {
  const order = art.view?.order ?? [];
  return order.map((ref, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return { ref, index, x: x + column * (width + gap), y: y + row * (height + gap), width, height };
  });
}

function renderDesktop(art, outDir, semanticReport) {
  const draw = layout({ origin: [0, 0], angles: [0, 0] }, art.seed);
  const stock = paper(art.seed);
  const scope = makeScope(art);
  const width = canvas.width;
  const height = canvas.height;

  draw.layer('paper');
  draw.emit(stock.base);

  draw.layer('type');
  typeBlock(draw, `真实项目解释图 · ${art.source.date}`, {
    x: 52, y: 48, width: 300, size: 9.5, maxChars: 30, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'eyebrow'
  });
  typeBlock(draw, art.copy.title, {
    x: 52, y: 82, width: 760, size: 28, lineHeight: 32, maxChars: 26, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'title'
  });
  typeBlock(draw, art.copy.subtitle, {
    x: 54, y: 150, width: 760, size: 13, maxChars: 32, fill: palette.teal, dataRef: 'c-main', status: 'supported', role: 'subtitle'
  });

  const orderElements = (art.view.order ?? []).map(ref => (art.view.elements ?? []).find(element => element.ref === ref && element.kind !== 'edge')).filter(Boolean);
  const main = mainPositions(art, { x: 52, y: 190, width: 200, height: 112, gap: 22, columns: Math.min(5, orderElements.length) });
  main.forEach((position, index) => drawCard(art, scope, { draw, element: orderElements[index], x: position.x, y: position.y, width: 200, height: 112, index: index + 1 }));
  const mainBottom = Math.max(...main.map(item => item.y + item.height));

  const sideElements = (art.view.elements ?? []).filter(element => {
    if (['edge', 'arrow', 'unknown', 'claim', 'metric', 'note'].includes(element.kind)) return false;
    return !(art.view.order ?? []).includes(element.ref);
  });
  const sideColumns = Math.max(1, Math.min(4, sideElements.length));
  const sideWidth = 230;
  const sideGap = 20;
  const sidePositions = sideElements.map((element, index) => ({
    element,
    x: 52 + (index % sideColumns) * (sideWidth + sideGap),
    y: mainBottom + 36 + Math.floor(index / sideColumns) * 96,
    width: sideWidth,
    height: 82
  }));
  sidePositions.forEach(item => drawSideCard(art, scope, { draw, element: item.element, x: item.x, y: item.y, width: item.width, height: item.height }));
  const sideBottom = sidePositions.length ? Math.max(...sidePositions.map(item => item.y + item.height)) : mainBottom;

  const positions = new Map();
  main.forEach((position, index) => positions.set(orderElements[index].ref, { ...position, element: orderElements[index] }));
  sidePositions.forEach(item => positions.set(item.element.ref, { ...item, element: item.element }));

  const edgeElements = (art.view.elements ?? []).filter(element => element.kind === 'edge' || element.kind === 'arrow');
  for (const element of edgeElements) {
    const relation = (art.relations ?? []).find(item => item.id === element.ref);
    if (!relation) throw new Error(`边元素缺少关系：${element.id}`);
    const from = positions.get(relation.from);
    const to = positions.get(relation.to);
    if (!from || !to) throw new Error(`序列布局无法定位边端点：${element.id} ${relation.from} → ${relation.to}`);
    const bothMain = (art.view.order ?? []).includes(relation.from) && (art.view.order ?? []).includes(relation.to);
    if (bothMain) {
      drawEdge(art, scope, { draw, element, from, to, orientation: 'horizontal', y: from.y + from.height / 2 });
    } else if (from.y === to.y || Math.abs(from.y - to.y) < 4) {
      drawEdge(art, scope, { draw, element, from, to, orientation: 'horizontal', y: from.y + from.height / 2 });
    } else {
      drawEdge(art, scope, { draw, element, from, to, orientation: 'vertical' });
    }
  }

  const unknownElements = (art.view.elements ?? []).filter(element => element.kind === 'unknown');
  const unknownColumns = Math.max(1, Math.min(3, unknownElements.length));
  const unknownWidth = 340;
  const unknownGap = 17;
  const unknownY = Math.max(sideBottom + 30, 470);
  unknownElements.forEach((element, index) => {
    const x = 52 + (index % unknownColumns) * (unknownWidth + unknownGap);
    const y = unknownY + Math.floor(index / unknownColumns) * 54;
    const status = 'unknown';
    draw.layer('subject');
    rect(draw, { x, y, width: unknownWidth, height: 44, fill: palette.paper, stroke: palette.amber, strokeWidth: 1, dash: '7 5', radius: 2, dataRef: element.ref, status, role: 'unknown' });
    draw.layer('type');
    typeBlock(draw, shortText(labelOf(art, element.ref), 40), {
      x: x + 10, y: y + 19, width: unknownWidth - 20,
      size: 9, maxChars: 40, fill: palette.ink, dataRef: element.ref, status, role: 'unknown-label'
    });
    scope.add({ id: element.id, kind: 'unknown', bbox: [x, y, x + unknownWidth, y + 44], lineStyle: 'dashed', label: labelOf(art, element.ref) });
  });

  const metricElements = (art.view.elements ?? []).filter(element => element.kind === 'metric');
  const metricY = unknownY + 54;
  metricElements.forEach((element, index) => {
    const metric = (art.metrics ?? []).find(item => item.id === element.ref);
    const x = 52 + index * 160;
    const text = `${metric.label} ${metric.value}${metric.unit}`;
    draw.layer('prop');
    rect(draw, { x, y: metricY, width: 150, height: 24, fill: palette.paper, stroke: palette.teal, strokeWidth: 1, radius: 12, dataRef: element.ref, status: 'supported', role: 'metric' });
    draw.layer('type');
    typeBlock(draw, shortText(text, 16), { x: x + 9, y: metricY + 16, width: 134, size: 9, maxChars: 16, fill: palette.teal, dataRef: element.ref, status: 'supported', role: 'metric-label' });
    scope.add({ id: element.id, kind: 'metric', bbox: [x, metricY, x + 150, metricY + 24], label: text });
  });

  const claimElements = (art.view.elements ?? []).filter(element => element.kind === 'claim');
  claimElements.forEach(element => {
    const claim = (art.claims ?? []).find(item => item.id === element.ref);
    draw.layer('type');
    const lines = typeBlock(draw, claim?.text ?? labelOf(art, element.ref), {
      x: 52, y: 598, width: 1095, size: 14, maxChars: 70, fill: palette.ink, dataRef: element.ref, status: 'supported', role: 'conclusion'
    });
    scope.add({ id: element.id, kind: 'claim', bbox: [52, 578, 1147, 598 + (lines.length - 1) * 16.5 + 8], label: claim?.text });
  });

  draw.layer('type');
  typeBlock(draw, `${art.source.title} · ${art.evidence.length} 条证据`, {
    x: 52, y: 650, width: 680, size: 9.5, maxChars: 80, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'source'
  });
  typeBlock(draw, '实线 文中事实 · 虚线 推断 / 未知', {
    x: 850, y: 650, width: 300, size: 9.5, maxChars: 30, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'legend'
  });

  draw.layer('texture');
  draw.emit(stock.grain);

  const textOverflow = draw.text.filter(item => item.box[0] < 32 || item.box[1] < 24 || item.box[2] > width - 12 || item.box[3] > height - 5 || item.box[2] - item.box[0] > item.width + 0.01);
  if (textOverflow.length) throw new Error(`sequence 文字超框：${textOverflow.map(item => item.text).join('、')}`);
  const contrast = {
    ink: contrastRatio(palette.ink, palette.paper),
    tone: contrastRatio(palette.tone, palette.paper),
    teal: contrastRatio(palette.teal, palette.paper),
    amberText: contrastRatio(palette.amber, palette.paper)
  };
    if (contrast.ink < 4.5 || contrast.tone < 4.5 || contrast.teal < 4.5) throw new Error(`sequence 文字对比度不足：${JSON.stringify(contrast)}`);

  assertCoverage(art, scope.elements);

  const format = entries => entries.map(entry => `    ${entry}`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="scene-title scene-desc" xml:lang="zh-CN">
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
    canvas: { width, height, viewBox: `0 0 ${width} ${height}` },
    source: art.source,
    focus: art.view.focus,
    elements: scope.elements,
    metrics: { textCount: draw.text.length, textOverflow, contrast, evidenceCount: art.evidence.length },
    svg: { file: `${art.id}.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) }
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${art.id}.svg`), svg);
  writeFileSync(join(outDir, `${art.id}.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  return scene;
}

function renderMobile(art, outDir, semanticReport) {
  const draw = layout({ origin: [0, 0], angles: [0, 0] }, art.seed);
  const stock = paper(art.seed);
  const scope = makeScope(art);
  const width = 390;
  const height = 860;

  draw.layer('paper');
  rect(draw, { x: 0, y: 0, width, height, fill: palette.paper, dataRef: 'c-main', status: 'supported', role: 'background' });
  draw.layer('type');
  typeBlock(draw, `真实项目解释图 · ${art.source.date}`, {
    x: 16, y: 28, width: 300, size: 8, maxChars: 30, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'eyebrow'
  });
  typeBlock(draw, art.copy.title, {
    x: 16, y: 56, width: 358, size: 21, lineHeight: 26, maxChars: 18, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'title'
  });
  typeBlock(draw, art.copy.subtitle, {
    x: 16, y: 126, width: 358, size: 10.5, maxChars: 32, fill: palette.teal, dataRef: 'c-main', status: 'supported', role: 'subtitle'
  });

  const orderElements = (art.view.order ?? []).map(ref => (art.view.elements ?? []).find(element => element.ref === ref && element.kind !== 'edge')).filter(Boolean);
  const cardHeight = 78;
  const cardGap = 12;
  const main = orderElements.map((element, index) => ({
    element,
    x: 16, y: 148 + index * (cardHeight + cardGap), width: 358, height: cardHeight, index: index + 1
  }));
  main.forEach(item => drawCard(art, scope, { draw, element: item.element, x: item.x, y: item.y, width: item.width, height: item.height, index: item.index, compact: true }));
  const mainBottom = main.length ? main[main.length - 1].y + main[main.length - 1].height : 148;

  const positions = new Map(main.map(item => [item.element.ref, item]));
  const sideElements = (art.view.elements ?? []).filter(element => {
    if (['edge', 'arrow', 'unknown', 'claim', 'metric', 'note'].includes(element.kind)) return false;
    return !(art.view.order ?? []).includes(element.ref);
  });
  const sideY = mainBottom + 16;
  const sidePositions = sideElements.map((element, index) => ({
    element,
    x: 16,
    y: sideY + index * 22 - 12,
    width: 358,
    height: 20
  }));
  sidePositions.forEach(item => positions.set(item.element.ref, item));

  const edgeElements = (art.view.elements ?? []).filter(element => element.kind === 'edge' || element.kind === 'arrow');
  for (const element of edgeElements) {
    const relation = (art.relations ?? []).find(item => item.id === element.ref);
    if (!relation) throw new Error(`边元素缺少关系：${element.id}`);
    const from = positions.get(relation.from);
    const to = positions.get(relation.to);
    if (!from || !to) throw new Error(`移动序列布局无法定位边端点：${element.id} ${relation.from} → ${relation.to}`);
    if (from.y === to.y || Math.abs(from.y - to.y) < 4) {
      drawEdge(art, scope, { draw, element, from, to, orientation: 'horizontal', compact: true });
    } else if (to.height <= 22) {
      const status = semanticStatus(art, element.ref);
      const color = statusColor(status);
      const dash = element.lineStyle === 'dashed' || status === 'unknown' ? '6 4' : '';
      const rowMid = to.y + 10;
      draw.layer('subject');
      line(draw, { points: [[356, rowMid], [373, rowMid]], color, width: 1, dash, dataRef: element.ref, status });
      arrowHead(draw, { x: 373, y: rowMid, direction: 'right', color, dataRef: element.ref, status });
      scope.add({ id: element.id, kind: 'arrow', bbox: [354, rowMid - 6, 374, rowMid + 6], label: relationLabel(art, element.ref) });
    } else {
      const status = semanticStatus(art, element.ref);
      const color = statusColor(status);
      const dash = element.lineStyle === 'dashed' || status === 'unknown' ? '6 4' : '';
      draw.layer('subject');
      line(draw, { points: [[195, from.y + from.height + 1], [195, to.y - 2]], color, width: 1, dash, dataRef: element.ref, status });
      arrowHead(draw, { x: 195, y: to.y, direction: 'down', color, dataRef: element.ref, status });
      scope.add({ id: element.id, kind: 'arrow', bbox: [188, from.y + from.height, 202, to.y], label: relationLabel(art, element.ref) });
    }
  }

  sidePositions.forEach(({ element, y }) => {
    const status = semanticStatus(art, element.ref);
    const color = statusColor(status);
    draw.layer('subject');
    rect(draw, { x: 16, y, width: 358, height: 20, fill: 'none', stroke: color, strokeWidth: 0.8, dash: status === 'supported' ? '' : '5 4', radius: 2, dataRef: element.ref, status, role: 'side-row' });
    draw.layer('type');
    typeBlock(draw, shortText(labelOf(art, element.ref), 32), {
      x: 24, y: y + 15, width: 340, size: 8.5, maxChars: 32, fill: palette.ink, dataRef: element.ref, status, role: 'side-row-label'
    });
    scope.add({ id: element.id, kind: 'node', bbox: [16, y, 374, y + 20], label: labelOf(art, element.ref) });
  });
  const sideBottom = sideElements.length ? sideY + sideElements.length * 22 - 4 : mainBottom;

  const unknownElements = (art.view.elements ?? []).filter(element => element.kind === 'unknown');
  const unknownY = Math.max(sideBottom + 10, 690);
  unknownElements.forEach((element, index) => {
    const y = unknownY + index * 18;
    draw.layer('type');
    typeBlock(draw, `未知 · ${shortText(labelOf(art, element.ref), 38)}`, {
      x: 16, y: y + 6, width: 358, size: 8, maxChars: 38, fill: palette.ink, dataRef: element.ref, status: 'unknown', role: 'unknown-label'
    });
    scope.add({ id: element.id, kind: 'unknown', bbox: [16, y - 7, 374, y + 9], lineStyle: 'dashed', label: labelOf(art, element.ref) });
  });

  const metricElements = (art.view.elements ?? []).filter(element => element.kind === 'metric');
  const metricY = unknownY + Math.max(1, unknownElements.length) * 18 + 8;
  metricElements.forEach((element, index) => {
    const metric = (art.metrics ?? []).find(item => item.id === element.ref);
    const text = `${metric.label} ${metric.value}${metric.unit}`;
    const x = 16 + index * 170;
    draw.layer('prop');
    rect(draw, { x, y: metricY, width: 160, height: 22, fill: palette.paper, stroke: palette.teal, strokeWidth: 1, radius: 11, dataRef: element.ref, status: 'supported', role: 'metric' });
    draw.layer('type');
    typeBlock(draw, shortText(text, 18), { x: x + 8, y: metricY + 15, width: 144, size: 8, maxChars: 18, fill: palette.teal, dataRef: element.ref, status: 'supported', role: 'metric-label' });
    scope.add({ id: element.id, kind: 'metric', bbox: [x, metricY, x + 160, metricY + 22], label: text });
  });

  const claimElements = (art.view.elements ?? []).filter(element => element.kind === 'claim');
  claimElements.forEach(element => {
    const claim = (art.claims ?? []).find(item => item.id === element.ref);
    draw.layer('type');
    const lines = typeBlock(draw, claim?.text ?? labelOf(art, element.ref), {
      x: 16, y: 792, width: 358, size: 11, maxChars: 32, fill: palette.ink, dataRef: element.ref, status: 'supported', role: 'conclusion'
    });
    scope.add({ id: element.id, kind: 'claim', bbox: [16, 778, 374, 792 + (lines.length - 1) * 13 + 6], label: claim?.text });
  });

  draw.layer('type');
  typeBlock(draw, `${art.evidence.length} 条证据 · 行 ${Math.min(...art.evidence.map(item => item.lineStart))}–${Math.max(...art.evidence.map(item => item.lineEnd))}`, {
    x: 16, y: 846, width: 170, size: 8, maxChars: 24, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'source'
  });
  typeBlock(draw, '实线 事实 · 虚线 推断/未知', {
    x: 210, y: 846, width: 164, size: 8, maxChars: 24, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'legend'
  });

  draw.layer('texture');
  draw.emit(`<rect width="${width}" height="${height}" fill="${palette.paper}" filter="url(#paper-grain)" opacity="0.032"/>`);

  const textOverflow = draw.text.filter(item => item.box[0] < 12 || item.box[1] < 12 || item.box[2] > width - 12 || item.box[3] > height - 2 || item.box[2] - item.box[0] > item.width + 0.01);
  if (textOverflow.length) throw new Error(`sequence 移动版文字超框：${textOverflow.map(item => item.text).join('、')}`);
  const contrast = {
    ink: contrastRatio(palette.ink, palette.paper),
    tone: contrastRatio(palette.tone, palette.paper),
    teal: contrastRatio(palette.teal, palette.paper),
    amberText: contrastRatio(palette.amber, palette.paper)
  };
  if (contrast.ink < 4.5 || contrast.tone < 4.5 || contrast.teal < 4.5) throw new Error(`sequence 移动版文字对比度不足：${JSON.stringify(contrast)}`);

  assertCoverage(art, scope.elements);

  const format = entries => entries.map(entry => `    ${entry}`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="mobile-scene-title mobile-scene-desc" xml:lang="zh-CN">
  <title id="mobile-scene-title">${esc(art.source.title)}</title>
  <desc id="mobile-scene-desc">${esc(art.intent)}</desc>
  <defs>${stock.defs}</defs>
${layers.map(layer => `  <g id="${layer}">\n${format(draw.groups[layer])}\n  </g>`).join('\n')}
</svg>\n`;
  const maxContentY = Math.max(...draw.text.map(item => item.box[3]), ...scope.elements.map(item => item.bbox[3]));
  const scene = {
    version: 2,
    id: `${art.id}.mobile`,
    grammar: art.view.grammar,
    seed: art.seed,
    canvas: { width, height, viewBox: `0 0 ${width} ${height}` },
    source: art.source,
    focus: art.view.focus,
    elements: scope.elements,
    metrics: { textCount: draw.text.length, textOverflow, contrast, evidenceCount: art.evidence.length, maxContentY: num(maxContentY), maxHeight: height, semanticChecks: semanticReport.checks },
    svg: { file: `${art.id}.mobile.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) }
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${art.id}.mobile.svg`), svg);
  writeFileSync(join(outDir, `${art.id}.mobile.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  return scene;
}

export function buildSequence(art, outDir, semanticReport) {
  return {
    desktop: renderDesktop(art, outDir, semanticReport),
    mobile: renderMobile(art, outDir, semanticReport)
  };
}
