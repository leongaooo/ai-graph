export const palette = Object.freeze({ paper: '#F7F6F1', ink: '#141A1F', tone: '#3D4A47', mist: '#8A948E', teal: '#0F6B5E', amber: '#B4761F' });
export const canvas = { width: 1200, height: 675, safe: 10 };
export const layers = ['paper', 'grid', 'env', 'subject', 'prop', 'type', 'texture'];
export const weights = [2.4, 1.4, 0.7];
export const num = value => Number(value.toFixed(2));
export const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const rad = degrees => degrees * Math.PI / 180;

export function project3d([x, y, z], { origin, angles = [-30, -15] }) {
  const [across, away] = angles.map(rad);
  return [origin[0] + Math.cos(across) * x - Math.cos(away) * y,
    origin[1] + Math.sin(across) * x + Math.sin(away) * y - z].map(num);
}

export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let mix = Math.imul(state ^ state >>> 15, state | 1);
    mix ^= mix + Math.imul(mix ^ mix >>> 7, mix | 61);
    return ((mix ^ mix >>> 14) >>> 0) / 4294967296;
  };
}

export const area = points => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point[0] * next[1] - point[1] * next[0];
}, 0)) / 2;
export const bounds = points => [0, 1].map(axis => Math.min(...points.map(point => point[axis])))
  .concat([0, 1].map(axis => Math.max(...points.map(point => point[axis]))));
const coords = point => point.map(num).join(' ');

export function stroke(start, end, { width = 1.4, color = palette.ink, opacity = 1 } = {}, random) {
  if (!weights.includes(width)) throw new Error(`非法线宽：${width}`);
  const delta = end.map((value, index) => value - start[index]);
  const length = Math.hypot(...delta);
  if (length < 24) return `<path d="M${coords(start)}L${coords(end)}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
  const normal = [-delta[1] / length, delta[0] / length];
  const offset = () => (random() * 2 - 1) * 0.6;
  const first = offset(), middle = offset(), last = offset();
  const at = (fraction, distance) => start.map((value, axis) => value + fraction * delta[axis] + distance * normal[axis]);
  const side = sign => [at(1/6, first + sign * width * 0.55), at(1/3, middle + sign * width / 2),
    at(1/2, middle + sign * width / 2), at(2/3, middle + sign * width / 2), at(5/6, last + sign * width * 0.55)];
  const upper = side(1), lower = side(-1);
  return `<path data-pen="${width}" d="M${coords(start)}C${upper.slice(0, 3).map(coords).join(' ')}C${upper.slice(3).map(coords).join(' ')} ${coords(end)}C${lower.slice(3).reverse().map(coords).join(' ')} ${coords(lower[2])}C${lower.slice(0, 2).reverse().map(coords).join(' ')} ${coords(start)}Z" fill="${color}" opacity="${opacity}"/>`;
}

export function hatch(draw, frame, { u, v, width, height, step = 14, color = palette.mist, opacity = 0.35 }) {
  for (let offset = step; offset < width; offset += step) draw.line(frame(u + offset, v), frame(u + offset, v + height), { color, opacity, width: 0.7 });
  for (let offset = step; offset < height; offset += step) draw.line(frame(u, v + offset), frame(u + width, v + offset), { color, opacity, width: 0.7 });
}

export const halftone = () => `<pattern id="dot45" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.22" fill="${palette.ink}"/></pattern>`;
export const paper = seed => ({ defs: `<filter id="paper-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.73" numOctaves="2" seed="${1 + (seed >>> 0) % 997}"/></filter>`,
  base: `<rect width="${canvas.width}" height="${canvas.height}" fill="${palette.paper}"/>`,
  grain: `<rect width="${canvas.width}" height="${canvas.height}" fill="${palette.paper}" filter="url(#paper-grain)" opacity="0.032"/>` });

const closing = /^[，。！？、：；）》】」』〉”’…·,.!?;:%)\]]/u;
const opening = /[（《【「『〈“‘(\[]$/u;
const tokenize = value => value.match(/[+−-]?\d+(?:[.,]\d+)*(?:[ \u00a0]?(?:[a-zA-Z°%]+|毫米|厘米|千米|像素|米|秒|度|档))?|[A-Za-z]+|./gu) ?? [];
const count = value => Array.from(value).length;
const advance = (text, size, spacing) => Array.from(text).reduce((sum, char) => sum + (/[\x00-\x7f]/u.test(char) ? 0.68 : 1.06) * size + spacing, 0);
const fonts = { title: 'Songti SC, Source Han Serif SC, serif', sans: 'PingFang SC, Noto Sans CJK SC, sans-serif', mono: 'ui-monospace, Menlo, monospace' };

export function typeBlock(draw, content, { x, y, width, size, lineHeight = size * 1.18, kind = 'sans', maxChars = kind === 'title' ? 12 : 22,
  spacing = 0, fill = palette.ink, weight = kind === 'title' ? 600 : 400 }) {
  const fits = text => count(text) <= maxChars && advance(text, size, spacing) <= width;
  const lines = content.split('\n').flatMap(paragraph => {
    const tokens = tokenize(paragraph);
    const wrap = [];
    while (tokens.length) {
      let end = tokens.length;
      while (end && (!fits(tokens.slice(0, end).join('').trim()) || closing.test(tokens[0]) || opening.test(tokens.slice(0, end).join('').trim()) || closing.test(tokens[end] ?? ''))) end--;
      if (!end) throw new Error(`文字超框或避头尾失败：${paragraph}`);
      wrap.push(tokens.splice(0, end).join('').trim());
      while (tokens[0] === ' ') tokens.shift();
    }
    return wrap;
  });
  lines.forEach((text, index) => {
    const baseline = y + index * lineHeight;
    const box = [x, num(baseline - size), num(x + advance(text, size, spacing)), num(baseline + size * 0.27)];
    draw.text.push({ text, kind, box, width, maxChars });
    draw.emit(`<text x="${x}" y="${num(baseline)}" fill="${fill}" font-family="${fonts[kind]}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}">${esc(text)}</text>`);
  });
  return lines;
}

export function layout(camera, seed) {
  const groups = Object.fromEntries(layers.map(name => [name, []]));
  const points = Object.fromEntries(layers.map(name => [name, []]));
  const surfaces = { texture: [], amber: [] };
  const random = seeded(seed);
  let current = 'paper';
  const project = point => project3d(point, camera);
  const emit = markup => groups[current].push(markup);
  const track = (vertices, pad = 0) => {
    const [left, top, right, bottom] = bounds(vertices);
    points[current].push([left - pad, top - pad], [right + pad, bottom + pad]);
  };
  const draw = { groups, points, surfaces, text: [], project, emit, layer: name => { current = name; } };
  draw.line = (start, end, style = {}) => {
    const vertices = [project(start), project(end)];
    const pad = (style.width ?? 1.4) * 0.55 + 0.6;
    track(vertices, pad);
    if (style.color === palette.amber) surfaces.amber.push(2 * pad * (Math.hypot(vertices[1][0] - vertices[0][0], vertices[1][1] - vertices[0][1]) + 2 * pad));
    emit(stroke(...vertices, style, random));
  };
  draw.poly = (vertices, { fill = 'none', edge, width = 1.4, opacity = 1, texture = false } = {}) => {
    const projected = vertices.map(project);
    track(projected);
    if (texture || fill === palette.amber) surfaces[texture ? 'texture' : 'amber'].push(area(projected));
    const shortEdges = edge && projected.every(([x, y], index) => {
      const [nextX, nextY] = projected[(index + 1) % projected.length];
      return Math.hypot(nextX - x, nextY - y) < 24;
    });
    if (shortEdges) track(projected, width / 2);
    emit(`<path d="M${projected.map(coords).join('L')}Z" fill="${texture ? 'url(#dot45)' : fill}"${shortEdges ? ` stroke="${edge}" stroke-width="${width}" stroke-linejoin="round"` : ''}${opacity === 1 ? '' : ` opacity="${opacity}"`}/>`);
    if (edge && !shortEdges) vertices.forEach((start, index) => draw.line(start, vertices[(index + 1) % vertices.length], { color: edge, width, opacity }));
  };
  draw.curve = (commands, { fill = 'none', edge = 'none', width = 1.4, opacity = 1 } = {}) => {
    const projected = commands.map(([command, ...vertices]) => [command, ...vertices.map(project)]);
    const vertices = projected.flatMap(([, ...vertices]) => vertices);
    track(vertices, edge === 'none' ? 0 : width / 2);
    if (fill === palette.amber || edge === palette.amber) {
      const [left, top, right, bottom] = bounds(vertices);
      surfaces.amber.push((right - left + width) * (bottom - top + width));
    }
    emit(`<path d="${projected.map(([command, ...vertices]) => command + vertices.map(coords).join(' ')).join('')}" fill="${fill}" stroke="${edge}" stroke-width="${width}" stroke-linejoin="round" opacity="${opacity}"/>`);
  };
  return draw;
}
