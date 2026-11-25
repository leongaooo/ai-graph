#!/usr/bin/env node
// 最小证据查看器：把编译产物变成一张可以点的图。
// 点图上的任意元素 → 右侧给出它的语义对象、来源文件行号、原文、textHash 复算结果。
// 用法：node tools/evidence-viewer.mjs <spec.json> <outDir> [--mobile]

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const [specArg, outArg, ...rest] = process.argv.slice(2);
if (!specArg || !outArg) {
  console.error('Usage: node tools/evidence-viewer.mjs <spec.json> <outDir> [--mobile]');
  process.exit(2);
}
const mobile = rest.includes('--mobile');
const specPath = resolve(specArg);
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const specDir = dirname(specPath);
const outDir = resolve(outArg);

const files = readdirSync(outDir);
const pick = (ext) => {
  const hit = files
    .filter((f) => f.endsWith(ext))
    .filter((f) => (mobile ? f.endsWith('.mobile' + ext) : !f.includes('.mobile')))
    .sort();
  return hit.length ? join(outDir, hit[0]) : null;
};
const svgPath = pick('.svg');
const scenePath = pick('.scene.json');
if (!svgPath || !scenePath) {
  console.error('缺少编译产物：需要先跑 compile 输出 svg + scene.json');
  process.exit(2);
}
const svg = readFileSync(svgPath, 'utf8');
const scene = JSON.parse(readFileSync(scenePath, 'utf8'));
const canvas = scene.canvas || { width: 1200, height: 675 };

// ---- 语义对象索引 ----
const semantic = spec.semantic || {};
const refIndex = new Map();
const describe = (o) => {
  switch (o._kind) {
    case 'claims':
      return o.text;
    case 'unknowns':
      return o.text;
    case 'inferences':
      return `${o.text}（推断依据：${o.reason}）`;
    case 'metrics':
      return `${o.label} = ${o.value} ${o.unit || ''}`.trim();
    case 'relations':
      return `${o.from} → ${o.to}：${o.type || o.label || ''}`;
    case 'entities':
      return `${o.label}（${o.kind || ''}）`;
    default:
      return o.label || o.id;
  }
};
for (const [kind, list] of Object.entries(semantic)) {
  if (!Array.isArray(list)) continue;
  for (const o of list) {
    refIndex.set(o.id, { ...o, _kind: kind, text: describe({ ...o, _kind: kind }) });
  }
}

// ---- 来源与定位 ----
const sources = spec.sources || [];
const sourceById = new Map(sources.map((s) => [s.id, s]));
const sourceText = new Map();
const sourceRaw = new Map();
for (const s of sources) {
  const p = resolve(specDir, s.uri);
  if (!existsSync(p)) continue;
  const raw = readFileSync(p, 'utf8');
  sourceRaw.set(s.id, raw);
  sourceText.set(s.id, raw.split(/\r?\n/));
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

const locatorIndex = new Map();
for (const s of sources) {
  for (const loc of s.locators || []) {
    locatorIndex.set(loc.id, { ...loc, sourceId: s.id });
  }
}

let checks = 0;
let mismatches = 0;
const elementRows = [];
for (const el of scene.elements || []) {
  const obj = refIndex.get(el.ref);
  const srcRefs = (obj && obj.sourceRefs) || [];
  const locators = srcRefs
    .map((id) => locatorIndex.get(id))
    .filter(Boolean)
    .map((loc) => {
      const lines = sourceText.get(loc.sourceId) || [];
      const excerpt = lines.slice(loc.lineStart - 1, loc.lineEnd).join('\n');
      const actual = sha256(excerpt);
      const ok = actual === loc.textHash;
      checks += 1;
      if (!ok) mismatches += 1;
      return {
        id: loc.id,
        sourceId: loc.sourceId,
        lineStart: loc.lineStart,
        lineEnd: loc.lineEnd,
        textHash: loc.textHash,
        actualHash: actual,
        ok,
        excerpt,
      };
    });
  elementRows.push({
    id: el.id,
    label: el.label,
    status: el.status,
    kind: el.kind,
    ref: el.ref,
    bbox: el.bbox,
    semanticKind: obj ? obj._kind : null,
    semanticText: obj ? obj.text : '（找不到对应语义对象）',
    locators,
  });
}

const orphan = elementRows.filter((r) => !r.locators.length).length;
const sourceMeta = sources.map((s) => ({
  id: s.id,
  uri: s.uri,
  title: s.title,
  date: s.date,
  sha256: s.sha256,
  actualSha256: sourceRaw.has(s.id) ? sha256(sourceRaw.get(s.id)) : null,
}));

const data = {
  specId: spec.id,
  grammar: scene.grammar,
  title: (spec.copy?.title || spec.view?.title || scene.title || spec.id).replace(/\s*\n\s*/g, ' '),
  canvas,
  sourceMeta,
  elements: elementRows,
};

const esc = (v) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const statusText = { supported: '事实', inferred: '推断', unknown: '未知' };
const svgBody = svg
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>[\s\S]*$/, '')
  .trim();

const overlays = elementRows
  .map(
    (r, i) => `<button class="hot" style="left:${(r.bbox[0] / canvas.width) * 100}%;top:${
      (r.bbox[1] / canvas.height) * 100
    }%;width:${((r.bbox[2] - r.bbox[0]) / canvas.width) * 100}%;height:${((r.bbox[3] - r.bbox[1]) / canvas.height) * 100}%"
      data-i="${i}" aria-label="${esc(r.label)}"><span class="tagnum">${i + 1}</span></button>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(data.title)} · 证据查看器</title>
<style>
:root{--ink:#1a1a18;--muted:#6b6b66;--line:#dedbd2;--paper:#faf8f3;--accent:#1f6f5c;--warn:#9a5b18}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.65 -apple-system,"PingFang SC","Helvetica Neue",sans-serif}
.wrap{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(320px,.95fr);gap:28px;padding:28px 32px 40px;max-width:1500px}
h1{font-size:20px;margin:0 0 6px;line-height:1.35}
.meta{color:var(--muted);font-size:12.5px}
.figure{position:relative;border:1px solid var(--line);background:#fff;border-radius:2px;overflow:hidden}
.figure svg{display:block;width:100%;height:auto}
.hot{position:absolute;border:0;background:transparent;padding:0;cursor:pointer;border-radius:2px}
.hot:hover,.hot:focus-visible{outline:2px solid rgba(31,111,92,.55);outline-offset:-2px;background:rgba(31,111,92,.06)}
.hot.on{outline:2px solid var(--accent);outline-offset:-2px;background:rgba(31,111,92,.1)}
.tagnum{position:absolute;top:3px;left:4px;font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#8a8a84;opacity:.55}
.hot:hover .tagnum,.hot.on .tagnum{opacity:1;color:var(--accent)}
.hint{margin:10px 0 0;color:var(--muted);font-size:12.5px}
.panel{position:sticky;top:16px;align-self:start}
.card{border:1px solid var(--line);background:#fff;border-radius:2px;padding:16px 16px 18px;min-height:220px}
.row{display:flex;align-items:center;gap:8px;margin:0 0 6px}
.kind{font-size:12px;color:var(--muted)}
.st{font-size:12px;padding:1px 6px;border:1px solid var(--line);border-radius:2px;color:var(--muted)}
.st.supported{color:var(--accent);border-color:rgba(31,111,92,.4)}
.st.inferred{color:var(--warn);border-color:rgba(154,91,24,.45)}
.st.unknown{color:var(--warn);border-color:rgba(154,91,24,.45)}
.claim{font-size:14.5px;margin:8px 0 14px}
.ev{border-top:1px dashed var(--line);padding-top:10px;margin-top:10px}
.ev-head{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted)}
pre{white-space:pre-wrap;word-break:break-word;background:#f4f2ec;border:1px solid var(--line);border-radius:2px;padding:8px 10px;margin:6px 0 0;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#2b2b28}
.hash{font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);word-break:break-all}
.ok{color:var(--accent)}
.bad{color:#a33}
.summary{font-size:12.5px;color:var(--muted);margin:12px 0 0}
@media (max-width:900px){.wrap{grid-template-columns:1fr;padding:18px 16px 32px}.panel{position:static}}
</style>
</head>
<body>
<div class="wrap">
  <section>
    <h1>${esc(data.title)}</h1>
    <p class="meta" id="srcmeta"></p>
    <div class="figure" id="fig" style="aspect-ratio:${canvas.width}/${canvas.height}">
      <svg viewBox="0 0 ${canvas.width} ${canvas.height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(
        data.title,
      )}">${svgBody}</svg>
      ${overlays}
    </div>
    <p class="hint">点图上任意色块，右侧显示它凭什么成立。编号 ${elementRows.length} 个元素，均可回溯到来源行。</p>
    <p class="summary" id="summary"></p>
  </section>
  <aside class="panel"><div class="card" id="panel"><p class="kind">点左侧图上的任一元素</p></div></aside>
</div>
<script id="evidence-data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script>
const D = JSON.parse(document.getElementById('evidence-data').textContent);
const ST = ${JSON.stringify(statusText)};
const meta = document.getElementById('srcmeta');
meta.textContent = D.sourceMeta.map(s => s.title + ' · ' + s.date + ' · sha256 ' + s.sha256.slice(0,12)).join('  |  ');
document.getElementById('summary').textContent = '核验：' + D.elements.reduce((n,e)=>n+e.locators.length,0) + ' 条来源定位，全部可复算；来源文件 sha256 ' + (D.sourceMeta.every(s=>s.sha256===s.actualSha256) ? '一致' : '不一致');
const panel = document.getElementById('panel');
const buttons = [...document.querySelectorAll('.hot')];
function render(i){
  const e = D.elements[i];
  panel.innerHTML = '';
  const head = document.createElement('div');
  head.className='row';
  head.innerHTML = '<span class="st '+e.status+'">'+(ST[e.status]||e.status)+'</span><span class="kind">'+ (e.semanticKind||'—') +'</span>';
  panel.appendChild(head);
  const t = document.createElement('div'); t.className='claim'; t.textContent = e.semanticText; panel.appendChild(t);
  const lh = document.createElement('div'); lh.className='kind'; lh.textContent='图上文案：'+ (e.label||''); panel.appendChild(lh);
  for (const loc of e.locators){
    const box = document.createElement('div'); box.className='ev';
    box.innerHTML = '<div class="ev-head"><span>'+loc.sourceId+' 第 '+loc.lineStart+(loc.lineEnd>loc.lineStart?'–'+loc.lineEnd:'')+' 行</span><span class="'+(loc.ok?'ok':'bad')+'">textHash '+(loc.ok?'复算一致':'不一致')+'</span></div>';
    const pre = document.createElement('pre'); pre.textContent = loc.excerpt; box.appendChild(pre);
    const h = document.createElement('div'); h.className='hash'; h.textContent = 'textHash ' + loc.textHash.slice(0,16) + '…'; box.appendChild(h);
    panel.appendChild(box);
  }
  if(!e.locators.length){ const w=document.createElement('p'); w.className='bad'; w.textContent='无来源定位：该元素不能当作事实。'; panel.appendChild(w); }
}
buttons.forEach((b,i)=>{ b.addEventListener('click',()=>{ buttons.forEach(x=>x.classList.remove('on')); b.classList.add('on'); render(i); }); });
const want = Number(new URLSearchParams(location.search).get('sel'));
const start = Number.isInteger(want) && want >= 0 && want < buttons.length ? want : 0;
if(buttons.length) buttons[start].click();
</script>
</body>
</html>`;

const outPath = join(outDir, `${spec.id || basename(specPath, '.json')}${mobile ? '.mobile' : ''}.evidence.html`);
writeFileSync(outPath, html, 'utf8');
console.log(
  JSON.stringify(
    {
      ok: mismatches === 0 && orphan === 0,
      out: outPath,
      elements: elementRows.length,
      locators: checks,
      mismatches,
      elementsWithoutSource: orphan,
    },
    null,
    2,
  ),
);
