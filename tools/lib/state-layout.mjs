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

function makeDraw(art) {
  return {
    draw: layout({ origin: [0, 0], angles: [0, 0] }, art.seed),
    stock: paper(art.seed)
  };
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
    : direction === 'left'
      ? [[x, y], [x + 9, y - 4.5], [x + 9, y + 4.5]]
      : direction === 'down'
        ? [[x, y], [x - 4.5, y - 9], [x + 4.5, y - 9]]
        : [[x, y], [x - 4.5, y + 9], [x + 4.5, y + 9]];
  draw.layer('subject');
  draw.poly(points.map(point => screenPoint(...point)), { fill: color, dataRef, status, role: 'arrowhead' });
}

function tickDot(draw, { x, y, r = 4, color = palette.ink, dataRef, status = 'supported' }) {
  draw.layer('subject');
  draw.emit(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" data-ref="${esc(dataRef)}" data-status="${esc(status)}" data-role="timeline-tick"/>`);
}

function toneColor(tone) {
  return tone === 'amber' ? palette.amber : palette.teal;
}

function textMax(width, size, fallback) {
  return Math.max(4, Math.min(fallback, Math.floor((width - size * 1.6) / (size * 1.06))));
}

function renderLanes(art, scope, { draw, x, y, width, height, columns, gapX, gapY }) {
  const lanes = art.view.lanes;
  const laneWidth = width;
  const laneHeight = height;
  const positions = lanes.map((lane, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return { lane, x: x + column * (laneWidth + gapX), y: y + row * (laneHeight + gapY) };
  });

  for (const { lane, x: laneX, y: laneY } of positions) {
    const color = toneColor(lane.tone);
    draw.layer('subject');
    rect(draw, { x: laneX, y: laneY, width: laneWidth, height: laneHeight, fill: '#FFFFFF', dataRef: lane.ref, status: 'supported', role: 'lane' });
    rect(draw, { x: laneX, y: laneY, width: 2.6, height: laneHeight, fill: color, dataRef: lane.ref, status: 'supported', role: 'lane-accent' });
    line(draw, { points: [[laneX, laneY + laneHeight], [laneX + laneWidth, laneY + laneHeight]], color: '#D9D5C8', width: 0.7, dataRef: lane.ref, status: 'supported', role: 'lane-rule' });
    draw.layer('type');
    typeBlock(draw, lane.title, {
      x: laneX + 14, y: laneY + 26, width: laneWidth - 28,
      size: 12.5, maxChars: textMax(laneWidth - 28, 12.5, 10),
      fill: palette.ink, dataRef: lane.ref, status: 'supported', role: 'lane-title'
    });
    scope.add({ id: lane.id, kind: 'lane', bbox: [laneX, laneY, laneX + laneWidth, laneY + laneHeight], label: lane.title });

    const chipWidth = (laneWidth - 36) / 2;
    lane.states.forEach((state, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const rowX = laneX + 14 + column * (chipWidth + 10);
      const rowY = laneY + 62 + row * 28;
      const stateStatus = semanticStatus(art, state.ref);
      draw.layer('prop');
      if (stateStatus === 'supported') {
        rect(draw, { x: rowX, y: rowY - 7, width: 5, height: 5, fill: color, dataRef: state.ref, status: stateStatus, role: 'state-mark' });
      } else {
        rect(draw, { x: rowX, y: rowY - 7, width: 5, height: 5, stroke: color, strokeWidth: 0.8, dash: '3 2', dataRef: state.ref, status: stateStatus, role: 'state-mark' });
      }
      draw.layer('type');
      typeBlock(draw, state.label, {
        x: rowX + 11, y: rowY, width: chipWidth - 11,
        size: 10.5, maxChars: textMax(chipWidth - 11, 10.5, 8),
        fill: palette.ink, dataRef: state.ref, status: stateStatus, role: 'state-label'
      });
      scope.add({ id: `state-${state.ref.slice(3)}`, kind: 'state', bbox: [rowX - 2, rowY - 16, rowX + chipWidth - 4, rowY + 6], label: state.label });
    });
  }
}

function renderLoop(art, scope, { draw, x, y, width, height, columns, gapX, gapY, titleY }) {
  const loop = art.view.loop;
  const steps = loop.steps;
  const stepWidth = width;
  const stepHeight = height;
  const positions = steps.map((step, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return { step, x: x + column * (stepWidth + gapX), y: y + row * (stepHeight + gapY) };
  });

  draw.layer('type');
  typeBlock(draw, loop.title, {
    x, y: titleY, width: Math.max(240, width * columns),
    size: 14, maxChars: 18, fill: palette.ink, dataRef: loop.ref, status: 'supported', role: 'loop-title'
  });

  positions.forEach(({ step, x: stepX, y: stepY }, index) => {
    draw.layer('subject');
    rect(draw, { x: stepX, y: stepY, width: stepWidth, height: stepHeight, fill: '#FFFFFF', stroke: '#D9D5C8', strokeWidth: 0.7, radius: 0, dataRef: step.ref, status: 'supported', role: 'loop-step' });
    draw.layer('type');
    typeBlock(draw, `${String(index + 1).padStart(2, '0')}`, {
      x: stepX + 10, y: stepY + 28, width: 26,
      size: 8.5, maxChars: 3, kind: 'mono', fill: palette.teal, dataRef: step.ref, status: 'supported', role: 'step-index'
    });
    typeBlock(draw, step.label, {
      x: stepX + 34, y: stepY + 28, width: stepWidth - 44,
      size: 12.5, maxChars: textMax(stepWidth - 44, 12.5, 8),
      fill: palette.ink, dataRef: step.ref, status: 'supported', role: 'step-label'
    });
    scope.add({ id: step.id, kind: 'node', bbox: [stepX, stepY, stepX + stepWidth, stepY + stepHeight], label: step.label });
  });

  for (let index = 0; index < positions.length - 1; index++) {
    const current = positions[index];
    const next = positions[index + 1];
    if (Math.abs(current.y - next.y) < 0.1) {
      const startX = current.x + stepWidth;
      const endX = next.x;
      draw.layer('subject');
      line(draw, { points: [[startX, current.y + stepHeight / 2], [endX, next.y + stepHeight / 2]], color: '#C9C5B8', width: 1, dataRef: loop.steps[index + 1].ref, status: 'supported' });
      arrowHead(draw, { x: endX, y: next.y + stepHeight / 2, direction: 'right', dataRef: loop.steps[index + 1].ref, status: 'supported' });
    } else {
      const startY = current.y + stepHeight;
      const endY = next.y;
      draw.layer('subject');
      line(draw, { points: [[current.x + stepWidth / 2, startY], [next.x + stepWidth / 2, endY]], color: palette.teal, width: 1.2, dataRef: loop.steps[index + 1].ref, status: 'supported' });
      arrowHead(draw, { x: next.x + stepWidth / 2, y: endY, direction: 'down', dataRef: loop.steps[index + 1].ref, status: 'supported' });
    }
  }

  const feedback = loop.feedback;
  if (feedback) {
    const from = positions.find(item => item.step.id === feedback.from);
    const to = positions.find(item => item.step.id === feedback.to);
    if (!from || !to) throw new Error(`loop.feedback 端点不存在：${feedback.from} / ${feedback.to}`);
    draw.layer('subject');
    if (columns === 1) {
      const last = positions[positions.length - 1];
      const noteY = last.y + stepHeight + 9;
      draw.layer('type');
      typeBlock(draw, `↺ ${feedback.label}`, {
        x: 18, y: noteY, width: 350,
        size: 9, maxChars: 24, fill: palette.amber, dataRef: feedback.ref, status: 'supported', role: 'feedback-note'
      });
    } else {
      const topY = y - 10;
      const fromX = from.x + stepWidth / 2;
      const toX = to.x + stepWidth / 2;
      line(draw, {
        points: [[fromX, from.y - 4], [fromX, topY], [toX, topY], [toX, to.y - 4]],
        color: palette.amber, width: 1.2, dash: '7 5', dataRef: feedback.ref, status: 'supported', role: 'feedback'
      });
      arrowHead(draw, { x: toX, y: to.y - 4, direction: 'down', color: palette.amber, dataRef: feedback.ref, status: 'supported' });
      draw.layer('type');
      typeBlock(draw, feedback.label, {
        x: Math.min(fromX, toX) + 24, y: topY - 4, width: 180,
        size: 9, maxChars: 12, fill: palette.amber, dataRef: feedback.ref, status: 'supported', role: 'feedback-label'
      });
    }
  }
}

function renderEdge(art, scope, options) {
  const edge = art.view.edge;
  if (!edge) return;
  const { draw, compact = false } = options;
  const { x, y, width, height } = options;
  draw.layer('subject');
  if (compact) {
    rect(draw, { x, y, width, height, fill: '#FFFFFF', dataRef: edge.ref, status: 'supported', role: 'edge-note' });
    line(draw, { points: [[x, y + height], [x + width, y + height]], color: '#D9D5C8', width: 0.7, dataRef: edge.ref, status: 'supported', role: 'edge-rule' });
  } else {
    rect(draw, { x, y, width, height, fill: 'none', dataRef: edge.ref, status: 'supported', role: 'edge-note' });
  }
  draw.layer('type');
  if (compact) {
    typeBlock(draw, edge.label, {
      x: x + 12, y: y + 17, width: width - 24,
      size: 10.5, maxChars: 8, fill: palette.teal, dataRef: edge.ref, status: 'supported', role: 'edge-title'
    });
    typeBlock(draw, (edge.tasks ?? []).join(' · '), {
      x: x + 12, y: y + 35, width: width - 24,
      size: 9, maxChars: textMax(width - 24, 9, 38), fill: palette.ink, dataRef: edge.ref, status: 'supported', role: 'edge-task-label'
    });
  } else {
    typeBlock(draw, edge.label, {
      x: x + 14, y: y + (height + 10) / 2, width: 86,
      size: 10.5, maxChars: 6, fill: palette.teal, dataRef: edge.ref, status: 'supported', role: 'edge-title'
    });
    const tasks = edge.tasks ?? [];
    const gap = 7;
    const available = width - 112 - gap * Math.max(0, tasks.length - 1);
    const taskWidth = Math.floor(available / Math.max(1, tasks.length));
    draw.layer('grid');
    line(draw, { points: [[x, y + height], [x + width, y + height]], color: '#D9D5C8', width: 0.7, dataRef: edge.ref, status: 'supported', role: 'edge-rule' });
    tasks.forEach((task, index) => {
      const taskX = x + 112 + index * (taskWidth + gap);
      if (index > 0) {
        line(draw, { points: [[taskX - gap / 2, y + 8], [taskX - gap / 2, y + height - 8]], color: '#D9D5C8', width: 0.7, dataRef: edge.ref, status: 'supported', role: 'edge-divider' });
      }
      draw.layer('type');
      typeBlock(draw, task, {
        x: taskX, y: y + (height + 10) / 2, width: taskWidth,
        size: 9.5, maxChars: textMax(taskWidth, 9.5, 6), fill: palette.ink, dataRef: edge.ref, status: 'supported', role: 'edge-task-label'
      });
    });
  }
  scope.add({ id: edge.id, kind: 'note', bbox: [x, y, x + width, y + height], label: edge.label });
}

function renderNotes(art, scope, { draw, notes, x, y, width, height, gap, stacked = false }) {
  if (stacked) {
    const boxHeight = notes.length * height + (notes.length - 1) * gap + 16;
    draw.layer('subject');
    rect(draw, { x, y, width, height: boxHeight, fill: palette.paper, stroke: palette.amber, strokeWidth: 1, dash: '7 5', radius: 2, dataRef: notes[0].ref, status: 'unknown', role: 'unknown' });
    notes.forEach((note, index) => {
      const noteY = y + 8 + index * (height + gap);
      draw.layer('type');
      typeBlock(draw, note.label, {
        x: x + 10, y: noteY + height - 2, width: width - 20,
        size: 8.5, maxChars: textMax(width - 20, 8.5, 38), fill: palette.amber, dataRef: note.ref, status: 'unknown', role: 'unknown-label'
      });
      scope.add({ id: note.id, kind: 'unknown', bbox: [x, noteY, x + width, noteY + height], lineStyle: 'dashed', label: note.label });
    });
    return;
  }
  notes.forEach((note, index) => {
    const noteX = x + index * (width + gap);
    draw.layer('subject');
    rect(draw, { x: noteX, y, width, height, fill: palette.paper, stroke: palette.amber, strokeWidth: 1, dash: '7 5', radius: 2, dataRef: note.ref, status: 'unknown', role: 'unknown' });
    draw.layer('type');
    typeBlock(draw, note.label, {
      x: noteX + 10, y: y + 17, width: width - 20,
      size: 9.5, maxChars: textMax(width - 20, 9.5, 26), fill: palette.amber, dataRef: note.ref, status: 'unknown', role: 'unknown-label'
    });
    scope.add({ id: note.id, kind: 'unknown', bbox: [noteX, y, noteX + width, y + height], lineStyle: 'dashed', label: note.label });
  });
}

function renderConclusion(art, scope, { draw, x, y, width, maxChars, text = art.mainConclusion.text }) {
  const claimRef = art.mainConclusion.claimRef;
  const status = semanticStatus(art, claimRef);
  const lineStyle = status === 'supported' ? 'solid' : 'dashed';
  draw.layer('type');
  const lines = typeBlock(draw, text, {
    x, y, width, size: 14, maxChars, fill: palette.ink,
    dataRef: claimRef, status, role: 'conclusion'
  });
  const bottom = y + (lines.length - 1) * 14 * 1.18 + 5;
  scope.add({ id: 'claim-main', kind: 'claim', bbox: [x, y - 16, x + width, bottom], lineStyle, label: art.mainConclusion.text });
}

function renderSource(art, { draw, x, y, width, compact = false }) {
  const lastLine = Math.max(...art.evidence.map(item => item.lineEnd));
  const sourceCount = Array.isArray(art.sources) ? art.sources.length : 1;
  const text = sourceCount > 1
    ? compact
      ? `${sourceCount} 篇来源 · ${art.evidence.length} 条证据`
      : `${sourceCount} 篇来源 · ${art.evidence.length} 条证据 · 各行号见 evidence`
    : compact
      ? `行 2–${lastLine} · ${art.evidence.length} 条证据`
      : `${art.source.title} · 行 2–${lastLine} · ${art.evidence.length} 条证据`;
  draw.layer('type');
  typeBlock(draw, text, {
    x, y, width, size: 9.5, maxChars: compact ? 24 : 80, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'source'
  });
}

function renderLegend({ draw, x, y, width, compact = false }) {
  draw.layer('type');
  typeBlock(draw, compact ? '实线 事实 · 虚线 未知' : '实线 文中事实 · 虚线 未知 / 推断', {
    x, y, width, size: 9.5, maxChars: compact ? 18 : 30, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'legend'
  });
}

function eventStatus(art, event) {
  const status = semanticStatus(art, event.ref);
  return { status, dash: status === 'supported' ? '' : '6 4', color: status === 'supported' ? palette.teal : palette.amber };
}

function timelineCard(art, scope, { draw, event, x, y, width, height, below = false, withExcerpt = false }) {
  const { status, dash, color } = eventStatus(art, event);
  draw.layer('subject');
  rect(draw, { x, y, width, height, fill: '#FFFFFF', dataRef: event.ref, status, role: 'timeline-card' });
  rect(draw, { x, y, width: 2.6, height, fill: color, dataRef: event.ref, status, role: 'timeline-card-bar' });
  line(draw, { points: [[x, y + height], [x + width, y + height]], color, width: 0.7, dash, dataRef: event.ref, status, role: 'timeline-card-rule' });
  draw.layer('type');
  typeBlock(draw, event.time ?? '', {
    x: x + 12, y: y + 18, width: 84, size: 8.5, kind: 'mono', fill: palette.tone,
    dataRef: event.ref, status, role: 'timeline-time'
  });
  typeBlock(draw, status === 'supported' ? '事实' : status === 'inferred' ? '推断' : '未知', {
    x: x + width - 46, y: y + 18, width: 34, size: 8.5, fill: color,
    dataRef: event.ref, status, role: 'timeline-status'
  });
  typeBlock(draw, event.label, {
    x: x + 12, y: y + 42, width: width - 24, size: 13, lineHeight: 16, maxChars: 16,
    fill: palette.ink, dataRef: event.ref, status, role: 'timeline-label'
  });
  if (withExcerpt && event.excerpt) {
    typeBlock(draw, event.lineRef ?? '', {
      x: x + 12, y: y + height - 30, width: 60, size: 7.5, maxChars: 6, fill: color,
      dataRef: event.ref, status, role: 'timeline-line-ref'
    });
    typeBlock(draw, event.excerpt, {
      x: x + 12, y: y + height - 18, width: width - 22, size: 7, lineHeight: 8.5, maxChars: 42, kind: 'mono',
      fill: palette.ink, dataRef: event.ref, status, role: 'timeline-excerpt'
    });
    scope.add({ id: event.id, kind: 'state', bbox: [x, y, x + width, y + height], lineStyle: status === 'supported' ? 'solid' : 'dashed', label: event.label });
    return { x: x + width / 2, y: below ? y : y + height };
  }
  if (event.evidence && !event.excerpt) {
    typeBlock(draw, event.evidence, {
      x: x + 12, y: y + height - 12, width: width - 24,
      size: 8.5, maxChars: textMax(width - 24, 8.5, 30), fill: palette.tone,
      dataRef: event.ref, status, role: 'timeline-evidence'
    });
  }
  scope.add({ id: event.id, kind: 'state', bbox: [x, y, x + width, y + height], lineStyle: status === 'supported' ? 'solid' : 'dashed', label: event.label });
  return { x: x + width / 2, y: below ? y : y + height };
}

function renderTimelineDesktop(art, outDir, semanticReport) {
  const { draw, stock } = makeDraw(art);
  const scope = makeScope(art);
  const width = canvas.width;
  const height = canvas.height;
  const events = art.view.events ?? [];
  const left = 52;
  const right = 1148;

  draw.layer('paper');
  draw.emit(stock.base);

  // ---- 页眉：标题 + 右侧读数条 ----
  draw.layer('type');
  typeBlock(draw, `技术文章解释图 · ${art.source.date}`, {
    x: left, y: 46, width: 360, size: 9.5, maxChars: 42, fill: palette.mist, dataRef: 'c-main', status: 'supported', role: 'eyebrow'
  });
  typeBlock(draw, art.copy.title, {
    x: left, y: 88, width: 720, size: 32, lineHeight: 38, spacing: 0.6, maxChars: 22, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'title'
  });
  typeBlock(draw, art.copy.subtitle, {
    x: left, y: 162, width: 620, size: 12.5, maxChars: 40, fill: palette.teal, dataRef: 'c-main', status: 'supported', role: 'subtitle'
  });

  // 读数条：只放 spec 里已有的数，不编造
  const metrics = art.metrics ?? [];
  const restarts = metrics.find(m => /重启/.test(m.label));
  const toSec = t => {
    const m = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/.exec(t ?? '');
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000 : null;
  };
  const first = toSec(events[0]?.time);
  const last = toSec(events[events.length - 1]?.time);
  const span = first !== null && last !== null ? Math.max(0, last - first) : null;
  const readings = [
    span !== null ? { value: span.toFixed(1), unit: '秒', label: '全过程' } : null,
    { value: String(events.length), unit: '个', label: '主要时刻' },
    restarts ? { value: String(restarts.value), unit: restarts.unit ?? '次', label: restarts.label } : null
  ].filter(Boolean);
  const cellW = 86;
  const cellGap = 20;
  const totalW = readings.length * cellW + (readings.length - 1) * cellGap;
  const readX = right - totalW;
  readings.forEach((r, i) => {
    const x = readX + i * (cellW + cellGap);
    typeBlock(draw, r.value, {
      x, y: 96, width: cellW, size: 24, maxChars: 4, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'reading-value'
    });
    typeBlock(draw, `${r.unit} · ${r.label}`, {
      x, y: 118, width: cellW, size: 8.5, maxChars: 12, fill: palette.mist, dataRef: 'c-main', status: 'supported', role: 'reading-label'
    });
    if (i > 0) {
      draw.layer('grid');
      line(draw, { points: [[x - cellGap / 2, 76], [x - cellGap / 2, 120]], color: '#CFCCC2', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'reading-rule' });
      draw.layer('type');
    }
  });

  draw.layer('grid');
  line(draw, { points: [[left, 184], [right, 184]], color: '#CFCCC2', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'header-rule' });

  draw.layer('type');
  typeBlock(draw, art.view.axisTitle, {
    x: left, y: 208, width: 560, size: 12.5, maxChars: 28, fill: palette.ink, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'axis-title'
  });

  // ---- 图区：浅色底带，把五个时刻托起来 ----
  const bandTop = 224;
  const bandH = 202;
  draw.layer('env');
  rect(draw, { x: left, y: bandTop, width: right - left, height: bandH, fill: '#F3F1E9', dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'timeline-band' });
  draw.layer('grid');
  line(draw, { points: [[left, bandTop], [right, bandTop]], color: '#D9D5C8', width: 0.7, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'band-rule' });
  line(draw, { points: [[left, bandTop + bandH], [right, bandTop + bandH]], color: '#D9D5C8', width: 0.7, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'band-rule' });


  const cardWidth = 206;
  const gapX = 6;
  const axisX = left;
  const axisY = 358;
  const cardHeight = 84;
  const cardY = 236;
  const step = cardWidth + gapX;
  const axisRight = axisX + step * (events.length - 1) + cardWidth;

  draw.layer('subject');
  line(draw, { points: [[axisX - 4, axisY], [axisRight + 4, axisY]], color: palette.teal, width: 1.4, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'timeline-axis' });
  arrowHead(draw, { x: axisRight + 4, y: axisY, direction: 'right', color: palette.teal, dataRef: art.mainConclusion.claimRef, status: 'supported' });

  events.forEach((event, index) => {
    const cardX = axisX + step * index;
    const tickX = cardX + cardWidth / 2;
    const { status, dash, color } = eventStatus(art, event);

    // 卡：白底 + 左侧色条 + 底部细线，轻一点
    draw.layer('subject');
    rect(draw, { x: cardX, y: cardY, width: cardWidth, height: cardHeight, fill: '#FFFFFF', dataRef: event.ref, status, role: 'timeline-card' });
    rect(draw, { x: cardX, y: cardY, width: 2.6, height: cardHeight, fill: color, dataRef: event.ref, status, role: 'timeline-card-bar' });
    line(draw, { points: [[cardX, cardY + cardHeight], [cardX + cardWidth, cardY + cardHeight]], color, width: 0.7, dash, dataRef: event.ref, status, role: 'timeline-card-rule' });

    draw.layer('type');
    typeBlock(draw, event.time ?? '', {
      x: cardX + 12, y: cardY + 20, width: 92, size: 8.5, kind: 'mono', maxChars: 14, fill: palette.mist,
      dataRef: event.ref, status, role: 'timeline-time'
    });
    typeBlock(draw, status === 'supported' ? '事实' : status === 'inferred' ? '推断' : '未知', {
      x: cardX + cardWidth - 44, y: cardY + 20, width: 32, size: 8.5, maxChars: 4, fill: color,
      dataRef: event.ref, status, role: 'timeline-status'
    });
    typeBlock(draw, event.label, {
      x: cardX + 12, y: cardY + 52, width: cardWidth - 22, size: 14, lineHeight: 17, maxChars: 15,
      fill: palette.ink, dataRef: event.ref, status, role: 'timeline-label'
    });

    // 轴点：外环 + 实心
    draw.layer('subject');
    tickDot(draw, { x: tickX, y: axisY, r: 5.2, color: status === 'supported' ? palette.teal : palette.amber, dataRef: event.ref, status });
    tickDot(draw, { x: tickX, y: axisY, r: 2.1, color: '#FFFFFF', dataRef: event.ref, status });
    line(draw, { points: [[tickX, axisY], [tickX, cardY + cardHeight]], color, width: 0.7, dash, dataRef: event.ref, status, role: 'timeline-stem' });

    // 原文条：每列一块浅色底，行号 + 原文
    if (event.excerpt) {
      const exY = 378;
      const exH = 42;
      draw.layer('env');
      rect(draw, { x: cardX, y: exY, width: cardWidth, height: exH, fill: '#FFFFFF', dataRef: event.ref, status, role: 'timeline-excerpt-block' });
      draw.layer('type');
      typeBlock(draw, event.lineRef ?? '', {
        x: cardX + 8, y: exY + 13, width: 42, size: 7.5, maxChars: 5, fill: color, dataRef: event.ref, status, role: 'timeline-line-ref'
      });
      typeBlock(draw, event.excerpt, {
        x: cardX + 8, y: exY + 27, width: cardWidth - 14, size: 7.2, lineHeight: 8.6, maxChars: 38,
        kind: 'mono', fill: palette.tone, dataRef: event.ref, status, role: 'timeline-excerpt'
      });
      scope.add({ id: event.id, kind: 'state', bbox: [cardX, cardY, cardX + cardWidth, exY + exH], lineStyle: status === 'supported' ? 'solid' : 'dashed', label: event.label });
    } else {
      scope.add({ id: event.id, kind: 'state', bbox: [cardX, cardY, cardX + cardWidth, cardY + cardHeight], lineStyle: status === 'supported' ? 'solid' : 'dashed', label: event.label });
    }
  });

  // ---- 缺证据三处：一个虚线容器，三段并列 ----
  const notes = art.view.notes ?? [];
  if (notes.length) {
    const noteY = 444;
    const noteH = 52;
    draw.layer('env');
    rect(draw, { x: left, y: noteY, width: right - left, height: noteH, fill: 'none', stroke: palette.amber, strokeWidth: 0.7, dash: '6 4', dataRef: notes[0].ref, status: 'unknown', role: 'notes-band' });
    draw.layer('type');
    const colW = (right - left) / notes.length;
    notes.forEach((note, i) => {
      const colX = left + colW * i;
      if (i > 0) {
        draw.layer('grid');
        line(draw, { points: [[colX, noteY + 8], [colX, noteY + noteH - 8]], color: palette.amber, width: 0.7, dataRef: note.ref, status: 'unknown', role: 'notes-sep' });
        draw.layer('type');
      }
      typeBlock(draw, note.label ?? '', {
        x: colX + 14, y: noteY + 26, width: colW - 26, size: 9.5, lineHeight: 13, maxChars: 26,
        fill: palette.amber, dataRef: note.ref, status: 'unknown', role: 'note'
      });
      scope.add({ id: note.id, kind: 'unknown', bbox: [colX, noteY, colX + colW, noteY + noteH], lineStyle: 'dashed', label: note.label });
    });
  }

  // ---- 结论：左侧色条 + 更大的字 ----
  const conclusionY = 516;
  draw.layer('env');
  rect(draw, { x: left, y: conclusionY, width: right - left, height: 56, fill: '#F3F1E9', dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'conclusion-band' });
  rect(draw, { x: left, y: conclusionY, width: 3, height: 56, fill: palette.teal, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'conclusion-bar' });
  draw.layer('type');
  typeBlock(draw, art.mainConclusion.text, {
    x: left + 18, y: conclusionY + 32, width: 1060, size: 15, lineHeight: 20, maxChars: 62,
    fill: palette.ink, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'conclusion'
  });
  const claimEl = (art.view.elements ?? []).find(e => e.ref === art.mainConclusion.claimRef);
  scope.add({ id: claimEl?.id ?? art.mainConclusion.claimRef, kind: 'claim', bbox: [left, conclusionY, right, conclusionY + 56], lineStyle: 'solid', label: art.mainConclusion.text });

  draw.layer('grid');
  line(draw, { points: [[left, 596], [right, 596]], color: '#CFCCC2', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'footer-rule' });
  renderSource(art, { draw, x: left, y: 624, width: 680 });
  renderLegend({ draw, x: 880, y: 624, width: 268 });

  draw.layer('texture');
  draw.emit(stock.grain);

  const textOverflow = draw.text.filter(item => item.box[0] < 32 || item.box[1] < 24 || item.box[2] > width - 12 || item.box[3] > height - 5 || item.box[2] - item.box[0] > item.width + 0.01);
  if (textOverflow.length) throw new Error(`timeline 文字超框：${textOverflow.map(item => item.text).join('、')}`);
  const contrast = {
    ink: contrastRatio(palette.ink, palette.paper),
    tone: contrastRatio(palette.tone, palette.paper),
    teal: contrastRatio(palette.teal, palette.paper),
    amberText: contrastRatio(palette.amber, palette.paper)
  };
  if (contrast.ink < 4.5 || contrast.tone < 4.5 || contrast.teal < 4.5) throw new Error(`timeline 文字对比度不足：${JSON.stringify(contrast)}`);

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
    metrics: { textCount: draw.text.length, textOverflow, contrast, evidenceCount: art.evidence.length, maxContentY: Math.max(...draw.text.map(item => item.box[3]), ...scope.elements.map(item => item.bbox[3])) },
    svg: { file: `${art.id}.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) }
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${art.id}.svg`), svg);
  writeFileSync(join(outDir, `${art.id}.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  return scene;
}

function renderTimelineMobile(art, outDir, semanticReport) {
  const { draw, stock } = makeDraw(art);
  const scope = makeScope(art);
  const width = 390;
  const height = 860;
  const events = art.view.events ?? [];

  draw.layer('paper');
  rect(draw, { x: 0, y: 0, width, height, fill: palette.paper, dataRef: 'c-main', status: 'supported', role: 'background' });
  draw.layer('type');
  typeBlock(draw, `技术文章解释图 · ${art.source.date}`, {
    x: 16, y: 28, width: 280, size: 8, maxChars: 30, fill: palette.tone, dataRef: 'c-main', status: 'supported', role: 'eyebrow'
  });
  typeBlock(draw, art.copy.title, {
    x: 16, y: 58, width: 358, size: 22, lineHeight: 28, maxChars: 18, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'title'
  });
  typeBlock(draw, art.copy.subtitle, {
    x: 16, y: 124, width: 358, size: 10.5, maxChars: 32, fill: palette.teal, dataRef: 'c-main', status: 'supported', role: 'subtitle'
  });
  typeBlock(draw, art.view.axisTitle, {
    x: 16, y: 152, width: 340, size: 10, maxChars: 24, fill: palette.ink, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'axis-title'
  });

  const axisX = 34;
  const firstY = 172;
  const step = 106;
  const cardWidth = 300;
  const cardHeight = 104;

  draw.layer('subject');
  line(draw, { points: [[axisX, firstY - 12], [axisX, firstY + step * (events.length - 1) + 12]], color: palette.teal, width: 1.4, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'timeline-axis' });

  events.forEach((event, index) => {
    const tickY = firstY + step * index;
    const cardY = tickY;
    tickDot(draw, { x: axisX, y: tickY, r: 4, color: palette.ink, dataRef: event.ref, status: eventStatus(art, event).status });
    line(draw, { points: [[axisX, tickY], [axisX + 18, cardY + cardHeight / 2]], color: eventStatus(art, event).color, width: 1, dash: eventStatus(art, event).dash, dataRef: event.ref, status: eventStatus(art, event).status, role: 'timeline-stem' });
    timelineCard(art, scope, { draw, event, x: axisX + 18, y: cardY, width: cardWidth, height: cardHeight, below: false, withExcerpt: true });
  });

  renderNotes(art, scope, { draw, notes: art.view.notes, x: 16, y: firstY + step * (events.length - 1) + cardHeight + 14, width: 358, height: 15, gap: 3, stacked: true });
  renderConclusion(art, scope, {
    draw, x: 16, y: 806, width: 358, maxChars: 30,
    text: art.copy?.mobileConclusion || art.mainConclusion.text
  });
  renderSource(art, { draw, x: 16, y: 844, width: 170, compact: true });
  renderLegend({ draw, x: 200, y: 844, width: 174, compact: true });

  draw.layer('texture');
  draw.emit(`<rect width="${width}" height="${height}" fill="${palette.paper}" filter="url(#paper-grain)" opacity="0.032"/>`);

  const textOverflow = draw.text.filter(item => item.box[0] < 12 || item.box[1] < 12 || item.box[2] > width - 12 || item.box[3] > height - 2 || item.box[2] - item.box[0] > item.width + 0.01);
  if (textOverflow.length) throw new Error(`timeline 移动版文字超框：${textOverflow.map(item => item.text).join('、')}`);

  assertCoverage(art, scope.elements);

  const format = entries => entries.map(entry => `    ${entry}`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="mobile-scene-title mobile-scene-desc" xml:lang="zh-CN">
  <title id="mobile-scene-title">${esc(art.source.title)}</title>
  <desc id="mobile-scene-desc">${esc(art.intent)}</desc>
  <defs>${stock.defs}</defs>
${layers.map(layer => `  <g id="${layer}">\n${format(draw.groups[layer])}\n  </g>`).join('\n')}
</svg>\n`;
  const scene = {
    version: 2,
    id: `${art.id}.mobile`,
    grammar: art.view.grammar,
    seed: art.seed,
    canvas: { width, height, viewBox: `0 0 ${width} ${height}` },
    source: art.source,
    focus: art.view.focus,
    elements: scope.elements,
    metrics: { textCount: draw.text.length, textOverflow, evidenceCount: art.evidence.length, maxContentY: Math.max(...draw.text.map(item => item.box[3]), ...scope.elements.map(item => item.bbox[3])), maxHeight: height, semanticChecks: semanticReport.checks },
    svg: { file: `${art.id}.mobile.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) }
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${art.id}.mobile.svg`), svg);
  writeFileSync(join(outDir, `${art.id}.mobile.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  return scene;
}

function renderStateDesktop(art, outDir, semanticReport) {
  const { draw, stock } = makeDraw(art);
  const scope = makeScope(art);
  const width = canvas.width;
  const height = canvas.height;
  const left = 52;
  const right = 1148;

  draw.layer('paper');
  draw.emit(stock.base);

  // ---- 页眉：标题压在上，读数退到右肩 ----
  draw.layer('type');
  typeBlock(draw, `技术文章解释图 · ${art.source.date}`, {
    x: left, y: 44, width: 360, size: 9.5, maxChars: 42, fill: palette.mist, dataRef: 'c-main', status: 'supported', role: 'eyebrow'
  });
  typeBlock(draw, art.copy.title, {
    x: left, y: 84, width: 720, size: 32, lineHeight: 38, spacing: 0.6, maxChars: 22, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'title'
  });
  typeBlock(draw, art.copy.subtitle, {
    x: left, y: 152, width: 620, size: 12.5, maxChars: 40, fill: palette.teal, dataRef: 'c-main', status: 'supported', role: 'subtitle'
  });

  // 读数条：只放 spec 里已有的数与计数，不编造
  const metrics = art.metrics ?? [];
  const notes = art.view.notes ?? [];
  const readings = [
    ...metrics.map(item => ({ value: String(item.value), unit: item.unit ?? '次', label: item.label })),
    notes.length ? { value: String(notes.length), unit: '处', label: '未知' } : null
  ].filter(Boolean);
  const cellW = 86;
  const cellGap = 20;
  const totalW = readings.length * cellW + (readings.length - 1) * cellGap;
  const readX = right - totalW;
  readings.forEach((reading, index) => {
    const x = readX + index * (cellW + cellGap);
    typeBlock(draw, reading.value, {
      x, y: 88, width: cellW, size: 24, maxChars: 4, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'reading-value'
    });
    const labelText = `${reading.unit} · ${reading.label}`;
    typeBlock(draw, labelText, {
      x, y: 110, width: cellW + 12, size: labelText.length > 14 ? 7.2 : 8.5, maxChars: Math.max(18, labelText.length),
      fill: palette.mist, dataRef: 'c-main', status: 'supported', role: 'reading-label'
    });
    if (index > 0) {
      draw.layer('grid');
      line(draw, { points: [[x - cellGap / 2, 68], [x - cellGap / 2, 112]], color: '#CFCCC2', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'reading-rule' });
      draw.layer('type');
    }
  });

  draw.layer('grid');
  line(draw, { points: [[left, 168], [right, 168]], color: '#CFCCC2', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'header-rule' });

  draw.layer('type');
  typeBlock(draw, art.view.axisTitle ?? art.copy.series, {
    x: left, y: 190, width: 640, size: 12.5, maxChars: 34, fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'section-title'
  });

  // ---- 图区：浅色底带托住四组状态 ----
  const bandTop = 206;
  const bandBottom = 362;
  draw.layer('env');
  rect(draw, { x: left, y: bandTop, width: right - left, height: bandBottom - bandTop, fill: '#F3F1E9', dataRef: 'c-main', status: 'supported', role: 'state-band' });
  draw.layer('grid');
  line(draw, { points: [[left, bandTop], [right, bandTop]], color: '#D9D5C8', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'band-rule' });
  line(draw, { points: [[left, bandBottom], [right, bandBottom]], color: '#D9D5C8', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'band-rule' });

  const laneWidth = Math.floor((right - left - 3 * 20) / 4);
  renderLanes(art, scope, { draw, x: left, y: bandTop + 15, width: laneWidth, height: 126, columns: 4, gapX: 20, gapY: 0 });

  // ---- 动作链：单行 6 步 ----
  const loopTitleY = 384;
  const stepWidth = Math.floor((right - left - 5 * 8) / 6);
  renderLoop(art, scope, { draw, x: left, y: 400, width: stepWidth, height: 46, columns: 6, gapX: 8, gapY: 0, titleY: loopTitleY });

  renderEdge(art, scope, { draw, x: left, y: 458, width: right - left, height: 44 });

  // ---- 缺证据：一个虚线容器 + 两段细竖线 + 三列文案 ----
  const noteTop = 514;
  const noteH = 38;
  const colW = (right - left) / Math.max(1, notes.length);
  draw.layer('prop');
  rect(draw, { x: left, y: noteTop, width: right - left, height: noteH, fill: 'none', stroke: palette.amber, strokeWidth: 1, dash: '7 5', dataRef: notes[0]?.ref ?? 'c-main', status: 'unknown', role: 'unknown' });
  notes.forEach((note, index) => {
    const colX = left + index * colW;
    if (index > 0) {
      draw.layer('grid');
      line(draw, { points: [[colX, noteTop + 6], [colX, noteTop + noteH - 6]], color: '#D9D5C8', width: 0.7, dataRef: note.ref, status: 'unknown', role: 'unknown-rule' });
    }
    draw.layer('type');
    typeBlock(draw, note.label, {
      x: colX + 14, y: noteTop + 24, width: colW - 28,
      size: 9.5, maxChars: textMax(colW - 28, 9.5, 34), fill: palette.amber, dataRef: note.ref, status: 'unknown', role: 'unknown-label'
    });
    scope.add({ id: note.id, kind: 'unknown', bbox: [colX + 2, noteTop, colX + colW - 2, noteTop + noteH], lineStyle: 'dashed', label: note.label });
  });

  // ---- 结论：左色条 + 更大的字 ----
  const conclusionY = 564;
  const conclusionH = 54;
  draw.layer('env');
  rect(draw, { x: left, y: conclusionY, width: right - left, height: conclusionH, fill: '#F3F1E9', dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'conclusion-band' });
  rect(draw, { x: left, y: conclusionY, width: 3, height: conclusionH, fill: palette.teal, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'conclusion-bar' });
  draw.layer('type');
  typeBlock(draw, art.mainConclusion.text, {
    x: left + 18, y: conclusionY + 31, width: 1060, size: 15, lineHeight: 20, maxChars: 62,
    fill: palette.ink, dataRef: art.mainConclusion.claimRef, status: 'supported', role: 'conclusion'
  });
  const claimEl = (art.view.elements ?? []).find(item => item.ref === art.mainConclusion.claimRef);
  scope.add({ id: claimEl?.id ?? art.mainConclusion.claimRef, kind: 'claim', bbox: [left, conclusionY, right, conclusionY + conclusionH], lineStyle: 'solid', label: art.mainConclusion.text });

  draw.layer('grid');
  line(draw, { points: [[left, 630], [right, 630]], color: '#CFCCC2', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'footer-rule' });
  renderSource(art, { draw, x: left, y: 648, width: 680 });
  renderLegend({ draw, x: 878, y: 648, width: 270 });

  draw.layer('texture');
  draw.emit(stock.grain);

  const textOverflow = draw.text.filter(line => line.box[0] < 32 || line.box[1] < 24 || line.box[2] > width - 12 || line.box[3] > height - 5 || line.box[2] - line.box[0] > line.width + 0.01);
  if (textOverflow.length) throw new Error(`state 文字超框：${textOverflow.map(line => line.text).join('、')}`);
  const contrast = {
    ink: contrastRatio(palette.ink, palette.paper),
    tone: contrastRatio(palette.tone, palette.paper),
    teal: contrastRatio(palette.teal, palette.paper),
    amberText: contrastRatio(palette.amber, palette.paper)
  };
  if (contrast.ink < 4.5 || contrast.tone < 4.5 || contrast.teal < 4.5) throw new Error(`state 文字对比度不足：${JSON.stringify(contrast)}`);

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
    metrics: { textCount: draw.text.length, textOverflow, contrast, evidenceCount: art.evidence.length, maxContentY: Math.max(...draw.text.map(item => item.box[3]), ...scope.elements.map(item => item.bbox[3])) },
    svg: { file: `${art.id}.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) }
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${art.id}.svg`), svg);
  writeFileSync(join(outDir, `${art.id}.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  return scene;
}

function renderStateMobile(art, outDir, semanticReport) {
  const { draw, stock } = makeDraw(art);
  const scope = makeScope(art);
  const width = 390;
  const height = 860;
  const left = 16;
  const right = 374;
  const notes = art.view.notes ?? [];

  draw.layer('paper');
  rect(draw, { x: 0, y: 0, width, height, fill: palette.paper, dataRef: 'c-main', status: 'supported', role: 'background' });
  draw.layer('type');

  typeBlock(draw, `技术文章解释图 · ${art.source.date}`, {
    x: left, y: 26, width: 280, size: 8, maxChars: 30, fill: palette.mist, dataRef: 'c-main', status: 'supported', role: 'eyebrow'
  });
  typeBlock(draw, art.copy.title, {
    x: left, y: 56, width: 358, size: 22, lineHeight: 28, spacing: 0.3, maxChars: 18, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'title'
  });
  typeBlock(draw, art.copy.subtitle, {
    x: left, y: 124, width: 358, size: 10.5, maxChars: 34, fill: palette.teal, dataRef: 'c-main', status: 'supported', role: 'subtitle'
  });

  // 读数一行三项，与桌面同一口径
  const metrics = art.metrics ?? [];
  const readings = [
    ...metrics.map(item => ({ value: String(item.value), unit: item.unit ?? '次', label: item.label })),
    notes.length ? { value: String(notes.length), unit: '处', label: '未知' } : null
  ].filter(Boolean);
  const cellW = Math.floor((right - left - (readings.length - 1) * 14) / Math.max(1, readings.length));
  readings.forEach((reading, index) => {
    const x = left + index * (cellW + 14);
    typeBlock(draw, reading.value, {
      x, y: 150, width: cellW, size: 17, maxChars: 4, kind: 'title', fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'reading-value'
    });
    const labelText = `${reading.unit} · ${reading.label}`;
    typeBlock(draw, labelText, {
      x, y: 166, width: cellW + 8, size: labelText.length > 10 ? 7 : 8, maxChars: Math.max(12, labelText.length),
      fill: palette.mist, dataRef: 'c-main', status: 'supported', role: 'reading-label'
    });
    if (index > 0) {
      draw.layer('grid');
      line(draw, { points: [[x - 7, 136], [x - 7, 170]], color: '#CFCCC2', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'reading-rule' });
      draw.layer('type');
    }
  });

  draw.layer('grid');
  line(draw, { points: [[left, 182], [right, 182]], color: '#CFCCC2', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'header-rule' });

  draw.layer('type');
  typeBlock(draw, art.view.axisTitle ?? art.copy.series, {
    x: left, y: 202, width: 358, size: 10.5, maxChars: 30, fill: palette.ink, dataRef: 'c-main', status: 'supported', role: 'section-title'
  });

  // 图区底带
  draw.layer('env');
  rect(draw, { x: left, y: 212, width: right - left, height: 250, fill: '#F3F1E9', dataRef: 'c-main', status: 'supported', role: 'state-band' });
  draw.layer('grid');
  line(draw, { points: [[left, 212], [right, 212]], color: '#D9D5C8', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'band-rule' });
  line(draw, { points: [[left, 462], [right, 462]], color: '#D9D5C8', width: 0.7, dataRef: 'c-main', status: 'supported', role: 'band-rule' });

  renderLanes(art, scope, { draw, x: left, y: 222, width: 174, height: 112, columns: 2, gapX: 10, gapY: 10 });

  // 动作链：手机版压成带格线的编号列表
  const loop = art.view.loop;
  draw.layer('type');
  typeBlock(draw, loop.title, {
    x: left, y: 490, width: 358, size: 12, maxChars: 16, fill: palette.ink, dataRef: loop.ref, status: 'supported', role: 'loop-title'
  });
  const stepRows = loop.steps ?? [];
  stepRows.forEach((step, index) => {
    const rowY = 512 + index * 21;
    draw.layer('type');
    typeBlock(draw, `${String(index + 1).padStart(2, '0')}`, {
      x: left, y: rowY, width: 22, size: 8, kind: 'mono', maxChars: 2, fill: palette.teal, dataRef: step.ref, status: 'supported', role: 'step-index'
    });
    typeBlock(draw, step.label, {
      x: left + 30, y: rowY, width: 328, size: 11.5, maxChars: 26, fill: palette.ink, dataRef: step.ref, status: 'supported', role: 'step-label'
    });
    draw.layer('grid');
    line(draw, { points: [[left, rowY + 7], [right, rowY + 7]], color: '#E4E0D4', width: 0.6, dataRef: step.ref, status: 'supported', role: 'step-rule' });
    scope.add({ id: step.id, kind: 'node', bbox: [left, rowY - 13, right, rowY + 8], label: step.label });
  });

  renderEdge(art, scope, { draw, x: left, y: 640, width: right - left, height: 42, compact: true });

  // 缺证据：一个虚线容器 + 两段细竖线
  const noteTop = 696;
  const noteH = 56;
  draw.layer('prop');
  rect(draw, { x: left, y: noteTop, width: right - left, height: noteH, fill: 'none', stroke: palette.amber, strokeWidth: 1, dash: '7 5', dataRef: notes[0]?.ref ?? 'c-main', status: 'unknown', role: 'unknown' });
  notes.forEach((note, index) => {
    const rowY = noteTop + 17 + index * 16;
    draw.layer('type');
    typeBlock(draw, note.label, {
      x: left + 12, y: rowY, width: right - left - 24, size: 8.5, maxChars: 38, fill: palette.amber, dataRef: note.ref, status: 'unknown', role: 'unknown-label'
    });
    scope.add({ id: note.id, kind: 'unknown', bbox: [left + 2, rowY - 12, right - 2, rowY + 4], lineStyle: 'dashed', label: note.label });
  });

  // 结论
  const claimRef = art.mainConclusion.claimRef;
  const claimStatus = semanticStatus(art, claimRef);
  draw.layer('env');
  rect(draw, { x: left, y: 764, width: right - left, height: 58, fill: '#F3F1E9', dataRef: claimRef, status: claimStatus, role: 'conclusion-band' });
  rect(draw, { x: left, y: 764, width: 2.6, height: 46, fill: palette.teal, dataRef: claimRef, status: claimStatus, role: 'conclusion-bar' });
  draw.layer('type');
  const conclusionText = art.copy?.mobileConclusion || art.mainConclusion.text;
  const conclusionLines = typeBlock(draw, conclusionText, {
    x: left + 12, y: 776, width: 346, size: 13, lineHeight: 17, maxChars: 26, fill: palette.ink,
    dataRef: claimRef, status: claimStatus, role: 'conclusion'
  });
  const claimEl = (art.view.elements ?? []).find(item => item.ref === claimRef);
  scope.add({ id: claimEl?.id ?? claimRef, kind: 'claim', bbox: [left, 764, right, 776 + (conclusionLines.length - 1) * 17 + 4], lineStyle: 'solid', label: conclusionText });

  const footerY = 776 + (conclusionLines.length - 1) * 17 + 18;
  renderSource(art, { draw, x: left, y: footerY, width: 358, compact: true });
  renderLegend({ draw, x: left, y: footerY + 18, width: 358, compact: true });

  draw.layer('texture');
  draw.emit(`<rect width="${width}" height="${height}" fill="${palette.paper}" filter="url(#paper-grain)" opacity="0.032"/>`);

  const textOverflow = draw.text.filter(line => line.box[0] < 12 || line.box[1] < 12 || line.box[2] > width - 12 || line.box[3] > height - 2 || line.box[2] - line.box[0] > line.width + 0.01);
  if (textOverflow.length) throw new Error(`state 移动版文字超框：${textOverflow.map(line => line.text).join('、')}`);
  const contrast = {
    ink: contrastRatio(palette.ink, palette.paper),
    tone: contrastRatio(palette.tone, palette.paper),
    teal: contrastRatio(palette.teal, palette.paper),
    amberText: contrastRatio(palette.amber, palette.paper)
  };
  if (contrast.ink < 4.5 || contrast.tone < 4.5 || contrast.teal < 4.5) throw new Error(`state 移动版文字对比度不足：${JSON.stringify(contrast)}`);

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

export function buildState(art, outDir, semanticReport) {
  if (art.view.grammar === 'timeline') {
    return {
      desktop: renderTimelineDesktop(art, outDir, semanticReport),
      mobile: renderTimelineMobile(art, outDir, semanticReport)
    };
  }
  return {
    desktop: renderStateDesktop(art, outDir, semanticReport),
    mobile: renderStateMobile(art, outDir, semanticReport)
  };
}
