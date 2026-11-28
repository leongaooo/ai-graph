// 场景样板 v2（第二版）：每张图按内容长出一个图形，而不是套同一个模板。
// 系统画层级、物质画温度曲线、人画汇流与截止线。零新增依赖。
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { layout, typeBlock, palette, canvas, paper, seeded } from './lib/ink.mjs';

const W = canvas.width;
const H = canvas.height;
const L = 72;
const R = 1128;
const camera = { origin: [0, H], angles: [0, -90] };

const st = (o = {}) => [
  ` stroke="${o.color ?? palette.ink}"`,
  ` stroke-width="${o.width ?? 1.4}"`,
  o.dash ? ` stroke-dasharray="${o.dash}"` : ''
].join('');
const al = (o = {}) => (o.opacity === undefined ? '' : ` opacity="${o.opacity}"`);

const box = (draw, x, y, w, h, o = {}) => draw.emit(
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill ?? 'none'}"${o.edge === 'none' ? '' : st({ ...o, color: o.edge ?? palette.ink })}${al(o)}/>`
);
const ln = (draw, x1, y1, x2, y2, o = {}) => draw.emit(
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${st(o)}${al(o)}/>`
);
const path = (draw, pts, o = {}) => draw.emit(
  `<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')}" fill="${o.fill ?? 'none'}"${o.fillOnly ? '' : st(o)}${al(o)}${o.join ? ` stroke-linejoin="${o.join}"` : ''}/>`
);
const head = (draw, x1, y1, x2, y2, o = {}, size = 7) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p1 = [x2 - size * Math.cos(a + 0.42), y2 - size * Math.sin(a + 0.42)];
  const p2 = [x2 - size * Math.cos(a - 0.42), y2 - size * Math.sin(a - 0.42)];
  draw.emit(`<path d="M${p1[0]} ${p1[1]}L${x2} ${y2}L${p2[0]} ${p2[1]}" fill="none"${st(o)}${al(o)}/>`);
};
const arrow = (draw, x1, y1, x2, y2, o = {}) => { ln(draw, x1, y1, x2, y2, o); head(draw, x1, y1, x2, y2, o, o.size ?? 7); };
const cross = (draw, x, y, s, o = {}) => { ln(draw, x - s, y - s, x + s, y + s, o); ln(draw, x - s, y + s, x + s, y - s, o); };
const ring = (draw, x, y, r, o = {}) => draw.emit(
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.fill ?? 'none'}"${o.edge === 'none' ? '' : st({ ...o, color: o.edge ?? palette.ink })}${al(o)}/>`
);

// 文本：size 与位置均为屏幕坐标
const txt = (draw, s, x, y, o = {}) => typeBlock(draw, s, {
  x, y, width: o.width ?? 900, size: o.size ?? 12, kind: o.kind, maxChars: o.maxChars ?? 60,
  fill: o.fill ?? palette.ink, weight: o.weight, spacing: o.spacing ?? 0, lineHeight: o.lineHeight
});
const bigNum = (draw, s, x, y, o = {}) => typeBlock(draw, s, {
  x, y, width: o.width ?? 240, size: o.size ?? 44, kind: 'mono', maxChars: 10,
  fill: o.fill ?? palette.ink, weight: o.weight ?? 500, spacing: -1
});

function chrome(draw, no, cls, title, question) {
  draw.layer('type');
  txt(draw, no, L, 62, { size: 11, kind: 'mono', fill: palette.teal, maxChars: 6, weight: 500 });
  txt(draw, cls, L + 34, 62, { size: 9.5, fill: palette.mist, maxChars: 20, spacing: 1.2 });
  txt(draw, 'AI GRAPH', R - 62, 62, { size: 9, kind: 'mono', fill: palette.mist, maxChars: 10, spacing: 1.6 });
  ln(draw, L, 84, R, 84, { width: 0.7, color: palette.mist, opacity: 0.5 });
  txt(draw, title, L, 132, { size: 34, kind: 'title', maxChars: 12, weight: 600 });
  txt(draw, question, L, 160, { size: 12.5, fill: palette.tone, maxChars: 60 });
}

function verdict(draw, decide, evidence) {
  ln(draw, L, 540, R, 540, { width: 0.7, color: palette.mist, opacity: 0.5 });
  draw.layer('type');
  txt(draw, '决定', L, 572, { size: 9.5, fill: palette.teal, maxChars: 4, spacing: 2.6, weight: 600 });
  txt(draw, decide, L + 46, 572, { size: 14.5, weight: 600, maxChars: 62, width: R - L - 50 });
  txt(draw, evidence, L, 640, { size: 8.8, kind: 'mono', fill: palette.mist, maxChars: 118, spacing: 0.2 });
}

function svgOf(title, intent, draw, seed, withGrain = true) {
  const stock = paper(seed);
  const order = ['paper', 'grid', 'env', 'subject', 'prop', 'type', 'texture'];
  const head_ = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xml:lang="zh-CN">
  <title id="t">${title}</title>
  <desc id="d">${intent}</desc>
  <defs>${stock.defs}</defs>`;
  const body = order.map((name) => {
    const extra = name === 'paper' ? `${stock.base}${withGrain ? stock.grain : ''}` : '';
    return `  <g id="${name}">\n    ${extra}\n${draw.groups[name].map((v) => `    ${v}`).join('\n')}\n  </g>`;
  }).join('\n');
  return `${head_}\n${body}\n</svg>\n`;
}

// ── 00 封面：三类对象 ────────────────────────────────
function cover() {
  const draw = layout(camera, 71);
  draw.layer('type');
  txt(draw, 'AI GRAPH · 演示区 · 场景样板 v2', L, 62, { size: 9.5, fill: palette.teal, maxChars: 40, spacing: 2.2, weight: 600 });
  txt(draw, '三类对象，七种图法', L, 140, { size: 42, kind: 'title', maxChars: 12, weight: 600 });
  txt(draw, '图法不是风格。系统要画出层级，物质要画出因果，人要画出基数 —— 选错图法，画得再好也读不出决定。', L, 172, { size: 13, fill: palette.tone, maxChars: 62 });
  ln(draw, L, 198, R, 198, { width: 0.7, color: palette.mist, opacity: 0.5 });
  const cols = [
    { x: L, n: 'I', head: '系统', sub: '人造系统 · 会漏层', bad: '怕层级糊：看不出谁调用谁', rows: [['软件工程', '越层依赖拖垮构建', '01'], ['运维发布', '灰度卡在 5%', '—'], ['数据管道', '重跑结果不一致', '—']] },
    { x: 424, n: 'II', head: '物质', sub: '自然规律 · 会倒果', bad: '怕因果倒置：箭头画反也像结论', rows: [['汽车', '热失控多久烧到整包', '02'], ['航天', '姿态异常先查哪个量', '03'], ['生物化学', '通量卡在第二步', '04']] },
    { x: 776, n: 'III', head: '人', sub: '个体决策 · 会失锚', bad: '怕数字没锚：百分比漂亮没有基数', rows: [['学习', '三天复习点怎么排', '05'], ['商务', '两个报价怎么选', '06'], ['生活', '工资去哪了', '07']] }
  ];
  cols.forEach((c) => {
    draw.layer('type');
    txt(draw, c.n, c.x, 234, { size: 11, kind: 'mono', fill: palette.teal, maxChars: 4, weight: 600 });
    txt(draw, c.head, c.x + 26, 236, { size: 19, kind: 'title', maxChars: 4, weight: 600 });
    txt(draw, c.sub, c.x + 26, 258, { size: 9.5, fill: palette.mist, maxChars: 18 });
    txt(draw, c.bad, c.x, 292, { size: 10.5, fill: palette.amber, maxChars: 22, width: 300 });
    ln(draw, c.x, 316, c.x + 300, 316, { width: 0.7, color: palette.mist, opacity: 0.5 });
    c.rows.forEach(([domain, story, id], i) => {
      const y = 348 + i * 62;
      draw.layer('type');
      txt(draw, domain, c.x, y + 14, { size: 11, weight: 600, maxChars: 8 });
      txt(draw, story, c.x, y + 34, { size: 10, fill: palette.tone, maxChars: 24 });
      if (id !== '—') txt(draw, id, c.x + 276, y + 14, { size: 9, kind: 'mono', fill: palette.teal, maxChars: 4 });
      if (id === '—') txt(draw, '待建', c.x + 264, y + 14, { size: 8.5, fill: palette.mist, maxChars: 4 });
      ln(draw, c.x, y + 48, c.x + 300, y + 48, { width: 0.7, color: palette.mist, opacity: 0.35 });
    });
  });
  verdict(draw, '演示区先上 01 / 02 / 05 三张：一张证明层级，一张证明因果，一张证明基数。', 'AI Graph · 场景矩阵 · 7 个业务故事 · 全部确定性 SVG · 同输入同字节');
  return svgOf('三类对象，七种图法', 'AI Graph 服务对象的划分依据与图法映射', draw, 71);
}

// ── 01 系统 · 层级 + 越层边 ────────────────────────
function plateArchitecture() {
  const draw = layout(camera, 41);
  chrome(draw, '01', '软件工程 · 代码架构 · 系统', '越层依赖拖垮构建', '一次小版本升级，为什么只有 CI 挂、本地不挂？');
  const bands = [
    { y: 196, name: '应用层', meta: '2 个入口 · api / web', env: '本地 Node 22.9' },
    { y: 282, name: '业务库', meta: '6 个包 · 唯一允许依赖第三方的地方', env: '' },
    { y: 368, name: '第三方', meta: 'undici 18 → 20 · 私有导出被移除', env: 'CI Node 20.11', plain: true }
  ];
  bands.forEach((b) => {
    draw.layer('subject');
    box(draw, L, b.y, 748, 58, { fill: b.plain ? 'none' : palette.mist, edge: palette.ink, width: 1.4, opacity: b.plain ? 1 : 0.14 });
    draw.layer('type');
    txt(draw, b.name, L + 20, b.y + 26, { size: 13.5, weight: 600, maxChars: 8 });
    txt(draw, b.meta, L + 20, b.y + 46, { size: 9.5, fill: palette.mist, maxChars: 34 });
    if (b.env) txt(draw, b.env, L + 640, b.y + 34, { size: 9.5, fill: palette.mist, maxChars: 16 });
  });
  [200, 400, 600].forEach((x) => {
    arrow(draw, x, 254, x, 280, { width: 1.4, color: palette.ink, size: 5 });
    arrow(draw, x, 340, x, 366, { width: 1.4, color: palette.ink, size: 5 });
  });
  // 越层直连：画在层级栈外侧，不穿过任何一层
  ln(draw, 848, 225, 848, 424, { width: 1.4, color: palette.amber, dash: '8 7' });
  head(draw, 848, 380, 848, 426, { width: 1.4, color: palette.amber }, 6);
  txt(draw, '越层\n直连', 858, 316, { size: 9, fill: palette.amber, weight: 600, maxChars: 4, lineHeight: 12, width: 60 });
  draw.layer('prop');
  box(draw, 840, 216, 14, 14, { fill: palette.amber, edge: 'none' });
  // 右侧：CI 报错原文
  draw.layer('type');
  ln(draw, 892, 196, 892, 316, { width: 0.7, color: palette.mist, opacity: 0.6 });
  txt(draw, 'CI 报错原文', 906, 208, { size: 9, fill: palette.mist, maxChars: 12, spacing: 1.4 });
  txt(draw, 'ERR_PATH_NOT_EXPORTED\nundici@20.0.0 · ./lib/util\nat api/handler.ts:31', 906,
    232, { size: 7.6, kind: 'mono', fill: palette.tone, width: 214, maxChars: 26, lineHeight: 16 });
  draw.layer('type');
  txt(draw, '本地与 CI 只差一个 Node 版本；越层这条边才是根因。', L, 486, { size: 10.5, fill: palette.tone, maxChars: 46 });
  verdict(draw, '先把越层直连收回业务库：改 3 个文件，比回退 2 个包 + 重跑 2 条流水线便宜。',
    'evidence 9 · CI log 4 · deps 3 · commits 2 ｜ inferred 1 ｜ sha256 stable');
  return svgOf('越层依赖拖垮构建', '应用层直接依赖第三方私有导出导致的构建断裂', draw, 41);
}

// ── 02 物质 · 温度曲线 ───────────────────────────
function plateBattery() {
  const draw = layout(camera, 43);
  chrome(draw, '02', '汽车 · 电池安全 · 物质', '热失控多久烧到整包', '一颗电芯短路，热量沿模组传多久？隔热层该放哪一级？');
  const X = (t) => L + (t / 90) * (R - L);
  const Y = (c) => 470 - (c / 900) * 274;
  [200, 400, 600, 800].forEach((c) => {
    ln(draw, L, Y(c), R, Y(c), { width: 0.7, color: palette.mist, opacity: 0.25 });
    draw.layer('type');
    txt(draw, `${c}`, 34, Y(c) + 4, { size: 8.5, kind: 'mono', fill: palette.mist, maxChars: 6 });
    draw.layer('subject');
  });
  draw.layer('type');
  txt(draw, '℃', 34, 190, { size: 8.5, kind: 'mono', fill: palette.mist, maxChars: 3 });
  txt(draw, '0', 34, 474, { size: 8.5, kind: 'mono', fill: palette.mist, maxChars: 3 });
  ln(draw, L, 470, R, 470, { width: 1.4, color: palette.ink, opacity: 0.55 });
  [0, 30, 60, 90].forEach((t) => {
    draw.layer('subject');
    ln(draw, X(t), 470, X(t), 478, { width: 0.7, color: palette.mist });
    draw.layer('type');
    txt(draw, t === 90 ? '90 s' : `${t}`, X(t) - 4, 494, { size: 8.5, kind: 'mono', fill: palette.mist, maxChars: 5 });
  });
  // 温度曲线：两级跳变
  const pts = [];
  for (let t = 0; t <= 18; t += 0.5) pts.push([X(t), Y(25 + 67 * Math.pow(t / 18, 0.55))]);
  for (let t = 18; t <= 19.4; t += 0.2) pts.push([X(t), Y(92 + (348 - 92) * ((t - 18) / 1.4))]);
  for (let t = 19.4; t <= 41; t += 0.6) pts.push([X(t), Y(348 + 172 * Math.pow((t - 19.4) / 21.6, 0.6))]);
  for (let t = 41; t <= 42.4; t += 0.2) pts.push([X(t), Y(520 + (780 - 520) * ((t - 41) / 1.4))]);
  for (let t = 42.4; t <= 90; t += 0.8) pts.push([X(t), Y(780 + 26 * ((t - 42.4) / 47.6))]);
  draw.layer('subject');
  path(draw, pts, { color: palette.ink, width: 2.4, join: 'round' });
  // 阈值
  ln(draw, L, Y(150), R, Y(150), { width: 0.7, color: palette.amber, dash: '7 6' });
  draw.layer('type');
  txt(draw, '热失控临界 150 ℃', L + 8, Y(150) - 8, { size: 8.5, fill: palette.amber, maxChars: 18 });
  txt(draw, '780 ℃ · 整包失效', X(50), Y(806) - 8, { size: 9.5, fill: palette.ink, maxChars: 18 });
  txt(draw, '348 ℃', X(24), Y(348) + 18, { size: 8.5, fill: palette.tone, maxChars: 8 });
  // 两级跳变：竖明线 + 右下事件键
  [18, 41].forEach((t, i) => {
    draw.layer('prop');
    const y1 = i === 0 ? Y(92) : Y(520), y2 = i === 0 ? Y(348) : Y(780);
    ln(draw, X(t), y1, X(t), y2, { width: 1.4, color: palette.amber, dash: '3 3' });
    draw.layer('type');
    bigNum(draw, i === 0 ? '18 s' : '41 s', 760, i === 0 ? 300 : 356, { size: 30, fill: palette.amber });
    txt(draw, i === 0 ? '烧到模组 · 348 ℃' : '烧到整包 · 780 ℃', 812, i === 0 ? 320 : 376, { size: 9, fill: palette.tone, maxChars: 16 });
  });
  // 隔热买到的时间：在时间轴上括起来
  draw.layer('prop');
  ln(draw, X(18), 452, X(41), 452, { width: 1.4, color: palette.teal });
  ln(draw, X(18), 446, X(18), 458, { width: 1.4, color: palette.teal });
  ln(draw, X(41), 446, X(41), 458, { width: 1.4, color: palette.teal });
  draw.layer('type');
  txt(draw, '模组间隙 4 mm 隔热买到的 +23 s', X(18) + 36, 444, { size: 9, fill: palette.teal, weight: 600, maxChars: 26 });
  verdict(draw, '隔热层放模组间隙，不放整包外壳：外壳只多 6 s，间隙多 23 s，逃生窗口差 4 倍。',
    'evidence 12 · bench 6 · datasheet 4 · teardown 2 ｜ unknown 1 ｜ sha256 stable');
  return svgOf('热失控多久烧到整包', '电芯热失控在包内的温度—时间传播曲线与隔热位置', draw, 43);
}

// ── 03 物质 · 三路信号 ───────────────────────────
function plateOrbit() {
  const draw = layout(camera, 47);
  chrome(draw, '03', '航天 · 在轨运维 · 物质', '姿态异常先查哪个量', '三路遥测互相矛盾，先信哪一个？');
  const rand = seeded(47);
  const tracks = [
    { y: 196, name: '角速度陀螺', verdict: '已排除', ok: false, spike: 0 },
    { y: 268, name: '磁强计', verdict: '已排除', ok: false, spike: 0 },
    { y: 340, name: '太阳敏感器', verdict: '待验证', ok: true, spike: 34 }
  ];
  tracks.forEach((t) => {
    draw.layer('subject');
    box(draw, L, t.y, 828, 54, { fill: palette.mist, edge: 'none', opacity: 0.07 });
    const base = t.y + 27;
    const sig = [];
    for (let i = 0; i <= 36; i++) {
      const f = i / 36;
      const step = t.spike && f > 0.78 ? (f - 0.78) / 0.22 * 26 : 0;
      sig.push([L + 8 + f * 812, base + (rand() * 2 - 1) * 4 - step]);
    }
    path(draw, sig, { color: t.ok ? palette.teal : palette.mist, width: t.ok ? 2.4 : 1.4, opacity: t.ok ? 1 : 0.5, join: 'round' });
    ln(draw, L, base, L + 828, base, { width: 0.7, color: palette.mist, opacity: 0.25 });
    draw.layer('type');
    txt(draw, t.name, L + 14, t.y + 20, { size: 10.5, weight: t.ok ? 600 : 400, fill: t.ok ? palette.ink : palette.mist, maxChars: 12 });
    txt(draw, t.verdict, 932, t.y + 24, { size: 9.5, fill: t.ok ? palette.teal : palette.mist, weight: t.ok ? 600 : 400, maxChars: 8 });
    if (!t.ok) cross(draw, 908, t.y + 27, 6, { width: 1.4, color: palette.mist });
  });
  ln(draw, 920, 196, 920, 394, { width: 0.7, color: palette.mist, opacity: 0.5 });
  // 时间轴
  ln(draw, L, 440, R, 440, { width: 2.4, color: palette.ink, opacity: 0.7 });
  [['T+0', 200], ['T+42', 620], ['T+90', 1040]].forEach(([label, x]) => {
    draw.layer('subject');
    ln(draw, x, 434, x, 446, { width: 1.4, color: palette.ink });
    draw.layer('type');
    txt(draw, label, x - 12, 466, { size: 8.5, kind: 'mono', fill: palette.mist, maxChars: 6 });
  });
  txt(draw, 'unknown · 地面未建模的推力偏心（不在这三路里）', 700, 500, { size: 9.5, fill: palette.tone, maxChars: 40 });
  ln(draw, 700, 506, 1050, 506, { width: 0.7, color: palette.mist, dash: '4 4' });
  verdict(draw, '下一过境窗口只调太阳敏感器安装角；动姿控参数会丢 2 圈测控。',
    'evidence 14 · telemetry 9 · design 3 · past-failure 2 ｜ unknown 1 ｜ sha256 stable');
  return svgOf('姿态异常先查哪个量', '在轨姿态异常的三路遥测互斥排查', draw, 47);
}

// ── 04 物质 · 通路 + 通量带 ────────────────────────
function platePathway() {
  const draw = layout(camera, 53);
  chrome(draw, '04', '生物化学 · 代谢通路 · 物质', '通量卡在第二步', '产物上不去，是补底物还是解除抑制？');
  const nodes = [
    { x: 110, name: '底物 G6P', sub: '胞内 2.1 mM' },
    { x: 300, name: '酶 A', sub: 'HK2' },
    { x: 470, name: '中间体 F6P', sub: '堆积 2.4×' },
    { x: 660, name: '酶 B', sub: 'PFK1' },
    { x: 960, name: '产物 F1,6BP', sub: '' }
  ];
  const cool = 396;
  // 通量带：粗段 = 理论通量，细段 = 被抑制后的实际通量
  const thick = 34, thin = 12;
  path(draw, [
    [L + 20, cool - thick / 2], [660, cool - thick / 2], [660, cool - thin / 2],
    [R - 20, cool - thin / 2], [R - 20, cool + thin / 2], [660, cool + thin / 2],
    [660, cool + thick / 2], [L + 20, cool + thick / 2]
  ], { fill: palette.ink, fillOnly: true, join: 'miter' });
  draw.layer('type');
  txt(draw, '1.00', L + 34, cool + 8, { size: 20, kind: 'mono', fill: palette.paper, maxChars: 5, weight: 500 });
  // 被抑制吃掉的通量：虚线框标出理论带宽
  box(draw, 660, cool - thick / 2, R - 20 - 660, thick, { fill: 'none', edge: palette.mist, width: 0.7, dash: '5 5', opacity: 0.8 });
  txt(draw, '0.38', 700, cool - thin / 2 - 10, { size: 20, kind: 'mono', fill: palette.amber, maxChars: 5, weight: 600 });
  txt(draw, '虚线 = 被吃掉的 0.62 通量', 700, cool + thick / 2 + 22, { size: 8.5, fill: palette.mist, maxChars: 24 });
  // 节点
  nodes.forEach((n) => {
    draw.layer('subject');
    ln(draw, n.x, 336, n.x, cool - thick / 2, { width: 0.7, color: palette.mist });
    ring(draw, n.x, cool, 4, { fill: palette.paper, edge: palette.ink, width: 1.4 });
    draw.layer('type');
    txt(draw, n.name, n.x - 26, 320, { size: 11, weight: 600, maxChars: 12 });
    if (n.sub) txt(draw, n.sub, n.x - 26, 334, { size: 8.5, fill: n.name === '中间体 F6P' || n.name === '酶 B' ? palette.amber : palette.mist, maxChars: 14 });
  });
  // 抑制
  // 负反馈：从下游回指酶 B（不回穿标签区）
  ln(draw, 960, 384, 960, 344, { width: 1.4, color: palette.amber });
  ln(draw, 960, 344, 692, 344, { width: 1.4, color: palette.amber });
  head(draw, 720, 344, 680, 344, { width: 1.4, color: palette.amber }, 6);
  draw.layer('type');
  txt(draw, '负反馈抑制 · 下游回压', 706, 334, { size: 9.5, fill: palette.amber, weight: 600, maxChars: 18 });
  txt(draw, '通量在酶 B 处被打薄；上游中间体因此堆积 2.4 倍。', L, 486, { size: 10.5, fill: palette.tone, maxChars: 46 });
  verdict(draw, '先解除酶 B 的负反馈抑制（通量 0.38→0.82），补底物只能到 0.46。',
    'evidence 11 · assays 5 · flux 4 · papers 2 ｜ inferred 2 ｜ sha256 stable');
  return svgOf('通量卡在第二步', '糖酵解通路中负反馈抑制造成的通量瓶颈', draw, 53);
}

// ── 05 人 · 保持率曲线 ──────────────────────────
function plateCurve() {
  const draw = layout(camera, 59);
  chrome(draw, '05', '学习 · 记忆保持 · 人', '三天复习点怎么排', '一周 300 个词，复习几次才不白背？');
  const x0 = L, x1 = R, y0 = 470, y1 = 196;
  const px = (d) => x0 + (d / 7) * (x1 - x0 - 40);
  const py = (r) => y0 + r * (y1 - y0);
  [0.25, 0.5, 0.75, 1].forEach((r) => {
    draw.layer('subject');
    ln(draw, x0, py(r), x1 - 40, py(r), { width: 0.7, color: palette.mist, opacity: 0.25 });
    draw.layer('type');
    txt(draw, `${r * 100}%`, 36, py(r) + 4, { size: 8.5, kind: 'mono', fill: palette.mist, maxChars: 6 });
  });
  for (let d = 0; d <= 7; d++) {
    draw.layer('subject');
    ln(draw, px(d), y0, px(d), y0 + 6, { width: 0.7, color: palette.mist });
    draw.layer('type');
    txt(draw, d === 7 ? '7 天' : `${d}`, px(d) - 3, y0 + 22, { size: 8.5, kind: 'mono', fill: palette.mist, maxChars: 5 });
  }
  const reviews = [1, 2, 4];
  const tau = 1.05;
  const segs = [];
  const rebounds = [];
  let from = 1, t0 = 0;
  reviews.concat([7]).forEach((day, index) => {
    const pts = [];
    for (let s = t0; s <= day; s += 0.04) pts.push([px(s), py(from * Math.exp(-(s - t0) / tau))]);
    const end = from * Math.exp(-(day - t0) / tau);
    pts.push([px(day), py(end)]);
    segs.push(pts);
    if (index < reviews.length) rebounds.push({ x: px(day), y1: py(Math.max(end, 0.12)), y2: py(0.9), label: index + 1 });
    from = 0.9;
    t0 = day;
  });
  draw.layer('subject');
  segs.forEach((pts) => path(draw, pts, { color: palette.ink, width: 2.4, join: 'round' }));
  draw.layer('prop');
  rebounds.forEach((r) => {
    ln(draw, r.x, r.y1, r.x, r.y2, { width: 2.4, color: palette.teal });
    ring(draw, r.x, r.y2, 5, { fill: palette.teal, edge: 'none' });
  });
  draw.layer('type');
  rebounds.forEach((r) => txt(draw, `复习 ${r.label}`, r.x - 16, r.y2 - 12, { size: 8.5, fill: palette.teal, weight: 600, maxChars: 6 }));
  draw.layer('type');
  bigNum(draw, '71%', 900, 250, { size: 40, fill: palette.ink });
  txt(draw, '第 7 天 · 三次复习', 902, 268, { size: 9, fill: palette.mist, maxChars: 14 });
  bigNum(draw, '14%', 900, 330, { size: 28, fill: palette.tone });
  txt(draw, '不复习', 902, 348, { size: 9, fill: palette.mist, maxChars: 6 });
  verdict(draw, '每天新词 43 个配三次复习，别报 60 个只背不复 —— 后者一周后只剩 84 个可用。',
    'evidence 8 · 2 papers + 自测 ｜ inferred 3 ｜ sha256 stable');
  return svgOf('三天复习点怎么排', '复习间隔对一周记忆保持率的影响', draw, 59);
}

// ── 06 人 · 截止线 ───────────────────────────
function plateQuote() {
  const draw = layout(camera, 61);
  chrome(draw, '06', '商务 · 供应商选择 · 人', '两个报价怎么选', 'A 便宜 8%，B 快两周，选哪个？');
  const X = (d) => L + (d / 120) * (R - L);
  const deadline = 92;
  // 截止线
  ln(draw, X(deadline), 196, X(deadline), 430, { width: 2.4, color: palette.teal, dash: '7 6' });
  draw.layer('type');
  txt(draw, '合同截止 12-20', X(deadline) - 42, 186, { size: 9.5, fill: palette.teal, weight: 600, maxChars: 14 });
  // 两条履约道
  const lanes = [
    { y: 250, name: 'A 方案 · 182 万 · 96 天 · 12-22 到货', days: 96 },
    { y: 320, name: 'B 方案 · 197 万 · 82 天 · 12-10 到货', days: 82 }
  ];
  lanes.forEach((l) => {
    draw.layer('subject');
    ln(draw, L, l.y - 8, R, l.y - 8, { width: 0.7, color: palette.mist, opacity: 0.2 });
    box(draw, L, l.y, X(l.days) - L, 30, { fill: palette.mist, edge: 'none', opacity: 0.28 });
    draw.layer('type');
    txt(draw, l.name, L + 14, l.y + 20, { size: 10.5, weight: 600, maxChars: 30 });
  });
  // A 撞线的 4 天
  draw.layer('subject');
  box(draw, X(deadline), 250, X(96) - X(deadline), 30, { fill: palette.amber, edge: 'none', opacity: 0.95 });
  draw.layer('type');
  txt(draw, '4 天', X(deadline) + 9, 271, { size: 9, fill: palette.paper, weight: 600, maxChars: 4 });
  // B 提前的 10 天
  draw.layer('subject');
  ln(draw, X(82), 362, X(deadline), 362, { width: 1.4, color: palette.teal });
  ln(draw, X(82), 356, X(82), 368, { width: 1.4, color: palette.teal });
  ln(draw, X(deadline), 356, X(deadline), 368, { width: 1.4, color: palette.teal });
  draw.layer('type');
  txt(draw, '提前 10 天', X(82) + 4, 352, { size: 9, fill: palette.teal, weight: 600, maxChars: 10 });
  // 轴
  ln(draw, L, 430, R, 430, { width: 1.4, color: palette.ink, opacity: 0.5 });
  [0, 30, 60, 90, 120].forEach((d) => {
    draw.layer('subject');
    ln(draw, X(d), 430, X(d), 437, { width: 0.7, color: palette.mist });
    draw.layer('type');
    txt(draw, d === 120 ? '120 天' : `${d}`, X(d) - 5, 452, { size: 8.5, kind: 'mono', fill: palette.mist, maxChars: 6 });
  });
  txt(draw, '按今天起算的交付天数。A 的第 93–96 天落在截止线之外。', L, 486, { size: 10, fill: palette.tone, maxChars: 50 });
  verdict(draw, '有硬截止就选 B：多付 15 万买 10 天缓冲，比赌 3%/天、上限 30 万的罚金便宜。',
    'evidence 10 · quotes 6 · history 3 · contract 1 ｜ inferred 1 ｜ sha256 stable');
  return svgOf('两个报价怎么选', '两份报价在合同截止线上的履约位置', draw, 61);
}

// ── 07 人 · 瀑布 ───────────────────────────
function plateCash() {
  const draw = layout(camera, 67);
  chrome(draw, '07', '生活 · 家庭现金流 · 人', '工资去哪了', '这个月结余为什么只剩 250？');
  const floor = 470, unit = 0.27, w = 150;
  const steps = [
    { x: 96, label: '到手收入', value: 1000, kind: 'in' },
    { x: 372, label: '固定支出', value: 450, kind: 'out' },
    { x: 648, label: '弹性支出', value: 300, kind: 'out', spl: 0.41 },
    { x: 924, label: '结余', value: 250, kind: 'rest' }
  ];
  let running = 0;
  steps.forEach((s, i) => {
    const h = s.value * unit;
    if (s.kind === 'in') {
      draw.layer('subject');
      box(draw, s.x, floor - h, w, h, { fill: palette.mist, edge: 'none', opacity: 0.28 });
      running = s.value;
      draw.layer('type');
      bigNum(draw, '1000', s.x, floor - h + 2, { size: 18, fill: palette.paper });
    } else if (s.kind === 'out') {
      const top = floor - running * unit;
      draw.layer('subject');
      box(draw, s.x, top, w, h, { fill: palette.ink, edge: 'none', opacity: 0.86 });
      if (s.spl) box(draw, s.x + w * (1 - s.spl), top, w * s.spl, h, { fill: palette.amber, edge: 'none', opacity: 0.92 });
      ln(draw, steps[i - 1].x + w, top, s.x, top, { width: 0.7, color: palette.mist, dash: '5 4' });
      running -= s.value;
      draw.layer('type');
      txt(draw, `−${s.value}`, s.x + 14, top + h / 2 + 5, { size: 11, kind: 'mono', fill: palette.paper, maxChars: 8, weight: 500 });
    } else {
      draw.layer('subject');
      box(draw, s.x, floor - h, w, h, { fill: palette.teal, edge: 'none', opacity: 0.18 });
      ln(draw, steps[i - 1].x + w, floor - h, s.x, floor - h, { width: 0.7, color: palette.mist, dash: '5 4' });
      draw.layer('type');
      bigNum(draw, '250', s.x, floor - h - 14, { size: 24, fill: palette.ink });
    }
    draw.layer('type');
    txt(draw, s.label, s.x, floor + 26, { size: 10, fill: palette.tone, maxChars: 10 });
  });
  draw.layer('subject');
  ln(draw, L, floor, R, floor, { width: 1.4, color: palette.ink, opacity: 0.5 });
  // 外卖：指到弹性支出里那 41%
  const flexX = 648 + w * 0.59;
  ln(draw, flexX + 30, 372, flexX + 74, 330, { width: 0.7, color: palette.amber, dash: '4 4' });
  draw.layer('type');
  txt(draw, '外卖 123 元 · 占弹性 41% · 占收入 12.3%', flexX + 80, 324, { size: 9.5, fill: palette.amber, weight: 600, maxChars: 40 });
  txt(draw, '固定支出已占收入 45%，没有压榨空间；结余 250 里只有弹性还能动。', L, 512, { size: 10, fill: palette.tone, maxChars: 52 });
  verdict(draw, '先砍外卖（−123，零摩擦），结余回到 373；砍订阅要解约，只省 68。',
    'evidence 7 · bills 6 · budget 1 ｜ inferred 2 ｜ sha256 stable');
  return svgOf('工资去哪了', '月度现金流的逐级扣减与结余构成', draw, 67);
}

const plates = [
  ['00-matrix', cover],
  ['01-code-architecture', plateArchitecture],
  ['02-battery-thermal', plateBattery],
  ['03-orbit-attitude', plateOrbit],
  ['04-metabolic-pathway', platePathway],
  ['05-review-curve', plateCurve],
  ['06-vendor-quote', plateQuote],
  ['07-cash-flow', plateCash]
];

const outDir = process.argv[2] ?? 'out/story-plates-v2';
mkdirSync(outDir, { recursive: true });
const index = [];
for (const [id, build] of plates) {
  const svg = build();
  writeFileSync(`${outDir}/${id}.svg`, svg);
  index.push({ id, bytes: Buffer.byteLength(svg), sha256: createHash('sha256').update(svg).digest('hex') });
}
writeFileSync(`${outDir}/index.json`, `${JSON.stringify(index, null, 2)}\n`);
for (const row of index) console.log(String(row.bytes).padStart(6), row.sha256.slice(0, 12), row.id);
