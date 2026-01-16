# ai-graph

一个面向 **AI 生成页面效果** 的“图文场景插画”工具箱：把用户文案转成 **可控、可复用、可验证** 的 SVG 场景插画（人物 + 物品 + 背景装饰），再交给任意前端技术栈去做滚动进入、hover、打字机、动效编排。

如果你在做落地页/产品页时，觉得“只有文字和卡片不够惊艳”，但又不希望引入重量级图形引擎、也不想让 AI 随机画出不可控的 SVG——这个仓库提供了一条中间路径：**结构化指令 + 素材库 + 质量门禁 + 稳定渲染**。

## 这仓库能为 AI 生成页面带来什么贡献

- **Prompt → SceneSpec(JSON) → Static SVG**：把“插画级场景”变成可版本化的结构化数据，避免纯自然语言生成的不可控。
- **层级正确**：统一图层 `bg_base → bg → fg → text`，并通过视觉门禁保证“装饰永远不会压在人物/文字上”。
- **像真实世界**：内置人物（含肤色/方向变体）+ 可识别物品 + 线性 icon（增强可读性与现代感）。
- **可跨技术栈**：输出是标准 SVG（静态文件），React/Vue/Svelte/原生 HTML 都能直接用；动效可由页面层自由实现。
- **可回归、可扩展**：同一个 Brief/seed 可重复生成；新增场景只需扩展 motifs 与 scene 模板，不必推倒重来。

## 核心概念

- **BriefSpec**：面向“文案 + 意图 + 风格”的输入（带 slot）。
- **SceneSpec**：面向“画布 + 节点 + 图层 + defs”的插画结构（可渲染/可 lint）。
- **Motifs**：以 `<symbol id="motif_*">` 管理的可复用素材（人物/物品/装饰）。

## 项目结构

```
ai-graph/
  assets/
    motifs/                 # 人物/物品/装饰素材（defs + manifest + meta）
    scenes/                 # 可复用场景模板（SceneSpec mother）
  tools/
    pipeline.mjs            # 一键流水线：compose → inject → lint → render
    compose-scene.mjs       # 文案 slot 注入
    inject-motifs.mjs       # 只注入用到的 <symbol>（静态 SVG，体积可控）
    scene-spec-lint.mjs     # 结构校验
    scene-visual-lint.mjs   # 视觉门禁（防压人/压字/半个头/过度装饰）
    render-scene-svg.mjs    # SceneSpec → SVG（按图层输出）
    scene-auto-fill.mjs     # 自动填充：domain/style 选择 + 候选布局打分
  examples/                 # 生成产物输出目录（默认清空，仅保留 .gitkeep）
```

## 快速上手（本地）

要求：Node.js 18+

1) 用已有 scene 模板渲染一个 SVG（Brief + scene mother → render）

```bash
node ai-graph/tools/pipeline.mjs \
  --brief ai-graph/examples/your.brief.json \
  --scene ai-graph/assets/scenes/stage-payments-stripe-glass.scene.json \
  --outScene ai-graph/examples/out.scene.json \
  --outSvg ai-graph/examples/out.render.svg
```

2) 让工具“自动填充”一个场景（先产 mother，再走 pipeline）

```bash
node ai-graph/tools/scene-auto-fill.mjs \
  --brief ai-graph/examples/your.brief.json \
  --out ai-graph/examples/auto.scene.mother.json \
  --domain payments \
  --style glass \
  --seed 1 \
  --candidates 120

node ai-graph/tools/pipeline.mjs \
  --brief ai-graph/examples/your.brief.json \
  --scene ai-graph/examples/auto.scene.mother.json \
  --outScene ai-graph/examples/auto.scene.json \
  --outSvg ai-graph/examples/auto.render.svg
```

## “不混乱”的设计约束（为什么它能稳定）

这套系统不是靠“让 AI 自己画得更像”，而是靠 **约束 + 检测**：

- **渲染层级强制**：背景/装饰永远在下，人物/内容永远在上。
- **视觉 lint 作为质量门禁**：重叠、靠近、裁切、过量装饰等问题直接 fail，让输出保持可用。
- **静态 SVG 输出**：不依赖运行时注入，不会出现“本地打开空白/渲染不一致”。
- **素材库复用**：用可识别的图形元素（人物/物品/icon）替代“随机 path 拼装”的生硬感。

## 文档

- `ai-graph/ai-graph.md`：仓库能力与规范说明
- `ai-graph/user-prompt-to-svg-animate.md`：如何把用户需求变成可控的插画/动效指令
- `ai-graph/STAGE_SUMMARY.md`：阶段性总结与下一阶段建议

## 未来畅想（Roadmap）

我希望把它做成 AI 生成页面时的“图形能力底座”，让“每个模块都可以选择：流程图 / 结构化图 / 插画级大图 + 文案”：

- **版式模板库**：为每个 domain（Payments/Dispatch/Payroll/Portal/Booking…）提供多种成熟构图（Framer glass / 手绘手帐 / glow）。
- **更强的布局引擎**：从“打分选最优”升级为“规则驱动 + 约束求解”，支持网格对齐、密度控制、留白节奏。
- **语义到素材的映射**：把“用户文案理解”落到稳定的 domainTags/intentTags，并自动补齐真实世界物品（合同/发票/地图/工具/设备）。
- **动效规范化**：输出 SVG 的同时输出动效 DSL（进入、hover、微漂移、骨架生成中），由任意前端框架落地。
- **更多渲染后端**：SVG 之外，探索 Canvas/WebGL/Lottie 的可选输出，但仍保持同一份 SceneSpec 作为“单一真相源”。

---

如果你想把它用在自己的落地页生成器里：你只需要让 AI 产出 BriefSpec + Scene mother（或直接用 auto-fill），然后把最终 SVG 当作组件/图片插入页面即可。

