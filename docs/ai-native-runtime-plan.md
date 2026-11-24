# AI Graph AI-native 运行时：整体开发计划

> 版本：2026-11-24 / v0.1 开发中
> 产品定义：给 AI Agent 调用的证据约束视觉投影运行时。AI 在结构化语义对象上推理；AI Graph 负责校验、投影、查询和修复提示。SVG 是给人看的投影，不是事实源。

## 0. 现在已经有什么

已落地（本次开发）：

- `VisualSpec v0.2` 归一化层：兼容现有扁平 v0.1，输出 `sources / semantic / view / intent` 四区块。
- `tools/runtime/validate.mjs`：复用 12 条语义门禁，返回 `path / ref / rule / repairHint`。
- `tools/runtime/compile.mjs`：调用现有构建器，产出 SVG、SceneArtifact、semantic report、evidence index、artifact hash。
- `tools/runtime/query.mjs`：`main_path / unknown_edges / node_evidence / reachable / overflow / element / search / acceptance`。
- `tools/mcp-server.mjs`：stdio JSON-RPC，暴露 `visual_validate / visual_compile / visual_query`。
- 两份真实文章样本已通过 validate + compile + query；桌面/移动 artifact hash 与既有构建一致。
- `scene.json` 增加 `viewElementId`，把逻辑元素 id 和绘制元素 id 分开，查询不再靠猜。
- 多来源 `sources[]`：`visual_validate` 逐来源校验 sha256 / locator textHash；`visual_compile` 用多来源预校验报告，不要求把多文档拼成单文件。

已完成：

- PR 变更解释 demo：真实 commit `94c3a63`，9 证据、19 可见元素。
- 事故状态投影 demo：本机真实中断日志 + demo runbook，14 证据、29 可见元素；删除恢复日志触发 `sourceSha256` + `supportedEvidence` 失败。
- 研究主张图 demo：三篇独立原文、18 证据、27 可见元素；改来源结论后旧 claim 失效。
- 30 个 eval fixture：30/30 通过；无来源 supported 4/4 捕获；stale 4/4 拒绝；确定性修复 28/28。

尚未做：

- 独立 `visual_diff`（按计划放到三 demo 之后）。
- 真实 LLM Agent 的自修复实测（当前是确定性 patch harness，不是模型）。
- `next-blog` 页面集成（用户明确要求全部开发完成后再做）。

## 1. 三条产品线，不是三个孤立 demo

### A. 代码 Agent：PR 变更解释

**真实场景**：代码审查 Agent / 编程 Agent 在一个 PR 跨 API、队列、数据库或部署配置时，需要回答“谁受影响、风险在哪、哪些依赖没有证据”。

**输入**：真实 `git diff`、相关测试、接口文档、部署配置。

**输出**：
- 变更前后的请求链路；
- 受影响实体与风险关系；
- unknown 依赖（例如“重试语义没有测试覆盖”）；
- 每条边可回指 diff 行、测试名或文档段落；
- 修改 diff 后旧 source hash 失效。

**验收**：同一 PR 连续两次 compile 的 artifact hash 一致；删掉一条测试来源后，相关关系降级为 unknown 或构建失败。

### B. 事故响应 Agent：状态投影

**真实场景**：值班助手 / runbook Agent 在日志、告警、runbook 出现多个状态转换时，需要知道“现在确认了什么、哪些还是推断、下一步查什么”。

**输入**：真实日志时间段、告警记录、runbook 段落。

**输出**：
- state graph：正常 / 预警 / 告警 / 严重；
- 失败分支与已确认事件；
- 尚未确认的推断；
- 每个状态转换绑定日志时间段或 runbook 段落；
- 下一步查询建议。

**验收**：删除某条日志后，相关关系必须降级为 unknown 或触发构建失败；不能继续显示为已证实。

### C. 研究 Agent：主张与证据图

**真实场景**：研究 / 投研 / 政策分析 Agent 在多份文档存在主张、反例、证据缺口和不同版本时，需要保留冲突而不是合并成单一事实。

**输入**：多篇真实文章 / 报告 / 政策文本。

**输出**：
- claim graph；
- 证据引用；
- 冲突关系；
- unknown 与时间范围；
- 来源更新后过期主张不得继续显示为已证实。

**验收**：所有 supported claim 有来源定位和 textHash；两个冲突主张不能合并成一个 claim。

## 2. 开发阶段

### Phase 0：协议与运行时（1–2 周，当前）

- [x] v0.2 四区块协议与归一化层
- [x] `visual_validate`
- [x] `visual_compile`
- [x] `visual_query`
- [x] stdio MCP server
- [x] 两份样本跑通
- [x] 协议文档 / JSON Schema 审稿
- [x] 负向测试：非法 grammar、过期 hash、实线 unknown、无来源 supported、文字越界
- [x] 两轮修复演示（确定性 patch harness；真实 LLM 待补）

**退出标准**：两份样本 validate 12/12；compile hash 与既有构建一致；MCP `initialize / tools/list / tools/call` 全通；至少 3 类故意错误能在诊断里定位到 `path/ref/rule`。

### Phase 1：三个真实 demo（2–3 周）

按 A → B → C 的顺序，不并行堆三个半成品。

- [x] A1 找到真实 PR：commit `94c3a63`，只改 `siteMetadata.js` 与 `next.config.js`，保存 diff。
- [x] A2 写 `demos/pr-change/` 的 v0.2 spec、source locator、acceptance。
- [x] A3 跑 validate / compile / query；记录主路径、风险分支与证据。
- [x] B1 找到真实日志 + runbook：本机复现服务中断，11 行日志 + 明确标注的 demo runbook；没有冒充生产。
- [x] B2 写 `demos/incident-state/`；验证“删一条恢复日志 → 构建失败”。
- [x] C1 用三篇真实文章，写 `demos/research-claims/`；多来源独立校验。
- [x] C2 验证冲突主张不被合并；改来源结论后旧 claim 失效。

**退出标准**：三个 demo 共用同一套 MCP 工具，零专用工具；每个 demo 有 SVG、scene、evidence index、semantic report；至少一个 demo 触发并修复一次真实 unknown。

### Phase 2：eval 与自修复（2 周）

- [x] 30 个 fixture：sequence 5 / state 6 / 失败分支 4 / unknown 3 / 过期来源 4 / 布局 4 / 非法 grammar 2 / 无来源 supported 2。
- [x] `eval/run-eval.mjs`：批量 validate + 基线 compile + 确定性修复，输出通过率、分类和修复率。
- [x] 修复报告：每类错误最多两次工具调用；当前 harness 为确定性 patch，不是 LLM。
- [x] 指标：fixture 30/30；无来源 supported 4/4；过期来源 4/4；确定性修复 28/28（100%）。

**退出标准**：30/30 fixture 有预期结果；至少 24/30 能在两次调用内自修；失败能指出是补证据、改状态、改 grammar 还是改布局。

### Phase 3：集成到项目链接（全部开发完成后）

- [ ] 把 runtime 的协议、MCP、demo artifact 接入 `next-blog` 的 `/projects/ai-graph`。
- [ ] 页面只展示 artifact 和证据索引，不展示“半成品成功结果”。
- [ ] 保留现有两条文章切片作为基线，不删除。
- [ ] 只在本地 commit；push / 部署等用户明确同意。

## 3. 验收指标

| 维度 | 指标 | 目标 |
| --- | --- | --- |
| Agent 自修复 | 故意错误两次工具调用内修好 | ≥80% |
| 集成复用 | 三个 demo 共用同一组 MCP 工具 | 零专用工具 |
| 证据保真 | supported 元素有来源定位 | 100% |
| 协议稳定 | 三 demo 后不新增必填字段 | 0 个新必填字段 |
| 新场景接入 | 从拿到素材到出 artifact | ≤2 天，不改 MCP 接口 |
| 诊断质量 | 失败能定位 path/ref/rule/repair | 人工补写诊断文字 <20% |
| 确定性 | 同 spec / source / profile 的 hash | 100% 一致 |
| 过期来源 | 旧 hash 产物被拒绝 | 100% |

## 4. 风险与止损

### 风险 1：AI 根本不需要视觉层

**信号**：Agent 不调用 `visual_query`，只把 SVG 当最终展示；结构化 JSON 已满足任务。

**止损**：收缩为“证据约束的解释产物服务”，停止用“视觉推理”命名；保留 validate/compile/query 作为证据层。

### 风险 2：协议退化成普通节点和边

**信号**：三个 demo 只用 entities/relations，claims/unknowns/source locator/status 不进入决策；不同场景只换标签颜色；MCP 返回与 Mermaid AST 无本质差别。

**止损**：停止增加 renderer；优先设计能改变 Agent 行为的 query 和诊断。

### 风险 3：Agent 自修复放大错误

**信号**：为了过 lint 把 unsupported 改成 supported、同一错误循环、source hash 失败后沿用旧 artifact、unknown 转实线。

**止损**：优先拒绝构建、保留失败状态、提供有限修复选项；validate 不自动改事实。

## 5. 文件地图

```text
schema/visual-spec.v0.2.schema.json   # AI 调用面 schema
tools/runtime/protocol.mjs            # v0.1 ↔ v0.2 归一化
tools/runtime/validate.mjs            # visual_validate
tools/runtime/compile.mjs             # visual_compile
tools/runtime/query.mjs               # visual_query
tools/runtime/artifacts.mjs           # scene 的 viewElementId 映射
tools/mcp-server.mjs                  # stdio JSON-RPC
docs/visual-spec-v0.2.md              # 协议
docs/mcp-runtime.md                   # MCP 用法
docs/ai-native-runtime-plan.md        # 本计划
demos/                                # 待建：pr-change / incident-state / research-claims
eval/                                 # 待建：30 fixtures
```

## 6. 现在不要做什么

- 不要先改 `next-blog` 页面；用户要求全部开发完成后再集成。
- 不要为每个 demo 写专用 MCP 工具。
- 不要先做 `visual_diff`；三 demo 跑通后再加。
- 不要把 SVG 或截图当作事实源；事实源始终是 spec + 来源定位。
- 不要在缺真实素材时编造 diff、日志或研究结论。
