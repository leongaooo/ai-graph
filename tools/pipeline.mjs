import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function usage() {
  console.log(
    [
      "Scene pipeline (Brief + Scene mother → SceneSpec → render.svg)",
      "",
      "Usage:",
      "  node tools/pipeline.mjs --brief <brief.json> --scene <scene-mother.json> --outScene <scene.json> --outSvg <render.svg>",
      "",
      "Steps:",
      "  1) compose: inject brief.layout.slots into the scene mother ({{slot:*}})",
      "  2) inject motifs",
      "  3) lint: validate structure and visual constraints",
      "  4) render: output static SVG",
    ].join("\n")
  );
}

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function run(script, args) {
  const tool = fileURLToPath(new URL(script, import.meta.url));
  const res = spawnSync(process.execPath, [tool, ...args], { stdio: "inherit" });
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

  run("./compose-scene.mjs", ["--brief", brief, "--scene", scene, "--out", outScene]);
  run("./inject-motifs.mjs", ["--scene", outScene, "--out", outScene]);
  run("./scene-spec-lint.mjs", [outScene]);
  run("./scene-visual-lint.mjs", [outScene]);
  run("./render-scene-svg.mjs", [outScene, outSvg]);
}

main();
