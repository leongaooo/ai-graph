import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(
    [
      "Usage:",
      "  node front-end-effect/tools/scene-visual-lint.mjs <scene.json>",
      "",
      "What it checks (best-effort, static):",
      "  - Decor nodes must not appear after text nodes (z-order rule).",
      "  - Decor must not overlap text bounding boxes beyond a small threshold.",
      "",
      "Conventions:",
      "  - Use node.attrs['data-role'] in {'decor','subject','prop','text'}.",
      "  - Text nodes are treated as role 'text' by default.",
    ].join("\n")
  );
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function num(v, fallback = 0) {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function bboxIntersect(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function area(b) {
  return Math.max(0, b.w) * Math.max(0, b.h);
}

function expandBox(b, pad) {
  return { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad };
}

function roleOf(node) {
  const r = node?.attrs?.["data-role"];
  if (typeof r === "string" && r) return r;
  if (node.type === "text") return "text";
  return "unknown";
}

function propKindOf(node) {
  const raw = String(node?.attrs?.["data-prop-kind"] ?? "").trim();
  return raw || "default";
}

function isContainerProp(propBox, canvasBox) {
  if (!propBox?.node || !propBox?.box) return false;
  if (propBox.kind === "container") return true;
  if (propBox.layer !== "bg") return false;

  const id = String(propBox.id ?? "");
  if (/(^|_)(panel|frame|container)(_|$)/i.test(id)) return true;

  // Heuristic: large rounded rect in bg is usually a container panel.
  if (propBox.node.type === "rect") {
    const coverage = area(propBox.box) / Math.max(1, area(canvasBox));
    const rx = num(propBox.node?.attrs?.rx, 0);
    if (coverage >= 0.12 && rx >= 14) return true;
  }
  return false;
}

function layerOf(node) {
  const raw = String(node?.attrs?.["data-layer"] ?? "").trim();
  if (raw === "bg_base" || raw === "bg" || raw === "fg" || raw === "text") return raw;
  const role = roleOf(node);
  const decorType = String(node?.attrs?.["data-decor-type"] ?? "").trim();
  if (role === "text") return "text";
  if (role === "decor") {
    if (decorType === "texture" || decorType === "shadow") return "bg_base";
    return "bg";
  }
  if (role === "subject") return "fg";
  if (role === "prop") return "fg";
  return "fg";
}

function textBBox(node) {
  const x = num(node?.attrs?.x, 0);
  const y = num(node?.attrs?.y, 0);
  const fontSize = num(node?.attrs?.["font-size"], 16);
  const text = String(node?.text ?? "");
  const anchor = String(node?.attrs?.["text-anchor"] ?? "start");

  // crude text metrics: Latin-heavy approximation; good enough for overlap-guardrails.
  const width = Math.max(1, text.length) * fontSize * 0.56;
  const height = fontSize * 1.2;

  let left = x;
  if (anchor === "middle") left = x - width / 2;
  if (anchor === "end") left = x - width;

  // treat y as baseline; move bbox up.
  return { x: left, y: y - height, w: width, h: height };
}

function nodeBBox(node) {
  const t = node.type;
  const a = node.attrs || {};

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
  if (t === "line") {
    const x1 = num(a.x1);
    const y1 = num(a.y1);
    const x2 = num(a.x2);
    const y2 = num(a.y2);
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
  }
  if (t === "text") return textBBox(node);

  // path bbox is non-trivial; ignore to avoid false fails.
  return null;
}

function parseRgbaAlpha(fill) {
  if (typeof fill !== "string") return null;
  const m = fill.match(/rgba\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([0-9.]+)\s*\)/i);
  if (!m) return null;
  const a = Number.parseFloat(m[1]);
  return Number.isFinite(a) ? a : null;
}

function estimateEffectiveOpacity(node) {
  const attrs = node?.attrs || {};
  const explicit = attrs.opacity !== undefined ? num(attrs.opacity, 1) : null;
  const fill = attrs.fill;
  const fillAlpha = parseRgbaAlpha(fill);

  const isSoftBlur = typeof attrs.filter === "string" && attrs.filter.includes("f_soft");
  if (isSoftBlur) return Math.min(0.18, explicit ?? 1) * (fillAlpha ?? 1);

  // Heuristic: blurred orb gradients are intended as subtle background light.
  const isOrbFill = typeof fill === "string" && fill.includes("url(#g_orb");
  if (isSoftBlur && isOrbFill) return Math.min(0.22, explicit ?? 1);

  if (fillAlpha !== null) return (explicit ?? 1) * fillAlpha;
  return explicit ?? 1;
}

function inferDecorType(node, coverage) {
  const attrs = node?.attrs || {};
  const raw = String(attrs["data-decor-type"] ?? "").trim();
  if (raw) return raw;
  if (coverage > 0.82) return "texture";
  const isSoftBlur = typeof attrs.filter === "string" && attrs.filter.includes("f_soft");
  if (isSoftBlur) return "shadow";
  return "accent";
}

function flatten(nodes, out = []) {
  for (const n of nodes || []) {
    out.push(n);
    if (Array.isArray(n.children)) flatten(n.children, out);
  }
  return out;
}

function main() {
  const scenePath = process.argv[2];
  if (!scenePath) {
    usage();
    process.exit(2);
  }

  const abs = path.resolve(process.cwd(), scenePath);
  const scene = readJson(abs);
  const canvasBox = {
    x: 0,
    y: 0,
    w: num(scene?.canvas?.width, 0),
    h: num(scene?.canvas?.height, 0),
  };
  const canvasArea = area(canvasBox) || 1;
  const nodes = flatten(scene?.nodes || []);

  // Layer sanity: we now render by layers, not by authoring order.
  // Enforce that roles are assigned to sensible layers so the renderer can guarantee z-order.
  for (const n of nodes) {
    const role = roleOf(n);
    const layer = layerOf(n);
    if (role === "text" && layer !== "text") {
      console.error(`scene-visual-lint: text node "${n.id}" must be in data-layer="text" (or be inferred as text).`);
      process.exit(2);
    }
    if (role === "decor" && layer !== "bg" && layer !== "bg_base") {
      console.error(`scene-visual-lint: decor node "${n.id}" must be in data-layer="bg_base" or "bg".`);
      process.exit(2);
    }
    if (role === "subject" && layer !== "fg") {
      console.error(`scene-visual-lint: subject node "${n.id}" must be in data-layer="fg".`);
      process.exit(2);
    }
    if (role === "prop" && layer !== "fg" && layer !== "bg") {
      console.error(`scene-visual-lint: prop node "${n.id}" must be in data-layer="fg" or "bg".`);
      process.exit(2);
    }
  }

  const textNodes = nodes.filter((n) => roleOf(n) === "text");
  const textBoxes = textNodes
    .map((n) => ({ id: n.id, box: nodeBBox(n) }))
    .filter((t) => t.box && area(t.box) > 0);

  const subjectBoxes = nodes
    .filter((n) => roleOf(n) === "subject")
    .map((n) => ({ id: n.id, layer: layerOf(n), box: nodeBBox(n) }))
    .filter((t) => t.box && area(t.box) > 0);

  const propBoxes = nodes
    .filter((n) => roleOf(n) === "prop")
    .map((n) => ({ id: n.id, layer: layerOf(n), kind: propKindOf(n), node: n, box: nodeBBox(n) }))
    .filter((t) => t.box && area(t.box) > 0);

  // Props must not overlap people (prevents “calendar on head”).
  // Exception: container props (e.g., a background panel) are allowed to overlap subjects for composition.
  const FOREGROUND_PROP_PAD = 8;
  for (const p of propBoxes) {
    if (isContainerProp(p, canvasBox)) continue;
    for (const s of subjectBoxes) {
      if (s.layer !== "fg") continue;
      const isect = bboxIntersect(expandBox(p.box, FOREGROUND_PROP_PAD), s.box);
      if (!isect) continue;
      const ratio = area(isect) / Math.max(1, Math.min(area(p.box), area(s.box)));
      if (ratio > 0.01) {
        console.error(`scene-visual-lint: prop "${p.id}" overlaps subject "${s.id}". Move it away (or mark as data-prop-kind="container" if it is a background panel).`);
        process.exit(2);
      }
    }
  }

  const decorNodes = nodes.filter((n) => roleOf(n) === "decor");
  const decorBoxes = decorNodes
    .map((n) => {
      const box = nodeBBox(n);
      if (!box) return null;
      const coverage = area(box) / canvasArea;
      return {
        id: n.id,
        coverage,
        opacity: estimateEffectiveOpacity(n),
        decorType: inferDecorType(n, coverage),
        layer: layerOf(n),
        box,
      };
    })
    .filter(Boolean)
    .filter((d) => d.box && area(d.box) > 0);

  // Safe-zone: accent decor should not be near foreground (prevents “pressed on head” even without overlap).
  // We approximate with bounding boxes (fast, deterministic). If it fails, move the accent to corners/empty areas.
  const SAFE_PAD_SUBJECT = 56;
  const SAFE_PAD_PROP = 40;
  for (const d of decorBoxes) {
    if (d.decorType !== "accent") continue;
    if (d.layer !== "bg") continue;
    if (d.coverage > 0.82) continue;

    for (const s of subjectBoxes) {
      const isect = bboxIntersect(d.box, expandBox(s.box, SAFE_PAD_SUBJECT));
      if (isect) {
        console.error(`scene-visual-lint: accent decor "${d.id}" is too close to subject "${s.id}" (safe-zone). Move it to empty corner.`);
        process.exit(2);
      }
    }
    for (const p of propBoxes) {
      if (p.layer !== "fg") continue;
      const isect = bboxIntersect(d.box, expandBox(p.box, SAFE_PAD_PROP));
      if (isect) {
        console.error(`scene-visual-lint: accent decor "${d.id}" is too close to prop "${p.id}" (safe-zone). Move it to empty corner.`);
        process.exit(2);
      }
    }
  }

  // Decor budget: keep the scene calm and predictable.
  // Ignore full-canvas layers (bg/texture grids) from the count.
  const nonFullDecor = decorBoxes.filter((d) => d.coverage <= 0.82);
  const DECOR_BUDGET = 10;
  if (nonFullDecor.length > DECOR_BUDGET) {
    console.error(
      `scene-visual-lint: too many decor nodes (${nonFullDecor.length} > ${DECOR_BUDGET}). Keep decor minimal.`
    );
    process.exit(2);
  }

  // Placement guard: subjects should not be clipped at the top edge (half-head looks wrong).
  const subjectNodes = nodes.filter((n) => roleOf(n) === "subject");
  for (const s of subjectNodes) {
    const box = nodeBBox(s);
    if (!box) continue;
    if (box.y < 0) {
      console.error(`scene-visual-lint: subject "${s.id}" is clipped at top (y=${box.y}). Move it down or adjust symbol viewBox.`);
      process.exit(2);
    }
  }

  const problems = [];
  for (const d of decorBoxes) {
    // Full-canvas/near-full overlays are allowed (bg layers, subtle textures).
    if (d.coverage > 0.82) continue;

    // Base background shadows/textures are allowed to overlap foreground (they are behind it).
    if (d.layer === "bg_base" || d.decorType === "shadow" || d.decorType === "texture") continue;

    // Decor should behave like background: allow overlap only if it is very subtle.
    for (const s of subjectBoxes) {
      const isect = bboxIntersect(d.box, s.box);
      if (!isect) continue;
      const ratio = area(isect) / Math.max(1, Math.min(area(d.box), area(s.box)));
      const threshold = d.decorType === "accent" ? 0.03 : d.opacity >= 0.22 ? 0.03 : 0.6;
      if (ratio > threshold) {
        problems.push({ decor: d.id, target: `subject:${s.id}`, ratio: Number(ratio.toFixed(3)) });
      }
    }
    for (const p of propBoxes) {
      if (p.layer !== "fg") continue;
      const isect = bboxIntersect(d.box, p.box);
      if (!isect) continue;
      const ratio = area(isect) / Math.max(1, Math.min(area(d.box), area(p.box)));
      const threshold = d.decorType === "accent" ? 0.04 : d.opacity >= 0.22 ? 0.04 : 0.6;
      if (ratio > threshold) {
        problems.push({ decor: d.id, target: `prop:${p.id}`, ratio: Number(ratio.toFixed(3)) });
      }
    }

    for (const t of textBoxes) {
      const isect = bboxIntersect(d.box, t.box);
      if (!isect) continue;
      const ratio = area(isect) / Math.max(1, Math.min(area(d.box), area(t.box)));
      // Small overlaps from subtle/blur decor are OK; strict only for opaque decor.
      const threshold = d.decorType === "accent" ? 0.06 : d.opacity >= 0.25 ? 0.06 : 0.6;
      if (ratio > threshold) {
        problems.push({ decor: d.id, target: `text:${t.id}`, ratio: Number(ratio.toFixed(3)) });
      }
    }
  }

  if (problems.length) {
    console.error(
      `scene-visual-lint: decor overlaps foreground (too much):\n` +
        problems
          .slice(0, 8)
          .map((p) => `  - decor=${p.decor} target=${p.target} ratio=${p.ratio}`)
          .join("\n")
    );
    process.exit(2);
  }

  console.log(`OK: ${scenePath}`);
}

main();
