// 演示区入口第一屏：一句话 → 一张图
// 只讲一个故事，克制的字量；零依赖，固定输入逐字节一致。
import { writeFileSync, mkdirSync } from 'node:fs';

const P = { paper:'#F7F6F1', ink:'#141A1F', tone:'#3D4A47', mist:'#8A948E', teal:'#0F6B5E', amber:'#B4761F' };
const W = 1200, H = 675;
const SANS = 'PingFang SC, Noto Sans CJK SC, sans-serif';
const SERIF = 'Songti SC, Source Han Serif SC, serif';
const MONO = 'ui-monospace, Menlo, monospace';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* 四段话 / 四个节点，一一对应；同一套 x */
const PITCH = 264, NX = 72, NW = 216, NY = 274, NH = 96;
const nodes = [
  { i:1, x:NX,         title:'结算任务',   note:'入口 · 批次',       kind:'normal',
    frag:['结算任务，','在第二步失败。'] },
  { i:2, x:NX+PITCH,   title:'优惠券核销', note:'第二步 · 越层调用', kind:'culprit',
    frag:['优惠券核销','绕过了业务库，'] },
  { i:3, x:NX+PITCH*2, title:'业务库',     note:'被跳过',           kind:'skipped',
    frag:['业务库本该','在这一格。'] },
  { i:4, x:NX+PITCH*3, title:'基础库',     note:'私有方法未导出',    kind:'culprit',
    frag:['直接调了它的','私有方法。'] }
];

let b = '';
b += `<text x="72" y="66" fill="${P.teal}" font-family="${MONO}" font-size="9.5" letter-spacing="2.2">AI GRAPH</text>`;
b += `<text x="1128" y="66" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="9" letter-spacing="1.4">演示区 · 第一屏</text>`;

b += `<text x="72" y="176" fill="${P.ink}" font-family="${SERIF}" font-size="43" font-weight="600" letter-spacing="1">一句话，画成一张能开会的图</text>`;
b += `<text x="72" y="212" fill="${P.tone}" font-family="${SANS}" font-size="13" letter-spacing="0.3">不用会排版，也不用请设计师：把一段带证据的事实交给它，图是算出来的。</text>`;

// 一点点纸面高亮：只压在出事的那一格，不做装饰
b += `<rect x="${nodes[1].x - 10}" y="${NY - 10}" width="${NW + 20}" height="${NH + 20}" fill="${P.amber}" opacity="0.055"/>`;
nodes.forEach(nd => {
  const amber = nd.kind === 'culprit', skipped = nd.kind === 'skipped';
  if (skipped) {
    b += `<rect x="${nd.x}" y="${NY}" width="${NW}" height="${NH}" fill="none" stroke="${P.mist}" stroke-width="0.9" stroke-dasharray="5 5" opacity="0.8"/>`;
  } else {
    b += `<rect x="${nd.x}" y="${NY}" width="${NW}" height="${NH}" fill="none" stroke="${amber ? P.amber : P.ink}" stroke-width="${amber ? 1.4 : 1.1}" opacity="${amber ? 0.95 : 0.85}"/>`;
  }
  const numC = skipped ? P.mist : (amber ? P.amber : P.ink);
  b += `<text x="${nd.x + 16}" y="${NY + 26}" fill="${numC}" font-family="${MONO}" font-size="9" letter-spacing="1.2">0${nd.i}</text>`;
  b += `<text x="${nd.x + 16}" y="${NY + 56}" fill="${skipped ? P.tone : P.ink}" font-family="${SANS}" font-size="15" font-weight="600">${esc(nd.title)}</text>`;
  b += `<text x="${nd.x + 16}" y="${NY + 78}" fill="${skipped ? P.mist : P.tone}" font-family="${SANS}" font-size="9.5">${esc(nd.note)}</text>`;
});

function arrow(x1, y, x2, stroke, sw, op) {
  return `<line x1="${x1}" y1="${y}" x2="${x2 - 6}" y2="${y}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"/>`
       + `<path d="M${x2 - 7} ${y - 3} L${x2} ${y} L${x2 - 7} ${y + 3}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${op}"/>`;
}
b += arrow(NX + NW + 8,  NY + NH/2, nodes[1].x - 8, P.ink, 1, 0.55);
b += arrow(nodes[1].x + NW + 8, NY + NH/2, nodes[2].x - 8, P.mist, 0.8, 0.4);
b += arrow(nodes[2].x + NW + 8, NY + NH/2, nodes[3].x - 8, P.mist, 0.8, 0.4);

// 实际走的那一步：02 从上方绕到 04
{
  const x1 = nodes[1].x + NW - 34, x2 = nodes[3].x + 34, yTop = NY - 30;
  b += `<path d="M${x1} ${NY+2} V${yTop} H${x2} V${NY-4}" fill="none" stroke="${P.amber}" stroke-width="1.7" stroke-dasharray="7 5"/>`;
  b += `<path d="M${x2 - 5} ${NY - 10} L${x2} ${NY - 2} L${x2 + 5} ${NY - 10}" fill="none" stroke="${P.amber}" stroke-width="1.7"/>`;
  b += `<text x="${(x1 + x2)/2}" y="${yTop - 10}" text-anchor="middle" fill="${P.amber}" font-family="${SANS}" font-size="10.5" letter-spacing="0.6">实际走的是这一步 · 跳过业务库</text>`;
}

// 被切开的那句话：四段贴着节点
nodes.forEach((nd, k) => {
  const col = nd.kind === 'skipped' ? P.mist : (nd.kind === 'culprit' ? P.amber : P.tone);
  b += `<line x1="${nd.x}" y1="${NY + NH + 24}" x2="${nd.x + 40}" y2="${NY + NH + 24}" stroke="${nd.kind === 'culprit' ? P.amber : P.ink}" stroke-width="1" opacity="${nd.kind === 'skipped' ? 0.3 : 0.55}"/>`;
  nd.frag.forEach((line, j) => {
    b += `<text x="${nd.x + 16}" y="${NY + NH + 52 + j * 25}" fill="${col}" font-family="${SERIF}" font-size="15" opacity="${nd.kind === 'skipped' ? 0.85 : 1}">${esc(line)}</text>`;
  });
  if (k < 3) {
    const mid = nd.x + NW + (PITCH - NW) / 2;
    b += `<line x1="${mid}" y1="${NY + NH + 34}" x2="${mid}" y2="${NY + NH + 88}" stroke="${P.mist}" stroke-width="0.6" stroke-dasharray="2 4" opacity="0.5"/>`;
  }
});

b += `<line x1="72" y1="500" x2="104" y2="500" stroke="${P.amber}" stroke-width="2"/>`;
b += `<text x="116" y="504" fill="${P.tone}" font-family="${SANS}" font-size="12.5">橙色是计划外的那一步 —— 四格里唯一没有 spec 背书的地方，所以它被画成虚线。</text>`;
b += `<text x="1128" y="504" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="8.6" letter-spacing="0.8">↓ 三类对象 · 七种图法</text>`;
b += `<line x1="72" y1="548" x2="1128" y2="548" stroke="${P.mist}" stroke-width="0.7" opacity="0.45"/>`;
b += `<text x="72" y="580" fill="${P.teal}" font-family="${SANS}" font-size="9.5" letter-spacing="2">结论</text>`;
b += `<text x="110" y="580" fill="${P.ink}" font-family="${SANS}" font-size="14.5" font-weight="600">先补导出，再谈重构。两次失败都压在同一条边上。</text>`;
b += `<text x="72" y="640" fill="${P.mist}" font-family="${MONO}" font-size="8.8">4 段原文 → 4 个框 · 每条断言回指行号 · unsourced 0 · 同一份 spec 可重排 1200 × 675 / 390 × 860</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" xml:lang="zh-CN">
<title>一句话，画成一张能开会的图</title>
<defs><filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.73" numOctaves="2" seed="42"/></filter></defs>
<rect width="${W}" height="${H}" fill="${P.paper}"/>
<rect width="${W}" height="${H}" fill="${P.paper}" filter="url(#grain)" opacity="0.032"/>
${b}
</svg>`;

const out = process.argv[2] || 'out/hero';
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/hero-one-line.svg`, svg);
console.log('hero-one-line');
