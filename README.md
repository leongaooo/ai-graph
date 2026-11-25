# ai-graph

## AI-native：给 Agent 调用的证据约束视觉投影运行时

当前主线不是“让 AI 看图”，而是让 AI 在一个可校验、可查询、可复现的结构化场景上工作。

```text
来源（source + locator + sha256）
  → 语义（实体 / 关系 / 主张 / 指标 / unknown / inference）
  → 视图（sequence / state + 逻辑元素 + acceptance）
  → MCP：visual_validate → visual_compile → visual_query
  → SceneArtifact / evidence index / semantic report / 确定性 SVG
```

- **事实源是 spec，不是 SVG**：SVG 只是同一份语义数据给人看的投影。
- **AI 不猜坐标**：布局由布局器生成；AI 只改语义和视图约束。
- **每条 supported 项必须能回指来源行号与文本哈希**；没有证据的内容只能标 `inferred` 或 `unknown`。
- **失败返回结构化诊断**：`path / ref / rule / expected / actual / repairHint`，AI 按诊断修 spec，不靠猜。
- **三个 MCP 工具**：`visual_validate`、`visual_compile`、`visual_query`；MCP 层不包含布局规则。
- **先本地、后集成**：runtime 与三个 demo 全部跑通后，再接入 `next-blog` 的 `/projects/ai-graph`。

快速验证：

```bash
cd /Users/gaolimin/GitHub/ai-graph
npm run runtime:test        # 15/15，含多来源 validate/compile
npm run eval:run            # 32/32 fixture；29/29 两次调用内修复
npm run mcp:start

# 四个真实 demo
node tools/runtime/cli.mjs validate demos/pr-change/spec.json
node tools/runtime/cli.mjs compile demos/pr-change/spec.json out/demos/pr-change both

node tools/runtime/cli.mjs validate demos/incident-state/spec.json
node demos/incident-state/verify-downgrade.mjs

node tools/runtime/cli.mjs validate demos/research-claims/spec.json
node demos/research-claims/verify-stale.mjs
```

文档：

- 协议：[`docs/visual-spec-v0.2.md`](docs/visual-spec-v0.2.md)
- MCP：[`docs/mcp-runtime.md`](docs/mcp-runtime.md)
- 整体计划：[`docs/ai-native-runtime-plan.md`](docs/ai-native-runtime-plan.md)
- 四个 demo：[`demos/README.md`](demos/README.md)
- 32 eval：[`eval/README.md`](eval/README.md)
- JSON Schema：[`schema/visual-spec.v0.2.schema.json`](schema/visual-spec.v0.2.schema.json)

### 当前状态（2026-11-24）

- [x] v0.2 四区块协议与 v0.1 归一化
- [x] `visual_validate` / `visual_compile` / `visual_query`
- [x] stdio MCP server
- [x] 多来源 `sources[]`：逐来源 sha256 / locator textHash；compile 使用多来源预校验报告
- [x] 两份真实文章样本 validate 12/12；compile hash 与既有构建一致
- [x] PR 变更解释 demo：真实 commit `94c3a63`，9 证据、19 可见元素
- [x] 事故状态投影 demo：本机真实中断日志 + runbook，14 证据、29 可见元素；删除恢复日志会触发构建失败
- [x] 研究主张图 demo：三篇独立原文、18 证据、27 可见元素；来源更新后旧 claim 失效
- [x] 32 个 eval fixture：32/32 通过；无来源 supported 4/4 捕获；stale 4/4 拒绝；确定性修复 29/29
- [ ] 全部完成后接入 `next-blog`

---

## 基线：AI Graph 2.0 解释图引擎

以下内容保留为现有引擎与两条真实样本的基线；新方向在其上增加 AI 调用面，不废弃已有产物。

AI Graph 2.0 阶段的主线不是“让插画更好看”，而是“让图承担信息职责”。

```text
Brief → VisualSpec（实体/关系/证据/unknown）
      → 语义门禁（来源哈希、单位、可见回指）
      → 图法选择（当前 sequence / state）
      → 确定性 SVG（1200×675 桌面 + 390×860 竖版）
```

- **主产物是 VisualSpec，不是 SVG**：SVG 只是同一份语义数据的一个视图。
- **AI 负责理解与选图法，不负责猜坐标**：坐标由布局器稳定生成。
- **每条 supported 关系必须能回指文章行号与文本哈希**；没有证据的内容只能标 `inferred` 或 `unknown`，不能画成事实。
- **门禁不通过就不构建**：证据哈希、单位来源、可见元素回指、unknown 线型、验收问题映射、图法支持、state 布局引用，12 条任一失败直接退出。
- **同一份 spec 同时出桌面与移动两套图**：移动版不是把桌面图缩小，而是重新排版。
- **页面入口**：第一条 `sequence` 与第二条 `state` 切片都已接入 `leongao.me/projects/ai-graph`；runtime 的新集成等三个 demo 与 eval 全部完成后再做；旧 01/02/03 场景降级为“样式实验”。

### 第一条纵向切片（sequence）

样本是真实文章《把一台 2C2G 的云服务器配成能对外交付的 Demo 出口》：

```bash
cd /Users/gaolimin/GitHub/ai-graph
node tools/visual-spec-lint.mjs art/agent-delivery-gate.visual.json
node tools/build-explainer.mjs art/agent-delivery-gate.visual.json out
```

产物：

- `art/agent-delivery-gate.visual.json`：12 条证据、10 个实体、10 条关系、6 条主张、6 个指标、2 个 unknown、1 条 inference。
- `out/agent-delivery-gate.svg`：1200×675，五个节点的主路径 + tokens 结果 + 代理反例分支。
- `out/agent-delivery-gate.mobile.svg`：390×860 竖版。
- `out/agent-delivery-gate.semantic-report.json`：语义门禁报告，12 项全部通过。
- `out/agent-delivery-gate.scene.json` / `.mobile.scene.json`：每个可见元素的 ref、bbox、status。

验证：

- 把任意一条 evidence 的 `textHash` 改错，`visual-spec-lint.mjs` 退出码为 1，报 `supportedEvidence` 失败。
- 同参两次构建，桌面 SVG SHA-1 `36e384c361264a07b8b95072d9309c87733ae0b7`，移动 SVG SHA-1 `721ede46ab7eb5c04fca3157c34665ad36d1b3af`，两次一致。
- 桌面/移动 `textOverflow: 0`。

### 第二条纵向切片（state）

样本是真实文章《自动化设备监控平台：从状态可见到异常可控》。这条切片检验的不是“再画一张图”，而是“换一种图法时，布局器只读 spec，不读文章、不猜坐标”。

```bash
cd /Users/gaolimin/GitHub/ai-graph
node tools/visual-spec-lint.mjs art/automation-equipment-state.visual.json
node tools/build-explainer.mjs art/automation-equipment-state.visual.json out
```

产物：

- `art/automation-equipment-state.visual.json`：14 条证据、27 个实体、9 条关系、6 条主张、0 个指标、3 个 unknown、2 条 inference。
- `out/automation-equipment-state.svg`：1200×675，四列状态板（在线 / 运行 / 业务 / 风险）+ 异常到复盘闭环 + 边缘网关 + 未知项。
- `out/automation-equipment-state.mobile.svg`：390×860，2×2 状态板 + 单列闭环。
- `out/automation-equipment-state.semantic-report.json`：12/12 通过。

验证：

- 同参两次构建，桌面 SVG SHA-1 `fffc6aa607e6943d061eb72045f1eb33c309135b`，移动 SVG SHA-1 `77e51e57637f3f2a5b4a4385e6f2b4c4cd4b5061`，两次一致。
- 桌面/移动 `textOverflow: 0`；移动 `maxContentY: 840.57 / 860`。
- 把 `view.grammar` 改成 `hierarchy`，lint 退出 1，`grammarSupported` 失败。
- 从 `view.elements` 移除 `state-fault`，lint 退出 1，`stateLayoutRefs` 报“缺少可见元素”。

### 当前边界

- 已有两个真实样本、两种图法；但 `sequence` 仍是第一篇文章的固定坐标模板，`state` 才是第一个数据驱动的通用布局。
- 还没有第三样本证明 `state` 不是只为这篇文章写的；也还没有 `hierarchy` / `comparison`。
- `docs/quickstart.md` 已有初稿，但还没有外部开发者 30 分钟实测记录。
- 还没有真实读者理解测试；当前只能证明结构成立，不能证明读者理解变好。
- 不把当前产物描述成商业可用或行业可用。

字段、status 语义和门禁规则见 [`docs/visual-spec.md`](docs/visual-spec.md)；30 分钟上手见 [`docs/quickstart.md`](docs/quickstart.md)。

### 下一步（AI-native runtime）

1. 按 [`docs/ai-native-runtime-plan.md`](docs/ai-native-runtime-plan.md) 先做代码 Agent 的 PR 变更解释 demo，用真实 diff / 测试 / 文档；不编造代码变更。
2. 再做事故响应 Agent 的状态投影 demo；没有真实日志 + runbook 就暂停，不用假日志。
3. 复用现有两篇文章 + 第三篇真实文章，做研究 Agent 的主张与证据图。
4. 三个 demo 共用同一套 MCP 工具；之后补 30 个 eval fixture 与 Agent 自修复报告。
5. 全部完成后再接入 `/projects/ai-graph`；在此之前不改线上页面。

现有两条切片仍作为引擎基线保留，不删除。外部开发者实测与读者理解测试暂时让位于 runtime 开发；没有真实反馈前不写“商业可用 / 行业可用”。

---

## 以下为旧 SceneSpec 场景插画路径（legacy）

> 2026-11-23 起，以下内容保留为样式实验与历史实现，不再作为 AI Graph 的主成果主张。旧路径证明的是程序化渲染、确定性构建和视觉约束，不是信息理解。

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

