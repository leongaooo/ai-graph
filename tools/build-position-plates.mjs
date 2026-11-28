// 论证之前的三个屏：它是什么 / 能干什么 / 换来什么。
// 语法与其余各屏一致：章节号 + 一句主张 + 一张图 + 一句收口。
import { writeFileSync, mkdirSync } from 'node:fs';

const P = { paper:'#F7F6F1', ink:'#141A1F', tone:'#3D4A47', mist:'#8A948E', teal:'#0F6B5E', amber:'#B4761F' };
const SANS = 'PingFang SC, Noto Sans CJK SC, sans-serif';
const SERIF = 'Songti SC, Source Han Serif SC, serif';
const MONO = 'ui-monospace, Menlo, monospace';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const W = 1200, H = 675;

const head = (ch, label, title, sub, ts = 41) => `
<text x="72" y="60" fill="${P.teal}" font-family="${MONO}" font-size="9.5" letter-spacing="2">${ch}</text>
<text x="112" y="60" fill="${P.mist}" font-family="${SANS}" font-size="9" letter-spacing="1.6">${esc(label)}</text>
<text x="1128" y="60" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="9" letter-spacing="1.4">AI GRAPH · 演示区</text>
<text x="72" y="158" fill="${P.ink}" font-family="${SERIF}" font-size="${ts}" font-weight="600" letter-spacing="0.6">${esc(title)}</text>
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

/* ─────────── 00 定位：它在替换什么 ─────────── */
{
  let b = '';
  b += `<text x="72" y="232" fill="${P.mist}" font-family="${MONO}" font-size="8" letter-spacing="1.6">上一版 · 手画的</text>`;
  b += `<text x="700" y="232" fill="${P.teal}" font-family="${MONO}" font-size="8" letter-spacing="1.6">这一版 · 算的</text>`;

  // 左：歪的三层图 + 一句没人能答的批注
  b += `<g transform="rotate(-1.5 270 380)">`;
  [[90,244,236,60,'结算任务'],[108,322,214,56,'优惠券核销'],[78,398,252,58,'业务库']].forEach(([x,y,w,h,t],i)=>{
    b += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${P.ink}" stroke-width="${i===1?1.4:1.2}" opacity="${i===1?0.75:0.6}"/>`;
    b += `<text x="${x+14}" y="${y+h/2+4}" fill="${P.tone}" font-family="${SANS}" font-size="11.5" opacity="0.85">${t}</text>`;
    b += `<text x="${x+w-14}" y="${y+24}" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="7.4" opacity="0.8">L??</text>`;
    b += `<line x1="${x+w-34}" y1="${y+21}" x2="${x+w-12}" y2="${y+24}" stroke="${P.mist}" stroke-width="0.8" opacity="0.7"/>`;
  });
  b += `<path d="M208 306 L172 320" stroke="${P.tone}" stroke-width="1" opacity="0.5"/>`;
  b += `<path d="M226 380 L286 398" stroke="${P.tone}" stroke-width="1" opacity="0.5"/>`;
  b += `</g>`;
  b += `<ellipse cx="404" cy="424" rx="64" ry="17" fill="none" stroke="${P.amber}" stroke-width="0.9" stroke-dasharray="4 4" opacity="0.7"/>`;
  b += `<text x="404" y="428" text-anchor="middle" fill="${P.amber}" font-family="${SANS}" font-size="9.5">上次谁改的？</text>`;
  b += `<text x="72" y="492" fill="${P.mist}" font-family="${SANS}" font-size="9.5">线是摆的，出处是丢的 —— 谁也说不出这个框来自哪句话。</text>`;

  // 中间：一箭
  b += `<path d="M470 372 H628" stroke="${P.ink}" stroke-width="1.2" opacity="0.55"/>`;
  b += `<path d="M620 367 L630 372 L620 377" fill="none" stroke="${P.ink}" stroke-width="1.2" opacity="0.55"/>`;
  b += `<text x="549" y="358" text-anchor="middle" fill="${P.tone}" font-family="${SANS}" font-size="10.5">重算，不是重画</text>`;

  // 右：等距、对齐、每格挂一个行号
  [[246,'结算任务','L14'],[326,'优惠券核销','L44'],[406,'业务库','L48']].forEach(([y,t,ln])=>{
    b += `<rect x="700" y="${y}" width="300" height="58" fill="none" stroke="${P.ink}" stroke-width="1" opacity="0.72"/>`;
    b += `<text x="716" y="${y+25}" fill="${P.ink}" font-family="${SANS}" font-size="12" font-weight="500">${t}</text>`;
    b += `<line x1="716" y1="${y+36}" x2="${716+90}" y2="${y+36}" stroke="${P.mist}" stroke-width="2" opacity="0.3"/>`;
    b += `<text x="984" y="${y+29}" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="7.6">${ln}</text>`;
  });
  b += `<path d="M850 304 V326" stroke="${P.ink}" stroke-width="0.8" opacity="0.35"/>`;
  b += `<path d="M850 384 V406" stroke="${P.ink}" stroke-width="0.8" opacity="0.35"/>`;
  b += `<line x1="700" y1="482" x2="1000" y2="482" stroke="${P.mist}" stroke-width="0.6" opacity="0.45"/>`;
  b += `<text x="700" y="498" fill="${P.mist}" font-family="${MONO}" font-size="7.8" letter-spacing="0.8">spec v0.2 → 重出 · 手改 0</text>`;

  save('00-positioning', wrap(head('00', '定位', '不是画图工具，是把事实画成能签字的图', '给它一段带出处的事实，它交回一张图：能上会、能复查、能在手机上重排一遍。')
    + b + close('它先是产品：三个动词、一条命令；技术是它的账本，后面几屏都在证明这本账靠得住。',
      'product first · evidence always · hand-drawn figure 0')));
}

/* ─────────── 01 三件事：收 / 画 / 查 ─────────── */
{
  let b = '';
  const cols = [
    { x:72,  zh:'收', verb:'VALIDATE', line:'指不回原文的，当场拒。', note:'材料先变成事实：一句一行，每行带行号与原文。', foot:'原文 → claim · 每行带行号 · unsourced 当场拒' },
    { x:432, zh:'画', verb:'COMPILE', line:'层级和连线，从数据算出来。', note:'没有画布、没有拖拽：框的大小位置都由层级决定。', foot:'layout 从 spec 算 · 手摆 0' },
    { x:792, zh:'查', verb:'QUERY', line:'图上每句话，倒查回原文。', note:'点一句话，回它落在 spec 的哪几行、哪个哈希。', foot:'span + hash + kind · 一条断言一条链' }
  ];
  cols.forEach(c => {
    b += `<text x="${c.x}" y="262" fill="${P.ink}" font-family="${SERIF}" font-size="26" font-weight="600">${c.zh}</text>`;
    b += `<text x="${c.x + 34}" y="256" fill="${P.teal}" font-family="${MONO}" font-size="8.6" letter-spacing="2.2">${c.verb}</text>`;
    b += `<text x="${c.x}" y="300" fill="${P.ink}" font-family="${SANS}" font-size="16" font-weight="600">${esc(c.line)}</text>`;
    b += `<text x="${c.x}" y="320" fill="${P.tone}" font-family="${SANS}" font-size="9.5">${esc(c.note)}</text>`;
    b += `<text x="${c.x}" y="494" fill="${P.mist}" font-family="${MONO}" font-size="7.6" letter-spacing="0.6">${esc(c.foot)}</text>`;
  });

  // 收：一页笔记 → 三行 claim，第三行被拦
  b += `<rect x="72" y="342" width="104" height="126" fill="none" stroke="${P.mist}" stroke-width="0.8" opacity="0.7"/>`;
  b += `<text x="80" y="356" fill="${P.mist}" font-family="${MONO}" font-size="6.6">notes.md</text>`;
  [378, 402, 426, 450].forEach((y, i) => {
    b += `<line x1="80" y1="${y}" x2="${80 + (i === 3 ? 56 : 86)}" y2="${y}" stroke="${P.mist}" stroke-width="2.6" opacity="0.33"/>`;
  });
  b += `<path d="M184 404 H204" stroke="${P.ink}" stroke-width="1" opacity="0.5"/>`;
  b += `<path d="M200 401 L206 404 L200 407" fill="none" stroke="${P.ink}" stroke-width="1" opacity="0.5"/>`;
  [368, 396, 424].forEach((y, i) => {
    const rej = i === 2;
    b += `<text x="212" y="${y}" fill="${rej ? P.mist : P.ink}" font-family="${SANS}" font-size="9.2" opacity="${rej ? 0.55 : 1}">${['结算任务：第二步失败','核销绕过业务库','私有方法未导出'][i]}</text>`;
    if (!rej) b += `<text x="376" y="${y}" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="6.8">L${[3,4][i]}</text>`;
    if (rej) {
      b += `<line x1="210" y1="${y - 3.5}" x2="332" y2="${y - 3.5}" stroke="${P.ink}" stroke-width="0.9" opacity="0.55"/>`;
      b += `<text x="340" y="${y}" fill="${P.amber}" font-family="${MONO}" font-size="7.6">拒</text>`;
    }
  });

  // 画：三块事实 → 三层图 + 一条越层边
  b += `<text x="432" y="352" fill="${P.mist}" font-family="${MONO}" font-size="6.8" letter-spacing="1">claim ×3</text>`;
  [366, 410, 454].forEach(y => {
    b += `<rect x="432" y="${y}" width="62" height="20" fill="${P.ink}" opacity="0.16"/>`;
  });
  b += `<path d="M500 420 H522" stroke="${P.ink}" stroke-width="1" opacity="0.5"/>`;
  b += `<path d="M518 417 L524 420 L518 423" fill="none" stroke="${P.ink}" stroke-width="1" opacity="0.5"/>`;
  [[354,'结算'],[402,'核销'],[450,'业务库']].forEach(([y, t], i) => {
    b += `<rect x="548" y="${y}" width="150" height="34" fill="none" stroke="${P.ink}" stroke-width="${i === 1 ? 1.3 : 0.9}" opacity="${i === 1 ? 0.85 : 0.5}"/>`;
    b += `<text x="560" y="${y + 21}" fill="${i === 1 ? P.ink : P.tone}" font-family="${SANS}" font-size="9.5">${t}</text>`;
  });
  b += `<path d="M698 ${354 + 17} H736 V${450 + 17} H698" fill="none" stroke="${P.amber}" stroke-width="1.3" stroke-dasharray="4 3" opacity="0.85"/>`;
  b += `<text x="738" y="${354 + 12}" fill="${P.amber}" font-family="MONO, monospace" font-size="6.6">越层</text>`;

  // 查：一个框 → 引线 → 出处
  b += `<rect x="792" y="360" width="128" height="38" fill="${P.amber}" opacity="0.055"/>`;
  b += `<rect x="792" y="360" width="128" height="38" fill="none" stroke="${P.amber}" stroke-width="1.2" opacity="0.9"/>`;
  b += `<text x="804" y="383" fill="${P.ink}" font-family="${SANS}" font-size="9.8" font-weight="600">优惠券核销</text>`;
  b += `<path d="M920 379 H948" stroke="${P.teal}" stroke-width="0.9" opacity="0.7"/>`;
  b += `<circle cx="920" cy="379" r="2.6" fill="${P.teal}" opacity="0.85"/>`;
  b += `<text x="954" y="371" fill="${P.tone}" font-family="${MONO}" font-size="8.6">L44 – L49</text>`;
  b += `<text x="954" y="386" fill="${P.ink}" font-family="${MONO}" font-size="8.2">9e70c3bd</text>`;
  b += `<text x="954" y="401" fill="${P.teal}" font-family="${MONO}" font-size="7.4">supported</text>`;

  save('01-three-verbs', wrap(head('01', '三件事', '三个动词，一条命令，材料进去，图出来', '每一步只做一件事，每一步都有出口；出错就停在门口，不会带进图里。')
    + b + close('一条命令跑完三步：材料进，图出，出处跟着图走。',
      'validate → compile → query · exit 0 或一条 rejection')));
}

/* ─────────── 02 换来什么：三个能当场验的数 ─────────── */
{
  let b = '';
  const cols = [
    { x:72,  n:'0',   unit:'差异', l1:'同一份事实跑两遍，输出逐字节相同。', l2:'图能复查，也能复算。', foot:'run #1 = run #2 · sha256 一致' },
    { x:432, n:'120', unit:'个服务 · 8 层', l1:'一次算出，零手摆。', l2:'每一条环、每一条热路径都追得到。', foot:'nodes 120 · ranks 8 · labels 0' },
    { x:792, n:'2',   unit:'种版式 · 1 份内容', l1:'横版竖版各算一遍。', l2:'改内容不用改版式，不是第二份手工活。', foot:'1200×675 / 390×860 · duplicate 0' }
  ];
  cols.forEach(c => {
    b += `<text x="${c.x}" y="316" fill="${P.ink}" font-family="${SERIF}" font-size="54" font-weight="600" letter-spacing="-1">${c.n}</text>`;
    const nw = c.n.length === 1 ? 34 : (c.n.length === 2 ? 66 : 100);
    b += `<text x="${c.x + nw}" y="316" fill="${P.tone}" font-family="${SANS}" font-size="12">${c.unit}</text>`;
    b += `<line x1="${c.x}" y1="334" x2="${c.x + 240}" y2="334" stroke="${P.ink}" stroke-width="0.9" opacity="0.4"/>`;
    b += `<text x="${c.x}" y="360" fill="${P.tone}" font-family="${SANS}" font-size="10.5">${esc(c.l1)}</text>`;
    b += `<text x="${c.x}" y="378" fill="${P.tone}" font-family="${SANS}" font-size="10.5">${esc(c.l2)}</text>`;
    b += `<text x="${c.x}" y="412" fill="${P.mist}" font-family="${MONO}" font-size="7.4">${esc(c.foot)}</text>`;
  });
  // 业务价值：一屏里唯一被放大的一句
  b += `<line x1="72" y1="446" x2="1128" y2="446" stroke="${P.mist}" stroke-width="0.5" opacity="0.25"/>`;
  b += `<line x1="72" y1="470" x2="98" y2="470" stroke="${P.amber}" stroke-width="2"/>`;
  b += `<text x="112" y="478" fill="${P.ink}" font-family="${SERIF}" font-size="22" letter-spacing="0.4">会议桌上最贵的一句话是「这数据哪来的」。</text>`;
  b += `<text x="112" y="504" fill="${P.tone}" font-family="${SANS}" font-size="10.5">现在你递出去的，不是一张截图，是行号和哈希。</text>`;
  b += `<text x="1128" y="504" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="7.8">vs. a screenshot</text>`;
  save('02-payoff', wrap(head('02', '换来什么', '省掉的不是画图时间，是没人敢信', '三条当场能验的结果 —— 验不了，就别信这句话。')
    + b + close('能对账的图，才配进会议室。', 'reproducible · traceable · reflowable · verifiable by a stranger')));
}

console.log(names.join('\n'));
