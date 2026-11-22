import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { palette as ink, paper, layout, typeBlock } from './lib/ink.mjs';
import { assembleScene, writeScene } from './lib/emit.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'out');

const art = {
  id: 'iso-rebuild',
  seed: 412907,
  intent: '左侧三张制图底稿（平面、剖面、轴测）指向右侧被逐层挤出的四层切片；最上层一面墙正被抬起，琥珀色只标记这一次抬升。',
  camera: { origin: [700, 500], angles: [-30, -15] },
  focus: { target: 'lift.wall', thirdsAnchor: [886, 190] },
  copy: {
    title: '平面图站起来',
    subtitle: '一张 SVG，挤出四层空间',
    series: '制图手记',
    index: '02 / 06',
    stages: ['平面', '剖面', '轴测'],
    parameters: '1200 × 675   /   −30° · −15°'
  }
};

const levels = [
  { z: 20, mode: 'plan' },
  { z: 60, mode: 'ring' },
  { z: 100, mode: 'rooms' },
  { z: 140, mode: 'built' }
];
const slab = { w: 400, d: 280, t: 12 };

const fixed = point => point.map(value => Number(value.toFixed(2))).join(' ');

function screenPoly(draw, layer, vertices, { fill = 'none', edge = 'none', width = 1.4, opacity = 1 } = {}) {
  draw.layer(layer);
  const closed = vertices.concat([vertices[0]]);
  draw.emit(`<path d="M${closed.map(fixed).join('L')}" fill="${fill}"${edge === 'none' ? '' : ` stroke="${edge}" stroke-width="${width}"`} stroke-linejoin="round"${opacity === 1 ? '' : ` opacity="${opacity}"`}/>`);
}

function screenLine(draw, layer, a, b, { color = ink.mist, width = 0.7, opacity = 1 } = {}) {
  draw.layer(layer);
  draw.emit(`<path d="M${a.map(v => Number(v.toFixed(2))).join(' ')}L${b.map(v => Number(v.toFixed(2))).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}"${opacity === 1 ? '' : ` opacity="${opacity}"`}/>`);
}

function box(draw, [x, y, z], w, d, h, { top = ink.paper, left = ink.tone, right = ink.ink, edge = ink.ink, width = 1.4, texture = false } = {}) {
  draw.poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], { fill: top, edge, width, texture, opacity: texture ? 0.22 : 1 });
  draw.poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], { fill: left, edge, width: 0.7 });
  draw.poly([[x, y, z], [x, y + d, z], [x, y + d, z + h], [x, y, z + h]], { fill: right, edge, width: 0.7 });
}

const plan = (draw, z) => {
  const line3 = (a, b) => draw.line([a[0], a[1], z], [b[0], b[1], z], { color: ink.mist, width: 0.7, opacity: 0.85 });
  line3([0, 0], [400, 0]);
  line3([400, 0], [400, 280]);
  line3([400, 280], [0, 280]);
  line3([0, 280], [0, 0]);
  line3([180, 0], [180, 280]);
  line3([180, 150], [400, 150]);
  for (let x = 30; x < 400; x += 30) line3([x, 0], [x, 8]);
  for (let y = 30; y < 280; y += 30) line3([0, y], [8, y]);
  draw.line([0, 0, z], [400, 0, z], { color: ink.teal, width: 0.7, opacity: 0.35 });
  draw.line([0, 0, z], [0, 280, z], { color: ink.teal, width: 0.7, opacity: 0.35 });
};

function walls(draw, z, counter, mode) {
  const ring = [
    [0, 0, 130, 0], [160, 0, 400, 0],
    [0, 280, 400, 280],
    [0, 0, 0, 120], [0, 160, 0, 280],
    [400, 0, 400, 280]
  ];
  const rooms = [[180, 0, 180, 96], [180, 140, 180, 280], [180, 150, 392, 150]];
  const list = mode === 'ring' ? ring.slice(0, 4) : mode === 'rooms' ? ring.concat([rooms[0], rooms[1]]) : ring.concat(rooms);
  for (const [x1, y1, x2, y2] of list) {
    const horizontal = y1 === y2;
    const length = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
    const thick = 9;
    const height = mode === 'ring' ? 10 : mode === 'rooms' ? 16 : 22;
    if (horizontal) box(draw, [Math.min(x1, x2), y1 - thick / 2, z], length, thick, height, { left: ink.tone, right: ink.ink });
    else box(draw, [x1 - thick / 2, Math.min(y1, y2), z], thick, length, height, { left: ink.ink, right: ink.tone });
    counter.walls += 1;
  }
}

function panels(draw) {
  for (const [index, y] of [86, 214, 342].entries()) {
    screenPoly(draw, 'env', [[56, y], [272, y], [272, y + 96], [56, y + 96]], { fill: ink.paper, edge: ink.mist, width: 0.7 });
    const x0 = 68, y0 = y + 9;
    if (index === 0) {
      const w = 188, h = 68;
      screenPoly(draw, 'env', [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], { edge: ink.ink, width: 0.7 });
      screenLine(draw, 'env', [x0 + 88, y0], [x0 + 88, y0 + h], { color: ink.tone });
      screenLine(draw, 'env', [x0 + 88, y0 + 38], [x0 + w, y0 + 38], { color: ink.tone });
      for (let i = 14; i < w; i += 24) screenLine(draw, 'env', [x0 + i, y0], [x0 + i, y0 + 6], { color: ink.mist });
      for (let i = 12; i < h; i += 18) screenLine(draw, 'env', [x0, y0 + i], [x0 + 6, y0 + i], { color: ink.mist });
    } else if (index === 1) {
      const base = y0 + 46;
      screenLine(draw, 'env', [x0, base], [x0 + 188, base], { color: ink.ink });
      for (const [ax, ah] of [[0, 28], [48, 28], [98, 40], [150, 40]]) {
        screenPoly(draw, 'env', [[x0 + ax, base], [x0 + ax + 38, base], [x0 + ax + 38, base - ah], [x0 + ax, base - ah]], { fill: ink.paper, edge: ink.ink, width: 0.7 });
        for (let i = 6; i < 38; i += 8) screenLine(draw, 'env', [x0 + ax + i, base], [x0 + ax + i, base - ah], { color: ink.mist, opacity: 0.45 });
        screenLine(draw, 'env', [x0 + ax, base - ah - 30], [x0 + ax, base - ah - 22], { color: ink.mist });
      }
      screenLine(draw, 'env', [x0, base - 62], [x0 + 196, base - 62], { color: ink.teal, opacity: 0.55 });
    } else {
      const cx = x0 + 96, cy = y0 + 58;
      const plate = (lift) => {
        const p = (dx, dz) => [cx + dx, cy + dz * 0.5 - dx * 0.26 + lift];
        return [[p(-66, 0), p(0, 0), p(0, 26), p(-66, 26)], [p(0, 0), p(66, 0), p(66, 26), p(0, 26)]];
      };
      for (const [index2, lift] of [[0, 8], [1, 15], [2, 22]]) {
        const [left, right] = plate(lift);
        screenPoly(draw, 'env', left, { fill: ink.paper, edge: index2 === 2 ? ink.teal : ink.mist, width: index2 === 2 ? 1.4 : 0.7 });
        screenPoly(draw, 'env', right, { fill: ink.paper, edge: ink.mist, width: 0.7 });
      }
      screenLine(draw, 'env', [cx - 60, cy + 38], [cx + 60, cy + 8], { color: ink.amber, width: 0.7, opacity: 0.8 });
      screenPoly(draw, 'env', [[cx, cy + 28], [cx + 18, cy + 10], [cx + 28, cy + 28], [cx + 10, cy + 46]], { fill: ink.paper, edge: ink.teal, width: 0.7 });
    }
    draw.layer('type');
    typeBlock(draw, `0${index + 1}  ${art.copy.stages[index]}`, { x: 56, y: y + 114, size: 11, kind: 'mono', width: 216, fill: ink.tone, maxChars: 12 });
  }
}

export function renderIso() {
  const draw = layout(art.camera, art.seed);
  const stock = paper(art.seed);
  draw.emit(stock.base);
  const counter = { walls: 0 };

  draw.layer('grid');
  const guide = { color: ink.mist, width: 0.7, opacity: 0.42 };
  for (let x = 0; x <= 400; x += 40) draw.line([x, 0, 12], [x, 280, 12], guide);
  for (let y = 0; y <= 280; y += 40) draw.line([0, y, 12], [400, y, 12], guide);
  draw.line([0, 0, 174], [0, 0, 12], { color: ink.mist, width: 0.7, opacity: 0.55 });
  draw.line([400, 0, 174], [400, 0, 12], { color: ink.mist, width: 0.7, opacity: 0.35 });

  draw.layer('env');
  panels(draw);

  draw.layer('subject');
  for (const [index, level] of levels.entries()) {
    const { z, mode } = level;
    box(draw, [0, 0, z], slab.w, slab.d, slab.t, { top: ink.paper, left: ink.tone, right: ink.ink, edge: ink.ink, width: mode === 'plan' ? 2.4 : 1.4 });
    if (mode === 'plan') plan(draw, z + slab.t);
    else {
      draw.poly([[0, 0, z + slab.t], [400, 0, z + slab.t], [400, 280, z + slab.t], [0, 280, z + slab.t]], { texture: true, opacity: index === 3 ? 0.2 : 0.12 });
      walls(draw, z + slab.t, counter, mode);
    }
    draw.layer('type');
    const anchor = draw.project([418, 292, z + 4]);
    typeBlock(draw, `0${levels.length - index}`, { x: anchor[0] - 6, y: anchor[1] + 4, size: 10, kind: 'mono', width: 24, fill: ink.tone });
  }

  draw.layer('subject');
  draw.poly([[18, 0, 174], [148, 0, 174], [148, 0, 196], [18, 0, 196]], { fill: ink.amber, edge: ink.ink, width: 1.4 });
  draw.line([18, 0, 196], [148, 0, 196], { color: ink.ink, width: 0.7 });
  for (const x of [36, 66, 96, 126]) draw.line([x, 0, 196], [x, 0, 200], { color: ink.paper, width: 0.7, opacity: 0.8 });

  draw.layer('type');
  typeBlock(draw, art.copy.series, { x: 66, y: 60, size: 13, width: 200, spacing: 2.5, weight: 600, fill: ink.teal });
  typeBlock(draw, art.copy.index, { x: 66, y: 82, size: 11, kind: 'mono', width: 120, spacing: 1.25, fill: ink.tone });
  const dims = levels.map(level => draw.project([400, 0, level.z + slab.t]));
  const top = dims[0], bottom = dims[dims.length - 1];
  for (const point of dims) screenLine(draw, 'type', [point[0] + 8, point[1]], [point[0] + 30, point[1]], { color: ink.mist });
  screenLine(draw, 'type', [top[0] + 30, top[1]], [bottom[0] + 30, bottom[1]], { color: ink.mist });
  typeBlock(draw, `${top[1] > bottom[1] ? '' : ''}${Math.abs(dims[0][1] - dims[3][1]).toFixed(0)}`, { x: top[0] + 34, y: (top[1] + bottom[1]) / 2 + 4, size: 10, kind: 'mono', width: 40, fill: ink.tone });
  typeBlock(draw, art.copy.parameters, { x: 900, y: 646, width: 240, maxChars: 40, size: 11, kind: 'mono', fill: ink.tone });
  typeBlock(draw, art.copy.title, { x: 64, y: 540, width: 380, size: 41, lineHeight: 46, kind: 'title' });
  const paths = Object.values(draw.groups).flat().filter(entry => entry.startsWith('<path')).length;
  typeBlock(draw, art.copy.subtitle, { x: 67, y: 598, width: 380, size: 15, spacing: 1.4, fill: ink.teal, maxChars: 30 });
  typeBlock(draw, `本图 ${paths} 条笔迹 · ${counter.walls} 面墙 · ${levels.length} 层切片`, { x: 67, y: 630, width: 380, size: 11, kind: 'mono', fill: ink.tone, maxChars: 34 });

  draw.layer('texture');
  draw.emit(stock.grain);

  const { scene, svg } = assembleScene({ art, draw, stock, focus: draw.project([340, 130, 210]), metrics: { walls: counter.walls, levels: levels.length } });
  return { scene, svg };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  mkdirSync(out, { recursive: true });
  const { scene, svg } = renderIso();
  writeScene(scene, svg, out);
  console.log(`${scene.svg.file} · ${scene.svg.bytes} B · sha1 ${scene.svg.sha1} · paths ${scene.counts.paths}`);
}
