// 场景样板 v2：7 个业务故事 → 7 张确定性 SVG（1200×675）
// 目的：验证同一套图元与调色能否覆盖「系统 / 物质 / 人」三类解释对象。
// 全部走 tools/lib 的 layout / typeBlock / palette，零新增依赖。
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { layout, typeBlock, palette, canvas, paper } from './lib/ink.mjs';

const W = canvas.width;
const H = canvas.height;
const camera = { origin: [0, H], angles: [0, -90] };
const pt = (x, y) => [x, H - y, 0];
// 精确制图路线：几何用原始 SVG 图元，不做笔触抖动（笔触只保留在纸纹上）。
const style = (o = {}) => [
  ` stroke="${o.color ?? palette.ink}"`,
  ` stroke-width="${o.width ?? 1.4}"`,
  o.dash ? ` stroke-dasharray="${o.dash}"` : ''
].join('');
const alpha = (o = {}) => o.opacity === undefined ? '' : ` opacity="${o.opacity}"`;
const box = (draw, x, y, w, h, o = {}) => draw.emit(
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill ?? 'none'}"${o.edge === 'none' ? '' : style({ ...o, color: o.edge ?? palette.ink })}${alpha(o)}/>`
);
const ln = (draw, x1, y1, x2, y2, o = {}) => draw.emit(
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${style(o)}${alpha(o)}/>`
);
const head = (draw, x1, y1, x2, y2, o = {}, len = 7) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p1 = [x2 - len * Math.cos(a + 0.42), y2 - len * Math.sin(a + 0.42)];
  const p2 = [x2 - len * Math.cos(a - 0.42), y2 - len * Math.sin(a - 0.42)];
  draw.emit(`<path d="M${p1[0]} ${p1[1]}L${x2} ${y2}L${p2[0]} ${p2[1]}" fill="none"${style(o)}/>`);
};
const arrow = (draw, x1, y1, x2, y2, o = {}) => { ln(draw, x1, y1, x2, y2, o); head(draw, x1, y1, x2, y2, o, o.len ?? 7); };
const cross = (draw, x, y, s, o = {}) => {
  ln(draw, x - s, y - s, x + s, y + s, o);
  ln(draw, x - s, y + s, x + s, y - s, o);
};
const dot = (draw, x, y, r, o = {}) => draw.emit(`<circle cx="${x}" cy="${y}" r="${r}" fill="${o.fill ?? palette.ink}"${o.edge === 'none' ? '' : style({ ...o, color: o.edge ?? o.fill ?? palette.ink, width: o.width ?? 1.4 })}/>`);
const txt = (draw, s, x, y, o = {}) => typeBlock(draw, s, {
  x, y, width: o.width ?? 940, size: o.size ?? 14, kind: o.kind, maxChars: o.maxChars ?? 52,
  fill: o.fill ?? palette.ink, weight: o.weight, spacing: o.spacing ?? 0, lineHeight: o.lineHeight
});

function frame(no, domain, title, question, draw) {
  draw.layer('type');
  txt(draw, `${no} · ${domain}`, 96, 76, { size: 10.5, spacing: 2.4, fill: palette.teal, weight: 600, maxChars: 30 });
  txt(draw, title, 96, 126, { size: 36, kind: 'title', maxChars: 12, weight: 600 });
  txt(draw, question, 96, 160, { size: 14, fill: palette.tone, maxChars: 54 });
  ln(draw, 96, 190, 1104, 190, { width: 0.7, color: palette.mist, opacity: 0.55 });
}

function foot(draw, conclusion, decide, evidence) {
  ln(draw, 96, 556, 1104, 556, { width: 0.7, color: palette.mist, opacity: 0.55 });
  draw.layer('type');
  txt(draw, conclusion, 96, 586, { size: 16.5, weight: 600, maxChars: 48 });
  txt(draw, decide, 96, 612, { size: 12, fill: palette.tone, maxChars: 80 });
  txt(draw, evidence, 96, 648, { size: 9.5, fill: palette.mist, maxChars: 124, spacing: 0.4 });
}

function svgOf(title, intent, draw, seed) {
  const stock = paper(seed);
  const layers = ['paper', 'grid', 'env', 'subject', 'prop', 'type', 'texture'];
  const preamble = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xml:lang="zh-CN">
  <title id="t">${title}</title>
  <desc id="d">${intent}</desc>
  <defs>${stock.defs}</defs>`;
  const body = layers.map((name) => {
    const extra = name === 'paper' ? `${stock.base}${stock.grain}` : '';
    return `  <g id="${name}">\n    ${extra}\n${draw.groups[name].map((v) => `    ${v}`).join('\n')}\n  </g>`;
  }).join('\n');
  return `${preamble}\n${body}\n</svg>\n`;
}

// ── 00 场景矩阵 ─────────────────────────────
function plateMatrix() {
  const draw = layout(camera, 71);
  draw.layer('type');
  txt(draw, 'AI Graph · 服务对象', 96, 76, { size: 10.5, spacing: 2.4, fill: palette.teal, weight: 600, maxChars: 30 });
  txt(draw, '三类对象，七种图法', 96, 126, { size: 36, kind: 'title', maxChars: 12, weight: 600 });
  txt(draw, '按「被解释的东西」分类：系统会漏层，物质会倒果，人会说数没锚。', 96, 160, { size: 14, fill: palette.tone, maxChars: 54 });
  ln(draw, 96, 190, 1104, 190, { width: 0.7, color: palette.mist, opacity: 0.55 });
  const cols = [
    { x: 96, head: '系统 · 人造', tail: '怕层级糊\n看不出谁调用谁', items: [['软件工程', '越层依赖拖垮构建'], ['运维发布', '灰度卡在 5%'], ['数据管道', '重跑结果不一致']] },
    { x: 424, head: '物质 · 自然', tail: '怕因果倒置\n箭头画反就像结论', items: [['汽车', '热失控多久烧到整包'], ['航天', '姿态异常先查哪个量'], ['生物化学', '通量卡在第二步']] },
    { x: 752, head: '人 · 决策', tail: '怕数字没锚\n百分比漂亮没有基数', items: [['学习', '三天复习点怎么排'], ['商务', '两个报价怎么选'], ['生活', '工资去哪了']] }
  ];
  cols.forEach((c) => {
    ln(draw, c.x, 226, c.x + 300, 226, { width: 1.4, color: palette.teal });
    draw.layer('type');
    txt(draw, c.head, c.x, 254, { size: 15, weight: 600, maxChars: 10 });
    txt(draw, c.tail, c.x, 274, { size: 10, fill: palette.mist, width: 280, maxChars: 12, lineHeight: 15 });
    c.items.forEach(([domain, story], i) => {
      const y = 322 + i * 58;
      draw.layer('subject');
      box(draw, c.x, y, 300, 44, { fill: palette.mist, edge: palette.mist, width: 0.7, opacity: 0.16 });
      draw.layer('type');
      txt(draw, domain, c.x + 12, y + 20, { size: 11, fill: palette.ink, weight: 600, maxChars: 8 });
      txt(draw, story, c.x + 12, y + 37, { size: 10, fill: palette.tone, maxChars: 22 });
    });
  });
  foot(draw, '先按对象分类，再定图法；图法错了，画得再好也读不出结论。',
    '能决定：演示区先上哪三类 —— 系统证明「层」，物质证明「因果」，人证明「基数」。',
    'AI Graph · 场景矩阵 · 7 个业务故事 · 全部确定性 SVG · 同输入同字节');
  return svgOf('三类对象，七种图法', 'AI Graph 服务对象的划分依据与图法映射', draw, 71);
}

// ── 01 软件工程 · 越层依赖 ─────────────────────
function plateArchitecture() {
  const draw = layout(camera, 41);
  frame('01', '软件工程 · 代码架构', '越层依赖拖垮构建', '一次小版本升级，为什么只有 CI 挂、本地不挂？', draw);
  const bands = [
    { y: 262, name: '应用层', meta: '2 个入口 · api / web', env: '本地 Node 22.9', solid: true },
    { y: 344, name: '业务库', meta: '6 个包 · 唯一允许依赖第三方的地方', env: '', solid: true },
    { y: 426, name: '第三方', meta: 'undici 18 → 20 · 私有导出被移除', env: 'CI Node 20.11', solid: false }
  ];
  bands.forEach((b) => {
    draw.layer('subject');
    box(draw, 340, b.y, 620, 46, { fill: b.solid ? palette.mist : 'none', edge: palette.ink, width: 1.4, opacity: b.solid ? 0.16 : 1 });
    draw.layer('type');
    txt(draw, b.name, 356, b.y + 27, { size: 13, weight: 600, maxChars: 8 });
    txt(draw, b.meta, 424, b.y + 27, { size: 11, fill: palette.tone, maxChars: 30 });
    if (b.env) txt(draw, b.env, 862, b.y + 27, { size: 9.5, fill: palette.mist, maxChars: 16 });
  });
  [520, 700, 860].forEach((x) => {
    arrow(draw, x, 318, x, 342, { width: 1.4, color: palette.ink, len: 5 });
    arrow(draw, x, 400, x, 424, { width: 1.4, color: palette.ink, len: 5 });
  });
  ln(draw, 976, 284, 976, 446, { width: 1.4, color: palette.amber, dash: '7 6' });
  head(draw, 976, 400, 976, 446, { width: 1.4, color: palette.amber }, 6);
  draw.layer('type');
  txt(draw, '越层\n直连', 986, 360, { size: 9, fill: palette.amber, weight: 600, maxChars: 4, lineHeight: 12, width: 60 });
  txt(draw, '应用层绕开业务库，\n直接 import 第三方\n的私有导出。', 96, 284, { size: 10.5, fill: palette.tone, width: 236, maxChars: 14, lineHeight: 19 });
  foot(draw, '先把越层直连收回业务库，别急着回退版本。',
    '能决定：改代码（碰 3 个文件）还是回退版本（动 2 个包并重跑 2 条流水线）。',
    '证据 9 条（CI 日志 4 · 依赖树 3 · 提交 2）· inferred 1（本地复现条件）· 同输入同字节');
  return svgOf('越层依赖拖垮构建', '应用层直接依赖第三方私有导出导致的构建断裂', draw, 41);
}

// ── 02 汽车 · 热失控传播 ───────────────────
function plateBattery() {
  const draw = layout(camera, 43);
  frame('02', '汽车 · 电池安全', '热失控多久烧到整包', '一颗电芯短路，多久烧到整包？隔热层该加在哪一级？', draw);
  ln(draw, 170, 246, 1000, 246, { width: 0.7, color: palette.mist, dash: '6 6' });
  [['0 s', 170], ['18 s', 470], ['41 s', 770], ['90 s', 1000]].forEach(([label, x]) => {
    draw.layer('subject');
    ln(draw, x, 240, x, 252, { width: 0.7, color: palette.mist });
    draw.layer('type');
    txt(draw, label, x + 5, 240, { size: 9.5, fill: palette.mist, maxChars: 8 });
  });
  const cells = [
    { x: 170, w: 200, name: '单体电芯', temp: '92 ℃', frac: 0.12, hot: false },
    { x: 470, w: 200, name: '模组（12 串）', temp: '348 ℃', frac: 0.44, hot: false },
    { x: 770, w: 200, name: '整包', temp: '780 ℃', frac: 1, hot: true }
  ];
  cells.forEach((c) => {
    draw.layer('subject');
    box(draw, c.x, 300, c.w, 54, { fill: c.hot ? palette.amber : palette.mist, edge: palette.ink, width: 1.4, opacity: c.hot ? 0.14 : 0.22 });
    draw.layer('type');
    txt(draw, c.name, c.x, 294, { size: 11, fill: palette.tone, maxChars: 14 });
    txt(draw, c.temp, c.x, 382, { size: 12, weight: 600, maxChars: 8 });
    draw.layer('subject');
    box(draw, c.x, 388, c.w * c.frac, 8, { fill: c.hot ? palette.amber : palette.ink, edge: 'none', width: 1.4 });
    ln(draw, c.x, 392, c.x + c.w, 392, { width: 0.7, color: palette.mist, opacity: 0.4 });
  });
  arrow(draw, 370, 327, 468, 327, { width: 2.4, color: palette.ink, len: 6 });
  arrow(draw, 670, 327, 768, 327, { width: 2.4, color: palette.ink, len: 6 });
  draw.layer('type');
  txt(draw, '18 s', 404, 322, { size: 9.5, fill: palette.tone, maxChars: 6 });
  txt(draw, '41 s', 704, 322, { size: 9.5, fill: palette.tone, maxChars: 6 });
  txt(draw, '峰值温度', 96, 384, { size: 11, fill: palette.tone, maxChars: 10 });
  txt(draw, '模组间隔热 4 mm，把 18 s 拖成 41 s。', 96, 440, { size: 11, fill: palette.teal, weight: 600, maxChars: 34 });
  ln(draw, 718, 356, 718, 430, { width: 1.4, color: palette.teal, dash: '5 5' });
  draw.layer('prop');
  box(draw, 710, 424, 16, 12, { fill: palette.teal, edge: palette.teal, width: 1.4 });
  draw.layer('type');
  txt(draw, '隔热层加这里', 736, 434, { size: 9.5, fill: palette.teal, maxChars: 10 });
  foot(draw, '隔热层加在模组之间，不要加在整包外壳。',
    '能决定：4 mm 气凝胶放整包外壳（省 30% 成本、只多 6 s）还是模组间隙（多 23 s 逃生窗口）。',
    '证据 12 条（台架记录 6 · 单体规格书 4 · 拆解报告 2）· unknown 1（第 7 串是否同源）· 同输入同字节');
  return svgOf('热失控多久烧到整包', '电芯热失控在包内的传播时间窗与隔热位置', draw, 43);
}

// ── 03 航天 · 姿态异常 ────────────────────
function plateOrbit() {
  const draw = layout(camera, 47);
  frame('03', '航天 · 在轨运维', '姿态异常先查哪个量', '三个遥测量互相矛盾，先信哪一个？', draw);
  const suspects = [
    { x: 170, name: '角速度陀螺', verdict: '已排除', ok: false, tick: 300 },
    { x: 470, name: '磁强计', verdict: '已排除', ok: false, tick: 620 },
    { x: 770, name: '太阳敏感器', verdict: '待验证', ok: true, tick: 940 }
  ];
  suspects.forEach((s) => {
    draw.layer('subject');
    box(draw, s.x, 250, 230, 60, { fill: s.ok ? 'none' : palette.mist, edge: s.ok ? palette.teal : palette.mist, width: s.ok ? 2.4 : 1.4, opacity: s.ok ? 1 : 0.2 });
    draw.layer('type');
    txt(draw, s.name, s.x + 14, 282, { size: 12, weight: s.ok ? 600 : 400, fill: s.ok ? palette.ink : palette.mist, maxChars: 12 });
    txt(draw, s.verdict, s.x + 14, 302, { size: 10, fill: s.ok ? palette.teal : palette.mist, maxChars: 10 });
    if (!s.ok) cross(draw, s.x + 206, 288, 7, { width: 1.4, color: palette.mist });
    draw.layer('subject');
    ln(draw, s.x + 115, 310, s.tick, 414, { width: 0.7, color: s.ok ? palette.teal : palette.mist, dash: s.ok ? '6 5' : '3 4' });
    draw.emit(`<path d="M${s.tick} 418L${s.tick + 5} 428L${s.tick - 5} 428Z" fill="${s.ok ? palette.teal : palette.mist}"/>`);
  });
  ln(draw, 140, 428, 1040, 428, { width: 2.4, color: palette.ink });
  [['T+0 s', 300], ['T+42 s', 620], ['T+90 s', 940]].forEach(([label, x]) => {
    draw.layer('subject');
    ln(draw, x, 422, x, 434, { width: 1.4, color: palette.ink });
    draw.layer('type');
    txt(draw, label, x - 14, 454, { size: 9.5, fill: palette.tone, maxChars: 10 });
  });
  draw.layer('subject');
  ln(draw, 700, 500, 1085, 500, { width: 0.7, color: palette.mist, dash: '4 4' });
  draw.layer('type');
  txt(draw, 'unknown 1 项 · 地面未建模的推力偏心（不在这三路遥测里）', 700, 492, { size: 10, fill: palette.tone, maxChars: 44 });
  foot(draw, '先核对太阳敏感器；另两个量已排除。',
    '能决定：下一过境窗口只调太阳敏感器安装角 —— 动姿控参数会丢 2 圈测控。',
    '证据 14 条（遥测帧 9 · 设计文档 3 · 历史故障 2）· unknown 1（推力偏心未被模型覆盖）· 同输入同字节');
  return svgOf('姿态异常先查哪个量', '在轨姿态异常的三路遥测互斥排查路径', draw, 47);
}

// ── 04 生物化学 · 代谢通路 ───────────────────
function platePathway() {
  const draw = layout(camera, 53);
  frame('04', '生物化学 · 代谢通路', '通量卡在第二步', '产物上不去，是补底物还是解除抑制？', draw);
  const nodes = [
    { x: 128, w: 148, name: '底物 G6P', sub: '胞内 2.1 mM', tone: 'plain' },
    { x: 312, w: 128, name: '酶 A', sub: 'HK2', tone: 'plain' },
    { x: 480, w: 172, name: '中间体 F6P', sub: '堆积 2.4×', tone: 'fill' },
    { x: 692, w: 128, name: '酶 B', sub: 'PFK1 · 被抑制', tone: 'edge' },
    { x: 860, w: 168, name: '产物 F1,6BP', sub: '通量 0.38', tone: 'plain' }
  ];
  nodes.forEach((n) => {
    draw.layer('subject');
    if (n.tone === 'fill') box(draw, n.x, 296, n.w, 60, { fill: palette.amber, edge: 'none', width: 1.4, opacity: 0.12 });
    else if (n.tone === 'edge') box(draw, n.x, 296, n.w, 60, { fill: 'none', edge: palette.amber, width: 2.4 });
    else box(draw, n.x, 296, n.w, 60, { fill: 'none', edge: palette.ink, width: 1.4 });
    draw.layer('type');
    txt(draw, n.name, n.x + 12, 324, { size: 12, weight: 600, maxChars: 12 });
    txt(draw, n.sub, n.x + 12, 344, { size: 9.5, fill: n.tone === 'plain' ? palette.mist : palette.amber, maxChars: 16 });
  });
  [[276, 310], [440, 478], [652, 690], [820, 858]].forEach(([x1, x2]) => arrow(draw, x1, 326, x2, 326, { width: 1.4, color: palette.ink, len: 6 }));
  draw.layer('subject');
  ln(draw, 756, 296, 756, 268, { width: 1.4, color: palette.amber });
  ln(draw, 742, 268, 770, 268, { width: 2.4, color: palette.amber });
  draw.layer('type');
  txt(draw, '负反馈抑制', 778, 274, { size: 10, fill: palette.amber, weight: 600, maxChars: 10 });
  draw.layer('prop');
  [['理论 1.00', 1, palette.mist, 0.35], ['实测 0.38', 0.38, palette.amber, 0.95]].forEach(([label, frac, color, op], i) => {
    const y = 404 + i * 38;
    ln(draw, 300, y, 880, y, { width: 0.7, color: palette.mist, opacity: 0.35 });
    box(draw, 300, y - 11, 580 * frac, 11, { fill: color, edge: 'none', width: 1.4, opacity: op });
    draw.layer('type');
    txt(draw, label, 96, y - 1, { size: 10.5, fill: i ? palette.ink : palette.tone, maxChars: 12, weight: i ? 600 : 400 });
  });
  txt(draw, '补底物最多到 0.46；解除抑制可到 0.82。', 300, 500, { size: 11, fill: palette.tone, maxChars: 40 });
  foot(draw, '先解除酶 B 的负反馈抑制，再谈补底物。',
    '能决定：加底物（便宜、见效 0.08）还是改抑制（贵、见效 0.44）。',
    '证据 11 条（酶活测定 5 · 通量实验 4 · 文献 2）· inferred 2（胞内浓度换算、稳态假设）· 同输入同字节');
  return svgOf('通量卡在第二步', '糖酵解通路中负反馈抑制造成的通量瓶颈', draw, 53);
}

// ── 05 学习 · 复习节奏 ─────────────────────
function plateCurve() {
  const draw = layout(camera, 59);
  frame('05', '学习 · 记忆保持', '三天复习点怎么排', '一周 300 个词，复习几次才不白背？', draw);
  const x0 = 200, x1 = 1000, y0 = 470, y1 = 246;
  const px = (d) => x0 + (d / 7) * (x1 - x0);
  const py = (r) => y0 + r * (y1 - y0);
  [0.25, 0.5, 0.75, 1].forEach((r) => {
    draw.layer('subject');
    ln(draw, x0, py(r), x1, py(r), { width: 0.7, color: palette.mist, opacity: 0.3 });
    draw.layer('type');
    txt(draw, `${r * 100}%`, 158, py(r) + 4, { size: 9.5, fill: palette.mist, maxChars: 6 });
  });
  for (let d = 0; d <= 7; d++) {
    draw.layer('subject');
    ln(draw, px(d), y0, px(d), y0 + 7, { width: 0.7, color: palette.mist });
    draw.layer('type');
    txt(draw, d === 7 ? '7 天' : `${d}`, px(d) - 3, y0 + 24, { size: 9.5, fill: palette.mist, maxChars: 6 });
  }
  const reviews = [1, 2, 4];
  const tau = 1.05;
  const decay = [];
  let from = 1, t0 = 0;
  reviews.concat([7]).forEach((day, index) => {
    const start = ['M', pt(px(t0), py(from))];
    decay.push(index === 0 ? start : ['M', pt(px(t0), py(from))]);
    for (let s = t0; s < day; s += 0.04) {
      decay.push(['L', pt(px(s), py(from * Math.exp(-(s - t0) / tau)))]);
    }
    const end = from * Math.exp(-(day - t0) / tau);
    decay.push(['L', pt(px(day), py(end))]);
    if (index < reviews.length) {
      draw.layer('prop');
      draw.emit(`<line x1="${px(day)}" y1="${py(Math.max(end, 0.12))}" x2="${px(day)}" y2="${py(0.9)}" stroke="${palette.teal}" stroke-width="2.4"/>`);
      draw.emit(`<path d="M${px(day)} ${py(0.9) - 5}L${px(day) + 5} ${py(0.9)}L${px(day)} ${py(0.9) + 5}L${px(day) - 5} ${py(0.9)}Z" fill="${palette.teal}"/>`);
      draw.layer('prop');
      from = 0.9;
    }
    t0 = day;
  });
  draw.layer('subject');
  draw.emit(`<path d="${decay.map(([c, p]) => c + p[0] + ' ' + (H - p[1])).join('')}" fill="none" stroke="${palette.ink}" stroke-width="2.4" stroke-linejoin="round"/>`);
  draw.layer('type');
  [1, 2, 4].forEach((day, i) => txt(draw, `复习 ${i + 1}`, px(day) - 16, py(0.9) - 10, { size: 9.5, fill: palette.teal, weight: 600, maxChars: 8 }));
  txt(draw, '三次复习：第 7 天仍剩 71%', 900, 300, { size: 10.5, fill: palette.ink, weight: 600, maxChars: 22 });
  txt(draw, '不复习：第 7 天只剩 14%', 900, 322, { size: 10.5, fill: palette.tone, maxChars: 22 });
  foot(draw, '第 1、2、4 天各复习一次，比每天复习省四成时间。',
    '能决定：每天新词 43 个（配三次复习）还是 60 个（只背不复）—— 后者第 7 天只剩 84 个可用。',
    '证据 8 条（两篇遗忘曲线实验 + 自测记录）· inferred 3（个体差异外推）· 同输入同字节');
  return svgOf('三天复习点怎么排', '复习间隔对一周记忆保持率的影响', draw, 59);
}

// ── 06 商务 · 报价取舍 ─────────────────────
function plateQuote() {
  const draw = layout(camera, 61);
  frame('06', '商务 · 供应商选择', '两个报价怎么选', 'A 便宜 8%，B 快两周，选哪个？', draw);
  draw.layer('type');
  txt(draw, 'A 方案', 96, 244, { size: 10, fill: palette.mist, maxChars: 8 });
  txt(draw, 'B 方案', 96, 262, { size: 10, fill: palette.mist, maxChars: 8 });
  draw.layer('prop');
  box(draw, 156, 236, 14, 5, { fill: palette.ink, edge: 'none', width: 1.4 });
  box(draw, 156, 254, 14, 5, { fill: palette.mist, edge: 'none', width: 1.4, opacity: 0.6 });
  const rows = [
    { y: 320, name: '报价', unit: '万元 · 越低越好', a: '182', b: '197', fa: 0.62, fb: 0.84 },
    { y: 396, name: '交付周期', unit: '天 · 越低越好', a: '96', b: '82', fa: 0.78, fb: 0.55 },
    { y: 472, name: '延期风险', unit: '近三年同类项目', a: '中', b: '低', fa: 0.55, fb: 0.25 }
  ];
  rows.forEach((r) => {
    ln(draw, 300, r.y, 1010, r.y, { width: 0.7, color: palette.mist, opacity: 0.3 });
    draw.layer('type');
    txt(draw, r.name, 96, r.y - 16, { size: 11.5, weight: 600, maxChars: 10 });
    txt(draw, r.unit, 96, r.y + 2, { size: 9, fill: palette.mist, maxChars: 16 });
    draw.layer('subject');
    box(draw, 300, r.y - 24, 360 * r.fa, 13, { fill: palette.ink, edge: 'none', width: 1.4 });
    box(draw, 300, r.y - 8, 360 * r.fb, 13, { fill: palette.mist, edge: 'none', width: 1.4, opacity: 0.55 });
    draw.layer('type');
    txt(draw, r.a, 300 + 360 * r.fa + 10, r.y - 13, { size: 10, fill: palette.ink, maxChars: 8 });
    txt(draw, r.b, 300 + 360 * r.fb + 10, r.y + 3, { size: 10, fill: palette.tone, maxChars: 8 });
  });
  draw.layer('type');
  txt(draw, '硬截止 12-20：B 留 8 天缓冲，A 要到 12-22 才到。', 96, 552 - 46, { size: 10.5, fill: palette.teal, weight: 600, maxChars: 42 });
  foot(draw, '能接受 +8% 成本就选 B，因为有硬截止。',
    '能决定：为两周多付 15 万，还是赌一次延期罚金（合同 3%/天，上限 30 万）。',
    '证据 10 条（两份报价单 6 · 历史履约 3 · 合同条款 1）· inferred 1（供应商排产预估）· 同输入同字节');
  return svgOf('两个报价怎么选', '价格、交付周期与延期风险的三轴取舍', draw, 61);
}

// ── 07 生活 · 月度现金流 ────────────────────
function plateCash() {
  const draw = layout(camera, 67);
  frame('07', '生活 · 家庭现金流', '工资去哪了', '这个月结余为什么只剩 250？', draw);
  const floor = 486, unit = 0.11, w = 150;
  const steps = [
    { x: 190, label: '到手收入', value: 1000, kind: 'in' },
    { x: 430, label: '固定支出', value: 450, kind: 'out' },
    { x: 670, label: '弹性支出', value: 300, kind: 'out' },
    { x: 910, label: '结余', value: 250, kind: 'rest' }
  ];
  let running = 0;
  steps.forEach((s, i) => {
    const h = s.value * unit;
    if (s.kind === 'in') {
      draw.layer('subject');
      box(draw, s.x, floor - h, w, h, { fill: palette.mist, edge: 'none', width: 1.4, opacity: 0.3 });
      running = s.value;
      draw.layer('type');
      txt(draw, '1 000', s.x + 10, floor - h - 10, { size: 11, weight: 600, maxChars: 8 });
    } else if (s.kind === 'out') {
      const top = floor - running * unit;
      draw.layer('subject');
      box(draw, s.x, top, w, h, { fill: i === 2 ? palette.amber : palette.ink, edge: 'none', width: 1.4, opacity: i === 2 ? 0.95 : 0.85 });
      if (i === 2) box(draw, s.x + w * 0.59, top, w * 0.41, h, { fill: palette.ink, edge: 'none', width: 1.4, opacity: 0.5 });
      ln(draw, steps[i - 1].x + w, top, s.x, top, { width: 0.7, color: palette.mist, dash: '5 4' });
      running -= s.value;
      draw.layer('type');
      txt(draw, `−${s.value}`, s.x + 12, top + h / 2 + 4, { size: 10.5, weight: 600, fill: palette.paper, maxChars: 8 });
    } else {
      draw.layer('subject');
      box(draw, s.x, floor - h, w, h, { fill: palette.teal, edge: 'none', width: 1.4, opacity: 0.2 });
      ln(draw, steps[i - 1].x + w, floor - h, s.x, floor - h, { width: 0.7, color: palette.mist, dash: '5 4' });
      draw.layer('type');
      txt(draw, '250', s.x + 10, floor - h - 10, { size: 11, weight: 600, maxChars: 8 });
    }
    draw.layer('type');
    txt(draw, s.label, s.x, floor + 26, { size: 10.5, fill: palette.tone, maxChars: 10 });
  });
  draw.layer('subject');
  ln(draw, 150, floor, 1090, floor, { width: 1.4, color: palette.ink, opacity: 0.55 });
  draw.layer('type');
  txt(draw, '弹性里外卖 123 元：占弹性 41%，占收入 12.3%。', 190, 300, { size: 10.5, fill: palette.amber, weight: 600, maxChars: 42 });
  ln(draw, 190, 306, 262, 344, { width: 0.7, color: palette.amber, dash: '4 4' });
  foot(draw, '先砍外卖，结余能回到 350 以上。',
    '能决定：砍外卖（−123，零摩擦）还是砍订阅（−68，但要解约）；固定支出 45% 已无压榨空间。',
    '证据 7 条（账单 6 · 预算表 1）· inferred 2（外卖与在家伙食的替代关系）· 同输入同字节');
  return svgOf('工资去哪了', '月度现金流的逐级扣减与结余构成', draw, 67);
}

const plates = [
  ['00-matrix', plateMatrix],
  ['01-code-architecture', plateArchitecture],
  ['02-battery-thermal', plateBattery],
  ['03-orbit-attitude', plateOrbit],
  ['04-metabolic-pathway', platePathway],
  ['05-review-curve', plateCurve],
  ['06-vendor-quote', plateQuote],
  ['07-cash-flow', plateCash]
];

const outDir = process.argv[2] ?? 'out/story-plates';
mkdirSync(outDir, { recursive: true });
const index = [];
for (const [id, build] of plates) {
  const svg = build();
  const file = `${id}.svg`;
  writeFileSync(`${outDir}/${file}`, svg);
  index.push({ id, file, bytes: Buffer.byteLength(svg), sha256: createHash('sha256').update(svg).digest('hex') });
}
writeFileSync(`${outDir}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
for (const row of index) console.log(String(row.bytes).padStart(6), row.sha256.slice(0, 12), row.id);
