import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bounds, canvas, esc, halftone, layers, layout, num, palette as ink, paper, typeBlock } from './lib/ink.mjs';
import { seatedFigure } from './lib/figure.mjs';
import { desktop, drawingPaper, lamp, monitor, observatory, paperRoll, panel, pen, table } from './lib/objects.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const defaultArt = join(root, 'art/spec-to-scene.art.json');
export const defaultOut = join(root, 'out');
export const sha1 = value => createHash('sha1').update(value).digest('hex');

export function renderScene(art) {
  const { id, camera, seed, copy, pose, props } = art;
  if (!/^[a-z0-9-]+$/.test(id) || !Number.isInteger(seed) || camera.angles.join() !== '-30,-15' ||
      props.sheets.map(sheet => sheet.state).join() !== 'rough,grid,finish') throw new Error('场景 ID、种子、机位或图纸顺序不合法');
  const draw = layout(camera, seed);
  const stock = paper(seed);
  draw.emit(stock.base);

  const floor = (u, v) => desktop(u, v, props.table.floor);
  draw.layer('grid');
  const rule = { color: ink.mist, width: 0.7, opacity: 0.39 };
  for (const u of [34, 144, 254, 364, 474, 584, 694]) draw.line(floor(u, -21), floor(u, 248), rule);
  for (const v of [-21, 26, 95, 164, 229, 248]) draw.line(floor(34, v), floor(694, v), rule);

  draw.layer('env');
  table(draw, props.table);

  draw.layer('subject');
  let finish;
  let finishFrame;
  for (const sheet of props.sheets) {
    const frame = drawingPaper(draw, sheet);
    const picture = observatory(draw, frame, sheet);
    if (sheet.state === 'finish') { finish = picture; finishFrame = frame; }
  }
  seatedFigure(draw, { ...pose, floor: props.table.floor });

  draw.layer('prop');
  monitor(draw, props.monitor);
  lamp(draw, props.lamp);
  pen(draw, props.sparePen);
  paperRoll(draw, { u: -130, v: -20, floor: props.table.floor });

  draw.layer('type');
  const label = (text, options) => typeBlock(draw, text, { size: 13, width: 120, ...options });
  label(copy.series, { x: 66, y: 83, spacing: 2.5, weight: 600, fill: ink.teal });
  label(copy.index, { x: 67, y: 111, kind: 'mono', size: 11, spacing: 1.25, fill: ink.tone });
  label(copy.parameters, { x: 896, y: 84, width: 240, maxChars: 40, kind: 'mono', size: 11, fill: ink.tone });
  const title = copy.title.replace('，', '，\n');
  typeBlock(draw, title, { x: 64, y: 498, width: 376, size: 41, lineHeight: 45.9, kind: 'title' });
  label(copy.subtitle, { x: 67, y: 604, width: 320, size: 15, spacing: 1.6, fill: ink.teal });
  for (const [index, sheet] of props.sheets.entries()) {
    const anchor = sheet.state === 'finish' ? finishFrame(sheet.width - 116, sheet.height - 26) : desktop(sheet.u + (index === 0 ? 96 : 15), 27, 0);
    const [x, y] = draw.project(anchor);
    label(`0${index + 1}`, { x, y, size: 11, kind: 'mono', width: 24, fill: ink.teal });
    label(copy.stages[index], { x: x + 24, y, size: 11, fill: index === 0 ? ink.tone : ink.ink });
  }

  draw.layer('texture');
  draw.poly(finish.texture, { texture: true, opacity: 0.75 });
  const apron = (u, height) => desktop(u, 0, height);
  draw.emit(stock.grain);

  const [left, top, right, bottom] = bounds(draw.points.subject).map(num);
  const format = entries => entries.map(entry => `    ${entry}`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="scene-title scene-desc" xml:lang="zh-CN">
  <title id="scene-title">${esc(copy.title)}</title>
  <desc id="scene-desc">${esc(art.intent)}</desc>
  <defs>${halftone()}${stock.defs}</defs>
${layers.map(layer => `  <g id="${layer}">\n${format(draw.groups[layer])}\n  </g>`).join('\n')}
</svg>\n`;
  const sum = values => values.reduce((total, value) => total + value, 0);
  const scene = { version: 2, ...art, canvas, layers, focus: { ...art.focus, screen: draw.project(finish.focus) },
    metrics: { subjectBounds: [left, top, right, bottom], subjectArea: num((right - left) * (bottom - top)),
      textureArea: num(sum(draw.surfaces.texture)), amberArea: num(sum(draw.surfaces.amber)), text: draw.text,
      layerBounds: Object.fromEntries(layers.filter(layer => draw.points[layer].length).map(layer => [layer, bounds(draw.points[layer]).map(num)])) },
    svg: { file: `${id}.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) } };
  return { scene, svg };
}

export function build(artPath = defaultArt, outDir = defaultOut) {
  const { scene, svg } = renderScene(JSON.parse(readFileSync(artPath, 'utf8')));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, scene.svg.file), svg);
  writeFileSync(join(outDir, `${scene.id}.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  return scene;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const scene = build(process.argv[2], process.argv[3]);
  console.log(`${scene.svg.file} · ${scene.svg.bytes} B · sha1 ${scene.svg.sha1}`);
}
