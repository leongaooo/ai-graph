import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error(`SceneSpec lint error: ${message}`);
  process.exitCode = 1;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectNodes(nodes, out = []) {
  for (const node of nodes) {
    out.push(node);
    if (Array.isArray(node.children)) collectNodes(node.children, out);
  }
  return out;
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node front-end-effect/tools/scene-spec-lint.mjs <scene.json>");
    process.exit(2);
  }

  const abs = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(abs, "utf8");
  let scene;
  try {
    scene = JSON.parse(raw);
  } catch {
    console.error(`Invalid JSON: ${filePath}`);
    process.exit(2);
  }

  if (!isObject(scene)) return fail("root must be an object");
  if (!isObject(scene.meta)) fail("meta is required");
  if (scene.meta?.version !== "0.1") fail("meta.version must be '0.1'");
  if (!isObject(scene.canvas)) fail("canvas is required");
  if (typeof scene.canvas?.width !== "number" || typeof scene.canvas?.height !== "number") {
    fail("canvas.width/height must be numbers");
  }
  if (typeof scene.canvas?.viewBox !== "string") fail("canvas.viewBox must be a string");

  if (!isObject(scene.theme?.palette)) fail("theme.palette is required");
  for (const key of ["bg", "fg", "primary", "accent", "muted"]) {
    if (typeof scene.theme?.palette?.[key] !== "string") fail(`theme.palette.${key} must be a string`);
  }
  if (!isObject(scene.theme?.typography)) fail("theme.typography is required");
  if (typeof scene.theme?.typography?.fontFamily !== "string") fail("theme.typography.fontFamily must be a string");

  if (!Array.isArray(scene.nodes) || scene.nodes.length === 0) fail("nodes must be a non-empty array");

  const flatNodes = collectNodes(scene.nodes);
  const ids = new Set();
  for (const node of flatNodes) {
    if (!isObject(node)) {
      fail("node must be an object");
      continue;
    }
    if (typeof node.id !== "string" || node.id.length === 0) fail("node.id must be a non-empty string");
    if (ids.has(node.id)) fail(`duplicate node id: ${node.id}`);
    ids.add(node.id);
    if (typeof node.type !== "string") fail(`node.type missing for id: ${node.id}`);
    if (node.type === "text" && (typeof node.text !== "string" || node.text.length === 0)) {
      fail(`text node must include non-empty 'text': ${node.id}`);
    }
  }

  if (!Array.isArray(scene.animations)) fail("animations must be an array (can be empty)");
  for (const anim of scene.animations ?? []) {
    if (!isObject(anim)) {
      fail("animation must be an object");
      continue;
    }
    if (anim.type !== "timeline") fail(`animation.type must be 'timeline': ${anim.id ?? "(missing id)"}`);
    if (!Array.isArray(anim.tracks) || anim.tracks.length === 0) fail(`animation.tracks must be non-empty: ${anim.id}`);
    for (const track of anim.tracks ?? []) {
      if (!isObject(track)) {
        fail(`track must be an object: ${anim.id}`);
        continue;
      }
      if (typeof track.target !== "string" || track.target.length === 0) fail(`track.target missing: ${anim.id}`);
      if (track.target && !ids.has(track.target)) fail(`track.target not found: ${track.target}`);
      if (typeof track.property !== "string") fail(`track.property missing: ${anim.id}`);
      if (!Array.isArray(track.keyframes) || track.keyframes.length < 2) fail(`track.keyframes must have >=2: ${anim.id}`);
      let prevT = -Infinity;
      for (const kf of track.keyframes ?? []) {
        if (!isObject(kf)) {
          fail(`keyframe must be an object: ${anim.id}/${track.target}`);
          continue;
        }
        if (typeof kf.t !== "number" || kf.t < 0 || kf.t > 1) fail(`keyframe.t must be 0..1: ${anim.id}/${track.target}`);
        if (kf.t < prevT) fail(`keyframes must be non-decreasing by t: ${anim.id}/${track.target}`);
        prevT = kf.t;
        if (!("value" in kf)) fail(`keyframe.value missing: ${anim.id}/${track.target}`);
      }
    }
  }

  if (!isObject(scene.a11y?.reducedMotion)) fail("a11y.reducedMotion is required");
  if (typeof scene.a11y?.reducedMotion?.strategy !== "string") fail("a11y.reducedMotion.strategy must be a string");

  if (process.exitCode === 1) return;
  console.log(`OK: ${filePath}`);
}

main();

