# AI Graph — 插画生成工具阶段性总结

## 我们现在做到什么程度
我们已经搭好一条 **用户文案/Brief → SceneSpec(JSON) → 静态 SVG** 的可复用流水线，能够为软件产品和网页生成“人物 + 物品 + 背景装饰”的场景插画。下一阶段的验收重点是视觉完成度、可复用性、移动适配和外部开发者能否快速成功。

## 核心产物（可复用工具链）
- `scene-spec.schema.json`：SceneSpec v0.1（画布、节点、defs、动画占位等）
- `brief-spec.schema.json`：BriefSpec v0.1（文案槽位、意图、风格提示等）
- `tools/pipeline.mjs`：一键流水线（compose → inject motifs → lint → visual-lint → render）
- `tools/compose-scene.mjs`：把 `{{slot:*}}` 文案槽注入 scene mother
- `tools/inject-motifs.mjs`：把用到的 motif `<symbol>` 注入 `scene.defs.raw`（静态 SVG，无运行时 JS）
- `tools/render-scene-svg.mjs`：SceneSpec → 纯静态 SVG（按图层输出）
- `tools/scene-spec-lint.mjs`：结构校验（schema + 基础约束）
- `tools/scene-visual-lint.mjs`：视觉门禁（防“压人/压文字/装饰越界/半个头”等）
- `tools/scene-auto-fill.mjs`：自动填充（基于 domain/style 的“人物/物品/装饰”选择 + 候选布局打分）

## 图层与“绝不压人”的渲染规则
- 统一图层：`bg_base → bg → fg → text`
- 人物：`data-role="subject"`（强制 `fg`）
- 装饰：`data-role="decor"`（只能 `bg_base/bg`，永远不在人物/文字之上）
- 物品：`data-role="prop"`（默认 `bg/fg`）
- 容器面板（允许人物叠压用于构图）：`data-role="prop"` + `data-prop-kind="container"` + `data-layer="bg"`

## 素材库与可识别图形机制
- motifs 统一用 `<symbol id="motif_*">` 注入，避免运行时拼 SVG 造成空白/不可控
- `assets/motifs/motifs.manifest.json`：motif 清单（id → svg defs + symbolId）
- `assets/motifs/motifs.meta.json`：motif 元数据（domainTags/styleTags/category/sizeHint），用于自动选择与约束
- 人物：`people-opeeps.defs.svg`（带肤色/方向变体）
- 图标：`icons-lucide.defs.svg`（增强“像真实世界”的可读性）

## 当前能力边界（需要继续打磨的点）
- auto-fill 的“构图美感”仍在演进：已从随机散点 → 结构化锚点布局，但仍需更强的主体比例、视觉密度、节奏、材质统一和记忆点规则
- 物品类型与场景语义覆盖不完整：payments/portal/booking 进展较好，dispatch/payroll 等 domain 仍需补齐 motifs/meta 与布局模板
- 目前主要输出静态插画；动画建议仍以“前端动效层（CSS/JS）”驱动为主（SVG 内部动画可选，但需单独规范）

## 下一阶段建议
- 增加“版式模板”而非仅靠打分：为每个 domain 提供 2–3 种成熟构图（偏 Framer、偏手绘、偏 glow）
- 引入更严格的“装饰背景容器”：背景装饰只允许在 panel 背后或画布边缘出现，默认不进入内容区
- 扩充“真实世界物品”库：电脑/手机/卡片/收据/地图/工单/工具箱/车辆等，并给出可控的摆放槽位

## 素材清理策略（本次选择）
- 保留：`assets/` 下的 motifs + scenes（属于“可复用素材库/模板库”）
- 版本管理：`examples/launch/` 与 `examples/showcase/` 保存精选示例的 Brief，`showcase/illustrations/` 保存工作台交付的 SVG 和备用配色 Brief。临时渲染输出放在 `out/`。
