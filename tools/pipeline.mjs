import { spawnSync } from "node:child_process";
import path from "node:path";

function usage() {
  console.log(
    [
      "Scene pipeline (Brief + Scene mother → SceneSpec → render.svg)",
      "",
      "Usage:",
      "  node front-end-effect/tools/pipeline.mjs --brief <brief.json> --scene <scene-mother.json> --outScene <scene.json> --outSvg <render.svg>",
      "",
      "Steps:",
      "  1) compose: inject brief.layout.slots into the scene mother ({{slot:*}})",
      "  2) lint: validate SceneSpec v0.1",
      "  3) render: output static SVG (no runtime JS required)",
    ].join("\n")
  );
}

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function main() {
  const brief = arg("--brief");
  const scene = arg("--scene");
  const outScene = arg("--outScene");
  const outSvg = arg("--outSvg");

  if (!brief || !scene || !outScene || !outSvg) {
    usage();
    process.exit(2);
  }

  const root = process.cwd();
  const composeTool = path.join(root, "front-end-effect/tools/compose-scene.mjs");
  const injectMotifsTool = path.join(root, "front-end-effect/tools/inject-motifs.mjs");
  const lintTool = path.join(root, "front-end-effect/tools/scene-spec-lint.mjs");
  const visualLintTool = path.join(root, "front-end-effect/tools/scene-visual-lint.mjs");
  const renderTool = path.join(root, "front-end-effect/tools/render-scene-svg.mjs");

  run("node", [composeTool, "--brief", brief, "--scene", scene, "--out", outScene]);
  run("node", [injectMotifsTool, "--scene", outScene, "--out", outScene]);
  run("node", [lintTool, outScene]);
  run("node", [visualLintTool, outScene]);
  run("node", [renderTool, outScene, outSvg]);
}

main();
