# VisualSpec v0.2：给 AI Agent 的证据约束视觉投影协议

> 状态：v0.1 运行时已落地（validate / compile / query + stdio MCP），协议 v0.2 作为 AI 调用面冻结。
> 目标不是“让 AI 画图”，而是让 AI 在一个可校验、可查询、可复现的结构化场景上工作；SVG 只是给人看的投影。

## 1. 四区块

```json
{
  "protocol": "ai-graph/visual-spec@0.2",
  "version": "0.2",
  "id": "pr-42-api-change",
  "seed": 20261124,
  "sources": [
    {
      "id": "source-main",
      "uri": "file:///path/to/diff.patch",
      "title": "PR #42 diff",
      "date": "2026-11-24",
      "sha256": "…",
      "locators": [
        {
          "id": "e-diff-1",
          "lineStart": 18,
          "lineEnd": 27,
          "textHash": "…",
          "excerpt": "+ await queue.publish(...)"
        }
      ]
    }
  ],
  "semantic": {
    "entities": [],
    "relations": [],
    "claims": [],
    "metrics": [],
    "unknowns": [],
    "inferences": [],
    "levels": []
  },
  "view": {
    "grammar": "sequence",
    "focus": "c-main",
    "order": ["client", "api", "queue", "worker"],
    "elements": []
  },
  "intent": {
    "text": "解释这个 PR 把同步调用改成队列后，请求链路和风险边界发生了什么变化。",
    "question": "哪些调用方受影响？哪些依赖还没有证据？",
    "audience": "代码审查 Agent / 值班工程师",
    "constraints": ["不补没有来源的事实", "unknown 必须虚线"],
    "mainConclusion": { "claimRef": "c-main", "text": "同步调用变成了异步投递，但重试语义尚未确认。" }
  },
  "acceptance": []
}
```

### sources

- `uri`：来源地址。本地可以是绝对路径或 `file://`；远程可以是 URL；运行时只读取可读的本地文件，或由调用方传入 `sourceText`。
- `sha256`：整篇来源的 SHA-256。来源变化后旧 artifact 必须失效。
- `locators[]`：证据定位。每个 locator 有 `lineStart`、`lineEnd`、`textHash`、`excerpt`。`textHash` 是行范围文本的 SHA-256，不是整篇哈希。

### semantic

- `entities`：参与者、组件、状态、边界、失败项。
- `relations`：实体之间的有向关系；`from`、`to` 必须指向已有 entity。
- `claims`：可以被回答的主张；`view.focus` 必须指向一个 claim。
- `metrics`：带 `unit` 和 `sourceRefs` 的数字；没有来源的数字不能进 metrics。
- `unknowns`：来源没有说明的部分；必须 `status: "unknown"`，投影时用虚线。
- `inferences`：从事实推出、但文中没有直接说的部分；必须 `status: "inferred"` 且有 `reason`。
- `levels`：可选分组，用于 sequence 的层级组织。

### view

- `grammar`：当前只支持 `sequence` / `state`。
- `focus`：主 claim id。
- `order`：sequence 的主路径顺序；`visual_query.main_path` 优先使用它。
- `elements`：每个可见元素的逻辑 id、语义 `ref`、kind、status。布局器必须覆盖全部 elements。
- `state` 额外字段：`lanes`、`loop`、`edge`、`notes`；每个引用都必须存在并进入 `view.elements`。

### intent

- `text`：这张图要解释什么。
- `question`：Agent 真正要回答的问题；`acceptance` 是它的可验证子问题。
- `audience`：给谁看。
- `constraints`：输出约束，例如“不补事实”“unknown 虚线”“不改来源”。
- `mainConclusion`：主结论；可以带 `claimRef`。

## 2. 与 v0.1 的兼容

现有两份样本是扁平 v0.1：

```json
{
  "version": 1,
  "id": "…",
  "source": { "path": "…", "sha256": "…" },
  "evidence": [],
  "entities": [],
  "relations": [],
  "claims": [],
  "unknowns": [],
  "inferences": [],
  "metrics": [],
  "acceptance": [],
  "view": {}
}
```

`tools/runtime/protocol.mjs` 会在读入时做一次归一化：

- `source` → `sources[0]`
- `evidence` → `sources[0].locators`
- `entities/relations/claims/metrics/unknowns/inferences/levels` → `semantic.*`
- `question/mainConclusion/intent` → `intent.*`
- `view/acceptance/copy` 原样保留

**v0.2 是 AI 调用面，v0.1 是现有引擎的兼容输入。** 不需要为了跑通而立刻重写两份样本；新 demo 应直接写 v0.2。

## 3. 产物

一次成功编译产出：

| 产物 | 说明 |
| --- | --- |
| `*.svg` | 桌面 1200×675 投影 |
| `*.mobile.svg` | 移动 390×860 投影；独立排版，不是桌面缩放 |
| `*.scene.json` | SceneArtifact：每个可见元素的 `id`、`viewElementId`、`ref`、`kind`、`status`、`lineStyle`、`bbox` |
| `*.semantic-report.json` | 12 条门禁的逐项结果与错误 |
| `artifact hash` | `scene.svg.sha1`；同 spec、同 source hash、同 profile 必须一致 |
| `evidence index` | `visual_compile` 返回的元素 → 语义 ref → 来源定位索引 |

`scene.json` 里的 `viewElementId` 是**逻辑元素 id**（例如 `edge-r-body-fail`），`id` 是**绘制元素 id**（例如 `arrow-r-body-fail`）。查询按两者都能命中；AI 不需要自己猜绘制 id。

## 4. 诊断契约

失败不是一句“构建失败”，而是一条可执行诊断：

```json
{
  "severity": "error",
  "rule": "supportedEvidence",
  "path": "relations[2].sourceRefs",
  "ref": "r-forward",
  "message": "supported 项必须有 sourceRef/sourceRefs",
  "expected": "至少一个有效 evidence ref",
  "actual": "[]",
  "repairHint": "补充来源引用，或把 status 改为 unknown"
}
```

AI 的修复顺序应当是：

1. 先判断 `rule`：是来源问题、状态问题、语法问题，还是布局问题。
2. 再按 `path` / `ref` 定位到自己的 spec。
3. 只改 spec，不让工具替它补事实。
4. 最多两轮；两轮仍失败就拒绝构建，保留失败状态。

## 5. 边界

**做**：证据绑定、语义状态、确定性投影、结构化查询、Agent 可读诊断、同参复现。

**不做**：实时指标采集、告警、通用图表语言全覆盖、自由画布编辑器、多人协作、像素相似度训练、用截图替代语义对象、自动补齐没有来源的事实。

如果最终只产出“Mermaid/D2 的另一种语法”，这个项目就失去存在理由。
