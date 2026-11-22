import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { palette as ink, paper, layout, typeBlock, seeded } from './lib/ink.mjs';
import { assembleScene, writeScene } from './lib/emit.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'out');

const art = {
  id: 'inference-field',
  seed: 731109,
  intent: '四层推理平面由下往上依次是 latent、code、render、ship；一条墨线穿层而上，只在一个节点上着琥珀，表示当前这一步。',
  camera: { origin: [665, 470], angles: [-30, -15] },
  focus: { target: 'node.render', thirdsAnchor: [640, 250] },
  copy: {
    title: '推理不是黑箱',
    subtitle: '四层可见：latent · code · render · ship',
    series: '制图手记',
    index: '03 / 06',
    stages: ['latent', 'code', 'render', 'ship'],
    parameters: '1200 × 675   /   −30° · −15°'
  }
};

const planes = [
  { z: 60, name: 'latent', mode: 'scatter' },
  { z: 112, name: 'code', mode: 'cells' },
  { z: 164, name: 'render', mode: 'mesh' },
  { z: 216, name: 'ship', mode: 'rows' }
];
const width = 380, depth = 130, thickness = 8;

function box(draw, [x, y, z], w, d, h, { top = ink.paper, left = ink.tone, right = ink.ink, edge = ink.ink, lineWidth = 1.4 } = {}) {
  draw.poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], { fill: top, edge, width: lineWidth });
  draw.poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], { fill: left, edge, width: 0.7 });
  draw.poly([[x, y, z], [x, y + d, z], [x, y + d, z + h], [x, y, z + h]], { fill: right, edge, width: 0.7 });
}

const at = (x, y, z) => [x, y, z];

function content(draw, plane, random) {
  const { z, mode } = plane;
  const top = z + thickness;
  if (mode === 'scatter') {
    for (let index = 0; index < 16; index += 1) {
      const x = -172 + Math.round(random() * 344);
      const y = 12 + Math.round(random() * 120);
      const size = 5 + Math.round(random() * 6);
      draw.poly([[x, y, top], [x + size, y, top], [x + size, y + size, top], [x, y + size, top]], { fill: ink.paper, edge: index % 5 === 0 ? ink.teal : ink.mist, width: index % 5 === 0 ? 1.4 : 0.7 });
    }
    for (let index = 0; index < 5; index += 1) draw.line(at(-120 + index * 30, 24 + index * 7, top), at(-96 + index * 30, 46 + index * 7, top), { color: ink.mist, width: 0.7, opacity: 0.5 });
  } else if (mode === 'cells') {
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 13; column += 1) {
        const x = -178 + column * 27;
        const y = 18 + row * 34;
        const solid = (row + column) % 7 === 0;
        draw.poly([[x, y, top], [x + 20, y, top], [x + 20, y + 18, top], [x, y + 18, top]], solid ? { fill: ink.ink, edge: ink.ink } : { fill: ink.paper, edge: ink.mist, width: 0.7 });
      }
    }
    draw.line(at(-178, 118, top), at(178, 118, top), { color: ink.teal, width: 0.7, opacity: 0.6 });
  } else if (mode === 'mesh') {
    for (let index = 0; index < 6; index += 1) {
      const x = -175 + index * 58;
      const y = 26 + (index % 3) * 36;
      const a = [x, y, top], b = [x + 46, y, top], c = [x + 23, y + 30, top];
      draw.poly([a, b, c], { edge: ink.teal, width: 0.7, opacity: 0.85 });
      draw.line(a, c, { color: ink.mist, width: 0.7, opacity: 0.55 });
      draw.line(b, c, { color: ink.mist, width: 0.7, opacity: 0.55 });
    }
    draw.line(at(-178, 122, top), at(178, 122, top), { color: ink.ink, width: 0.7, opacity: 0.35 });
  } else {
    for (let row = 0; row < 3; row += 1) {
      const y = 20 + row * 34;
      draw.line(at(-176, y, top), at(-120, y, top), { color: ink.ink, width: 1.4 });
      draw.line(at(-176, y + 6, top), at(150 - row * 22, y + 6, top), { color: ink.mist, width: 0.7, opacity: 0.6 });
      draw.poly([[160, y - 2, top], [168, y - 2, top], [168, y + 6, top], [160, y + 6, top]], { fill: row === 0 ? ink.teal : ink.paper, edge: ink.ink, width: 0.7 });
      draw.line(at(162, y + 2, top), at(166, y + 8, top), { color: ink.paper, width: 0.7, opacity: 0.9 });
    }
    draw.line(at(-178, 110, top), at(178, 110, top), { color: ink.ink, width: 2.4 });
    draw.line(at(-178, 118, top), at(150, 118, top), { color: ink.teal, width: 0.7 });
  }
}

const thread = z => { const t = (z - 20) / 230; return [-140 + 250 * t, 20 + 100 * t, z]; };

export function renderField() {
  const draw = layout(art.camera, art.seed);
  const stock = paper(art.seed);
  draw.emit(stock.base);
  const random = seeded(art.seed);

  draw.layer('grid');
  for (const plane of planes) {
    for (let x = -240; x <= 240; x += 40) draw.line([x, 0, plane.z + thickness], [x, depth, plane.z + thickness], { color: ink.mist, width: 0.7, opacity: 0.26 });
  }
  draw.line(thread(24), thread(54), { color: ink.mist, width: 0.7, opacity: 0.35 });

  draw.layer('env');
  for (const plane of planes) {
    box(draw, [-width / 2, 0, plane.z], width, depth, thickness, { top: ink.paper, left: ink.tone, right: ink.ink, edge: ink.ink });
    draw.poly([[-width / 2, 0, plane.z + thickness], [width / 2, 0, plane.z + thickness], [width / 2, depth, plane.z + thickness], [-width / 2, depth, plane.z + thickness]], { texture: true, opacity: 0.16 });
  }

  draw.layer('subject');
  for (const plane of planes) {
    content(draw, plane, random);
    const post = { x: 152, y: 104, z: plane.z + thickness, h: 22 };
    box(draw, [post.x, post.y, post.z], 7, 7, post.h, { top: ink.ink, left: ink.ink, right: ink.tone });
    draw.line([post.x + 3.5, post.y + 3.5, post.z + post.h], [post.x + 3.5, post.y + 3.5, post.z + post.h + 16], { color: ink.ink, width: 1.4 });
    draw.poly([[post.x + 3.5, post.y + 3.5, post.z + post.h + 16], [post.x + 20, post.y + 3.5, post.z + post.h + 12], [post.x + 3.5, post.y + 12, post.z + post.h + 8]], { fill: ink.teal, edge: ink.ink, width: 0.7 });
  }

  draw.layer('prop');
  for (const [start, end] of [[24, 54], [74, 106], [126, 158], [178, 210], [228, 252]]) {
    const a = thread(start), b = thread(end);
    draw.line(a, b, { color: ink.ink, width: 2.4 });
  }
  const node = thread(164);
  draw.poly([[node[0] - 9, node[1] - 9, 188], [node[0] + 9, node[1] - 9, 188], [node[0] + 9, node[1] + 9, 188], [node[0] - 9, node[1] + 9, 188]], { fill: ink.amber, edge: ink.ink, width: 0.7 });
  draw.line([node[0], node[1], 188], [node[0], node[1], 206], { color: ink.amber, width: 0.7 });

  for (const [index, plane] of planes.entries()) {
    const anchor = draw.project([width / 2, 0, plane.z + thickness]);
    draw.layer('type');
    typeBlock(draw, `0${index + 1}`, { x: anchor[0] + 18, y: anchor[1] + 2, size: 10, kind: 'mono', width: 24, fill: ink.mist });
    typeBlock(draw, plane.name, { x: anchor[0] + 36, y: anchor[1] + 2, size: 11, kind: 'mono', width: 80, fill: ink.ink });
  }

  draw.layer('type');
  typeBlock(draw, art.copy.series, { x: 66, y: 60, size: 13, width: 200, spacing: 2.5, weight: 600, fill: ink.teal });
  typeBlock(draw, art.copy.index, { x: 66, y: 82, size: 11, kind: 'mono', width: 120, spacing: 1.25, fill: ink.tone });
  typeBlock(draw, art.copy.title, { x: 64, y: 540, width: 380, size: 41, lineHeight: 46, kind: 'title' });
  typeBlock(draw, art.copy.subtitle, { x: 67, y: 598, width: 440, size: 14, spacing: 1.2, fill: ink.teal, maxChars: 40 });
  typeBlock(draw, `4 层 · ${planes.length} 道门禁 · 1 个当前节点`, { x: 67, y: 634, width: 380, size: 11, kind: 'mono', fill: ink.tone, maxChars: 34 });
  typeBlock(draw, art.copy.parameters, { x: 900, y: 646, width: 240, maxChars: 40, size: 11, kind: 'mono', fill: ink.tone });

  draw.layer('texture');
  draw.emit(stock.grain);

  const { scene, svg } = assembleScene({ art, draw, stock, focus: draw.project(node), metrics: { levels: planes.length, gates: planes.length } });
  return { scene, svg };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  mkdirSync(out, { recursive: true });
  const { scene, svg } = renderField();
  writeScene(scene, svg, out);
  console.log(`${scene.svg.file} · ${scene.svg.bytes} B · sha1 ${scene.svg.sha1} · paths ${scene.counts.paths}`);
}
