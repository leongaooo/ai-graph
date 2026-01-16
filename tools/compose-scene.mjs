import fs from "node:fs";
import path from "node:path";

function readJson(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function writeJson(filePath, value) {
  const abs = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function replaceSlotsInString(text, slots) {
  if (typeof text !== "string") return text;
  return text.replace(/\{\{\s*slot:([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
    const v = slots?.[key];
    return typeof v === "string" ? v : "";
  });
}

function walkNode(node, slots) {
  if (!node || typeof node !== "object") return;

  if (node.type === "text") node.text = replaceSlotsInString(node.text, slots);
  if (node.attrs && typeof node.attrs === "object") {
    for (const k of Object.keys(node.attrs)) node.attrs[k] = replaceSlotsInString(node.attrs[k], slots);
  }
  if (node.style && typeof node.style === "object") {
    for (const k of Object.keys(node.style)) node.style[k] = replaceSlotsInString(node.style[k], slots);
  }
  if (Array.isArray(node.children)) node.children.forEach((c) => walkNode(c, slots));
}

function usage() {
  console.log(
    [
      "Usage:",
      "  node front-end-effect/tools/compose-scene.mjs --brief <brief.json> --scene <scene.json> --out <out.json>",
      "",
      "Notes:",
      "  - Replaces {{slot:<key>}} placeholders inside text/attrs/style using brief.layout.slots.",
      "  - Does not modify animations; keep animation targets stable via node.id.",
    ].join("\n")
  );
}

function main() {
  const args = process.argv.slice(2);
  const get = (name) => {
    const i = args.indexOf(name);
    if (i === -1) return null;
    return args[i + 1] ?? null;
  };

  const briefPath = get("--brief");
  const scenePath = get("--scene");
  const outPath = get("--out");

  if (!briefPath || !scenePath || !outPath) {
    usage();
    process.exit(2);
  }

  const brief = readJson(briefPath);
  const baseScene = readJson(scenePath);
  const out = clone(baseScene);

  const slots = brief?.layout?.slots ?? {};
  if (!slots || typeof slots !== "object") {
    console.error("compose-scene: brief.layout.slots must be an object");
    process.exit(2);
  }

  out.meta = out.meta || {};
  if (brief?.meta?.title && !out.meta.title) out.meta.title = brief.meta.title;
  if (brief?.meta?.lang) out.meta.lang = brief.meta.lang;
  if (brief?.meta?.seed !== undefined) out.meta.seed = brief.meta.seed;

  if (out.a11y) {
    if (brief?.layout?.slots?.headline && !out.a11y.title) out.a11y.title = brief.layout.slots.headline;
  }

  if (Array.isArray(out.nodes)) out.nodes.forEach((n) => walkNode(n, slots));

  writeJson(outPath, out);
  console.log(`OK: wrote ${outPath}`);
}

main();

