import { palette as ink } from './ink.mjs';
import { circle, pen } from './objects.mjs';

const offset = (anchor, delta) => anchor.map((value, axis) => value + delta[axis]);
const mix = (start, end, fraction) => start.map((value, axis) => value + (end[axis] - value) * fraction);

function limb(draw, start, end, offsets, startWidth, endWidth, fill) {
  const side = (anchor, width) => offset(anchor, offsets.map(value => value * width));
  draw.curve([['M', side(start, startWidth)], ['C', side(mix(start, end, 0.32), startWidth), side(mix(start, end, 0.68), endWidth), side(end, endWidth)],
    ['L', side(end, -endWidth)], ['C', side(mix(start, end, 0.68), -endWidth), side(mix(start, end, 0.3), -startWidth), side(start, -startWidth)], ['Z']],
  { fill, edge: fill, width: 1.4 });
}

export function seatedFigure(draw, { joints, floor, penTip }) {
  const { hip, shoulder, head, farKnee, farAnkle, knee, ankle, elbow, wrist, farElbow, rest } = joints;
  const seat = (across, depth, height = 0) => offset(hip, [across, depth, -12 + height]);
  const disc = (radius, height) => circle((across, depth) => seat(across, depth, height), 0, 0, radius);
  const sole = (anchor, spread) => draw.poly([offset(anchor, [-9, 3, 3]), offset(anchor, [4, -spread, 4]), offset(anchor, [12, -spread - 7, 3]),
    [anchor[0] + 12, anchor[1] - spread - 7, floor], [anchor[0] - 10, anchor[1] + 4, floor]], { fill: ink.ink });
  const shadow = (across, depth) => offset(hip, [across, depth, floor - hip[2]]);
  draw.poly(circle(shadow, 7, -19, 38), { fill: ink.mist, opacity: 0.19 });
  draw.poly(circle(shadow, 7, -18, 31), { texture: true, opacity: 0.62 });
  for (const [across, depth] of [[-20, 14], [19, 16], [1, -21]]) {
    draw.line(seat(across * 0.76, depth * 0.76), [hip[0] + across * 1.5, hip[1] + depth * 1.5, floor], { width: 2.4 });
  }
  draw.poly(disc(28, -4), { fill: ink.ink });
  draw.poly(disc(28, 0), { fill: ink.tone, edge: ink.ink });
  limb(draw, offset(hip, [0, -6, 5]), farKnee, [0, 0, 1], 13, 10, ink.ink);
  limb(draw, farKnee, farAnkle, [0, 1, 0], 10, 5, ink.ink);
  sole(farAnkle, 12);
  limb(draw, hip, knee, [0, 0, 1], 16, 11, ink.tone);
  limb(draw, knee, ankle, [0, 1, 0], 11, 6, ink.tone);
  sole(ankle, 14);
  draw.line(offset(knee, [0, -5, 4]), offset(ankle, [0, -4, 8]), { width: 0.7, color: ink.mist, opacity: 0.8 });

  limb(draw, offset(shoulder, [0, -10, -4]), farElbow, [0, 0, 1], 14, 9, ink.ink);
  limb(draw, farElbow, rest, [0, 0, 1], 9, 4, ink.tone);
  draw.curve([['M', offset(hip, [-16, 12, -5])], ['C', offset(hip, [-38, 18, 22]), offset(shoulder, [-32, 10, -7]), offset(shoulder, [-25, 7, -3])],
    ['C', offset(shoulder, [-15, 3, 18]), offset(shoulder, [16, -4, 17]), offset(shoulder, [24, -8, -2])],
    ['C', offset(shoulder, [20, -6, -26]), offset(hip, [20, 0, 23]), offset(hip, [16, -3, 0])],
    ['C', offset(hip, [7, 0, -7]), offset(hip, [-4, 6, -9]), offset(hip, [-16, 12, -5])], ['Z']], { fill: ink.teal, edge: ink.ink, width: 2.4 });
  draw.curve([['M', offset(shoulder, [-21, 6, -15])], ['C', offset(shoulder, [-18, 5, -37]), offset(hip, [-18, 8, 19]), offset(hip, [-13, 8, 4])]], { edge: ink.paper, width: 0.7, opacity: 0.62 });
  limb(draw, offset(shoulder, [6, -2, 3]), elbow, [0, 0, 1], 15, 10, ink.teal);
  draw.line(offset(shoulder, [-1, -4, -10]), offset(elbow, [0, -1, -8]), { color: ink.ink, width: 1.4 });
  limb(draw, elbow, wrist, [0, 0, 1], 9, 4, ink.tone);
  draw.poly(circle((across, depth) => offset(elbow, [across, depth, 0]), 0, 0, 11), { fill: ink.tone, edge: ink.ink, width: 0.7 });
  draw.line(offset(elbow, [4, 0, 6]), offset(wrist, [-7, 0, 4]), { color: ink.mist, width: 0.7 });
  draw.line(offset(wrist, [-8, -2, 3]), offset(wrist, [8, 2, 3]), { color: ink.ink, width: 1.4 });
  limb(draw, offset(head, [-1, 0, -26]), offset(shoulder, [6, 0, 2]), [1, 0, 0], 7.5, 9.5, ink.tone);

  const profile = (across, height) => offset(head, [across, 0, height]);
  draw.curve([['M', profile(-18, -11)], ['C', profile(-28, 0), profile(-24, 23), profile(-9, 28)],
    ['C', profile(10, 35), profile(21, 24), profile(22, 10)], ['L', profile(24, 1)], ['L', profile(30, -9)], ['L', profile(23, -11)],
    ['C', profile(24, -22), profile(18, -29), profile(7, -27)], ['L', profile(-9, -22)], ['Z']], { fill: ink.tone, edge: ink.ink, width: 1.4 });
  draw.curve([['M', profile(-15, -16)], ['C', profile(-26, -12), profile(-32, 6), profile(-27, 18)],
    ['C', profile(-23, 35), profile(-2, 39), profile(12, 33)], ['C', profile(23, 30), profile(26, 23), profile(24, 15)],
    ['C', profile(9, 23), profile(11, 9), profile(2, 4)], ['C', profile(-7, 7), profile(-11, -2), profile(-6, -7)], ['Z']], { fill: ink.ink, edge: ink.ink });
  draw.curve([['M', profile(-23, 15)], ['C', profile(-17, 27), profile(-6, 30), profile(4, 29)]], { edge: ink.mist, opacity: 0.75, width: 0.7 });
  draw.line(profile(16, 2), profile(22, 2), { color: ink.paper, width: 0.7 });
  pen(draw, { tip: penTip, tail: offset(wrist, [-8, 8, 22]) });
  const grip = offset(wrist, [10, -5, -4]);
  draw.poly(circle((across, depth) => offset(wrist, [across, depth, 0]), 0, 0, 8), { fill: ink.tone, edge: ink.ink, width: 0.7 });
  limb(draw, offset(wrist, [2, -2, 2]), offset(wrist, [13, -3, -1]), [0, 0, 1], 4, 2.5, ink.tone);
  limb(draw, offset(wrist, [5, 0, 3]), offset(wrist, [16, 1, 0]), [0, 0, 1], 3.5, 2, ink.tone);
  limb(draw, wrist, grip, [0, 0, 1], 4.5, 3, ink.tone);
  draw.line(offset(wrist, [1, -1, 4]), offset(grip, [-1, 0, 3]), { color: ink.mist, width: 0.7 });
}
