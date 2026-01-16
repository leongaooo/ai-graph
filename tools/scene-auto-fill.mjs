import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(
    [
      "Usage:",
      "  node front-end-effect/tools/scene-auto-fill.mjs --brief <brief.json> --out <scene-mother.json> [--domain payments|portal|booking] [--style glass|paper|glow] [--seed <int>] [--candidates <n>]",
      "",
      "What it does:",
      "  - Reads BriefSpec v0.1",
      "  - Selects a style-pack (glass/paper/glow) + domain (payments/portal/booking)",
      "  - Generates multiple candidate layouts and picks the best-scoring one (deterministic by seed)",
      "  - Outputs a SceneSpec mother with {{slot:kicker/headline/subhead}} and correct layers",
      "",
      "Then render via pipeline:",
      "  node front-end-effect/tools/pipeline.mjs --brief <brief.json> --scene <scene-mother.json> --outScene <scene.json> --outSvg <render.svg>",
    ].join("\n")
  );
}

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function normalizeText(s) {
  return String(s ?? "").toLowerCase();
}

function detectStyle(brief, forced) {
  if (forced) return forced;
  const blob = [
    brief?.style?.illustrationStyle,
    brief?.style?.paletteHint,
    brief?.intent?.tone,
    ...(brief?.intent?.keywords ?? []),
    ...(brief?.story?.beats ?? []).map((b) => b?.text),
    ...Object.values(brief?.layout?.slots ?? {}),
  ]
    .map(normalizeText)
    .join(" ");

  const hasPaper = /\b(paper|journal|doodle|notebook|sketch|handwritten|sticky)\b/.test(blob);
  const hasGlow = /\b(glow|gradient|neon|orbs|electric|ai)\b/.test(blob);
  const hasGlass = /\b(glass|framer|workshop|saas|modern|minimal|premium)\b/.test(blob);

  if (hasPaper) return "paper";
  if (hasGlow) return "glow";
  if (hasGlass) return "glass";
  return "glass";
}

function detectDomain(brief, forced) {
  if (forced) return forced;
  const blob = [
    brief?.intent?.primaryGoal,
    brief?.intent?.audience,
    ...(brief?.intent?.keywords ?? []),
    ...(brief?.story?.beats ?? []).map((b) => b?.text),
    ...Object.values(brief?.layout?.slots ?? {}),
  ]
    .map(normalizeText)
    .join(" ");

  const score = { payments: 0, portal: 0, booking: 0 };
  if (/\b(stripe|payment|payments|charge|receipt|invoice|refund|payout|payroll)\b/.test(blob)) score.payments += 2;
  if (/\b(portal|customer|profile|order|orders|status|support|chat)\b/.test(blob)) score.portal += 2;
  if (/\b(booking|availability|time slot|timeslot|schedule|duration|service area)\b/.test(blob)) score.booking += 2;
  // Chinese hints
  if (/支付|收据|发票|结算|提成|工时|薪资/.test(blob)) score.payments += 2;
  if (/客户|门户|订单|工单|状态|消息|客服/.test(blob)) score.portal += 2;
  if (/预约|时间段|时长|服务区域|满单/.test(blob)) score.booking += 2;

  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best?.[1] > 0 ? best[0] : "payments";
}

function metaIndex(meta) {
  const byId = new Map();
  for (const m of meta?.motifs ?? []) byId.set(m.id, m);
  return byId;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function ri(rand, a, b) {
  // inclusive
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo + Math.floor(rand() * (hi - lo + 1));
}

function rf(rand, a, b) {
  return a + rand() * (b - a);
}

function bboxOf(node) {
  const t = node?.type;
  const a = node?.attrs || {};
  const num = (v) => (typeof v === "number" ? v : Number.parseFloat(String(v ?? "0")));

  if (t === "rect" || t === "image" || t === "use") {
    return { x: num(a.x), y: num(a.y), w: num(a.width), h: num(a.height) };
  }
  if (t === "circle") {
    const cx = num(a.cx);
    const cy = num(a.cy);
    const r = num(a.r);
    return { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r };
  }
  if (t === "ellipse") {
    const cx = num(a.cx);
    const cy = num(a.cy);
    const rx = num(a.rx);
    const ry = num(a.ry);
    return { x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry };
  }
  return null;
}

function area(b) {
  return Math.max(0, b.w) * Math.max(0, b.h);
}

function intersect(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function center(b) {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function scoreScene(scene) {
  // Higher is better. Keep simple + deterministic.
  const canvas = { x: 0, y: 0, w: scene.canvas.width, h: scene.canvas.height };
  const nodes = scene.nodes || [];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const panel = byId.get("panel") || byId.get("portal_panel") || byId.get("portal_panel");
  const person = byId.get("person") || byId.get("finance") || byId.get("customer") || byId.get("owner");

  const panelBox = panel ? bboxOf(panel) : null;
  const personBox = person ? bboxOf(person) : null;

  let score = 1000;

  // Penalty: key boxes outside canvas.
  for (const id of ["panel", "portal_panel", "person", "finance", "customer", "owner"]) {
    const n = byId.get(id);
    if (!n) continue;
    const b = bboxOf(n);
    if (!b) continue;
    const margin = 8;
    if (b.x < canvas.x - margin) score -= 50;
    if (b.y < canvas.y - margin) score -= 50;
    if (b.x + b.w > canvas.w + margin) score -= 50;
    if (b.y + b.h > canvas.h + margin) score -= 50;
  }

  // Prefer person close to/overlapping container (human + system feel).
  if (panelBox && personBox) {
    const isect = intersect(panelBox, personBox);
    const overlap = isect ? area(isect) / Math.max(1, area(personBox)) : 0;
    // Target overlap ~ 0.12..0.40 (person slightly overlaps the container edge).
    if (overlap < 0.05) score -= 160;
    else if (overlap < 0.10) score -= 80;
    else if (overlap > 0.50) score -= 140;
    else score += 40;

    // Also prefer smaller distance between centers (but not identical).
    const pc = center(panelBox);
    const hc = center(personBox);
    const dx = Math.abs(hc.x - pc.x);
    score -= clamp((dx - 360) / 4, 0, 120);
  }

  // Penalize bg props intruding into title band (y < 150).
  const titleBand = { x: 0, y: 0, w: canvas.w, h: 150 };
  for (const n of nodes) {
    if (String(n?.attrs?.["data-layer"] ?? "") !== "bg") continue;
    const b = bboxOf(n);
    if (!b) continue;
    const isect = intersect(b, titleBand);
    if (isect && area(isect) > 10) score -= 40;
  }

  // Penalize overlaps between bg props (keeps the scene legible; avoids “pile of stickers”).
  const bgProps = nodes
    .filter((n) => n?.attrs?.["data-role"] === "prop" && String(n?.attrs?.["data-layer"] ?? "") === "bg")
    .filter((n) => String(n?.attrs?.["data-prop-kind"] ?? "") !== "container")
    .map((n) => ({ id: n.id, box: bboxOf(n) }))
    .filter((x) => x.box && area(x.box) > 0);

  for (let i = 0; i < bgProps.length; i++) {
    for (let j = i + 1; j < bgProps.length; j++) {
      const a = bgProps[i].box;
      const b = bgProps[j].box;
      const isect = intersect(a, b);
      if (!isect) continue;
      const r = area(isect) / Math.max(1, Math.min(area(a), area(b)));
      if (r > 0.02) score -= 280 * r;
    }
  }

  // Clutter penalty: too many props makes the hero feel noisy.
  if (bgProps.length > 9) score -= (bgProps.length - 9) * 45;

  // Balance: keep main bg props roughly centered within panel.
  if (panelBox) {
    const pc = center(panelBox);
    let wsum = 0;
    let xsum = 0;
    for (const n of nodes) {
      if (String(n?.attrs?.["data-layer"] ?? "") !== "bg") continue;
      if (n.id === "panel") continue;
      const b = bboxOf(n);
      if (!b) continue;
      const w = area(b);
      wsum += w;
      xsum += w * center(b).x;
    }
    if (wsum > 0) {
      const cx = xsum / wsum;
      score -= Math.min(120, Math.abs(cx - pc.x) / 3);
    }
  }

  return score;
}

function hashString(s) {
  // small deterministic hash (FNV-1a-ish)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickOne(rand, items) {
  if (!items.length) return null;
  return items[ri(rand, 0, items.length - 1)];
}

function pickSome(rand, items, count) {
  const pool = items.slice();
  const out = [];
  const n = clamp(count, 0, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = ri(rand, 0, pool.length - 1);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

function pickSomeStable(rand, items, count) {
  // Same as pickSome, but returns a stable deterministic subset with stable ordering.
  const picked = pickSome(rand, items, count);
  picked.sort((a, b) => String(a).localeCompare(String(b)));
  return picked;
}

function candidatesFor(metaById, { domain, style }) {
  const out = [];
  for (const [id, m] of metaById.entries()) {
    const domains = new Set(m.domainTags ?? []);
    const styles = new Set(m.styleTags ?? []);
    if (!domains.has(domain)) continue;
    if (!styles.has(style)) continue;
    out.push({ id, m });
  }
  out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return out;
}

function pickMotifs(metaById, { domain, style, seed }) {
  const all = candidatesFor(metaById, { domain, style });
  const byCat = { person: [], prop_real: [], prop_ui: [], decor: [] };
  for (const x of all) {
    const cat = String(x.m?.category ?? "prop_ui");
    if (byCat[cat]) byCat[cat].push(x.id);
  }

  const rand = mulberry32((seed ^ hashString(`${domain}:${style}`)) >>> 0);

  const requiredByDomain = {
    // Keep the “real world” set small; avoid clutter.
    payments: ["credit_card_handdrawn", "receipt_handdrawn", "invoice_handdrawn", "lucide_shield_check", "lucide_lock", "lucide_wallet"],
    portal: ["phone_handdrawn", "chat_bubble_handdrawn", "receipt_handdrawn", "lucide_user", "lucide_file_text", "lucide_message_circle"],
    booking: ["calendar_handdrawn", "lucide_calendar_clock", "lucide_timer", "lucide_map", "lucide_badge"],
  };

  const required = requiredByDomain[domain] ?? [];
  const picked = new Set();
  for (const id of required) if (metaById.has(id)) picked.add(id);

  // People: exactly one (deterministic).
  const person = pickOne(rand, byCat.person);
  if (person) picked.add(person);

  // Real props: 2–4.
  for (const id of pickSome(rand, byCat.prop_real.filter((x) => !picked.has(x)), ri(rand, 1, 3))) picked.add(id);

  // UI props: 4–7.
  for (const id of pickSome(rand, byCat.prop_ui.filter((x) => !picked.has(x)), ri(rand, 2, 4))) picked.add(id);

  // Decor accents: style-dependent and capped.
  const wantDecor = style === "paper" ? ri(rand, 2, 3) : style === "glow" ? ri(rand, 1, 2) : ri(rand, 1, 2);
  for (const id of pickSome(rand, byCat.decor.filter((x) => !picked.has(x)), wantDecor)) picked.add(id);

  return Array.from(picked).sort((a, b) => String(a).localeCompare(String(b)));
}

function baseScene({ title, seed, motifs }) {
  return {
    meta: { version: "0.1", title, lang: "en", seed },
    canvas: { width: 1200, height: 600, viewBox: "0 0 1200 600", bg: "#0B0F14" },
    theme: {
      palette: {
        bg: "#0B0F14",
        fg: "rgba(234,242,255,0.92)",
        primary: "#4F8CFF",
        accent: "#8B5BFF",
        muted: "rgba(234,242,255,0.60)",
      },
      typography: { fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial", baseSize: 16 },
    },
    defs: {
      motifs,
      raw:
        "\n" +
        '      <linearGradient id="g_accent" x1="0" y1="0" x2="1" y2="1">\n' +
        '        <stop offset="0%" stop-color="rgba(79,140,255,0.95)"/>\n' +
        '        <stop offset="100%" stop-color="rgba(139,91,255,0.95)"/>\n' +
        "      </linearGradient>\n" +
        '      <filter id="f_soft" x="-20%" y="-20%" width="140%" height="140%">\n' +
        '        <feGaussianBlur stdDeviation="14"/>\n' +
        "      </filter>\n",
    },
    nodes: [],
    animations: [],
    a11y: { title, desc: "", reducedMotion: { strategy: "none" } },
  };
}

function addTitleSlots(scene) {
  scene.nodes.push(
    { id: "kicker", type: "text", attrs: { "data-role": "text", "data-layer": "text", x: 600, y: 64, "text-anchor": "middle", fill: "rgba(234,242,255,0.66)", "font-size": 14, "letter-spacing": 1 }, text: "{{slot:kicker}}" },
    { id: "headline", type: "text", attrs: { "data-role": "text", "data-layer": "text", x: 600, y: 96, "text-anchor": "middle", fill: "rgba(234,242,255,0.92)", "font-size": 28, "font-weight": 740 }, text: "{{slot:headline}}" },
    { id: "subhead", type: "text", attrs: { "data-role": "text", "data-layer": "text", x: 600, y: 126, "text-anchor": "middle", fill: "rgba(234,242,255,0.64)", "font-size": 16 }, text: "{{slot:subhead}}" }
  );
}

function buildPaymentsGlass({ seed, motifs, layout }) {
  const scene = baseScene({ title: "Auto: Payments (Glass)", seed, motifs });
  scene.a11y.desc = "Auto-generated payments scene with glass container and real-world payment props.";

  const panelX = clamp(layout?.panelX ?? 90, 50, 160);
  const panelY = clamp(layout?.panelY ?? 178, 150, 240);
  const panelW = clamp(layout?.panelW ?? 780, 680, 860);
  const panelH = clamp(layout?.panelH ?? 332, 300, 380);
  const personX = clamp(layout?.personX ?? panelX + panelW - 110, 620, 880);
  const safeRight = personX - 18;
  const innerPad = 26;
  const clampInPanelX = (x, width) => clamp(x, panelX + innerPad, Math.max(panelX + innerPad, safeRight - width));
  const clampInPanelY = (y, height) => clamp(y, panelY + innerPad, Math.max(panelY + innerPad, panelY + panelH - innerPad - height));
  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);

  scene.nodes.push(
    { id: "bg", type: "rect", attrs: { "data-role": "decor", "data-decor-type": "texture", x: 0, y: 0, width: 1200, height: 600, fill: "#0B0F14" } },
    { id: "orb1", type: "circle", attrs: { "data-role": "decor", "data-decor-type": "shadow", cx: panelX + 210, cy: panelY + 8, r: 170, fill: "rgba(79,140,255,0.16)", filter: "url(#f_soft)" } },
    { id: "orb2", type: "circle", attrs: { "data-role": "decor", "data-decor-type": "shadow", cx: 980, cy: 420, r: 190, fill: "rgba(139,91,255,0.14)", filter: "url(#f_soft)" } },
    { id: "panel_shadow", type: "ellipse", attrs: { "data-role": "decor", "data-decor-type": "shadow", cx: panelX + panelW / 2 + 40, cy: panelY + panelH + 100, rx: 520, ry: 120, fill: "rgba(0,0,0,0.28)", filter: "url(#f_soft)" } },
    { id: "panel", type: "rect", attrs: { "data-role": "prop", "data-layer": "bg", "data-prop-kind": "container", x: panelX, y: panelY, width: panelW, height: panelH, rx: 26, fill: "rgba(255,255,255,0.04)", stroke: "rgba(255,255,255,0.12)", "stroke-width": 1 } }
  );

  // Structured layout: keep 2–3 large real-world props + 2–3 small trust icons.
  // Grid-ish anchors (no random scatter).
  const cardBox = { w: 330, h: 230, x: panelX + innerPad, y: panelY + 64 };
  const invoiceBox = { w: 220, h: 170, x: panelX + innerPad + 380, y: panelY + 72 };
  const receiptBox = { w: 230, h: 176, x: panelX + innerPad + 160, y: panelY + 214 };

  const cardX = clampInPanelX(cardBox.x, cardBox.w);
  const cardY = clampInPanelY(cardBox.y, cardBox.h);
  const invoiceX = clampInPanelX(invoiceBox.x, invoiceBox.w);
  const invoiceY = clampInPanelY(invoiceBox.y, invoiceBox.h);
  const receiptX = clampInPanelX(receiptBox.x, receiptBox.w);
  const receiptY = clampInPanelY(receiptBox.y, receiptBox.h);

  if (motifs.includes("credit_card_handdrawn"))
    scene.nodes.push({ id: "card", type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: "#motif_credit_card_handdrawn", x: cardX, y: cardY, width: cardBox.w, height: cardBox.h, opacity: 0.76 } });
  if (motifs.includes("invoice_handdrawn"))
    scene.nodes.push({ id: "invoice", type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: "#motif_invoice_handdrawn", x: invoiceX, y: invoiceY, width: invoiceBox.w, height: invoiceBox.h, opacity: 0.46 } });
  if (motifs.includes("receipt_handdrawn"))
    scene.nodes.push({ id: "receipt", type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: "#motif_receipt_handdrawn", x: receiptX, y: receiptY, width: receiptBox.w, height: receiptBox.h, opacity: 0.58 } });

  const iconPool = ["lucide_shield_check", "lucide_lock", "lucide_wallet", "lucide_credit_card", "lucide_badge_check", "lucide_coins"].filter((m) => motifs.includes(m));
  const iconCount = clamp(ri(rand, 2, 3), 0, iconPool.length);
  const icons = pickSomeStable(rand, iconPool, iconCount);
  const iconSize = 34;
  const step = 44;
  const rowMax = Math.max(0, Math.floor((safeRight - (panelX + innerPad)) / step));
  const rowCount = Math.min(iconCount, rowMax);
  const rowW = rowCount * step;
  const rowX0 = clamp(panelX + innerPad + 8, panelX + innerPad + 8, safeRight - rowW);
  const rowY = clampInPanelY(panelY + 44, iconSize);
  for (let i = 0; i < rowCount; i++) {
    scene.nodes.push({
      id: `tag_${i}`,
      type: "use",
      attrs: {
        "data-role": "prop",
        "data-layer": "bg",
        href: `#motif_${icons[i]}`,
        x: rowX0 + i * step,
        y: rowY,
        width: iconSize,
        height: iconSize,
        opacity: 0.82,
      },
    });
  }

  // Human in fg (overlaps container)
  const person = motifs.find((m) => m.startsWith("opeeps_effigy_"));
  if (person) scene.nodes.push({ id: "person", type: "use", attrs: { "data-role": "subject", href: `#motif_${person}`, x: personX, y: 172, width: 320, height: 392, opacity: 0.96 } });

  addTitleSlots(scene);
  return scene;
}

function buildPortalPaper({ seed, motifs, layout }) {
  const scene = baseScene({ title: "Auto: Customer Portal (Paper)", seed, motifs });
  scene.a11y.desc = "Auto-generated customer portal scene with paper/journal container and UI cards.";

  // Require the paper/pencil motifs (fallback to glass if missing).
  const hasPaper = motifs.includes("paper_frame") || motifs.includes("pencil_shade_bl") || motifs.includes("tape_strip");
  if (!hasPaper) return buildPaymentsGlass({ seed, motifs });

  // add extra soft filter for glow (local only)
  scene.defs.raw +=
    '      <filter id="f_soft2" x="-30%" y="-30%" width="160%" height="160%">\n' +
    '        <feGaussianBlur stdDeviation="24"/>\n' +
    "      </filter>\n";

  const panelX = clamp(layout?.panelX ?? 80, 40, 140);
  const panelY = clamp(layout?.panelY ?? 160, 140, 210);
  const panelW = clamp(layout?.panelW ?? 720, 640, 820);
  const panelH = clamp(layout?.panelH ?? 380, 320, 420);
  const personX = clamp(layout?.personX ?? panelX + panelW - 110, 640, 880);
  const safeRight = personX - 18;
  const clampInPanel = (x, width) => clamp(x, panelX + 22, Math.max(panelX + 22, safeRight - width));

  scene.nodes.push(
    { id: "bg", type: "rect", attrs: { "data-role": "decor", "data-decor-type": "texture", x: 0, y: 0, width: 1200, height: 600, fill: "#0B0F14" } },
    { id: "glow", type: "ellipse", attrs: { "data-role": "decor", "data-decor-type": "shadow", cx: 340, cy: 220, rx: 220, ry: 180, fill: "rgba(79,140,255,0.16)", filter: "url(#f_soft2)" } }
  );

  if (motifs.includes("paper_frame")) scene.nodes.push({ id: "paper", type: "use", attrs: { "data-role": "decor", "data-decor-type": "texture", href: "#motif_paper_frame", x: 0, y: 0, width: 1200, height: 600, opacity: 0.82 } });
  if (motifs.includes("pencil_shade_bl")) scene.nodes.push({ id: "shade", type: "use", attrs: { "data-role": "decor", "data-decor-type": "shadow", href: "#motif_pencil_shade_bl", x: -30, y: 380, width: 320, height: 220, opacity: 0.32 } });

  scene.nodes.push({ id: "panel", type: "rect", attrs: { "data-role": "prop", "data-layer": "bg", "data-prop-kind": "container", x: panelX, y: panelY, width: panelW, height: panelH, rx: 22, fill: "rgba(255,255,255,0.03)", stroke: "rgba(255,255,255,0.10)", "stroke-width": 1 } });

  const addCard = (id, x, y, iconMotif, title, subtitle) => {
    scene.nodes.push({ id: `${id}_card`, type: "rect", attrs: { "data-role": "prop", "data-layer": "bg", x, y, width: 300, height: 112, rx: 18, fill: "rgba(255,255,255,0.03)", stroke: "rgba(255,255,255,0.10)", "stroke-width": 1 } });
    if (motifs.includes(iconMotif)) scene.nodes.push({ id: `${id}_ico`, type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: `#motif_${iconMotif}`, x: x + 26, y: y + 26, width: 38, height: 38, opacity: 0.95 } });
    scene.nodes.push(
      { id: `${id}_t`, type: "text", attrs: { "data-role": "text", "data-layer": "text", x: x + 80, y: y + 50, fill: "rgba(234,242,255,0.88)", "font-size": 13, "font-weight": 700 }, text: title },
      { id: `${id}_s`, type: "text", attrs: { "data-role": "text", "data-layer": "text", x: x + 80, y: y + 74, fill: "rgba(234,242,255,0.58)", "font-size": 12 }, text: subtitle }
    );
  };

  addCard("profile", panelX + 40, panelY + 50, "lucide_user", "Customer portal", "Order status • receipts • updates");
  addCard("order", panelX + 40, panelY + 180, "lucide_file_text", "Order #1284", "Scheduled • Crew assigned");

  if (motifs.includes("phone_handdrawn")) scene.nodes.push({ id: "phone", type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: "#motif_phone_handdrawn", x: clampInPanel(panelX + 360, 220), y: panelY + 80, width: 220, height: 170, opacity: 0.72 } });
  if (motifs.includes("receipt_handdrawn")) scene.nodes.push({ id: "receipt", type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: "#motif_receipt_handdrawn", x: clampInPanel(panelX + 560, 190), y: panelY + 160, width: 190, height: 150, opacity: 0.62 } });
  if (motifs.includes("chat_bubble_handdrawn")) scene.nodes.push({ id: "chat", type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: "#motif_chat_bubble_handdrawn", x: clampInPanel(panelX + 420, 230), y: panelY + 220, width: 230, height: 170, opacity: 0.56 } });
  if (motifs.includes("tape_strip")) scene.nodes.push({ id: "tape", type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: "#motif_tape_strip", x: panelX - 14, y: panelY - 18, width: 140, height: 70, opacity: 0.22 } });

  const person = motifs.find((m) => m.startsWith("opeeps_effigy_"));
  if (person) scene.nodes.push({ id: "person", type: "use", attrs: { "data-role": "subject", href: `#motif_${person}`, x: personX, y: 180, width: 320, height: 392, opacity: 0.96 } });

  addTitleSlots(scene);
  return scene;
}

function buildBookingGlass({ seed, motifs, layout }) {
  const scene = baseScene({ title: "Auto: Booking (Glass)", seed, motifs });
  scene.a11y.desc = "Auto-generated booking scene with glass container and scheduling icons.";

  const panelX = clamp(layout?.panelX ?? 80, 50, 160);
  const panelY = clamp(layout?.panelY ?? 170, 150, 240);
  const panelW = clamp(layout?.panelW ?? 760, 680, 860);
  const panelH = clamp(layout?.panelH ?? 340, 300, 380);
  const personX = clamp(layout?.personX ?? panelX + panelW - 110, 640, 880);

  scene.nodes.push(
    { id: "bg", type: "rect", attrs: { "data-role": "decor", "data-decor-type": "texture", x: 0, y: 0, width: 1200, height: 600, fill: "#0B0F14" } },
    { id: "orb1", type: "circle", attrs: { "data-role": "decor", "data-decor-type": "shadow", cx: panelX + 180, cy: panelY - 10, r: 160, fill: "rgba(79,140,255,0.16)", filter: "url(#f_soft)" } },
    { id: "orb2", type: "circle", attrs: { "data-role": "decor", "data-decor-type": "shadow", cx: 980, cy: 420, r: 180, fill: "rgba(139,91,255,0.14)", filter: "url(#f_soft)" } },
    { id: "panel_shadow", type: "ellipse", attrs: { "data-role": "decor", "data-decor-type": "shadow", cx: panelX + panelW / 2 + 20, cy: panelY + panelH + 98, rx: 520, ry: 120, fill: "rgba(0,0,0,0.28)", filter: "url(#f_soft)" } },
    { id: "panel", type: "rect", attrs: { "data-role": "prop", "data-layer": "bg", "data-prop-kind": "container", x: panelX, y: panelY, width: panelW, height: panelH, rx: 26, fill: "rgba(255,255,255,0.04)", stroke: "rgba(255,255,255,0.12)", "stroke-width": 1 } }
  );

  const chips = [
    { id: "slot", icon: "lucide_calendar_clock", title: "Time slots", subtitle: "Capacity-aware availability", x: 120, y: 220, w: 320 },
    { id: "dur", icon: "lucide_timer", title: "Duration", subtitle: "Per-service time blocks", x: 460, y: 220, w: 340 },
    { id: "area", icon: "lucide_map", title: "Service area", subtitle: "Zones + coverage rules", x: 120, y: 322, w: 320 },
    { id: "skill", icon: "lucide_badge", title: "Skill match", subtitle: "Right tech, first time", x: 460, y: 322, w: 340 },
  ];
  for (const c of chips) {
    const dx = panelX - 80;
    const dy = panelY - 170;
    scene.nodes.push({ id: `chip_${c.id}`, type: "rect", attrs: { "data-role": "prop", "data-layer": "bg", x: c.x + dx, y: c.y + dy, width: c.w, height: 84, rx: 18, fill: "rgba(255,255,255,0.03)", stroke: "rgba(255,255,255,0.10)", "stroke-width": 1 } });
    if (motifs.includes(c.icon)) scene.nodes.push({ id: `i_${c.id}`, type: "use", attrs: { "data-role": "prop", "data-layer": "bg", href: `#motif_${c.icon}`, x: c.x + dx + 26, y: c.y + dy + 22, width: 34, height: 34, opacity: 0.95 } });
    scene.nodes.push(
      { id: `t_${c.id}`, type: "text", attrs: { "data-role": "text", "data-layer": "text", x: c.x + dx + 76, y: c.y + dy + 36, fill: "rgba(234,242,255,0.88)", "font-size": 13, "font-weight": 720 }, text: c.title },
      { id: `s_${c.id}`, type: "text", attrs: { "data-role": "text", "data-layer": "text", x: c.x + dx + 76, y: c.y + dy + 58, fill: "rgba(234,242,255,0.56)", "font-size": 12 }, text: c.subtitle }
    );
  }

  const person = motifs.find((m) => m.startsWith("opeeps_effigy_"));
  if (person) scene.nodes.push({ id: "person", type: "use", attrs: { "data-role": "subject", href: `#motif_${person}`, x: personX, y: 168, width: 320, height: 392, opacity: 0.96 } });

  addTitleSlots(scene);
  return scene;
}

function generateCandidates({ domain, style, seed, motifs, n }) {
  const rand = mulberry32(seed);
  const candidates = [];

  const mkLayout = () => {
    if (domain === "payments" && style === "glass") {
      const panelX = ri(rand, 70, 120);
      const panelY = ri(rand, 168, 210);
      const panelW = ri(rand, 740, 820);
      const panelH = ri(rand, 316, 368);
      const personX = ri(rand, panelX + panelW - 130, panelX + panelW - 70);
      return {
        panelX,
        panelY,
        panelW,
        panelH,
        personX,
        cardX: ri(rand, 30, 90),
        cardY: ri(rand, 28, 72),
        receiptX: ri(rand, 300, 480),
        receiptY: ri(rand, 96, 176),
        invoiceX: ri(rand, 460, 600),
        invoiceY: ri(rand, 44, 124),
      };
    }
    if (domain === "portal" && style === "paper") {
      const panelX = ri(rand, 60, 120);
      const panelY = ri(rand, 150, 200);
      const panelW = ri(rand, 680, 780);
      const panelH = ri(rand, 340, 410);
      const personX = ri(rand, panelX + panelW - 130, panelX + panelW - 70);
      return { panelX, panelY, panelW, panelH, personX };
    }
    // booking/glass fallback
    const panelX = ri(rand, 60, 120);
    const panelY = ri(rand, 158, 210);
    const panelW = ri(rand, 720, 820);
    const panelH = ri(rand, 320, 372);
    const personX = ri(rand, panelX + panelW - 130, panelX + panelW - 70);
    return { panelX, panelY, panelW, panelH, personX };
  };

  for (let i = 0; i < n; i++) {
    const layout = mkLayout();
    let scene;
    if (domain === "payments" && style === "glass") scene = buildPaymentsGlass({ seed, motifs, layout });
    else if (domain === "portal" && style === "paper") scene = buildPortalPaper({ seed, motifs, layout });
    else if (domain === "booking" && style === "glass") scene = buildBookingGlass({ seed, motifs, layout });
    else if (domain === "payments") scene = buildPaymentsGlass({ seed, motifs, layout });
    else if (domain === "portal") scene = buildPortalPaper({ seed, motifs, layout });
    else scene = buildBookingGlass({ seed, motifs, layout });

    candidates.push({ layout, scene, score: scoreScene(scene) });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function main() {
  const briefPath = arg("--brief");
  const outPath = arg("--out");
  const forcedDomain = arg("--domain");
  const forcedStyle = arg("--style");
  const forcedSeed = arg("--seed");
  const candidatesArg = arg("--candidates");

  if (!briefPath || !outPath) {
    usage();
    process.exit(2);
  }

  const briefAbs = path.resolve(process.cwd(), briefPath);
  const outAbs = path.resolve(process.cwd(), outPath);
  const brief = readJson(briefAbs);

  const metaAbs = path.resolve(process.cwd(), "front-end-effect/assets/motifs/motifs.meta.json");
  const meta = readJson(metaAbs);
  const metaById = metaIndex(meta);

  const style = detectStyle(brief, forcedStyle);
  const domain = detectDomain(brief, forcedDomain);
  const seed = Number.isFinite(Number.parseInt(forcedSeed ?? "", 10))
    ? Number.parseInt(forcedSeed, 10)
    : Number.isFinite(brief?.meta?.seed)
      ? brief.meta.seed
      : 1;

  const picked = pickMotifs(metaById, { domain, style, seed });
  // Ensure required decor/container motifs for paper.
  const motifs = [...picked];
  if (style === "paper") {
    for (const req of ["paper_frame", "pencil_shade_bl", "tape_strip"]) {
      if (!motifs.includes(req)) motifs.push(req);
    }
    for (const req of ["doodle_sparkles"]) {
      if (!motifs.includes(req)) motifs.push(req);
    }
  }
  // Deterministic final list
  motifs.sort((a, b) => String(a).localeCompare(String(b)));

  const nCandidates = Number.isFinite(Number.parseInt(candidatesArg ?? "", 10)) ? Number.parseInt(candidatesArg, 10) : 40;
  const candidates = generateCandidates({ domain, style, seed, motifs, n: clamp(nCandidates, 1, 200) });
  const best = candidates[0];
  const scene = best.scene;
  scene.meta = scene.meta || {};
  scene.meta.auto = { domain, style, seed, candidates: candidates.length, score: best.score, layout: best.layout };

  // Ensure defs.motifs contains only the motifs actually used by <use href="#motif_*">.
  const used = new Set();
  for (const n of scene.nodes || []) {
    if (n?.type !== "use") continue;
    const href = String(n?.attrs?.href ?? "");
    const m = href.match(/^#motif_(.+)$/);
    if (m) used.add(m[1]);
  }
  scene.defs = scene.defs || {};
  scene.defs.motifs = Array.from(used).sort((a, b) => String(a).localeCompare(String(b)));

  writeJson(outAbs, scene);
  console.log(`OK: auto-filled scene mother (${domain}/${style}) candidates=${candidates.length} score=${best.score.toFixed(1)} → ${outPath}`);
}

main();
