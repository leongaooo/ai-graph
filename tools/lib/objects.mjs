import { hatch, palette as ink } from './ink.mjs';

export const desktop = (u, v, height = 0) => [v, -u, height];
export const panel = (frame, u, v, width, height) => [frame(u, v), frame(u + width, v), frame(u + width, v + height), frame(u, v + height)];
export const circle = (frame, u, v, radius) => Array.from({ length: 6 }, (_, index) => {
  const theta = index / 28 * 2 * Math.PI;
  return frame(u + Math.cos(theta) * radius, v + Math.sin(theta) * radius);
});

export function table(draw, { width, depth, floor }) {
  const floorAt = (u, v) => desktop(u, v, floor);
  const top = (u, v) => desktop(u, v, -13);
  const leg = (u, v, leanU, leanV) => {
    const a = desktop(u, v, -10), b = desktop(u + 13, v, -10), c = desktop(u + 13, v + 14, -10);
    const heel = floorAt(u + leanU, v + leanV), toe = floorAt(u + leanU + 10, v + leanV), back = floorAt(u + leanU + 10, v + leanV + 11);
    draw.poly([a, b, toe, heel], { fill: ink.tone, edge: ink.ink });
    draw.poly([b, c, back, toe], { fill: ink.ink });
  };
  draw.poly(panel(floorAt, 12, -23, width + 1, depth + 38), { fill: ink.mist, opacity: 0.13 });
  draw.poly(panel(floorAt, 38, 24, width - 72, 38), { fill: ink.mist, opacity: 0.1 });
  leg(24, depth - 28, -12, 17);
  leg(width - 37, depth - 23, 10, 12);
  leg(24, 16, -15, -13);
  leg(width - 39, 15, 13, -14);
  draw.poly([desktop(width, 0), desktop(width, depth), top(width, depth), top(width, 0)], { fill: ink.ink, edge: ink.ink, width: 2.4 });
  draw.poly([desktop(width, 0), desktop(width, depth), top(width, depth), top(width, 0)], { texture: true, opacity: 0.16 });
  draw.poly([desktop(0, 0), desktop(width, 0), top(width, 0), top(0, 0)], { fill: ink.tone, edge: ink.ink, width: 2.4 });
  draw.poly(panel(desktop, 0, 0, width, depth), { fill: ink.paper, edge: ink.ink, width: 2.4 });
  draw.line(desktop(0, 3, -4), desktop(width, 3, -4), { color: ink.ink, width: 0.7 });
  draw.line(desktop(0, 9, -5), desktop(width, 9, -5), { color: ink.mist, width: 0.7, opacity: 0.7 });
  draw.poly(panel((u, v) => desktop(u, v, -42), width * 0.42, depth - 7, width * 0.22, 6), { fill: ink.ink, edge: ink.ink, width: 0.7 });
  draw.line(desktop(width * 0.43, depth - 7, -43), desktop(width * 0.63, depth - 7, -43), { color: ink.mist, width: 0.7 });
  draw.line(desktop(92, 18, -11), desktop(width - 75, depth - 15, -11), { color: ink.tone, width: 1.4, opacity: 0.72 });
  draw.line(desktop(104, 20, -12), desktop(width - 63, depth - 27, -12), { color: ink.mist, width: 0.7, opacity: 0.62 });
  draw.line(desktop(7, 8), desktop(width - 7, 8), { color: ink.mist, width: 0.7 });
  for (let u = 25; u < width - 12; u += 10) draw.line(desktop(u, 8), desktop(u, u % 50 === 25 ? 15 : 12), { color: ink.mist, width: 0.7 });
  draw.line(desktop(48, 0, -5), desktop(width - 40, 0, -5), { color: ink.mist, width: 0.7, opacity: 0.65 });
}

export function pen(draw, { tip, tail }, color = ink.ink) {
  const at = (t, shift = 0) => tip.map((value, axis) => value + t * (tail[axis] - value) + (axis === 1 ? shift : 0));
  draw.poly([tip, at(0.18, -2), at(1, -2), at(1, 2), at(0.18, 2)], { fill: color, edge: ink.ink, width: 0.7 });
  draw.line(at(0.24), at(0.87), { color: ink.mist, width: 0.7 });
}

export function paperRoll(draw, { u, v, floor }) {
  const base = (across, depth, lift = 0) => desktop(u + across, v + depth, floor + lift);
  draw.poly(circle(base, 0, 0, 22), { fill: ink.tone, edge: ink.ink, width: 1.4 });
  draw.poly(circle(base, 0, 0, 14), { texture: true, opacity: 0.72 });
  draw.line(base(-18, 4, 2), base(56, 8, 2), { color: ink.paper, width: 0.7, opacity: 0.85 });
  draw.line(base(-12, -4, 3), base(44, -1, 3), { color: ink.mist, width: 0.7 });
  draw.line(base(14, 13, 2), base(62, 16, 2), { color: ink.ink, width: 1.4 });
}

export function monitor(draw, { u, v }) {
  const upright = (across, height) => desktop(u + across, v, height);
  draw.poly(panel(desktop, u + 25, v - 14, 47, 28), { fill: ink.tone, edge: ink.ink });
  draw.poly(panel(upright, 43, 2, 11, 30), { fill: ink.ink });
  draw.poly(panel((across, height) => desktop(u + across, v + 7, height), 0, 24, 94, 59), { fill: ink.tone, edge: ink.ink });
  draw.poly(panel(upright, 0, 24, 94, 59), { fill: ink.ink, edge: ink.ink, width: 2.4 });
  draw.poly(panel(upright, 5, 30, 84, 47), { fill: ink.teal });
  for (const level of [64, 55, 46, 37]) {
    draw.line(upright(14, level), upright(20, level), { color: ink.paper, width: 1.4 });
    draw.line(upright(25, level), upright(level === 55 ? 66 : 81, level), { color: ink.paper, width: 0.7, opacity: 0.7 });
  }
}

export function lamp(draw, { u, v, height }) {
  const base = (across, depth) => desktop(u + across, v + depth, 1);
  const root = desktop(u, v, 1), knee = desktop(u - 16, v + 21, height * 0.57), crown = desktop(u + 12, v + 8, height);
  const reach = 81;
  const neck = desktop(u + reach, v - 11, height + 3);
  draw.poly(circle(base, 0, 0, 16), { fill: ink.tone, edge: ink.ink });
  draw.line(root, knee, { width: 2.4 });
  draw.line(knee, crown, { width: 2.4 });
  draw.line(crown, neck, { width: 2.4 });
  draw.line(desktop(u - 9, v + 23, height * 0.57), desktop(u + 17, v + 10, height), { width: 1.4, color: ink.tone });
  for (const joint of [knee, crown]) {
    draw.poly(circle((across, lift) => [joint[0], joint[1] - across, joint[2] + lift], 0, 0, 3), { fill: ink.ink });
  }
  const hood = (across, lift) => desktop(u + reach + across, v - 11, height + lift);
  draw.curve([['M', hood(-29, -29)], ['C', hood(-25, -5), hood(-13, 4), hood(0, 3)], ['C', hood(14, 3), hood(24, -9), hood(30, -29)], ['Z']], { fill: ink.teal, edge: ink.ink, width: 2.4 });
  draw.curve([['M', hood(-27, -27)], ['C', hood(-20, -6), hood(-8, 2), hood(0, 2)], ['C', hood(9, 2), hood(19, -7), hood(28, -27)], ['Z']], { fill: ink.tone, edge: ink.ink, width: 1.4 });
}

export function drawingPaper(draw, { u, v, width, height, tilt = 0, state }) {
  const frame = (across, up, lift = 0) => desktop(u + across, v + up, 0.6 + up * tilt + lift);
  if (state === 'finish') {
    const side = (up, high) => desktop(u + width + 10, v + up, high);
    draw.poly([side(-4, 0), side(height - 7, 0), side(height - 7, (height - 7) * tilt)], { fill: ink.tone, edge: ink.ink });
    draw.poly(panel(frame, -11, -4, width + 21, height + 14), { fill: ink.teal, edge: ink.ink, width: 2.4 });
  } else {
    const under = (across, up) => desktop(u + across, v + up, 0.28);
    draw.poly(panel(under, 3, -3, width + 4, height + 4), { fill: state === 'grid' ? ink.teal : ink.mist, opacity: 0.23 });
  }
  draw.poly(panel(frame, 0, 0, width, height), { fill: ink.paper, edge: state === 'finish' ? ink.ink : ink.mist, width: state === 'finish' ? 1.4 : 0.7 });
  if (state === 'finish') {
    for (const across of [8, width - 23]) draw.poly(panel(frame, across, height - 4, 15, 9), { fill: ink.ink });
  }
  if (state === 'grid') hatch(draw, frame, { u: 4, v: 4, width: width - 8, height: height - 8, step: 12, color: ink.teal, opacity: 0.25 });
  return frame;
}

export function observatory(draw, frame, { width, height, state }) {
  const point = (u, v) => frame(u * width / 220, v * height / 168);
  const poly = (vertices, style) => draw.poly(vertices.map(vertex => point(...vertex)), style);
  const curve = (commands, style) => draw.curve(commands.map(([verb, ...vertices]) => [verb, ...vertices.map(vertex => point(...vertex))]), style);
  const line = (start, end, style) => draw.line(point(...start), point(...end), style);
  const finish = state === 'finish', rough = state === 'rough';
  const edge = finish ? ink.ink : rough ? ink.mist : ink.teal;
  const outline = { edge, width: finish ? 1.4 : 0.7 };
  const far = [[11, 54], [41, 104], [63, 86], [80, 108], [112, 61], [140, 97], [163, 79], [184, 106], [210, 64], [210, 24], [11, 24]];
  const hill = [[11, 47], [43, 61], [69, 52], [91, 57], [111, 48], [143, 53], [173, 44], [210, 55], [210, 24], [11, 24]];
  const sun = circle(point, 67, 130, 26);
  if (finish) draw.poly(sun, { fill: ink.amber });
  else draw.poly(sun, { edge, width: 0.7, opacity: rough ? 0.57 : 0.85 });
  poly(far, finish ? { fill: ink.teal, opacity: 0.23 } : { ...outline, opacity: 0.62 });
  poly(hill, finish ? { fill: ink.teal } : { ...outline, opacity: 0.64 });
  if (finish) {
    line([24, 60], [41, 90], { color: ink.teal, width: 0.7 });
    line([54, 75], [79, 97], { color: ink.teal, width: 0.7 });
    line([175, 72], [184, 91], { color: ink.teal, width: 0.7 });
    line([190, 66], [199, 67], { color: ink.paper, width: 0.7, opacity: 0.8 });
    poly([[18, 28], [55, 28], [55, 46], [18, 46]], { fill: ink.paper, edge: ink.teal, width: 0.7 });
    line([23, 42], [49, 33], { color: ink.teal, width: 0.7 });
    line([29, 28], [29, 46], { color: ink.teal, width: 0.7 });
    line([39, 28], [39, 46], { color: ink.teal, width: 0.7 });
    line([18, 49], [55, 49], { color: ink.ink, width: 1.4 });
    line([18, 52], [48, 52], { color: ink.mist, width: 0.7 });
    line([161, 119], [201, 119], { color: ink.ink, width: 1.4 });
    line([161, 115], [161, 123], { color: ink.ink, width: 0.7 });
    line([181, 116], [181, 122], { color: ink.ink, width: 0.7 });
    line([201, 115], [201, 123], { color: ink.ink, width: 0.7 });
    line([150, 111], [163, 111], { color: ink.teal, width: 0.7 });
    line([150, 111], [153, 106], { color: ink.teal, width: 0.7 });
    draw.poly(sun, { fill: ink.amber });
  }
  poly([[56, 32], [132, 32], [153, 44], [78, 44]], finish ? { fill: ink.ink } : outline);
  poly([[120, 41], [145, 48], [145, 77], [120, 71]], { ...outline, fill: finish ? ink.teal : 'none' });
  poly([[66, 36], [124, 36], [124, 71], [66, 71]], { ...outline, fill: finish ? ink.paper : 'none' });
  curve([['M', [65, 71]], ['C', [66, 99], [79, 111], [95, 110]], ['C', [112, 109], [124, 95], [125, 71]], ['Z']], { ...outline, fill: finish ? ink.paper : 'none' });
  curve([['M', [86, 71]], ['C', [85, 85], [89, 102], [95, 110]], ['C', [102, 103], [107, 85], [109, 71]]], outline);
  line([62, 70], [129, 70], { color: edge, width: finish ? 2.4 : 0.7 });
  for (const offset of [71, 79, 108, 116]) line([offset, 41], [offset, 63], { color: edge, width: 0.7 });
  poly([[89, 37], [101, 37], [101, 59], [89, 59]], { ...outline, fill: finish ? ink.ink : 'none' });
  if (rough) {
    curve([['M', [62, 74]], ['C', [64, 101], [78, 115], [93, 113]], ['C', [110, 114], [127, 97], [128, 72]]], { ...outline, opacity: 0.55 });
    line([58, 34], [135, 35], { color: edge, width: 0.7, opacity: 0.55 });
    line([95, 31], [95, 123], { color: edge, width: 0.7, opacity: 0.52 });
  }
  if (state === 'grid') {
    const guide = { color: ink.teal, width: 0.7, opacity: 0.63 };
    line([45, 71], [154, 71], guide);
    line([95, 22], [95, 127], guide);
    line([45, 40], [61, 40], guide);
    line([45, 40], [45, 56], guide);
  }
  line([11, 16], [210, 16], { color: edge, width: 0.7, opacity: 0.6 });
  line([11, 11], [39, 11], { color: edge, width: 1.4 });
  line([189, 11], [210, 11], { color: edge, width: 0.7 });
  return { focus: point(67, 130), texture: [[145, 52], [173, 43], [207, 52], [207, 28], [115, 28], [151, 43]].map(vertex => point(...vertex)) };
}
