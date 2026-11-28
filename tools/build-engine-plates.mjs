// 引擎能力样张 v2：语义缩放 / 大规模图 / 证据索引
// 三张图要证明的不是"画得好看"，而是"图里的东西只有投影引擎算得出来"。
// 零依赖；固定输入 → 逐字节一致。
import { writeFileSync, mkdirSync } from 'node:fs';

const P = { paper:'#F7F6F1', ink:'#141A1F', tone:'#3D4A47', mist:'#8A948E', teal:'#0F6B5E', amber:'#B4761F' };
const W = 1200, H = 675, L = 72, R = 1128;
const SANS = 'PingFang SC, Noto Sans CJK SC, sans-serif';
const SERIF = 'Songti SC, Source Han Serif SC, serif';
const MONO = 'ui-monospace, Menlo, monospace';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const n2 = v => Number(v).toFixed(2);

function head(no, label, title, question, metrics) {
  return `
<text x="${L}" y="62" fill="${P.teal}" font-family="${MONO}" font-size="11" font-weight="500">${no}</text>
<text x="${L+34}" y="62" fill="${P.mist}" font-family="${SANS}" font-size="9.5" letter-spacing="1.2">${esc(label)}</text>
<text x="${R}" y="62" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="9" letter-spacing="1.6">${esc(metrics)}</text>
<line x1="${L}" y1="84" x2="${R}" y2="84" stroke="${P.mist}" stroke-width="0.7" opacity="0.5"/>
<text x="${L}" y="132" fill="${P.ink}" font-family="${SERIF}" font-size="34" font-weight="600">${esc(title)}</text>
<text x="${L}" y="160" fill="${P.tone}" font-family="${SANS}" font-size="12.5">${esc(question)}</text>`;
}

function foot(decision, evidence) {
  return `
<line x1="${L}" y1="556" x2="${R}" y2="556" stroke="${P.mist}" stroke-width="0.7" opacity="0.45"/>
<text x="${L}" y="582" fill="${P.teal}" font-family="${SANS}" font-size="9.5" letter-spacing="2">决定</text>
<text x="${L+38}" y="582" fill="${P.ink}" font-family="${SANS}" font-size="14.5" font-weight="600">${esc(decision)}</text>
<text x="${L}" y="638" fill="${P.mist}" font-family="${MONO}" font-size="8.8">${esc(evidence)}</text>`;
}

function wrap(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" xml:lang="zh-CN">
<defs><filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.73" numOctaves="2" seed="42"/></filter></defs>
<rect width="${W}" height="${H}" fill="${P.paper}"/>
<rect width="${W}" height="${H}" fill="${P.paper}" filter="url(#grain)" opacity="0.032"/>
${body}
</svg>`;
}

const out = process.argv[2] || 'out/engine-plates';
mkdirSync(out, { recursive: true });
const written = [];

/* ───────────────────────── 01 语义缩放 ───────────────────────── */
const WORLD = { w: 1200, h: 1000 };
const CELL = { x: 300, y: 333 };
const systems = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
  systems.push({ i: r*4+c, id:`S${r*4+c+1}`, x: c*CELL.x + 26, y: r*CELL.y + 32, w: 248, h: 268 });
const sysName = { S1:'接入网关', S2:'风控引擎', S3:'账户中心', S5:'订单编排', S6:'库存预留', S7:'结算核心', S9:'对账批作业', S10:'数据仓库', S11:'报表服务' };
const S7 = systems[6];
const WIN2 = { x: 600, y: 370, w: 300, h: 250 };
const INNER = { x0: S7.x + 12, y0: S7.y + 35, w: 224, h: 214 };
const MW = INNER.w / 4, MH = INNER.h / 3;
const modules = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
  modules.push({ i: r*4+c, r, c, x: INNER.x0 + c*MW, y: INNER.y0 + r*MH, w: MW, h: MH });
const modName = ['结算任务','价格快照','优惠券核销','分摊规则','税费计算','汇率换算','退款冲销','差异归集','凭证生成','总账推送','科目映射','关账校验'];
const M7 = modules[6];
const WIN3 = { x: M7.x - 2, y: M7.y + 4, w: 62, h: 51.7 };
const FILE = { x: WIN3.x + 3, y: WIN3.y + 4, w: WIN3.w - 6, h: WIN3.h - 8 };

const panel = (px, py, pw, ph, win) => {
  const s = Math.min(pw / win.w, ph / win.h);
  const ox = px + (pw - win.w*s)/2, oy = py + (ph - win.h*s)/2;
  return { px, py, pw, ph, s, win, map: (wx, wy) => [ox + (wx - win.x)*s, oy + (wy - win.y)*s] };
};
const PW = 336, PH = 280;
const A = panel(72,  208, PW, PH, { x:0, y:0, w: WORLD.w, h: WORLD.h });
const B = panel(432, 208, PW, PH, WIN2);
const C = panel(792, 208, PW, PH, WIN3);
const m2 = (B.s / A.s).toFixed(1).replace('.0','');
const m3 = String(Math.round(C.s / A.s));

let b1 = '';
[A, B, C].forEach(p => {
  b1 += `<rect x="${p.px}" y="${p.py}" width="${p.pw}" height="${p.ph}" fill="none" stroke="${P.mist}" stroke-width="0.7" opacity="0.75"/>`;
});
b1 += `<text x="72" y="198" fill="${P.teal}" font-family="${MONO}" font-size="9.5" letter-spacing="1.2">1×  世界 1200 × 1000</text>`;
b1 += `<text x="432" y="198" fill="${P.teal}" font-family="${MONO}" font-size="9.5" letter-spacing="1.2">${m2}×  窗口 300 × 250</text>`;
b1 += `<text x="792" y="198" fill="${P.teal}" font-family="${MONO}" font-size="9.5" letter-spacing="1.2">${m3}×  窗口 ${WIN3.w} × ${WIN3.h.toFixed(1)}</text>`;

const bx = (p, wx, wy, ww, wh, o = {}) => {
  const [x, y] = p.map(wx, wy);
  return `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(ww*p.s)}" height="${n2(wh*p.s)}" fill="${o.fill ?? 'none'}" stroke="${o.stroke ?? P.ink}" stroke-width="${o.sw ?? 1}" opacity="${o.o ?? 1}"/>`;
};
const tx = (p, wx, wy, t, o = {}) => {
  const [x, y] = p.map(wx, wy);
  return `<text x="${n2(x)}" y="${n2(y)}" fill="${o.fill ?? P.ink}" font-family="${o.font ?? SANS}" font-size="${o.size ?? 9}" font-weight="${o.w ?? 400}">${esc(t)}</text>`;
};
// 文字位置固定在屏幕像素上：世界坐标缩放不该把 9px 的字压成 2.5px 的行距
const tpx = (p, wx, wy, dx, dy, t, o = {}) => {
  const [x, y] = p.map(wx, wy);
  return `<text x="${n2(x + dx)}" y="${n2(y + dy)}" fill="${o.fill ?? P.ink}" font-family="${o.font ?? SANS}" font-size="${o.size ?? 9}" font-weight="${o.w ?? 400}">${esc(t)}</text>`;
};

// 1×：12 个系统；每个框底一排 12 根刻度 = 里面的 12 个模块（只给量，不给名）
systems.forEach((s) => {
  const hot = s.i === 6;
  b1 += bx(A, s.x, s.y, s.w, s.h, { fill: hot ? P.ink : 'none', stroke: P.ink, sw: hot ? 1.2 : 0.9, o: hot ? 0.9 : 0.55 });
  if (hot) {
    b1 += tpx(A, s.x, s.y, 6, 17, '结算核心', { fill: P.paper, size: 9.5, w: 600 });
    b1 += tpx(A, s.x, s.y, 6, 31, 'S7', { fill: P.paper, size: 7, font: MONO });
  } else if (sysName[s.id]) {
    b1 += tpx(A, s.x, s.y, 6, 16, sysName[s.id], { size: 8.5, w: 500 });
    b1 += tpx(A, s.x, s.y, 6, 28, s.id, { size: 6.6, font: MONO, fill: P.mist });
  } else {
    b1 += tpx(A, s.x, s.y, 6, 16, s.id, { size: 7, font: MONO, fill: P.mist });
  }
  for (let k = 0; k < 12; k++) {
    const [dx, dy] = A.map(s.x + 18 + k*19, s.y + s.h - 26);
    b1 += `<line x1="${n2(dx)}" y1="${n2(dy)}" x2="${n2(dx)}" y2="${n2(dy + 13)}" stroke="${hot ? P.paper : P.ink}" stroke-width="1.1" opacity="${hot ? 0.55 : 0.3}"/>`;
  }

});
const edgesA = [[0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[4,8],[8,9],[6,7],[9,10],[2,6]];
edgesA.forEach(([a,b]) => {
  const sa = systems[a], sb = systems[b];
  const [x1,y1] = A.map(sa.x + sa.w - 6, sa.y + sa.h/2);
  const [x2,y2] = A.map(sb.x + 6, sb.y + sb.h/2);
  b1 += `<path d="M${n2(x1)} ${n2(y1)} L${n2(x2)} ${n2(y2)}" stroke="${P.ink}" stroke-width="0.8" opacity="0.3" fill="none"/>`;
});
{
  const [x,y] = A.map(WIN2.x, WIN2.y);
  b1 += `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(WIN2.w*A.s)}" height="${n2(WIN2.h*A.s)}" fill="none" stroke="${P.teal}" stroke-width="1.1" stroke-dasharray="4 3"/>`;

}

// 4×：S7 内 12 个模块
modules.forEach((m) => {
  b1 += bx(B, m.x, m.y, m.w, m.h, { stroke: P.ink, sw: 0.9, o: 0.7 });
  b1 += tpx(B, m.x, m.y, 5, 13, modName[m.i], { size: 8, w: 500 });
  b1 += tpx(B, m.x, m.y, 5, 24, m.i === 6 ? 'M7' : `M${m.i+1}`, { size: 6.4, font: MONO, fill: m.i===6 ? P.amber : P.mist });
  for (let k = 0; k < 3; k++) {
    const [dx, dy] = B.map(m.x + 6 + k*18, m.y + m.h - 18);
    b1 += `<line x1="${n2(dx)}" y1="${n2(dy)}" x2="${n2(dx)}" y2="${n2(dy+10)}" stroke="${P.ink}" stroke-width="0.9" opacity="0.25"/>`;
  }
});
const edgesB = [];
for (let i = 0; i < 12; i++) { edgesB.push([i,(i+1)%12]); if (i%2===0) edgesB.push([i,(i+5)%12]); }
edgesB.forEach(([a,b]) => {
  const ma = modules[a], mb = modules[b];
  const [x1,y1] = B.map(ma.x + ma.w, ma.y + ma.h/2);
  const [x2,y2] = B.map(mb.x, mb.y + mb.h/2);
  b1 += `<path d="M${n2(x1)} ${n2(y1)} L${n2(x2)} ${n2(y2)}" stroke="${P.teal}" stroke-width="0.7" opacity="0.3" fill="none"/>`;
});
{
  const [x,y] = B.map(WIN3.x, WIN3.y);
  b1 += `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(WIN3.w*B.s)}" height="${n2(WIN3.h*B.s)}" fill="${P.amber}" opacity="0.05"/>`;
  b1 += `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(WIN3.w*B.s)}" height="${n2(WIN3.h*B.s)}" fill="none" stroke="${P.amber}" stroke-width="1.1" stroke-dasharray="4 3"/>`;

}

// 16×：M7 里的一个文件
{
  const [fx, fy] = C.map(FILE.x, FILE.y);
  const fw = FILE.w * C.s, fh = FILE.h * C.s;
  b1 += `<rect x="${n2(fx)}" y="${n2(fy)}" width="${n2(fw)}" height="${n2(fh)}" fill="none" stroke="${P.ink}" stroke-width="1.1"/>`;
  b1 += `<text x="${n2(fx+9)}" y="${n2(fy+16)}" fill="${P.ink}" font-family="${MONO}" font-size="9" font-weight="600">settle.ts</text>`;
  b1 += `<text x="${n2(fx+fw-9)}" y="${n2(fy+16)}" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="6.6">3 deps</text>`;
  b1 += `<line x1="${n2(fx)}" y1="${n2(fy+23)}" x2="${n2(fx+fw)}" y2="${n2(fy+23)}" stroke="${P.mist}" stroke-width="0.5" opacity="0.6"/>`;
  const fns = ['run(order)','pickRules(ctx)','mergeCoupons()','fallback()','taxOf(order)','post(entries)'];
  const pitch = (fh - 40) / 6;
  fns.forEach((fn, j) => {
    const yy = fy + 36 + j * pitch;
    b1 += `<text x="${n2(fx+8)}" y="${n2(yy)}" fill="${P.mist}" font-family="${MONO}" font-size="6.2">${j+1}</text>`;
    b1 += `<text x="${n2(fx+19)}" y="${n2(yy)}" fill="${j===3 ? P.amber : P.tone}" font-family="${MONO}" font-size="7.4">${esc(fn)}</text>`;
  });
  const qx = fx + fw - 16;
  const r1 = fy + 36, r4 = fy + 36 + 3*pitch;
  b1 += `<path d="M${n2(fx+92)} ${n2(r1-3)} H${n2(qx)} V${n2(r4-3)} H${n2(fx+92)}" fill="none" stroke="${P.amber}" stroke-width="1" opacity="0.75"/>`;
  b1 += `<path d="M${n2(fx+92)} ${n2(r4-3)} l5 -2.2 l0 4.4 z" fill="${P.amber}" opacity="0.85"/>`;
}

b1 += `<text x="72" y="508" fill="${P.tone}" font-family="${SANS}" font-size="9">${esc('系统 12 · 边 11 · 每系统 12 模块')}</text>`;
b1 += `<text x="432" y="508" fill="${P.tone}" font-family="${SANS}" font-size="9">${esc('模块 12 · 引用 18 · 每模块 3 文件')}</text>`;
b1 += `<text x="792" y="508" fill="${P.tone}" font-family="${SANS}" font-size="9">${esc('文件 1 · 函数 6 · 内部调用 2')}</text>`;
b1 += `<text x="72" y="528" fill="${P.mist}" font-family="${SANS}" font-size="9">${esc('三个倍率共用一套世界坐标。虚线框 = 下一档要展示的范围，不是另画一张图。')}</text>`;

const svg1 = wrap(head('01', '投影引擎 · 语义缩放 · 系统', '一张图，三个倍率',
  '为什么不该把 120 个模块塞进一张 1200 宽的图？', `zoom 1× / ${m2}× / ${m3}× · one spec`)
  + b1
  + foot('同一套坐标给三个倍率：让读者自己往下钻，而不是我们替他决定看多细。',
    'projections 3 · shared space 1 · systems 12 · modules 12 · file 1 · duplicated work 0 · sha256 stable'));
writeFileSync(`${out}/01-semantic-zoom.svg`, svg1); written.push('01-semantic-zoom');

/* ───────────────────────── 02 大规模图 ───────────────────────── */
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261126);

const sizes = [10,16,20,18,16,14,14,12];
const GY = { top: 226, bottom: 480 };
const nodes = [];
sizes.forEach((n, i) => {
  const pitch = (GY.bottom - GY.top) / n;
  for (let j = 0; j < n; j++) nodes.push({
    id:`${i}.${j}`, layer:i, idx:j, cx: 124 + i*130,
    cy: GY.top + pitch*(j + 0.5), w: 78, h: Math.min(11, pitch - 3.4)
  });
});
const byLayer = s => nodes.filter(n => n.layer === s);

const edges = [];
for (let i = 0; i < 7; i++) for (const a of byLayer(i)) {
  const n1 = byLayer(i+1).length;
  const t1 = Math.floor(rnd() * n1);
  const t2 = Math.floor((a.idx * 1.7 + i * 3) % n1);
  edges.push([a, byLayer(i+1)[t1]]);
  if (t2 !== t1) edges.push([a, byLayer(i+1)[t2]]);
}
const back = [[byLayer(4)[3], byLayer(2)[5]], [byLayer(6)[2], byLayer(3)[1]]];
const focusIdx = [5, 4, 12, 9, 5, 4, 9, 3];
const focusChain = focusIdx.map((k, i) => byLayer(i)[k % byLayer(i).length]);
const focusIds = new Set(focusChain.map(n => n.id));
const focusEdges = new Set();
for (let i = 0; i < 7; i++) {
  const a = focusChain[i], b = focusChain[i+1];
  focusEdges.add(`${a.id}>${b.id}`);
  if (!edges.some(([x,y]) => x === a && y === b)) edges.push([a,b]);
}

let b2 = '';
sizes.forEach((n, i) => {
  b2 += `<text x="${124 + i*130}" y="${GY.top - 14}" text-anchor="middle" fill="${P.ink}" font-family="${MONO}" font-size="8.5">R${i}</text>`;
  b2 += `<text x="${124 + i*130 + 30}" y="${GY.top - 14}" fill="${P.mist}" font-family="${MONO}" font-size="6.8">${n}</text>`;
});

for (const [a, b] of edges) {
  const fx = focusEdges.has(`${a.id}>${b.id}`);
  const x1 = a.cx + a.w/2, y1 = a.cy, x2 = b.cx - b.w/2, y2 = b.cy;
  b2 += `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${fx ? P.ink : P.mist}" stroke-width="${fx ? 1.3 : 0.7}" opacity="${fx ? 0.8 : 0.16}"/>`;
}
back.forEach(([a, b], k) => {
  const ch = GY.bottom + 18 + k * 12;
  const x1 = a.cx, y1 = a.cy + a.h/2, x2 = b.cx, y2 = b.cy + b.h/2;
  b2 += `<path d="M${n2(x1)} ${n2(y1)} V${ch} H${n2(x2)} V${n2(y2)}" fill="none" stroke="${P.amber}" stroke-width="1.4" opacity="0.85"/>`;
  b2 += `<text x="${n2(x1 + 6)}" y="${ch - 4}" fill="${P.amber}" font-family="${MONO}" font-size="7.6">环 ${k===0?'A':'B'} · R${a.layer}→R${b.layer}</text>`;
});
nodes.forEach(n => {
  const hot = focusIds.has(n.id);
  const dense = sizes[n.layer] >= 16;
  b2 += `<rect x="${n2(n.cx - n.w/2)}" y="${n2(n.cy - n.h/2)}" width="${n.w}" height="${n2(n.h)}" fill="${hot ? P.ink : 'none'}" stroke="${P.ink}" stroke-width="0.7" opacity="${hot ? 0.9 : (dense ? 0.35 : 0.58)}"/>`;
  b2 += `<text x="${n.cx}" y="${n2(n.cy + (dense ? 1.9 : 2.3))}" text-anchor="middle" font-family="${MONO}" font-size="${dense ? 5 : 6}" fill="${hot ? P.paper : P.ink}" opacity="${hot ? 0.9 : (dense ? 0.55 : 0.72)}">${n.id}</text>`;
});
b2 += `<text x="${focusChain[7].cx + 46}" y="${focusChain[7].cy - 2}" fill="${P.teal}" font-family="${MONO}" font-size="7.5">热路径</text>`;


const gmeta = `节点 ${nodes.length} · 边 ${edges.length}（全部前向）· 回指 2 · 层 8 · 平均出度 ${(edges.length/nodes.length).toFixed(1)} · 最长链 8`;
b2 += `<text x="72" y="540" fill="${P.tone}" font-family="${MONO}" font-size="9">${esc(gmeta)}</text>`;

const svg2 = wrap(head('02', '投影引擎 · 大规模图 · 系统', '八层深，两个回指',
  '凌晨断掉的支付链，120 个服务里先拆哪条边？', `${nodes.length} nodes · ${edges.length} edges · 2 cycles · 8 ranks`)
  + b2
  + foot('先拆 R6→R3 的回指（环 B）：它让整张图不可拓扑排序，其余边都还在 DAG 里。',
    `nodes ${nodes.length} · edges ${edges.length} · back-edges 2 · layered layout · sha256 stable`));
writeFileSync(`${out}/02-large-graph.svg`, svg2); written.push('02-large-graph');

/* ───────────────────────── 03 证据索引 ───────────────────────── */
const claims = [
  { n:1, text:'应用层直接依赖私有导出',        span:'L14–L19', hash:'7a3f2c91', sig:'supported' },
  { n:2, text:'业务库没有导出该符号',          span:'L22–L24', hash:'0b19d4ea', sig:'supported' },
  { n:3, text:'CI 原文：ERR_PATH_NOT_EXPORTED', span:'L31',   hash:'c58ea207', sig:'verbatim' },
  { n:4, text:'本地有缓存所以通过，CI 没有',    span:'L36–L38', hash:'4d2b8f10', sig:'supported' },
  { n:5, text:'三个模块重复同一个越层引用',      span:'L44–L49', hash:'9e70c3bd', sig:'supported' },
  { n:6, text:'修复后构建时长 −2.3 min',        span:'L52–L57', hash:'f1a0be66', sig:'measured' }
];

let b3 = '';
const FX = 72, FW = 528, FY = 208;
const bands = [
  { y: FY,       name:'应用层', tag:'apps/web · apps/admin · apps/worker', solid: true },
  { y: FY + 96,  name:'业务库', tag:'packages/core', solid: false },
  { y: FY + 192, name:'基础库', tag:'packages/util', solid: false }
];
bands.forEach(bd => {
  if (bd.solid) {
    b3 += `<rect x="${FX}" y="${bd.y}" width="${FW}" height="84" fill="${P.paper}" stroke="${P.ink}" stroke-width="1.1"/>`;
  } else {
    b3 += `<rect x="${FX}" y="${bd.y}" width="${FW}" height="84" fill="${P.mist}" opacity="0.1"/>`;
    b3 += `<rect x="${FX}" y="${bd.y}" width="${FW}" height="84" fill="none" stroke="${P.ink}" stroke-width="0.9" opacity="0.55"/>`;
  }
  b3 += `<text x="${FX+16}" y="${bd.y+25}" fill="${P.ink}" font-family="${SANS}" font-size="12.5" font-weight="600">${esc(bd.name)}</text>`;
  b3 += `<text x="${FX+16}" y="${bd.y+41}" fill="${P.tone}" font-family="${MONO}" font-size="7">${esc(bd.tag)}</text>`;
});
const chipRow = (bi) => bands[bi].y + 20;
const chips = [
  { x:FX+186, y:chipRow(0), label:'web',     note:'pages' },
  { x:FX+284, y:chipRow(0), label:'admin',   note:'console' },
  { x:FX+382, y:chipRow(0), label:'worker',  note:'batch' },
  { x:FX+186, y:chipRow(1), label:'billing', note:'invoice' },
  { x:FX+284, y:chipRow(1), label:'auth',    note:'session' },
  { x:FX+382, y:chipRow(1), label:'catalog', note:'sku' },
  { x:FX+186, y:chipRow(2), label:'date',    note:'format' },
  { x:FX+284, y:chipRow(2), label:'http',    note:'fetch' },
  { x:FX+382, y:chipRow(2), label:'crypto',  note:'hash' }
];
chips.forEach(c => {
  b3 += `<rect x="${c.x}" y="${c.y}" width="86" height="46" fill="none" stroke="${P.ink}" stroke-width="0.8" opacity="0.5"/>`;
  b3 += `<text x="${c.x+8}" y="${c.y+17}" fill="${P.ink}" font-family="${MONO}" font-size="8.4" font-weight="600">${esc(c.label)}</text>`;
  b3 += `<text x="${c.x+8}" y="${c.y+31}" fill="${P.mist}" font-family="${SANS}" font-size="7">${esc(c.note)}</text>`;
});
// 三条越层虚线：应用层直接下到基础库
[0, 1, 2].forEach(k => {
  const x = chips[k].x + 43;
  b3 += `<path d="M${x} ${bands[0].y+84} V${bands[2].y}" stroke="${P.amber}" stroke-width="${k===1 ? 2 : 1.1}" stroke-dasharray="5 4" fill="none" opacity="${k===1 ? 0.95 : 0.5}"/>`;
});
b3 += `<line x1="${FX+380}" y1="${FY-12}" x2="${FX+404}" y2="${FY-12}" stroke="${P.amber}" stroke-width="1.6" stroke-dasharray="5 4"/>`;
b3 += `<text x="${FX+410}" y="${FY-9}" fill="${P.amber}" font-family="${SANS}" font-size="8">越层直连（跳过业务库）</text>`;

const badges = [
  { n:1, x: chips[1].x + 43, y: bands[0].y + 84 - 1 },
  { n:2, x: chips[4].x - 12, y: bands[1].y + 46 },
  { n:3, x: chips[7].x + 43, y: bands[2].y },
  { n:4, x: chips[0].x - 12, y: bands[0].y + 46 },
  { n:5, x: chips[5].x + 96, y: bands[1].y + 46 },
  { n:6, x: chips[6].x - 13, y: bands[2].y + 20 }
];
badges.forEach(bd => {
  b3 += `<circle cx="${bd.x}" cy="${bd.y}" r="8" fill="${P.paper}" stroke="${P.teal}" stroke-width="1"/>`;
  b3 += `<text x="${bd.x}" y="${bd.y+2.8}" text-anchor="middle" fill="${P.teal}" font-family="${MONO}" font-size="7.6" font-weight="600">${bd.n}</text>`;
});
b3 += `<text x="${FX}" y="${FY + 304}" fill="${P.mist}" font-family="${SANS}" font-size="9">${esc('三根橙虚线 = 三个模块各自绕开业务库直连基础库；图上每一条，右边都有一条证据。')}</text>`;

const EX = 656, EW = 472;
b3 += `<text x="${EX}" y="${FY - 8}" fill="${P.mist}" font-family="${MONO}" font-size="8.4" letter-spacing="1.4">EVIDENCE · SPEC SPAN · SHA256</text>`;
b3 += `<line x1="${EX}" y1="${FY+4}" x2="${EX+EW}" y2="${FY+4}" stroke="${P.mist}" stroke-width="0.7" opacity="0.5"/>`;
claims.forEach((c, i) => {
  const y = FY + 30 + i * 42;
  b3 += `<circle cx="${EX+6}" cy="${y-3.4}" r="7.6" fill="none" stroke="${P.mist}" stroke-width="0.8"/>`;
  b3 += `<text x="${EX+6}" y="${y-0.5}" text-anchor="middle" fill="${P.teal}" font-family="${MONO}" font-size="7.2" font-weight="600">${c.n}</text>`;
  b3 += `<text x="${EX+24}" y="${y}" fill="${P.ink}" font-family="${c.n === 3 ? MONO : SANS}" font-size="${c.n === 3 ? 9.2 : 11.5}" font-weight="500">${esc(c.text)}</text>`;
  b3 += `<text x="${EX+24}" y="${y+14}" fill="${P.mist}" font-family="${MONO}" font-size="7.2">${esc(`${c.span}   ·   ${c.hash}   ·   ${c.sig}`)}</text>`;
  for (let k = 0; k < 8; k++) {
    const hgt = 3 + parseInt(c.hash[k], 16) * 0.95;
    b3 += `<rect x="${EX + EW - 62 + k*8}" y="${n2(y - hgt)}" width="4" height="${n2(hgt)}" fill="${P.teal}" opacity="0.3"/>`;
  }
  b3 += `<line x1="${EX}" y1="${y+23}" x2="${EX+EW}" y2="${y+23}" stroke="${P.mist}" stroke-width="0.5" opacity="0.3"/>`;
});
b3 += `<text x="${EX}" y="${FY + 296}" fill="${P.mist}" font-family="${MONO}" font-size="8.6">${esc('0 unsourced · compile rejects claims without a line span')}</text>`;
b3 += `<text x="${EX}" y="${FY + 314}" fill="${P.mist}" font-family="${SANS}" font-size="9">${esc('右边那列不参与版面，它是 spec 的行号索引。')}</text>`;

const svg3 = wrap(head('03', '协议 · 证据索引 · 全部', '每行字都回到某一行 spec',
  '读完这张图，凭什么相信它写的是对的？', '6 claims · 6 spans · 0 unsourced')
  + b3
  + foot('先摆证据，再下结论：图是投影，证据是投影的来源，不是事后补的脚注。',
    'claims 6 · spans 6 · verbatim 1 · supported 4 · measured 1 · unsourced 0 · sha256 stable'));
writeFileSync(`${out}/03-evidence-trace.svg`, svg3); written.push('03-evidence-trace');

console.log(written.join('\n'));
