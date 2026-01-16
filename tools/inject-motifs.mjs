import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(
    [
      "Usage:",
      "  node front-end-effect/tools/inject-motifs.mjs --scene <scene.json> --out <scene.json> [--manifest <motifs.manifest.json>]",
      "",
      "What it does:",
      "  - Reads SceneSpec v0.1 JSON",
      "  - Loads motif <symbol> defs from the manifest",
      "  - Concatenates them into scene.defs.raw (static SVG, no runtime JS)",
      "",
      "Conventions:",
      "  - scene.defs.motifs: string[] of motif ids",
      "  - motif manifest: { version, motifs: [{ id, path, symbolId, ... }] }",
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

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function extractSymbol(svgText, symbolId) {
  if (!svgText || !symbolId) return null;

  let start = svgText.indexOf(`<symbol id="${symbolId}"`);
  if (start === -1) start = svgText.indexOf(`<symbol id='${symbolId}'`);
  if (start === -1) {
    const i = svgText.indexOf(`id="${symbolId}"`);
    const j = svgText.indexOf(`id='${symbolId}'`);
    const hit = i !== -1 ? i : j;
    if (hit !== -1) {
      const back = svgText.lastIndexOf("<symbol", hit);
      if (back !== -1) start = back;
    }
  }
  if (start === -1) return null;

  const end = svgText.indexOf("</symbol>", start);
  if (end === -1) return null;
  return svgText.slice(start, end + "</symbol>".length);
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((x) => typeof x === "string" && x.trim());
  return [];
}

function main() {
  const scenePath = arg("--scene");
  const outPath = arg("--out");
  const manifestPath = arg("--manifest") || "front-end-effect/assets/motifs/motifs.manifest.json";

  if (!scenePath || !outPath) {
    usage();
    process.exit(2);
  }

  const sceneAbs = path.resolve(process.cwd(), scenePath);
  const outAbs = path.resolve(process.cwd(), outPath);
  const manifestAbs = path.resolve(process.cwd(), manifestPath);

  const scene = readJson(sceneAbs);
  const manifest = readJson(manifestAbs);

  const motifIds = ensureArray(scene?.defs?.motifs);
  if (motifIds.length === 0) {
    writeJson(outAbs, scene);
    console.log(`OK: wrote ${outPath} (no motifs)`);
    return;
  }

  const byId = new Map((manifest?.motifs || []).map((m) => [m.id, m]));
  const missing = [];
  const fileCache = new Map(); // abs path -> content
  const extracted = new Map(); // symbolId -> <symbol>...</symbol>

  for (const id of motifIds) {
    const entry = byId.get(id);
    if (!entry?.path || !entry?.symbolId) {
      missing.push(id);
      continue;
    }
    const abs = path.resolve(process.cwd(), entry.path);
    if (!fileCache.has(abs)) fileCache.set(abs, readText(abs));
    const svgText = fileCache.get(abs);
    const symbol = extractSymbol(svgText, entry.symbolId);
    if (!symbol) {
      console.error(`inject-motifs: failed to extract symbolId="${entry.symbolId}" from ${entry.path}`);
      process.exit(2);
    }
    if (!extracted.has(entry.symbolId)) extracted.set(entry.symbolId, symbol.trim());
  }

  if (missing.length) {
    console.error(`inject-motifs: missing motif ids: ${missing.join(", ")}`);
    process.exit(2);
  }

  const userDefsRaw = typeof scene?.defs?.raw === "string" ? scene.defs.raw.trim() : "";
  const motifDefsRaw = Array.from(extracted.values()).filter(Boolean).join("\n");

  scene.defs = scene.defs || {};
  scene.defs.raw = [userDefsRaw, motifDefsRaw].filter(Boolean).join("\n");

  writeJson(outAbs, scene);
  console.log(`OK: wrote ${outPath} (motifs: ${motifIds.length})`);
}

main();
