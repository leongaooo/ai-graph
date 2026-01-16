import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(
    [
      "Usage:",
      "  node front-end-effect/tools/render-scene-svg.mjs <scene.json> <out.svg>",
      "",
      "Notes:",
      "  - Converts SceneSpec v0.1 JSON into a static SVG file (no runtime JS required).",
      "  - If scene.defs.raw is a string, it is inserted into <defs> as-is.",
    ].join("\n")
  );
}

function escText(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escAttr(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function styleObjToString(style) {
  if (!style || typeof style !== "object") return "";
  const entries = Object.entries(style).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}:${String(v)}`).join(";");
}

function attrsToString(attrs) {
  if (!attrs || typeof attrs !== "object") return "";
  const parts = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    parts.push(`${k}="${escAttr(v)}"`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

function nodeToSvg(node) {
  const typeToTag = {
    group: "g",
    rect: "rect",
    circle: "circle",
    ellipse: "ellipse",
    line: "line",
    path: "path",
    text: "text",
    image: "image",
    use: "use",
  };

  const tag = typeToTag[node.type];
  if (!tag) return "";

  const attrs = { ...(node.attrs || {}) };
  if (node.id) attrs.id = node.id;

  const style = styleObjToString(node.style);
  if (style) attrs.style = style;

  const open = `<${tag}${attrsToString(attrs)}>`;
  const close = `</${tag}>`;

  const children = Array.isArray(node.children) ? node.children.map(nodeToSvg).join("") : "";
  if (tag === "text") {
    const text = node.text !== undefined ? escText(node.text) : "";
    return `${open}${text}${children}${close}`;
  }

  // self-closing tags where children/text are absent
  if (!children && (tag === "rect" || tag === "circle" || tag === "ellipse" || tag === "line" || tag === "path" || tag === "image" || tag === "use")) {
    return `<${tag}${attrsToString(attrs)} />`;
  }

  return `${open}${children}${close}`;
}

function roleOf(node) {
  const r = node?.attrs?.["data-role"];
  if (typeof r === "string" && r) return r;
  if (node?.type === "text") return "text";
  return "unknown";
}

function layerFromAttr(node) {
  const raw = String(node?.attrs?.["data-layer"] ?? "").trim();
  if (!raw) return null;
  const allowed = new Set(["bg_base", "bg", "fg", "text"]);
  return allowed.has(raw) ? raw : null;
}

function decorTypeOf(node) {
  const raw = String(node?.attrs?.["data-decor-type"] ?? "").trim();
  if (!raw) return null;
  const allowed = new Set(["texture", "shadow", "accent"]);
  return allowed.has(raw) ? raw : null;
}

function layerOf(node) {
  const explicit = layerFromAttr(node);
  if (explicit) return explicit;

  const role = roleOf(node);
  if (role === "text") return "text";
  if (role === "decor") {
    const dt = decorTypeOf(node);
    if (dt === "shadow" || dt === "texture") return "bg_base";
    return "bg";
  }
  if (role === "subject") return "fg";
  if (role === "prop") return "fg";
  return "fg";
}

function main() {
  const [scenePath, outPath] = process.argv.slice(2);
  if (!scenePath || !outPath) {
    usage();
    process.exit(2);
  }

  const sceneAbs = path.resolve(process.cwd(), scenePath);
  const outAbs = path.resolve(process.cwd(), outPath);
  const scene = JSON.parse(fs.readFileSync(sceneAbs, "utf8"));

  if (!scene?.canvas?.viewBox) {
    console.error("render-scene-svg: scene.canvas.viewBox is required");
    process.exit(2);
  }

  const title = scene?.a11y?.title ? escText(scene.a11y.title) : "";
  const desc = scene?.a11y?.desc ? escText(scene.a11y.desc) : "";

  const defsRaw = typeof scene?.defs?.raw === "string" ? scene.defs.raw : "";

  const topNodes = Array.isArray(scene.nodes) ? scene.nodes : [];
  const layerBgBase = [];
  const layerBg = [];
  const layerFg = [];
  const layerText = [];
  for (const n of topNodes) {
    const layer = layerOf(n);
    if (layer === "bg_base") layerBgBase.push(n);
    else if (layer === "bg") layerBg.push(n);
    else if (layer === "text") layerText.push(n);
    else layerFg.push(n);
  }

  const nodes = [
    `<g id="layer_bg_base">` + layerBgBase.map(nodeToSvg).join("") + `</g>`,
    `<g id="layer_bg">` + layerBg.map(nodeToSvg).join("") + `</g>`,
    `<g id="layer_fg">` + layerFg.map(nodeToSvg).join("") + `</g>`,
    `<g id="layer_text">` + layerText.map(nodeToSvg).join("") + `</g>`,
  ].join("");

  const svgParts = [];
  svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escAttr(scene.canvas.viewBox)}" width="${escAttr(scene.canvas.width ?? "")}" height="${escAttr(scene.canvas.height ?? "")}" role="img">`
  );
  if (title) svgParts.push(`<title>${title}</title>`);
  if (desc) svgParts.push(`<desc>${desc}</desc>`);
  if (defsRaw) svgParts.push(`<defs>${defsRaw}</defs>`);
  svgParts.push(nodes);
  svgParts.push(`</svg>`);

  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, svgParts.join("\n") + "\n", "utf8");
  console.log(`OK: wrote ${outPath}`);
}

main();
