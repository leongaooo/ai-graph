# ai-graph

为软件界面、产品网站和开发文档生成可直接使用的 SVG 插画。用 Brief 描述场景、配色和文字，用 SceneSpec 定义主体与构图。AI Graph 负责组合素材、运行视觉检查并导出独立 SVG。

![发布场景：一枚火箭从代码编辑器升起](examples/launch/launch.svg)

## 本地场景库与工作台

用 Chrome 直接打开 [showcase/index.html](showcase/index.html)。这是可单独打开的离线页面，包含全部插画、样式和交互。工作台可以切换场景、每个场景的两套品牌色和桌面／手机预览。每次切换配色后，「下载 SVG」「Brief」和页面底部的复现命令都会指向当前版本。单独复制入口文件时，页面中的仓库文档链接仍需从原仓库位置打开。

| 网页用途 | 行业 | 场景与 SVG |
| --- | --- | --- |
| 首页首屏 | 开发工具 | [从代码到部署](showcase/illustrations/launch.svg) |
| 功能介绍 | 团队协作 | [一起审阅改动](showcase/illustrations/team-review.svg) |
| 应用状态 | 金融 | [付款成功](showcase/illustrations/finance-payment.svg) |
| 工作流 | 物流 | [包裹在路上](showcase/illustrations/logistics-route.svg) |
| 文档配图 | 教育 | [从标本读懂叶脉](showcase/illustrations/learning-field-guide.svg) |

安装 Node.js 18+ 后，在仓库根目录可重建全部变体，并从相同输入再构建一遍检查字节是否一致。

```bash
npm run showcase:build
npm run showcase:check
```

[场景配置](showcase/scenes.json) 关联了页面用途、源 Brief、SceneSpec 和第二套配色。页面结构维护在 [index.template.html](showcase/index.template.html)，构建后生成单文件入口。[验收记录](docs/illustration-showcase-review.md) 含实际页面截图和已知边界。

## 跑出第一张插画

在仓库根目录运行。需要 Node.js 18+，使用 Node 自带模块。

```bash
npm run illustrate:example
```

打开 `out/illustrations/launch.svg` 查看结果。将 SVG 放进自己项目的图片目录即可使用。

```html
<img src="/images/launch.svg" width="960" height="600" alt="火箭从代码编辑器升起">
```

复制 [部署插画 Brief](examples/launch/launch.brief.json)，修改 `layout.slots` 内的品牌色、标题和替代描述，再用自己的 Brief 生成。

```bash
npm run illustrate -- --brief my.brief.json \
  --scene assets/scenes/developer-launch.scene.json \
  --outScene out/my-illustration.scene.json --outSvg out/my-illustration.svg
```

[插画技能](.agents/skills/ai-graph-illustration/SKILL.md) 包含在其他网页中调用这条流程的步骤。[场景目录](assets/scenes/scenes.manifest.json) 内带 `showcase` 标识的条目是本地演示场景。其余条目供设计实验，部分会触发人物与物件重叠检查。[产品计划](docs/illustration-engine-plan.md) 记录风格、导出和上手验证的后续工作。

## 底层能力：给 Agent 调用的证据约束视觉运行时

AI Graph 的运行时让 Agent 在可校验、可查询、可复现的结构化场景上工作。

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

## 信息图与证据投影能力

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

## 插画工具组成

- [BriefSpec](brief-spec.schema.json) 包含内容目标、配色与文案插槽。
- [SceneSpec](scene-spec.schema.json) 定义画布、图层和图形元素。
- [素材库](assets/motifs/README.md) 提供可复用的 SVG 人物、物品和装饰。
- [场景流水线](tools/pipeline.mjs) 负责插槽替换、素材注入、结构和视觉检查，以及 SVG 输出。
- [自动填充](tools/scene-auto-fill.mjs) 为现有领域和风格生成候选布局。[场景阶段总结](STAGE_SUMMARY.md)
