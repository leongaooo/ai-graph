import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bounds, canvas, esc, halftone, layers, num } from './ink.mjs';

const sha1 = value => createHash('sha1').update(value).digest('hex');

export function assembleScene({ art, draw, stock, focus, metrics = {} }) {
  const { id, copy, intent } = art;
  const count = markup => draw.groups.paper.length + 0;
  const [left, top, right, bottom] = bounds(draw.points.subject).map(num);
  const format = entries => entries.map(entry => `    ${entry}`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" role="img" aria-labelledby="scene-title scene-desc" xml:lang="zh-CN">
  <title id="scene-title">${esc(copy.title)}</title>
  <desc id="scene-desc">${esc(intent)}</desc>
  <defs>${halftone()}${stock.defs}</defs>
${layers.map(layer => `  <g id="${layer}">\n${format(draw.groups[layer])}\n  </g>`).join('\n')}
</svg>\n`;
  const markup = layers.flatMap(layer => draw.groups[layer]);
  const paths = markup.filter(entry => entry.startsWith('<path')).length;
  const nodes = markup.length;
  const scene = {
    version: 3,
    ...art,
    canvas,
    layers,
    focus: { ...art.focus, screen: focus },
    counts: { paths, nodes, text: draw.text.length, ...metrics },
    metrics: {
      subjectBounds: [left, top, right, bottom],
      subjectArea: num((right - left) * (bottom - top)),
      subjectShare: num(((right - left) * (bottom - top)) / (canvas.width * canvas.height)),
      textureArea: num(draw.surfaces.texture.reduce((sum, value) => sum + value, 0)),
      amberArea: num(draw.surfaces.amber.reduce((sum, value) => sum + value, 0)),
      text: draw.text,
      layerBounds: Object.fromEntries(layers.filter(layer => draw.points[layer].length).map(layer => [layer, bounds(draw.points[layer]).map(num)]))
    },
    svg: { file: `${id}.svg`, bytes: Buffer.byteLength(svg), sha1: sha1(svg) }
  };
  return { scene, svg };
}

export function writeScene(scene, svg, outDir) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, scene.svg.file), svg);
  writeFileSync(join(outDir, `${scene.id}.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  return scene;
}
