// 定位屏 v2：用真实材质讲同一件事 —— 左边是打印纸上的铅笔痕迹和便利贴，右边是能签字的成品。
// 全部纯 SVG 图元：纸张投影、胶带、便利贴、铅笔抖动线、行号芯片、斜盖章。
import { writeFileSync, mkdirSync } from 'node:fs';

const P = { paper:'#F7F6F1', sheet:'#FBF7EC', card:'#FFFDF7', ink:'#141A1F', tone:'#3D4A47',
            mist:'#8A948E', teal:'#0F6B5E', amber:'#B4761F', tape:'#D9C79A', note:'#F4E6C3' };
const SANS = 'PingFang SC, Noto Sans CJK SC, sans-serif';
const SERIF = 'Songti SC, Source Han Serif SC, serif';
const MONO = 'ui-monospace, Menlo, monospace';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const W = 1200, H = 675;

// 确定性抖动：同一条线每次画出来一样
const rnd = (s) => { let x = s * 9301 + 49297; return () => { x = (x * 233280 + 49297) % 233280; return x / 233280; }; };
const wob = (x1, y1, x2, y2, seed, amp = 2.6) => {
  const r = rnd(seed), dx = x2 - x1, dy = y2 - y1, n = Math.max(3, Math.round(Math.hypot(dx, dy) / 18));
  let d = `M${x1.toFixed(1)} ${(y1 + (r() - .5) * amp).toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const t = i / n, o = (r() - .5) * amp;
    const nx = x1 + dx * t + (dy === 0 ? 0 : o), ny = y1 + dy * t + (dx === 0 ? 0 : o);
    d += ` L${nx.toFixed(1)} ${ny.toFixed(1)}`;
  }
  return d;
};
// 铅笔：一笔淡、一笔深，像同一根线描了两遍
const pencil = (d) => {
  const s = d.seed || 0;
  return [0, 1, 2].map((k) =>
    `<path d="${wob(d.x1, d.y1, d.x2, d.y2, s + k * 13, 2.2 + k * 1.4)}" fill="none" stroke-linecap="round"
       stroke="${k === 2 ? '#26302C' : '#5C6661'}" stroke-width="${[1.2, 1.45, 1.0][k]}" opacity="${[0.36, 0.3, 0.14][k]}"/>`
  ).join('');
};
const seg = (x1, y1, x2, y2, seed) => ({ x1, y1, x2, y2, seed });
const pencilRect = (x, y, w, h, seed) =>
  pencil(seg(x, y, x + w, y, seed))
  + pencil(seg(x + w, y, x + w, y + h, seed + 1))
  + pencil(seg(x + w, y + h, x, y + h, seed + 2))
  + pencil(seg(x, y + h, x, y, seed + 3));
const pencilArrow = (x1, y1, x2, y2, seed) => {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 8;
  const head = [[x2 - s * Math.cos(a - .55), y2 - s * Math.sin(a - .55)], [x2, y2], [x2 - s * Math.cos(a + .55), y2 - s * Math.sin(a + .55)]];
  return pencil(seg(x1, y1, x2, y2, seed))
    + head.slice(0, 2).map((p, k) => pencil(seg(p[0], p[1], head[k + 1][0], head[k + 1][1], seed + 40 + k))).join('');
};

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

const defs = `<defs>
  <filter id="paperSh" x="-15%" y="-15%" width="130%" height="135%"><feDropShadow dx="2" dy="9" stdDeviation="10" flood-color="#141A1F" flood-opacity="0.18"/></filter>
  <filter id="cardSh" x="-12%" y="-12%" width="124%" height="135%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#141A1F" flood-opacity="0.13"/></filter>
  <filter id="noteSh" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="2" dy="5" stdDeviation="5" flood-color="#141A1F" flood-opacity="0.2"/></filter>
  <filter id="g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.73" numOctaves="2" seed="42"/></filter>
</defs>`;

const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" xml:lang="zh-CN">
${defs}
<rect width="${W}" height="${H}" fill="${P.paper}"/>
<rect width="${W}" height="${H}" fill="${P.paper}" filter="url(#g)" opacity="0.032"/>
${body}
</svg>`;

const out = process.argv[2] || 'out/pos-v2';
mkdirSync(out, { recursive: true });

/* ─────────── 00 定位 · 真实材质版 ─────────── */
{
  let b = '';

  /* 左：整张打印稿略斜放在桌上 */
  b += `<g transform="rotate(-0.9 268 352)">`;
  b += `<g filter="url(#paperSh)"><rect x="56" y="234" width="424" height="236" fill="${P.sheet}"/></g>`;
  b += `<rect x="56" y="234" width="424" height="236" fill="none" stroke="${P.ink}" stroke-width="0.5" opacity="0.14"/>`;

  // 顶部胶带
  b += `<g transform="rotate(-2.2 214 240)"><rect x="148" y="229" width="132" height="17" fill="${P.tape}" opacity="0.5"/>`
     + `<rect x="148" y="229" width="132" height="17" fill="none" stroke="${P.tape}" stroke-width="0.6" opacity="0.45"/></g>`;
  b += `<text x="74" y="258" fill="${P.mist}" font-family="${MONO}" font-size="6.8" letter-spacing="0.6">build-failure · 打印稿 2026-11-26</text>`;

  // 铅笔三框：不等宽、不对齐、线是抖的
  b += pencilRect(84, 274, 298, 54, 11);
  b += pencilRect(102, 344, 268, 50, 21);
  b += pencilRect(72, 410, 316, 50, 31);
  b += `<text x="98" y="306" transform="rotate(-0.8 98 306)" fill="${P.tone}" font-family="${SERIF}" font-size="12.5" letter-spacing="1.2">结算任务</text>`;
  b += `<text x="118" y="375" transform="rotate(0.9 118 375)" fill="${P.tone}" font-family="${SERIF}" font-size="12.5" letter-spacing="1.2">优惠券核销</text>`;
  b += `<text x="86" y="441" transform="rotate(-1.1 86 441)" fill="${P.tone}" font-family="${SERIF}" font-size="12.5" letter-spacing="1.2">业务库</text>`;

  // 行号没写清，被铅笔划掉
  [[348, 290],[356, 360],[336, 426]].forEach(([lx, ly], i) => {
    b += `<text x="${lx}" y="${ly}" fill="${P.mist}" font-family="${MONO}" font-size="7.2" transform="rotate(-4 ${lx} ${ly})">L??</text>`;
    b += pencil(seg(lx - 3, ly - 2, lx + 20, ly + 2, 40 + i));
  });

  // 一条画反的箭头，一条只画到一半
  b += pencilArrow(240, 328, 258, 344, 51);
  b += pencilArrow(374, 374, 320, 406, 52);

  // 便利贴：贴在纸的右下角，半张悬在桌面上
  b += `<g transform="rotate(-7 450 424)">`;
  b += `<g filter="url(#noteSh)"><rect x="392" y="380" width="118" height="88" fill="${P.note}"/></g>`;
  b += `<rect x="392" y="380" width="118" height="88" fill="none" stroke="${P.amber}" stroke-width="0.5" opacity="0.3"/>`;
  b += `<rect x="392" y="380" width="118" height="9" fill="${P.tape}" opacity="0.35"/>`;
  b += `<text x="404" y="408" fill="${P.tone}" font-family="${SANS}" font-size="10.5" font-weight="500">上次谁改的？</text>`;
  b += `<text x="404" y="426" fill="${P.tone}" font-family="${SANS}" font-size="8.6" opacity="0.8">这句到底哪来的</text>`;
  b += `<text x="404" y="440" fill="${P.tone}" font-family="${SANS}" font-size="8.6" opacity="0.8">——没人答得上来。</text>`;
  b += `</g>`;
  b += `</g>`;

  b += `<text x="56" y="500" fill="${P.mist}" font-family="${SANS}" font-size="9.5">改到第三版，出处丢了 —— 谁也说不出这个框来自哪句话。</text>`;

  /* 中：一根改成的墨线 */
  b += `<path d="M508 352 H662" stroke="${P.ink}" stroke-width="1.5" opacity="0.55"/>`;
  b += `<path d="M654 347 L666 352 L654 357" fill="none" stroke="${P.ink}" stroke-width="1.5" opacity="0.55"/>`;
  b += `<text x="585" y="338" text-anchor="middle" fill="${P.tone}" font-family="${SANS}" font-size="10.5">重算，不是重画</text>`;

  /* 右：一份出版级的图 —— 图版、裁切线、图例、图注、落款章 */
  b += `<text x="690" y="220" fill="${P.teal}" font-family="${MONO}" font-size="7.4" letter-spacing="1.4">OUTPUT · 1200 × 675 · 可签字</text>`;
  b += `<g filter="url(#cardSh)"><rect x="690" y="228" width="414" height="242" fill="${P.card}"/></g>`;
  b += `<rect x="690" y="228" width="414" height="242" fill="none" stroke="${P.ink}" stroke-width="0.5" opacity="0.3"/>`;
  // 裁切线
  [[690,228,-1,-1],[1104,228,1,-1],[690,470,-1,1],[1104,470,1,1]].forEach(([x, y, sx, sy]) => {
    b += `<path d="M${x + sx * 5} ${y} H${x + sx * 13}" stroke="${P.mist}" stroke-width="0.6" opacity="0.6"/>`;
    b += `<path d="M${x} ${y + sy * 5} V${y + sy * 13}" stroke="${P.mist}" stroke-width="0.6" opacity="0.6"/>`;
  });
  b += `<text x="706" y="248" fill="${P.mist}" font-family="${MONO}" font-size="6.6" letter-spacing="1.2">FIG. 1 · BUILD-FAILURE · spec v0.2</text>`;

  // 四个节点：第三个是“被跳过”的虚线框
  const nodes = [['结算任务','L14',0],['优惠券核销','L44',0],['业务库','',1],['基础库','L48',0]];
  nodes.forEach(([t, ln, skip], i) => {
    const y = 258 + i * 44;
    b += `<rect x="706" y="${y}" width="168" height="34" rx="2" fill="${skip ? 'none' : '#F3EEE0'}" stroke="${skip ? P.mist : P.ink}" stroke-width="${skip ? 0.7 : 0.9}" opacity="${skip ? 0.45 : 0.55}" ${skip ? 'stroke-dasharray="4 3"' : ''}/>`;
    b += `<text x="718" y="${y + 21}" fill="${skip ? P.mist : P.ink}" font-family="${SANS}" font-size="9.6" font-weight="500" opacity="${skip ? 0.8 : 1}">${t}</text>`;
    if (ln) b += `<text x="862" y="${y + 20}" text-anchor="end" fill="${P.mist}" font-family="${MONO}" font-size="6.6">${ln}</text>`;
    if (i < 3) b += `<path d="M790 ${y + 34} V${y + 44}" stroke="${P.ink}" stroke-width="0.6" opacity="0.25"/>`;
  });
  // 越层边：绕到右侧再回来
  b += `<path d="M874 319 H890 V407 H874" fill="none" stroke="${P.amber}" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.75"/>`;
  b += `<path d="M878 402 L873 408 L878 414" fill="none" stroke="${P.amber}" stroke-width="1.2" opacity="0.75"/>`;

  // 图例
  b += `<path d="M902 302 H926" stroke="${P.ink}" stroke-width="0.8" opacity="0.35"/>`;
  b += `<text x="932" y="305" fill="${P.mist}" font-family="${SANS}" font-size="7.6">顺序调用</text>`;
  b += `<path d="M902 322 H926" stroke="${P.amber}" stroke-width="1" stroke-dasharray="4 3" opacity="0.75"/>`;
  b += `<text x="932" y="325" fill="${P.mist}" font-family="${SANS}" font-size="7.6">越层 · 计划外</text>`;

  // 图注
  b += `<text x="706" y="432" fill="${P.tone}" font-family="${SERIF}" font-size="8.6">图 1 · 结算任务在第二步失败：核销越层调用基础库的私有方法。</text>`;
  b += `<text x="706" y="448" fill="${P.mist}" font-family="${MONO}" font-size="6.6">spec v0.2 · L14 · L44 · L48 · 重出 · 手改 0</text>`;

  // 落款章，盖在图版右下角
  b += `<g transform="rotate(-8 1012 420)" opacity="0.5">`;
  b += `<circle cx="1012" cy="420" r="30" fill="none" stroke="${P.amber}" stroke-width="1"/>`;
  b += `<circle cx="1012" cy="420" r="25.5" fill="none" stroke="${P.amber}" stroke-width="0.55" opacity="0.8"/>`;
  b += `<text x="1012" y="417" text-anchor="middle" fill="${P.amber}" font-family="${MONO}" font-size="6" letter-spacing="0.9">SIGNED OFF</text>`;
  b += `<text x="1012" y="427" text-anchor="middle" fill="${P.amber}" font-family="${MONO}" font-size="5" letter-spacing="0.7">REPRODUCIBLE</text>`;
  b += `</g>`;

  b += `<text x="690" y="500" fill="${P.mist}" font-family="${SANS}" font-size="9.5">重出一次：每条线都在，每个框都能倒查回 spec 的那几行。</text>`;

  const svg = wrap(head('00', '定位', '不是画图工具，是把事实画成能签字的图',
      '给它一段带出处的事实，它交回一张图：能上会、能复查、能在手机上重排一遍。') + b
    + close('它先是产品：三个动词、一条命令；技术是它的账本，后面几屏都在证明这本账靠得住。',
      'paper · pencil · tape · stamp — all plain SVG, no bitmaps'));
  writeFileSync(`${out}/00-positioning-real.svg`, svg);
}
console.log('00-positioning-real');
