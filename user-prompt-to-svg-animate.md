# Prompt → SVG Scene (SceneSpec)

把文案变成可校验的 SVG 场景与动画：`brief.json`（方向）→ `scene.json`（确定性产物，可渲染/可动画/可 lint）。

## Trigger（复制到需求开头）

按 `front-end-effect/user-prompt-to-svg-animate.md` 执行：先出 `brief.json`（`front-end-effect/brief-spec.schema.json`，并选 `layout.template` + `sceneId` 来自 `front-end-effect/assets/scenes/scenes.manifest.json`），再跑 `node front-end-effect/tools/pipeline.mjs --brief <brief.json> --scene <scene-mother.json> --outScene <scene.json> --outSvg <render.svg>`（含 slots 注入 / motifs 注入 / lint / 静态渲染）；文案只能来自 `brief.json.layout.slots`；动画只允许 `opacity/transform/strokeDashoffset/strokeDasharray`；必须提供 `a11y.reducedMotion`。

## How it works

- 选模板（信息组织）：`front-end-effect/templates/templates.manifest.json`
- 选场景母版（视觉风格）：`front-end-effect/assets/scenes/scenes.manifest.json`（含 `{{slot:...}}`）
- 或用“智能填充”生成场景母版（推荐）：`node front-end-effect/tools/scene-auto-fill.mjs --brief <brief.json> --out <scene-mother.json>`（会按语意选 `glass/paper/glow` + `payments/portal/booking`，并输出符合分层与门禁的 SceneSpec 母版）
- 若需要“更人/更场景化”：用 `scene.defs.motifs: string[]` 声明要用的 motifs（`front-end-effect/assets/motifs/motifs.manifest.json`），节点用 `<use href="#motif_*">` 复用（人物=Open Peeps 派生，物品/背景=自制）。
- 风格选择：优先用 `*_handdrawn` motifs 做“手绘插画感”（再用背景的轻纹理/涂鸦线提升质感），避免重新画复杂 path。
- 小元素优先复用现成 icon motifs（例如 `lucide_*`），避免“临时手搓路径”导致观感生硬。
- 统一走 pipeline（避免运行时注入导致“空白”）：`front-end-effect/tools/pipeline.mjs`
- 质量门禁：scene 必须标注 `node.attrs["data-role"]`（`decor/subject/prop/text`），decor 还应标注 `node.attrs["data-decor-type"]`（`texture/shadow/accent`）；pipeline 会跑 `front-end-effect/tools/scene-visual-lint.mjs`，若装饰遮挡前景/层级错误则直接失败（不输出 SVG）。

## Decor 机制（手绘，不乱）

- 装饰优先用 `doodle_*` motifs（`front-end-effect/assets/motifs/decor-handdrawn.defs.svg`），不要靠满屏网格当“装饰”。
- 也支持“纸张/铅笔质感”装饰（`front-end-effect/assets/motifs/decor-paper.defs.svg`）：`paper_frame` / `pencil_shade_*` / `tape_strip`。
- `data-decor-type`：`texture`（满屏纹理/底色）、`shadow`（地影/柔光）、`accent`（角落点缀）；`accent` 必须避开人物/物品/文本，宁可删掉也不要覆盖。
- 装饰预算：非满屏 decor 节点 ≤ 10；单个装饰不透明度建议 ≤ 0.55；只放在留白区。
- 文本保护：任何 `decor` 都不能重叠文本块（pipeline 硬失败），宁可少、不渲染，也不要乱。
- Framer workshop + 手帐涂鸦风格：accent 只放边角（`lucide_sparkles/lucide_star` + `doodle_*` 低不透明度），不要把“点缀”压在人物上。
- 推荐分层（渲染器会按层输出）：`bg_base`（底色/纹理/柔光）→ `bg`（背景容器：大色块/贴纸/物品底板）→ `fg`（人物/前景物品）→ `text`。
- `data-layer`（可选）：`bg_base | bg | fg | text`；不写则按 `data-role + data-decor-type` 推断。
- 安全边距：`data-decor-type="accent"` 必须与任何人物/前景物品保持足够距离（工具会按 bbox+padding 判定并硬失败），避免“贴着头部”这种观感问题。

## 三种背景容器（按提示词语意匹配）

只在 `bg` 层做“容器”，人物永远在 `fg`：

- `glass`（Framer workshop 气质默认）：关键词 `premium / saas / workshop / framer / modern / minimal / glass / blur` → `panel`（半透明描边+柔阴影）+ 少量 `lucide_*` 小贴纸
- `paper`（手帐涂鸦）：关键词 `handwritten / journal / doodle / paper / sticky / notebook / sketch` → `paper_frame` / `tape_strip` + `doodle_*` 低不透明度
- `glow`（AI/未来感）：关键词 `ai / neon / gradient / glow / orbs / electric` → `bg_base` 的柔光渐变（`f_soft`）+ `bg` 的少量光斑卡片

## 人物机制（多样但统一）

- 人物用 `opeeps_effigy_*` motifs（`front-end-effect/assets/motifs/people-opeeps.defs.svg`），用 `<use>` 放置；`data-role="subject"`。
- 表情：只用克制微笑（`Smile`），避免 `BigSmile`/夸张表情；保证“可信、温和”。
- 多样性：至少覆盖 1 个年长形象 + 1 个眼镜/职业属性（computer/paper/coffee/jacket 等）。
- 肤色：同一页面至少混用 2 个肤色（`*_light` / 默认（medium）/ `*_deep`），避免纯黑，深色用偏棕色系。
- 朝向：混用 `*_flip`（镜像）避免“脸都朝一个方向”。
- 若“背景纹理/涂鸦线在人物轮廓内部透出来”（看起来像装饰压到人）：在人物前面加 `clean plate`（`data-role="prop"` 的模糊深色椭圆/圆角矩形，fill=bg，放在 subjects 之前）来遮掉背景装饰，再叠人物。
- `clean plate` 建议放到 `data-layer="bg"`（属于“背景容器”的一部分），这样既能遮纹理，又不会打断前景物品编排。
- 物品不压人：任何会触发“贴头/压身”的物品都放进 `data-layer="bg"`（容器里），只有“手持/前景必需”物品才放 `fg`，且不得与人物 bbox 重叠（工具硬失败）。

## Default（未提供则采用）

- 画布：`980x320`（hero）/ `960x540`（section）
- 动画：900–1800ms；循环仅装饰；`prefers-reduced-motion` → `fade-only`
- 预算：`maxNodes=120`
