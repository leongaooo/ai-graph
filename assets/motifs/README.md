# Motifs (symbols library)

Motif = a reusable SVG `<symbol>` (people / objects / backgrounds) referenced via `<use>`.

- Index: `front-end-effect/assets/motifs/motifs.manifest.json`
- Third-party notices: `front-end-effect/assets/motifs/THIRD_PARTY_NOTICES.md`

## Use in SceneSpec

1) In scene JSON:

- `defs.motifs`: `["handshake_handdrawn", "opeeps_effigy_explaining", "contract_handdrawn"]`
- Nodes must set `attrs["data-role"]`:
  - `decor`: backgrounds / textures / grids / orbs
  - `subject`: people
  - `prop`: objects (card/contract/pin/van)
  - `text`: text layers
- For `decor`, also set `attrs["data-decor-type"]`:
  - `texture`: full-canvas bg/texture
  - `shadow`: soft ground shadows / glows (behind foreground)
  - `accent`: corner doodles / sparkles (must not overlap foreground)

## Decor framework (hand-drawn)

Keep decor “artful” but calm:

- Prefer reusable doodle motifs over ad-hoc grids: `doodle_*` (sparkles / corner scribble / swoosh / dotfield)
- If a tiny shape must look “clean and recognizable” (star/badge/laptop), prefer `lucide_*` icon motifs over hand-made paths.
- Also available: paper/pencil decor motifs: `paper_frame`, `pencil_shade_bl`, `pencil_shade_tr`, `tape_strip`
- Budget: max ~10 non-full-canvas decor nodes (enforced by `scene-visual-lint`)
- Layering: all `decor` must be before `text` (enforced)
- Readability: `accent` decor must not overlap text/people/props (enforced)

## People motifs (roles/age)

People are reusable `<symbol>` busts (Open Peeps derived). Use them as `data-role="subject"` and keep faces subtle (Smile, not exaggerated).

- Examples: `opeeps_effigy_manager_blazer`, `opeeps_effigy_dispatcher_computer`, `opeeps_effigy_fieldtech_jacket`, `opeeps_effigy_elder_turtleneck`
- Variants:
  - Skin: `*_light` / default (medium) / `*_deep`
  - Facing: `*_flip` (mirrored)

### Hand-drawn variants

- Use `*_handdrawn` motif ids (e.g. `handshake_handdrawn`, `contract_handdrawn`) for sketchy strokes.

2) Render (inject + lint + svg):

- `node front-end-effect/tools/pipeline.mjs --brief <brief.json> --scene <scene-mother.json> --outScene <scene.json> --outSvg <render.svg>`
