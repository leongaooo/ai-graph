# MCP Runtime：让 Agent 调用 AI Graph

`tools/mcp-server.mjs` 通过 stdio 暴露三个工具。它不依赖 MCP SDK，直接实现 JSON-RPC 2.0；任何支持 stdio MCP 的客户端都可以启动它。

```bash
cd /Users/gaolimin/GitHub/ai-graph
node tools/mcp-server.mjs
```

客户端配置示例（把路径换成你的仓库绝对路径）：

```json
{
  "mcpServers": {
    "ai-graph": {
      "command": "node",
      "args": ["/Users/gaolimin/GitHub/ai-graph/tools/mcp-server.mjs"]
    }
  }
}
```

## 三个工具

### `visual_validate`

输入：

```json
{
  "specPath": "art/agent-delivery-gate.visual.json"
}
```

或直接传对象：

```json
{
  "spec": { "protocol": "ai-graph/visual-spec@0.2", "version": "0.2", "id": "…", "sources": [], "semantic": {}, "view": {} },
  "sourceText": "单来源整篇文本",
  "sourceTexts": ["来源 1 文本", "来源 2 文本", "来源 3 文本"],
  "baseDir": "/Users/gaolimin/GitHub/ai-graph"
}
```

多来源 spec 直接用 `specPath` 时，runtime 会按 `sources[].uri` 逐个读取并逐来源校验；也可以传 `sourceTexts` 数组覆盖文件读取。

输出重点：

- `ok`
- `specId`
- `source.expectedSha256 / actualSha256 / status`（单来源）
- `sources[]`：多来源时每个 source 的 uri / expectedSha256 / actualSha256 / lines
- `checks`：12 条门禁逐项布尔值
- `diagnostics[]`：`rule / path / ref / expected / actual / repairHint`
- `normalizedSpec`：归一化后的 v0.2 envelope
- `warnings[]`：例如“扁平 v0.1 已归一化”

### `visual_compile`

输入：

```json
{
  "specPath": "art/automation-equipment-state.visual.json",
  "outDir": "out",
  "profile": "both"
}
```

输出重点：

- `ok`
- `specId`
- `grammar`
- `artifacts.desktop / artifacts.mobile`：`svg`、`scene`、`report`、`hash`、`elementCount`、`textOverflow`
- `sources[]`：多来源编译时保留全部来源元信息
- `evidenceIndex`：每个可见元素到语义 ref、来源 locator 的索引
- `semanticReport`
- 失败时 `diagnostics[]`，不会产生“半成品成功结果”

### `visual_query`

输入：

```json
{
  "specPath": "art/agent-delivery-gate.visual.json",
  "scenePath": "out/agent-delivery-gate.scene.json",
  "query": { "type": "main_path" }
}
```

支持查询：

| `type` | 作用 |
| --- | --- |
| `main_path` | sequence 优先用 `view.order`；state 用 `view.loop.steps` |
| `unknown_edges` | unknown / inferred 关系、unknowns、inferences，带来源与可见元素 |
| `node_evidence` | 单个语义 ref 的来源定位、状态、可见元素 |
| `reachable` | 从某个 ref 出发的上游/下游可达节点，默认深度 3 |
| `overflow` | 文字越界列表；正常为 `[]` |
| `element` | 按 `viewElementId` 或绘制 `id` 查可见元素 |
| `search` | 在 id / label / text / question / answer 中搜索 |
| `acceptance` | 按 acceptance id 返回问题、答案、可见元素 |

超出表达能力时返回：

```json
{
  "ok": true,
  "answer": {
    "unanswerable": true,
    "reason": "语义对象不存在：ref-xxx"
  }
}
```

`ok: true` 表示查询本身执行成功；`unanswerable` 表示场景里确实没有答案，不是工具坏了。

## 一次典型 Agent 调用链

1. Agent 从代码 diff / 日志 / 文档抽取出候选实体、关系、主张。
2. 调 `visual_validate`；只按 `diagnostics[].repairHint` 修 spec。
3. 校验通过后调 `visual_compile`；拿 `artifact hash`、`scene`、`evidenceIndex`。
4. 需要回答“失败分支是什么”“这个节点证据在哪”“哪些地方没有证据”时调 `visual_query`。
5. 把 `scene` / `semanticReport` 交给上层 Agent 做决策；SVG 只作为人类查看的投影。

## 设计约束

- **MCP 层不含布局规则**：布局在 `tools/lib/*-layout.mjs`，MCP 只做参数校验、调用和诊断归一化。
- **不替 Agent 改事实**：validate 不自动把 supported 改成 unknown；compile 不自动补 sourceRefs。
- **确定性**：同 spec、同 source hash、同 profile，`artifact hash` 必须一致。
- **失败可见**：`isError: true` 表示工具级失败；`ok: false` 与 `diagnostics` 同时返回，避免 Agent 把失败当成功。
