# Front-end Effect — 阶段性总结（SVG 场景插画）

## 我们现在做到什么程度
我们已经搭好一条 **用户文案/Brief → SceneSpec(JSON) → 静态 SVG** 的可复用流水线，具备“人物 + 物品 + 背景装饰”的场景表达能力，并且用质量门禁来避免常见的“装饰压人/压文字/画面混乱”等问题。

## 核心产物（可复用工具链）
- `front-end-effect/scene-spec.schema.json`：SceneSpec v0.1（画布、节点、defs、动画占位等）
- `front-end-effect/brief-spec.schema.json`：BriefSpec v0.1（文案槽位、意图、风格提示等）
- `front-end-effect/tools/pipeline.mjs`：一键流水线（compose → inject motifs → lint → visual-lint → render）
- `front-end-effect/tools/compose-scene.mjs`：把 `{{slot:*}}` 文案槽注入 scene mother
- `front-end-effect/tools/inject-motifs.mjs`：把用到的 motif `<symbol>` 注入 `scene.defs.raw`（静态 SVG，无运行时 JS）
- `front-end-effect/tools/render-scene-svg.mjs`：SceneSpec → 纯静态 SVG（按图层输出）
- `front-end-effect/tools/scene-spec-lint.mjs`：结构校验（schema + 基础约束）
- `front-end-effect/tools/scene-visual-lint.mjs`：视觉门禁（防“压人/压文字/装饰越界/半个头”等）
- `front-end-effect/tools/scene-auto-fill.mjs`：自动填充（基于 domain/style 的“人物/物品/装饰”选择 + 候选布局打分）

## 图层与“绝不压人”的渲染规则
- 统一图层：`bg_base → bg → fg → text`
- 人物：`data-role="subject"`（强制 `fg`）
- 装饰：`data-role="decor"`（只能 `bg_base/bg`，永远不在人物/文字之上）
- 物品：`data-role="prop"`（默认 `bg/fg`）
- 容器面板（允许人物叠压用于构图）：`data-role="prop"` + `data-prop-kind="container"` + `data-layer="bg"`

## 素材库与可识别图形机制
- motifs 统一用 `<symbol id="motif_*">` 注入，避免运行时拼 SVG 造成空白/不可控
- `front-end-effect/assets/motifs/motifs.manifest.json`：motif 清单（id → svg defs + symbolId）
- `front-end-effect/assets/motifs/motifs.meta.json`：motif 元数据（domainTags/styleTags/category/sizeHint），用于自动选择与约束
- 人物：`people-opeeps.defs.svg`（带肤色/方向变体）
- 图标：`icons-lucide.defs.svg`（增强“像真实世界”的可读性）

## 当前能力边界（需要继续打磨的点）
- auto-fill 的“构图美感”仍在演进：已从随机散点 → 结构化锚点布局，但仍需更强的“视觉密度/节奏/对齐”规则
- 物品类型与场景语义覆盖不完整：payments/portal/booking 进展较好，dispatch/payroll 等 domain 仍需补齐 motifs/meta 与布局模板
- 目前主要输出静态插画；动画建议仍以“前端动效层（CSS/JS）”驱动为主（SVG 内部动画可选，但需单独规范）

## 下一阶段建议
- 增加“版式模板”而非仅靠打分：为每个 domain 提供 2–3 种成熟构图（偏 Framer、偏手绘、偏 glow）
- 引入更严格的“装饰背景容器”：背景装饰只允许在 panel 背后或画布边缘出现，默认不进入内容区
- 扩充“真实世界物品”库：电脑/手机/卡片/收据/地图/工单/工具箱/车辆等，并给出可控的摆放槽位

## 素材清理策略（本次选择）
- 保留：`front-end-effect/assets/` 下的 motifs + scenes（属于“可复用素材库/模板库”）
- 清空：`front-end-effect/examples/`（只用于生成物/演示产物，避免长期堆积）
