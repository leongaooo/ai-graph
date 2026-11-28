// 演示区整页：每一屏一个小节，每屏只讲一件事。
// 语法统一：章节号 + 一句主张 + 一张图 + 一句收口。
import { writeFileSync, mkdirSync } from 'node:fs';

const P = { paper:'#F7F6F1', ink:'#141A1F', tone:'#3D4A47', mist:'#8A948E', teal:'#0F6B5E', amber:'#B4761F' };
const SANS = 'PingFang SC, Noto Sans CJK SC, sans-serif';
const SERIF = 'Songti SC, Source Han Serif SC, serif';
const MONO = 'ui-monospace, Menlo, monospace';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const W = 1200, H = 675;

const head = (ch, label, title, sub) => `
<text x="72" y="60" fill="${P.teal}" font-family="${MONO}" font-size="9.5" letter-spacing="2">${ch}</text>
<text x="112" y="60" fill="${P.mist}" font-family="${SANS}" font-size="9" letter-spacing="1.6">${esc(label)}</text>
<text x="1128" y="60" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="9" letter-spacing="1.4">AI GRAPH · 演示区</text>
<text x="72" y="158" fill="${P.ink}" font-family="${SERIF}" font-size="41" font-weight="600" letter-spacing="0.6">${esc(title)}</text>
<text x="72" y="191" fill="${P.tone}" font-family="${SANS}" font-size="12.5">${esc(sub)}</text>`;

const close = (line, micro) => `
<line x1="72" y1="540" x2="1128" y2="540" stroke="${P.mist}" stroke-width="0.7" opacity="0.45"/>
<text x="72" y="574" fill="${P.teal}" font-family="${SANS}" font-size="9.5" letter-spacing="2">结论</text>
<text x="110" y="574" fill="${P.ink}" font-family="${SANS}" font-size="14" font-weight="600">${esc(line)}</text>
<text x="72" y="640" fill="${P.mist}" font-family="${MONO}" font-size="8.6">${esc(micro)}</text>`;

const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" xml:lang="zh-CN">
<defs><filter id="g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.73" numOctaves="2" seed="42"/></filter></defs>
<rect width="${W}" height="${H}" fill="${P.paper}"/>
<rect width="${W}" height="${H}" fill="${P.paper}" filter="url(#g)" opacity="0.032"/>
${body}
</svg>`;

const out = process.argv[2] || 'out/page';
mkdirSync(out, { recursive: true });
const names = [];
const save = (id, svg) => { writeFileSync(`${out}/${id}.svg`, svg); names.push(id); };

/* ─────────── 00 页面地图 ─────────── */
const chapters = [
  ['01','一句话，画成一张能开会的图','主张 · 一整屏只说一件事'],
  ['02','事实进来，图出来','机制 · 中间那道投影'],
  ['03','三种对象，三种问法','范围 · 系统 / 物质 / 人'],
  ['04','同输入，同字节','可复现 · 两遍一模一样'],
  ['05','每句话都有出处','可审计 · 行号与哈希'],
  ['06','一百二十个服务，八层','规模 · 秩序是算出来的'],
  ['07','横的竖的，同一份','适配 · 计算机与手机'],
  ['08','带一段你的事实来','入口 · 试一张']
];
let b0 = '';
const ROW0 = 234, STEP = 37;
b0 += `<line x1="102" y1="${ROW0 - 24}" x2="102" y2="${ROW0 + STEP*7 + 6}" stroke="${P.mist}" stroke-width="0.7" opacity="0.4"/>`;
chapters.forEach((c, i) => {
  const y = ROW0 + i * STEP;
  const here = i === 0;
  b0 += `<circle cx="102" cy="${y - 5}" r="${here ? 3.4 : 2}" fill="${here ? P.amber : P.mist}" opacity="${here ? 1 : 0.6}"/>`;
  b0 += `<text x="128" y="${y}" fill="${here ? P.teal : P.mist}" font-family="${MONO}" font-size="9">${c[0]}</text>`;
  b0 += `<text x="176" y="${y}" fill="${P.ink}" font-family="${SANS}" font-size="15" font-weight="600" opacity="${here ? 1 : 0.82}">${esc(c[1])}</text>`;
  b0 += `<text x="660" y="${y}" fill="${P.tone}" font-family="${SANS}" font-size="10">${esc(c[2])}</text>`;
});
b0 += `<text x="128" y="${ROW0 + 17}" fill="${P.amber}" font-family="${SANS}" font-size="8.4" opacity="0.9">你在这里</text>`;
save('00-page-map', wrap(head('00', '页面地图', '这一页怎么读', '八屏，一屏一件事；顺序就是论证顺序 —— 往下是论证，不是说明书。') + b0
  + close('读完一遍，你应该知道它是什么、凭什么、能给你什么。', '8 sections · 1 story each · one screen per claim')));

/* ─────────── 01 一句话 ─────────── */
{
  const PITCH = 264, NX = 72, NW = 216, NY = 274, NH = 96;
  const nodes = [
    { i:1, x:NX, title:'结算任务', note:'入口 · 批次', kind:'n', frag:['结算任务，','在第二步失败。'] },
    { i:2, x:NX+PITCH, title:'优惠券核销', note:'第二步 · 越层调用', kind:'c', frag:['优惠券核销','绕过了业务库，'] },
    { i:3, x:NX+PITCH*2, title:'业务库', note:'被跳过', kind:'s', frag:['业务库本该','在这一格。'] },
    { i:4, x:NX+PITCH*3, title:'基础库', note:'私有方法未导出', kind:'c', frag:['直接调了它的','私有方法。'] }
  ];
  let b1 = '';
  b1 += `<text x="72" y="60" fill="${P.teal}" font-family="${MONO}" font-size="9.5" letter-spacing="2">01</text>`;
  b1 += `<text x="112" y="60" fill="${P.mist}" font-family="${SANS}" font-size="9" letter-spacing="1.6">主张</text>`;
  b1 += `<text x="1128" y="60" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="9" letter-spacing="1.4">AI GRAPH · 演示区</text>`;
  b1 += `<text x="72" y="172" fill="${P.ink}" font-family="${SERIF}" font-size="43" font-weight="600" letter-spacing="1">一句话，画成一张能开会的图</text>`;
  b1 += `<text x="72" y="208" fill="${P.tone}" font-family="${SANS}" font-size="13">不用会排版，也不用请设计师：把一段带证据的事实交给它，图是算出来的。</text>`;
  b1 += `<rect x="${nodes[1].x - 10}" y="${NY - 10}" width="${NW + 20}" height="${NH + 20}" fill="${P.amber}" opacity="0.055"/>`;
  nodes.forEach(nd => {
    const amber = nd.kind === 'c', skipped = nd.kind === 's';
    b1 += skipped
      ? `<rect x="${nd.x}" y="${NY}" width="${NW}" height="${NH}" fill="none" stroke="${P.mist}" stroke-width="0.9" stroke-dasharray="5 5" opacity="0.8"/>`
      : `<rect x="${nd.x}" y="${NY}" width="${NW}" height="${NH}" fill="none" stroke="${amber ? P.amber : P.ink}" stroke-width="${amber ? 1.4 : 1.1}" opacity="${amber ? 0.95 : 0.85}"/>`;
    b1 += `<text x="${nd.x + 16}" y="${NY + 26}" fill="${skipped ? P.mist : (amber ? P.amber : P.ink)}" font-family="${MONO}" font-size="9" letter-spacing="1.2">0${nd.i}</text>`;
    b1 += `<text x="${nd.x + 16}" y="${NY + 56}" fill="${skipped ? P.tone : P.ink}" font-family="${SANS}" font-size="15" font-weight="600">${esc(nd.title)}</text>`;
    b1 += `<text x="${nd.x + 16}" y="${NY + 78}" fill="${skipped ? P.mist : P.tone}" font-family="${SANS}" font-size="9.5">${esc(nd.note)}</text>`;
  });
  const arrow = (x1, y, x2, c, w, o) => `<line x1="${x1}" y1="${y}" x2="${x2-6}" y2="${y}" stroke="${c}" stroke-width="${w}" opacity="${o}"/>`
    + `<path d="M${x2-7} ${y-3} L${x2} ${y} L${x2-7} ${y+3}" fill="none" stroke="${c}" stroke-width="${w}" opacity="${o}"/>`;
  b1 += arrow(NX + NW + 8, NY + NH/2, nodes[1].x - 8, P.ink, 1, 0.55);
  b1 += arrow(nodes[1].x + NW + 8, NY + NH/2, nodes[2].x - 8, P.mist, 0.8, 0.4);
  b1 += arrow(nodes[2].x + NW + 8, NY + NH/2, nodes[3].x - 8, P.mist, 0.8, 0.4);
  {
    const x1 = nodes[1].x + NW - 34, x2 = nodes[3].x + 34, yTop = NY - 30;
    b1 += `<path d="M${x1} ${NY+2} V${yTop} H${x2} V${NY-4}" fill="none" stroke="${P.amber}" stroke-width="1.7" stroke-dasharray="7 5"/>`;
    b1 += `<path d="M${x2-5} ${NY-10} L${x2} ${NY-2} L${x2+5} ${NY-10}" fill="none" stroke="${P.amber}" stroke-width="1.7"/>`;
    b1 += `<text x="${(x1+x2)/2}" y="${yTop-10}" text-anchor="middle" fill="${P.amber}" font-family="${SANS}" font-size="10.5" letter-spacing="0.6">实际走的是这一步 · 跳过业务库</text>`;
  }
  nodes.forEach((nd, k) => {
    const col = nd.kind === 's' ? P.mist : (nd.kind === 'c' ? P.amber : P.tone);
    b1 += `<line x1="${nd.x}" y1="${NY+NH+24}" x2="${nd.x+40}" y2="${NY+NH+24}" stroke="${nd.kind === 'c' ? P.amber : P.ink}" stroke-width="1" opacity="${nd.kind === 's' ? 0.3 : 0.55}"/>`;
    nd.frag.forEach((ln, j) => {
      b1 += `<text x="${nd.x+16}" y="${NY+NH+52+j*25}" fill="${col}" font-family="${SERIF}" font-size="15" opacity="${nd.kind === 's' ? 0.85 : 1}">${esc(ln)}</text>`;
    });
    if (k < 3) {
      const mid = nd.x + NW + (PITCH - NW) / 2;
      b1 += `<line x1="${mid}" y1="${NY+NH+34}" x2="${mid}" y2="${NY+NH+88}" stroke="${P.mist}" stroke-width="0.6" stroke-dasharray="2 4" opacity="0.5"/>`;
    }
  });
  b1 += `<line x1="72" y1="500" x2="104" y2="500" stroke="${P.amber}" stroke-width="2"/>`;
  b1 += `<text x="116" y="504" fill="${P.tone}" font-family="${SANS}" font-size="12.5">橙色是计划外的那一步 —— 四格里唯一没有 spec 背书的地方，所以它被画成虚线。</text>`;
  b1 += `<text x="1128" y="504" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="8.6" letter-spacing="0.8">↓ 02 事实进来，图出来</text>`;
  save('01-one-line', wrap(b1 + `
<line x1="72" y1="548" x2="1128" y2="548" stroke="${P.mist}" stroke-width="0.7" opacity="0.45"/>
<text x="72" y="580" fill="${P.teal}" font-family="${SANS}" font-size="9.5" letter-spacing="2">结论</text>
<text x="110" y="580" fill="${P.ink}" font-family="${SANS}" font-size="14.5" font-weight="600">先补导出，再谈重构。两次失败都压在同一条边上。</text>
<text x="72" y="640" fill="${P.mist}" font-family="${MONO}" font-size="8.8">4 段原文 → 4 个框 · 每条断言回指行号 · unsourced 0</text>`));
}

/* ─────────── 02 事实进来，图出来 ─────────── */
{
  let b = '';
  const SX = 72, SY = 236, SW = 296, SH = 264;
  b += `<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="${P.paper}" stroke="${P.ink}" stroke-width="0.9" opacity="0.9"/>`;
  b += `<text x="${SX + 14}" y="${SY + 24}" fill="${P.ink}" font-family="${MONO}" font-size="8.6" font-weight="600">spec.md</text>`;
  b += `<text x="${SX + SW - 14}" y="${SY + 24}" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="7.6">v0.2</text>`;
  b += `<line x1="${SX}" y1="${SY + 34}" x2="${SX + SW}" y2="${SY + 34}" stroke="${P.mist}" stroke-width="0.6" opacity="0.6"/>`;
  const lines = [
    ['1', 'contract: build-failure'],
    ['3', 'claim: 结算任务在第二步失败'],
    ['4', 'claim: 核销绕过了业务库'],
    ['6', 'claim: 私有方法未导出'],
    ['9', 'evidence: L14–L19'],
    ['12','evidence: L31 · verbatim'],
    ['15','decision: 先补导出']
  ];
  lines.forEach((l, i) => {
    const y = SY + 56 + i * 28;
    b += `<text x="${SX + 12}" y="${y}" fill="${P.mist}" font-family="${MONO}" font-size="7">${l[0]}</text>`;
    b += `<text x="${SX + 30}" y="${y}" fill="${i >= 4 ? P.teal : P.tone}" font-family="${MONO}" font-size="7.6">${esc(l[1])}</text>`;
    b += `<line x1="${SX}" y1="${y + 13}" x2="${SX + SW}" y2="${y + 13}" stroke="${P.mist}" stroke-width="0.4" opacity="0.22"/>`;
  });
  b += `<polygon points="${SX+SW+6},${SY+34} ${SX+SW+6},${SY+SH-34} 548,${SY+SH-4} 548,${SY+4}" fill="${P.amber}" opacity="0.05"/>`;
  b += `<line x1="${SX+SW+6}" y1="${SY+34}" x2="548" y2="${SY+4}" stroke="${P.amber}" stroke-width="0.8" stroke-dasharray="6 6" opacity="0.5"/>`;
  b += `<line x1="${SX+SW+6}" y1="${SY+SH-34}" x2="548" y2="${SY+SH-4}" stroke="${P.amber}" stroke-width="0.8" stroke-dasharray="6 6" opacity="0.5"/>`;
  b += `<text x="${(SX+SW+548)/2}" y="${SY+SH+16}" text-anchor="middle" fill="${P.amber}" font-family="${MONO}" font-size="8.4" letter-spacing="1.4">projector</text>`;

  const FX = 560, FWD = 480, FY = 240, FH = 58, FG = 36;
  b += `<text x="${FX}" y="${FY - 12}" fill="${P.mist}" font-family="${MONO}" font-size="7.6" letter-spacing="1.2">OUTPUT · SVG 1200 × 675</text>`;
  ['应用层','业务库','基础库'].forEach((nm, i) => {
    const y = FY + i * (FH + FG);
    b += `<rect x="${FX}" y="${y}" width="${FWD}" height="${FH}" fill="${i === 2 ? P.mist : 'none'}" stroke="${P.ink}" stroke-width="${i === 2 ? 0.9 : 1.1}" opacity="${i === 2 ? 0.06 : 0.85}"/>`;
    b += `<text x="${FX + 18}" y="${y + 27}" fill="${P.ink}" font-family="${SANS}" font-size="13" font-weight="600">${nm}</text>`;
    b += `<text x="${FX + 18}" y="${y + 47}" fill="${P.tone}" font-family="${MONO}" font-size="7.6">${['apps/web · apps/admin','packages/core','packages/util · getRate()'][i]}</text>`;
  });
  {
    const x = FX + 300;
    b += `<path d="M${x} ${FY + FH} V${FY + 2*(FH+FG)}" stroke="${P.amber}" stroke-width="1.8" stroke-dasharray="6 5"/>`;
    b += `<circle cx="${x}" cy="${FY + FH + FG + 16}" r="3" fill="${P.paper}" stroke="${P.amber}" stroke-width="1"/>`;
  }
  b += `<text x="${FX}" y="${FY + 2*(FH+FG) + FH + 26}" fill="${P.mist}" font-family="${SANS}" font-size="9">一根线只往下走，除非 spec 里写着它跳。</text>`;
  save('02-projection', wrap(head('02', '机制', '事实进来，图出来', '左边一份带行号的事实稿，右边一张图。中间那道张开的光，是唯一的加工环节。') + b
    + close('投影器不认识"好看"，只认识 spec 里的层级、关系和结论。', 'input spec.md · projector 1 · output deterministic SVG · handwork 0')));
}

/* ─────────── 03 三种对象，三种问法 ─────────── */
{
  let b = '';
  const cols = [
    { x:72,  name:'系统', q:'哪条依赖越了层？', note:'软件工程 · 服务架构', kind:'stack' },
    { x:432, name:'物质', q:'什么时候越过阈值？', note:'汽车 · 航天 · 生化', kind:'curve' },
    { x:792, name:'人',   q:'三天后还记得多少？', note:'学习 · 商务 · 生活', kind:'saw' }
  ];
  cols.forEach(c => {
    b += `<text x="${c.x}" y="246" fill="${P.mist}" font-family="${SANS}" font-size="9" letter-spacing="2.4">${esc(c.name)}</text>`;
    b += `<line x1="${c.x + 34}" y1="242" x2="${c.x + 74}" y2="242" stroke="${P.ink}" stroke-width="0.9" opacity="0.45"/>`;
    b += `<text x="${c.x}" y="446" fill="${P.ink}" font-family="${SANS}" font-size="17" font-weight="600">${esc(c.q)}</text>`;
    b += `<text x="${c.x}" y="470" fill="${P.tone}" font-family="${SANS}" font-size="9.5">${esc(c.note)}</text>`;
    const gx = c.x, gy = 282, gw = 312;
    if (c.kind === 'stack') {
      [0,1,2].forEach(i => {
        b += `<rect x="${gx}" y="${gy + i*38}" width="${gw - 40}" height="28" fill="none" stroke="${P.ink}" stroke-width="${i===2?1.4:0.9}" opacity="${i===2?0.9:0.5}"/>`;
      });
      b += `<path d="M${gx + gw - 40} ${gy + 14} H${gx + gw - 14} V${gy + 90} H${gx + gw - 40}" fill="none" stroke="${P.amber}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
      b += `<text x="${gx + gw - 8}" y="${gy + 6}" fill="${P.amber}" font-family="${MONO}" font-size="7.4" letter-spacing="1">越层</text>`;
    } else if (c.kind === 'curve') {
      b += `<path d="M${gx} ${gy + 112} L${gx + 56} ${gy + 100} L${gx + 92} ${gy + 40} L${gx + 140} ${gy + 30} L${gx + 176} ${gy + 12} L${gx + gw - 8} ${gy + 10}" fill="none" stroke="${P.ink}" stroke-width="1.4"/>`;
      b += `<line x1="${gx}" y1="${gy + 40}" x2="${gx + gw - 8}" y2="${gy + 40}" stroke="${P.amber}" stroke-width="1" stroke-dasharray="5 4"/>`;
      b += `<circle cx="${gx + 92}" cy="${gy + 40}" r="3.4" fill="${P.amber}"/>`;
      b += `<text x="${gx + 80}" y="${gy + 28}" text-anchor="end" fill="${P.amber}" font-family="${MONO}" font-size="7.6">18 s</text>`;
      b += `<text x="${gx + gw - 8}" y="${gy + 56}" text-anchor="end" fill="${P.amber}" font-family="${MONO}" font-size="7.2" letter-spacing="0.8">阈值</text>`;
    } else {
      const pts = [[0,20],[40,96],[70,40],[110,110],[140,54],[180,116],[214,70],[260,122],[300,88]];
      let d = '';
      pts.forEach((p, i) => { d += `${i ? 'L' : 'M'}${gx + p[0]} ${gy + p[1]} `; });
      b += `<line x1="${gx}" y1="${gy + 132}" x2="${gx + 300}" y2="${gy + 132}" stroke="${P.mist}" stroke-width="0.6" stroke-dasharray="3 4" opacity="0.45"/>`;
      b += `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="1.2"/>`;
      [2, 4, 6].forEach(i => {
        const p = pts[i];
        b += `<line x1="${gx + p[0]}" y1="${gy + p[1] - 12}" x2="${gx + p[0]}" y2="${gy + p[1] - 2}" stroke="${P.teal}" stroke-width="1.4" opacity="0.85"/>`;
        b += `<circle cx="${gx + p[0]}" cy="${gy + p[1]}" r="2.4" fill="${P.teal}"/>`;
      });
      b += `<text x="${gx + 70}" y="${gy + 20}" fill="${P.teal}" font-family="${MONO}" font-size="7.4">复习 ×3</text>`;
    }
  });
  save('03-three-objects', wrap(head('03', '范围', '三种对象，三种问法', '系统要层级，物质要因果，人要取舍 —— 问法决定图形，不是反过来。') + b
    + close('三个领域，三种骨架；同一套引擎，只换参数。', 'objects 3 · morphologies 3 · story per figure 1')));
}

/* ─────────── 04 同输入，同字节 ─────────── */
{
  let b = '';
  const mini = (x, tag) => {
    let s = `<text x="${x}" y="250" fill="${P.mist}" font-family="${MONO}" font-size="8" letter-spacing="1.2">${tag}</text>`;
    s += `<rect x="${x - 8}" y="262" width="332" height="212" fill="none" stroke="${P.mist}" stroke-width="0.7" opacity="0.5"/>`;
    ['结算任务','优惠券核销','基础库'].forEach((nm, i) => {
      const y = 276 + i * 62;
      s += `<rect x="${x}" y="${y}" width="300" height="40" fill="none" stroke="${i===1 ? P.amber : P.ink}" stroke-width="${i===1?1.3:0.9}" opacity="${i===1?0.9:0.55}"/>`;
      s += `<text x="${x+12}" y="${y+25}" fill="${i===1 ? P.amber : P.ink}" font-family="${SANS}" font-size="10.5" font-weight="500">${nm}</text>`;
      if (i < 2) s += `<line x1="${x+150}" y1="${y+40}" x2="${x+150}" y2="${y+62}" stroke="${P.mist}" stroke-width="0.8" opacity="0.5"/>`;
    });
    s += `<path d="M${x+266} ${276+40} H${x+286} V${276+62}" fill="none" stroke="${P.amber}" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.7"/>`;
    return s;
  };
  b += mini(76, 'run #1');
  b += mini(440, 'run #2');
  b += `<text x="412" y="374" text-anchor="middle" fill="${P.ink}" font-family="${MONO}" font-size="20" opacity="0.55">=</text>`;
  b += `<text x="800" y="298" fill="${P.ink}" font-family="${SANS}" font-size="13" font-weight="600">两次输出</text>`;
  b += `<text x="800" y="320" fill="${P.tone}" font-family="${SANS}" font-size="9.5">逐字节相同</text>`;
  b += `<text x="800" y="360" fill="${P.teal}" font-family="${MONO}" font-size="8.4">sha256</text>`;
  b += `<text x="800" y="380" fill="${P.ink}" font-family="${MONO}" font-size="9.2">8ca1 4044 ccf2 0942</text>`;
  b += `<text x="800" y="394" fill="${P.ink}" font-family="${MONO}" font-size="9.2">fa35 89df b69c 7614</text>`;
  b += `<text x="800" y="416" fill="${P.mist}" font-family="${MONO}" font-size="7.4">run #1 = run #2</text>`;
  b += `<g transform="rotate(-11 1006 386)">`;
  b += `<circle cx="1006" cy="386" r="42" fill="none" stroke="${P.amber}" stroke-width="1.3" opacity="0.55"/>`;
  b += `<circle cx="1006" cy="386" r="36" fill="none" stroke="${P.amber}" stroke-width="0.8" opacity="0.3"/>`;
  b += `<text x="1006" y="383" text-anchor="middle" fill="${P.amber}" font-family="${MONO}" font-size="7.4" letter-spacing="1">BYTE-IDENTICAL</text>`;
  b += `<text x="1006" y="396" text-anchor="middle" fill="${P.amber}" font-family="${MONO}" font-size="6.4" letter-spacing="1">NO RANDOMNESS</text>`;
  b += `</g>`;
  save('04-byte-identical', wrap(head('04', '可复现', '同输入，同字节', '同一份 spec 跑两遍，SVG 一模一样 —— 图可以被复查，也可以被复算。') + b
    + close('只要 spec 不变，图就不会偷偷变；改了，哈希会先告诉你。', 'two runs · one sha256 · randomness 0 · re-verifiable by anyone')));
}

/* ─────────── 05 每句话都有出处 ─────────── */
{
  let b = '';
  const LX = 72, RX1 = 676, RX2 = 806, RX3 = 920, REND = 1076;
  b += `<text x="${LX}" y="266" fill="${P.ink}" font-family="${SERIF}" font-size="19" letter-spacing="0.4">“优惠券核销绕过了业务库。”</text>`;
  b += `<text x="${LX}" y="292" fill="${P.mist}" font-family="${MONO}" font-size="7.8" letter-spacing="1.6">ONE CLAIM · THREE SPANS</text>`;
  // 表头
  b += `<text x="${RX1}" y="320" fill="${P.mist}" font-family="${MONO}" font-size="7.4" letter-spacing="1.2">行号</text>`;
  b += `<text x="${RX2}" y="320" fill="${P.mist}" font-family="${MONO}" font-size="7.4" letter-spacing="1.2">文本哈希</text>`;
  b += `<text x="${RX3}" y="320" fill="${P.mist}" font-family="${MONO}" font-size="7.4" letter-spacing="1.2">kind</text>`;
  const rows = [
    { w:'优惠券核销', sx:164, span:'L44 – L49', hash:'9e70c3bd', kind:'supported', y:348 },
    { w:'绕过',       sx:120, span:'L46',       hash:'4b1c80e2', kind:'supported', y:404 },
    { w:'业务库',     sx:130, span:'L48',       hash:'a7f2d106', kind:'supported', y:460 }
  ];
  rows.forEach((r, i) => {
    b += `<text x="${LX}" y="${r.y}" fill="${P.ink}" font-family="${SERIF}" font-size="16">${r.w}</text>`;
    // 点线：把词和右列缝起来
    let dots = '';
    for (let x = r.sx; x < RX1 - 10; x += 8.5) {
      dots += `<circle cx="${x.toFixed(1)}" cy="${r.y - 4}" r="0.9" fill="${P.mist}" opacity="0.55"/>`;
    }
    b += dots;
    b += `<text x="${RX1}" y="${r.y}" fill="${P.tone}" font-family="${MONO}" font-size="11.5">${r.span}</text>`;
    b += `<text x="${RX2}" y="${r.y}" fill="${P.ink}" font-family="${MONO}" font-size="9.6">${r.hash}</text>`;
    b += `<text x="${RX3}" y="${r.y}" fill="${P.teal}" font-family="${MONO}" font-size="8.6">${r.kind}</text>`;
    if (i === 0) b += `<circle cx="${RX1 - 5}" cy="${r.y - 4}" r="2.4" fill="${P.teal}" opacity="0.85"/>`;
    b += `<line x1="${LX}" y1="${r.y + 16}" x2="${REND}" y2="${r.y + 16}" stroke="${P.mist}" stroke-width="0.5" opacity="0.3"/>`;
  });
  b += `<text x="${LX}" y="512" fill="${P.tone}" font-family="${SANS}" font-size="10">三个词，三条行号，三个哈希 —— 少一条，这句话就进不了图。</text>`;
  save('05-evidence', wrap(head('05', '可审计', '每句话都有出处', '图上任意一句话，都能回到 spec 的某几行；回不去的话，compile 直接拒。') + b
    + close('没有行号的断言进不了图 —— 这是协议，不是自觉。', 'span + hash + kind · unsourced 0 · rejected at compile time')));
}

/* ─────────── 06 一百二十个服务，八层 ─────────── */
{
  let b = '';
  const sizes = [10,16,20,18,16,14,14,12];
  const X0 = 150, PITCH = 128, TOPY = 306, BOTY = 474;
  const NW = 40, NH = 6;
  const pos = (i, j) => {
    const cx = X0 + i * PITCH;
    const pitch = (BOTY - TOPY) / sizes[i];
    return { x: cx, y: TOPY + pitch * (j + 0.5) };
  };
  // 极浅的边：每两个节点出一条，织成一张网，但不抢字
  let e = '';
  for (let i = 0; i < 7; i++) {
    const nA = sizes[i], nB = sizes[i + 1];
    for (let j = 0; j < nA; j++) {
      if (j % 2 && i % 2) continue;
      const k = (Math.round(j * 1.37) + i * 3) % nB;
      const a = pos(i, j), c = pos(i + 1, k);
      e += `<line x1="${(a.x + NW/2).toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${(c.x - NW/2).toFixed(1)}" y2="${c.y.toFixed(1)}" stroke="${P.ink}" stroke-width="0.6" opacity="0.12"/>`;
    }
  }
  b += e;
  // 节点
  sizes.forEach((n, i) => {
    const cx = X0 + i * PITCH;
    b += `<text x="${cx}" y="${TOPY - 30}" text-anchor="middle" fill="${P.mist}" font-family="${MONO}" font-size="8">R${i}</text>`;
    b += `<text x="${cx}" y="${TOPY - 16}" text-anchor="middle" fill="${P.mist}" font-family="${MONO}" font-size="6.4" opacity="0.7">${n}</text>`;
    for (let j = 0; j < n; j++) {
      const p = pos(i, j);
      b += `<rect x="${(p.x - NW/2).toFixed(1)}" y="${(p.y - NH/2).toFixed(1)}" width="${NW}" height="${NH}" fill="${P.ink}" opacity="0.24"/>`;
    }
  });
  // 热路径：一串真的连起来的节点
  const hot = [0, 3, 9, 12, 22, 7, 40];
  const hs = [[1, 2], [2, 9], [3, 12], [4, 4], [5, 7], [6, 2]];
  b += `<path d="${hs.map(([i, j], k) => {
    const p = pos(i, j);
    return `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(' ')}" fill="none" stroke="${P.ink}" stroke-width="2" opacity="0.9"/>`;
  hs.forEach(([i, j]) => {
    const p = pos(i, j);
    b += `<rect x="${(p.x - NW/2 - 1).toFixed(1)}" y="${(p.y - NH/2 - 1).toFixed(1)}" width="${NW + 2}" height="${NH + 2}" fill="${P.ink}"/>`;
  });
  b += `<text x="${X0 + 6 * PITCH + 40}" y="${(pos(6, 2).y - 6).toFixed(1)}" fill="${P.teal}" font-family="${SANS}" font-size="8.6">热路径 · 一条</text>`;
  // 回指：从 R5 跨到 R2，走顶部通道
  const bx1 = X0 + 5 * PITCH + NW/2, bx2 = X0 + 2 * PITCH + NW/2, CH = 250;
  const y1 = pos(5, 0).y, y2 = pos(2, 0).y;
  b += `<path d="M${bx1} ${y1.toFixed(1)} V${CH} H${bx2} V${y2.toFixed(1)} H${X0 + 2*PITCH}" fill="none" stroke="${P.amber}" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  b += `<path d="M${X0 + 2*PITCH + 6} ${(y2 - 3.5).toFixed(1)} L${X0 + 2*PITCH - 2} ${y2.toFixed(1)} L${X0 + 2*PITCH + 6} ${(y2 + 3.5).toFixed(1)}" fill="none" stroke="${P.amber}" stroke-width="1.5"/>`;
  b += `<text x="${(bx1 + bx2) / 2}" y="${CH - 8}" text-anchor="middle" fill="${P.amber}" font-family="${SANS}" font-size="9.5">一条回指 · 八层拉成环</text>`;
  save('06-scale', wrap(head('06', '规模', '一百二十个服务，八层', '不是二十个框的流程图：层级、顺序、环，都从数据里算出来。') + b
    + close('这张图没人手摆 —— 所以它能被重算，也能被追到某一行。', 'nodes 120 · ranks 8 · cycles 1 · layered layout · labels 0')));
}

/* ─────────── 07 横的竖的，同一份 ─────────── */
{
  let b = '';
  const AX = 96, AY = 244, AW = 450, AH = 253;
  b += `<text x="${AX}" y="${AY - 12}" fill="${P.mist}" font-family="${MONO}" font-size="8" letter-spacing="1">1200 × 675 · 桌面</text>`;
  b += `<rect x="${AX}" y="${AY}" width="${AW}" height="${AH}" fill="none" stroke="${P.mist}" stroke-width="0.7" opacity="0.55"/>`;
  {
    const s = AW / 1200, sy = AH / 675;
    const px = v => AX + v * s, py = v => AY + v * sy;
    // 缩略的标题区
    b += `<text x="${px(24)}" y="${py(66)}" fill="${P.mist}" font-family="${MONO}" font-size="5.4">01</text>`;
    b += `<text x="${px(26)}" y="${py(108)}" fill="${P.ink}" font-family="${SERIF}" font-size="16" letter-spacing="0.4">一句话，画成一张能开会的图</text>`;
    b += `<rect x="${px(26)}" y="${py(134)}" width="${330 * s}" height="2.4" fill="${P.mist}" opacity="0.4"/>`;
    b += `<rect x="${px(26)}" y="${py(143)}" width="${216 * s}" height="2.4" fill="${P.mist}" opacity="0.28"/>`;
    // 四格
    [[72,'结算任务'],[336,'优惠券核销'],[600,'业务库'],[864,'基础库']].forEach(([x, nm], i) => {
      const am = i === 1, sk = i === 2;
      b += `<rect x="${px(x)}" y="${py(274)}" width="${216 * s}" height="${96 * s}" fill="none" stroke="${sk ? P.mist : (am ? P.amber : P.ink)}" stroke-width="${am ? 1.1 : 0.6}" opacity="${sk ? 0.4 : 0.75}" ${sk ? 'stroke-dasharray="3 3"' : ''}/>`;
      b += `<text x="${px(x + 16)}" y="${py(274 + 56)}" fill="${sk ? P.mist : (am ? P.amber : P.ink)}" font-family="${SANS}" font-size="7.6">${nm}</text>`;
      b += `<rect x="${px(x + 16)}" y="${py(274 + 66)}" width="${120 * s}" height="2.2" fill="${P.mist}" opacity="0.35"/>`;
    });
    b += `<path d="M${px(518)} ${py(274)} V${py(240)} H${px(898)} V${py(274)}" fill="none" stroke="${P.amber}" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>`;
    // 原句片段（用短横条示意，保留节奏不保留字）
    [72, 336, 600, 864].forEach((x, i) => {
      b += `<rect x="${px(x + 16)}" y="${py(422)}" width="${(i === 2 ? 88 : 150) * s}" height="2.4" fill="${P.mist}" opacity="${i === 2 ? 0.3 : 0.42}"/>`;
      b += `<rect x="${px(x + 16)}" y="${py(448)}" width="${(i === 2 ? 70 : 130) * s}" height="2.4" fill="${P.mist}" opacity="${i === 2 ? 0.22 : 0.3}"/>`;
    });
    b += `<line x1="${px(26)}" y1="${py(577)}" x2="${px(50)}" y2="${py(577)}" stroke="${P.amber}" stroke-width="1.6"/>`;
    b += `<text x="${px(58)}" y="${py(580)}" fill="${P.ink}" font-family="${SANS}" font-size="7">先补导出，再谈重构。</text>`;
  }

  const BX = 664, BY = 240, BW = 130, BH = 288;
  b += `<text x="${BX}" y="${BY - 12}" fill="${P.mist}" font-family="${MONO}" font-size="8" letter-spacing="1">390 × 860 · 手机</text>`;
  b += `<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" fill="none" stroke="${P.mist}" stroke-width="0.7" opacity="0.55"/>`;
  b += `<text x="${BX + 10}" y="${BY + 26}" fill="${P.ink}" font-family="${SERIF}" font-size="9">一句话，画成</text>`;
  b += `<text x="${BX + 10}" y="${BY + 40}" fill="${P.ink}" font-family="${SERIF}" font-size="9">一张图</text>`;
  [[1,'结算任务'],[2,'核销'],[3,'业务库'],[4,'基础库']].forEach(([i, nm], k) => {
    const y = BY + 66 + k * 48;
    const am = i === 2 || i === 4, sk = i === 3;
    b += `<rect x="${BX + 10}" y="${y}" width="${BW - 20}" height="34" fill="none" stroke="${sk ? P.mist : (am ? P.amber : P.ink)}" stroke-width="0.6" opacity="${sk ? 0.35 : 0.6}" ${sk ? 'stroke-dasharray="3 2"' : ''}/>`;
    b += `<text x="${BX + 18}" y="${y + 20}" fill="${sk ? P.mist : (am ? P.amber : P.ink)}" font-family="${SANS}" font-size="7.4">${nm}</text>`;
    if (k < 3) b += `<line x1="${BX + BW/2}" y1="${y + 34}" x2="${BX + BW/2}" y2="${y + 48}" stroke="${P.mist}" stroke-width="0.6" opacity="0.4"/>`;
  });
  b += `<text x="${BX + 10}" y="${BY + BH - 16}" fill="${P.mist}" font-family="${MONO}" font-size="6.4">conclusion</text>`;

  b += `<text x="836" y="282" fill="${P.ink}" font-family="${SANS}" font-size="13" font-weight="600">重排，不是缩放</text>`;
  ['一条链路从横排改成一列，','标题换行，说明收短，','结论收在底部。','同一个 spec，两份输出。'].forEach((t, i) => {
    b += `<text x="836" y="${312 + i * 24}" fill="${P.tone}" font-family="${SANS}" font-size="10.5">${esc(t)}</text>`;
  });
  b += `<text x="836" y="446" fill="${P.teal}" font-family="${MONO}" font-size="8">reflow × 2 · hand edit 0</text>`;
  save('07-two-formats', wrap(head('07', '适配', '横的竖的，同一份', '不是把图缩小到手机上：同一个 spec，两种排版各算一遍。') + b
    + close('版式是投影参数，不是第二份手工活。', 'format 1200×675 / 390×860 · duplicate content 0')));
}

/* ─────────── 08 带一段你的事实来 ─────────── */
{
  let b = '';
  b += `<text x="72" y="300" fill="${P.ink}" font-family="${SERIF}" font-size="30" letter-spacing="0.6">把昨天那次构建失败，交给它。</text>`;
  b += `<line x1="72" y1="326" x2="500" y2="326" stroke="${P.amber}" stroke-width="2"/>`;
  b += `<text x="72" y="362" fill="${P.tone}" font-family="${SANS}" font-size="11.5">一段日志、一页笔记、一张表都行；它只要求一件事 —— 每句话能指回原文。</text>`;
  b += `<text x="72" y="432" fill="${P.mist}" font-family="${MONO}" font-size="9" letter-spacing="1.6">validate → compile → query</text>`;
  b += `<text x="72" y="454" fill="${P.mist}" font-family="${SANS}" font-size="9.5">三个动词，一条命令；出图不用打开设计软件。</text>`;
  {
    const CX = 976, CY = 344, R = 76;
    b += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${P.mist}" stroke-width="0.7" opacity="0.32"/>`;
    b += `<path d="M${CX - R} ${CY} H${CX + R}" stroke="${P.mist}" stroke-width="0.6" opacity="0.2"/>`;
    b += `<path d="M${CX} ${CY - R} V${CY + R}" stroke="${P.mist}" stroke-width="0.6" opacity="0.2"/>`;
    // 正在画的那一段弧
    const a1 = 206, a2 = 320;
    const pt = a => [CX + R * Math.cos(a * Math.PI / 180), CY + R * Math.sin(a * Math.PI / 180)];
    const p1 = pt(a1), p2 = pt(a2);
    b += `<path d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${R} ${R} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" fill="none" stroke="${P.amber}" stroke-width="1.6" opacity="0.85"/>`;
    b += `<line x1="${CX}" y1="${CY}" x2="${p1[0].toFixed(1)}" y2="${p1[1].toFixed(1)}" stroke="${P.amber}" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.45"/>`;
    b += `<line x1="${CX}" y1="${CY}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="${P.amber}" stroke-width="0.9" opacity="0.35"/>`;
    b += `<circle cx="${CX}" cy="${CY}" r="3.6" fill="${P.amber}"/>`;
    b += `<circle cx="${p2[0].toFixed(1)}" cy="${p2[1].toFixed(1)}" r="2.6" fill="${P.amber}"/>`;
    b += `<text x="${CX}" y="${CY + R + 30}" text-anchor="middle" fill="${P.mist}" font-family="${MONO}" font-size="7.6" letter-spacing="1.4">1 SPEC · 1 FIGURE</text>`;
  }
  save('08-come-with-facts', wrap(head('08', '入口', '带一段你的事实来', '这一页到这里结束；下一张图，应该由你的材料生成。') + b
    + close('试一张，就知道值不值。', 'start from your own material · nothing pre-drawn')));
}

console.log(names.join('\n'));
