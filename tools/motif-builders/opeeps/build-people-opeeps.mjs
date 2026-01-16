import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ExplainingBody from "@opeepsfun/open-peeps/build/body/effigy/Explaining.js";
import TeeArmsCrossedBody from "@opeepsfun/open-peeps/build/body/effigy/TeeArmsCrossed.js";
import BlazerBlackTeeBody from "@opeepsfun/open-peeps/build/body/effigy/BlazerBlackTee.js";
import ButtonPocketShirtBody from "@opeepsfun/open-peeps/build/body/effigy/ButtonPocketShirt.js";
import CoffeeBody from "@opeepsfun/open-peeps/build/body/effigy/Coffee.js";
import ComputerBody from "@opeepsfun/open-peeps/build/body/effigy/Computer.js";
import DressBody from "@opeepsfun/open-peeps/build/body/effigy/Dress.js";
import HoodieBody from "@opeepsfun/open-peeps/build/body/effigy/Hoodie.js";
import JacketBody from "@opeepsfun/open-peeps/build/body/effigy/Jacket.js";
import PaperBody from "@opeepsfun/open-peeps/build/body/effigy/Paper.js";
import ShirtCoatBody from "@opeepsfun/open-peeps/build/body/effigy/ShirtCoat.js";
import TurtleneckBody from "@opeepsfun/open-peeps/build/body/effigy/Turtleneck.js";
import MediumTwoHead from "@opeepsfun/open-peeps/build/head/MediumTwo.js";
import BunTwoHead from "@opeepsfun/open-peeps/build/head/BunTwo.js";
import BeanieHead from "@opeepsfun/open-peeps/build/head/Beanie.js";
import GrayShortHead from "@opeepsfun/open-peeps/build/head/GrayShort.js";
import HijabHead from "@opeepsfun/open-peeps/build/head/Hijab.js";
import LongHairHead from "@opeepsfun/open-peeps/build/head/LongHair.js";
import NoHairThreeHead from "@opeepsfun/open-peeps/build/head/NoHairThree.js";
import TurbanHead from "@opeepsfun/open-peeps/build/head/Turban.js";
import SmileFace from "@opeepsfun/open-peeps/build/face/Smile.js";
import GlassesAccessory from "@opeepsfun/open-peeps/build/accessory/Glasses.js";
import GlassesFourAccessory from "@opeepsfun/open-peeps/build/accessory/GlassesFour.js";
import GlassesTwoAccessory from "@opeepsfun/open-peeps/build/accessory/GlassesTwo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontEndEffectRoot = path.resolve(__dirname, "../../..");

function headAdjustFor(headName) {
  // Mirrors a tiny subset of adjustments from the original Effigy component.
  switch (headName) {
    case "MediumTwo":
      return "translate(-20 0)";
    case "BunTwo":
      return "translate(-50 -90)";
    case "Beanie":
      return "translate(20 0)";
    case "GrayShort":
      return "translate(40 0)";
    case "Hijab":
      return "translate(50 20)";
    case "LongHair":
      return "translate(-50 0)";
    case "NoHairThree":
      return "translate(30 0)";
    case "Turban":
      return "translate(0 0)";
    default:
      return "translate(0 0)";
  }
}

const BASE_SKIN = { skinColor: "#D6A27C", outlineColor: "#2A1B16" };
const SKIN_TONES = [
  { key: "light", skinColor: "#F2D3BF", outlineColor: "#2A1B16" },
  { key: "deep", skinColor: "#8B5A3C", outlineColor: "#2A1B16" },
];

function svgToSymbol(svgMarkup, { symbolId }) {
  const openTagMatch = svgMarkup.match(/^<svg\b([^>]*)>/i);
  if (!openTagMatch) throw new Error("Expected <svg> root from Open Peeps render.");

  const viewBoxMatch = openTagMatch[1].match(/\bviewBox=(\"[^\"]+\"|'[^']+')/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1].slice(1, -1) : null;
  if (!viewBox) throw new Error("Open Peeps SVG missing viewBox.");

  const inner = svgMarkup
    .replace(/^<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();

  return { symbol: `<symbol id="${symbolId}" viewBox="${viewBox}">${inner}</symbol>`, viewBox };
}

function effigySvg(props) {
  const { Body, Head, Face, Accessory, headAdjust = "translate(0 0)" } = props;
  const { skinColor, outlineColor } = props;
  // Expand the original Open Peeps Effigy viewBox upward to avoid “half head” cropping
  // when different heads/hair (beanie/bun/hijab/turban) are used.
  const viewBox = "184.21621621621625 120.7874999999999 940.2702702702704 1220.5875";
  return renderToStaticMarkup(
    React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox,
        overflow: "visible",
      },
      React.createElement(
        "g",
        { id: "Bust" },
        React.createElement(
          "g",
          { id: "Body", transform: "translate(147, 639) scale(1 1)" },
          React.createElement(Body, { skinColor, outlineColor }),
        ),
        React.createElement(
          "g",
          { id: "Hair", transform: `translate(342, 190) scale(1 1) ${headAdjust}`.trim() },
          React.createElement(Head, { outlineColor }),
        ),
        React.createElement(
          "g",
          { id: "Face", transform: "translate(531, 366) scale(1 1)" },
          React.createElement(Face, { outlineColor }),
        ),
        Accessory
          ? React.createElement(
              "g",
              { id: "Accessories", transform: "translate(419, 421) scale(1 1)" },
              React.createElement(Accessory, { outlineColor }),
            )
          : null,
      ),
    ),
  );
}

function parseViewBox(vb) {
  const parts = vb.trim().split(/\s+/).map((x) => Number.parseFloat(x));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minX, minY, width, height] = parts;
  return { minX, minY, width, height };
}

function makeFlipSymbol({ baseId, viewBox }) {
  const vb = parseViewBox(viewBox);
  if (!vb) throw new Error(`Invalid viewBox: ${viewBox}`);
  const tx = 2 * vb.minX + vb.width;
  return `<symbol id="${baseId}_flip" viewBox="${viewBox}"><g transform="translate(${tx} 0) scale(-1 1)"><use href="#${baseId}" /></g></symbol>`;
}

function main() {
  const outPath =
    process.argv[2] ||
    path.resolve(frontEndEffectRoot, "assets/motifs/people-opeeps.defs.svg");

  const roles = [
    {
      id: "opeeps_effigy_explaining",
      props: {
        Body: ExplainingBody,
        Head: MediumTwoHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("MediumTwo"),
      },
    },
    {
      id: "opeeps_effigy_arms_crossed",
      props: {
        Body: TeeArmsCrossedBody,
        Head: BunTwoHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("BunTwo"),
      },
    },
    {
      id: "opeeps_effigy_manager_blazer",
      props: {
        Body: BlazerBlackTeeBody,
        Head: NoHairThreeHead,
        Face: SmileFace,
        Accessory: GlassesAccessory,
        headAdjust: headAdjustFor("NoHairThree"),
      },
    },
    {
      id: "opeeps_effigy_dispatcher_computer",
      props: {
        Body: ComputerBody,
        Head: MediumTwoHead,
        Face: SmileFace,
        Accessory: GlassesTwoAccessory,
        headAdjust: headAdjustFor("MediumTwo"),
      },
    },
    {
      id: "opeeps_effigy_fieldtech_jacket",
      props: {
        Body: JacketBody,
        Head: BeanieHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("Beanie"),
      },
    },
    {
      id: "opeeps_effigy_support_coffee",
      props: {
        Body: CoffeeBody,
        Head: LongHairHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("LongHair"),
      },
    },
    {
      id: "opeeps_effigy_elder_turtleneck",
      props: {
        Body: TurtleneckBody,
        Head: GrayShortHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("GrayShort"),
      },
    },
    {
      id: "opeeps_effigy_ops_shirtcoat",
      props: {
        Body: ShirtCoatBody,
        Head: HijabHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("Hijab"),
      },
    },
    {
      id: "opeeps_effigy_finance_paper",
      props: {
        Body: PaperBody,
        Head: TurbanHead,
        Face: SmileFace,
        Accessory: GlassesFourAccessory,
        headAdjust: headAdjustFor("Turban"),
      },
    },
    {
      id: "opeeps_effigy_admin_button_pocket",
      props: {
        Body: ButtonPocketShirtBody,
        Head: MediumTwoHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("MediumTwo"),
      },
    },
    {
      id: "opeeps_effigy_builder_hoodie",
      props: {
        Body: HoodieBody,
        Head: BeanieHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("Beanie"),
      },
    },
    {
      id: "opeeps_effigy_sales_dress",
      props: {
        Body: DressBody,
        Head: BunTwoHead,
        Face: SmileFace,
        headAdjust: headAdjustFor("BunTwo"),
      },
    },
  ];

  const symbols = [];
  for (const role of roles) {
    {
      const baseId = `motif_${role.id}`;
      const svg = effigySvg({ ...role.props, ...BASE_SKIN });
      const { symbol, viewBox } = svgToSymbol(svg, { symbolId: baseId });
      symbols.push(symbol);
      symbols.push(makeFlipSymbol({ baseId, viewBox }));
    }
    for (const skin of SKIN_TONES) {
      const baseId = `motif_${role.id}_${skin.key}`;
      const svg = effigySvg({ ...role.props, ...skin });
      const { symbol, viewBox } = svgToSymbol(svg, { symbolId: baseId });
      symbols.push(symbol);
      symbols.push(makeFlipSymbol({ baseId, viewBox }));
    }
  }

  const header = [
    `<!--`,
    `  Source: @opeepsfun/open-peeps (MIT)`,
    `  Builder: front-end-effect/tools/motif-builders/opeeps/build-people-opeeps.mjs`,
    `  Notes: Generates multiple skin tones + flipped variants (faces remain subtle).`,
    `-->`,
  ].join("\n");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${header}\n${symbols.join("\n")}\n`, "utf8");
  console.log(`OK: wrote ${path.relative(process.cwd(), outPath)} (${symbols.length} symbols)`);
}

main();
