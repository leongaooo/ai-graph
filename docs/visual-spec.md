# VisualSpec 最小契约

Last updated: 2026-11-24

VisualSpec 是 AI Graph 2.0 的主产物。它先回答“图要表达什么关系、哪些是文中事实、哪些只是推断、哪些文章没说”，再交给布局器出图。

## 顶层字段

```json
{
  "version": "0.1",
  "id": "agent-delivery-gate",
  "intent": "为什么一次 OCR 上传要经过五层",
  "source": {
    "path": "data/blog/article.mdx",
    "title": "文章标题",
    "date": "2026-11-21",
    "sha256": "<source file sha256>"
  },
  "question": "图必须让读者回答的问题",
  "mainConclusion": "一句话结论",
  "levels": [],
  "entities": [],
  "relations": [],
  "claims": [],
  "evidence": [],
  "metrics": [],
  "unknowns": [],
  "inferences": [],
  "acceptance": [],
  "view": {
    "grammar": "sequence",
    "focus": "c-main",
    "order": [],
    "elements": []
  }
}
```

## status 语义

| status | 含义 | 渲染约束 |
|---|---|---|
| `supported` | 文章直接支持 | 可以有实线；必须有 `sourceRefs`，每条 evidence 的行号与文本哈希要匹配 |
| `inferred` | 由多处内容整理出的关系 | 必须有 `reason`；不要伪装成单条原文事实 |
| `unknown` | 文章没有说明 | 不得用实线；图上要有明确标记，或明确不画 |

## evidence

```json
{
  "id": "e-title",
  "lineStart": 2,
  "lineEnd": 2,
  "textHash": "<sha256 of the exact lines>",
  "excerpt": "title: ..."
}
```

- `lineStart` / `lineEnd` 从 1 开始，闭区间。
- `textHash` 是源文件中这些行的精确文本的 SHA-256；源文件改动后必须重新生成，否则门禁失败。
- `source.sha256` 是整份源文件的 SHA-256；它防止证据引用来自另一版文章。

## view

`view.grammar` 决定用哪种图法；当前支持 `sequence` 与 `state`。`state` 是第二样本新增的通用布局，不依赖某篇文章的固定坐标。

`view.elements` 是“可见元素 → 语义引用”的映射：

```json
{ "id": "node-reverse-proxy", "kind": "edge", "ref": "reverse-proxy", "status": "supported", "lineStyle": "solid" }
```

- `ref` 必须指向 entity / relation / claim / metric / unknown / inference。
- `kind` 用于布局器选择形状（node / edge / metric / note / claim）。
- 失败分支可以 `status: "supported"`（反例本身是文中事实），但 `lineStyle: "dashed"`；它不是“未知”，也不是主路径。
- 所有可见元素都应带 `data-ref`，便于从 SVG 反查语义。

## state 图法

`state` 用“维度 + 状态 + 闭环”表达一组不能合并的状态，以及异常如何进入组织行动。布局器只读数据，不读文章，也不猜坐标。

```json
{
  "view": {
    "grammar": "state",
    "focus": "c-no-mixed-fields",
    "lanes": [
      {
        "id": "lane-online",
        "title": "在线状态",
        "ref": "online-state",
        "tone": "teal",
        "states": [
          { "ref": "st-online", "label": "在线" },
          { "ref": "st-offline", "label": "离线" }
        ]
      }
    ],
    "loop": {
      "id": "loop",
      "title": "从异常到复盘",
      "ref": "c-data-action",
      "steps": [
        { "id": "loop-device-anomaly", "ref": "device-anomaly", "label": "设备异常" },
        { "id": "loop-alert-event", "ref": "alert-event", "label": "告警事件" }
      ],
      "feedback": {
        "ref": "r-loop-6",
        "from": "loop-data-review",
        "to": "loop-alert-event",
        "label": "复盘反哺告警规则"
      }
    },
    "edge": {
      "id": "edge-gateway-note",
      "ref": "edge-gateway",
      "label": "边缘网关",
      "tasks": ["协议转换", "数据过滤", "异常初判"]
    },
    "notes": [
      {
        "id": "note-thresholds",
        "ref": "u-thresholds",
        "label": "未知：状态阈值与去抖窗口"
      }
    ],
    "elements": []
  }
}
```

- `lanes[].states[].ref` 必须是 entity；`lane.tone` 可选 `teal` / `amber`，用于区分风险维度；`view.elements` 必须包含 `state-<ref去掉 st- 前缀>` 的可见元素。
- `loop.steps[].ref` 必须是 entity；`loop.feedback` 的 `from` / `to` 必须是 step id，`ref` 必须是 relation。
- `edge.ref` 和 `notes[].ref` 必须能在语义集合中找到；`notes` 默认画成 unknown 虚线。
- `state` 的桌面版是四列状态板 + 一行闭环；移动版是 2×2 状态板 + 单列闭环。两边都由同一份数据生成。
- `view.elements` 是可见元素白名单：布局器会检查每个 lane / state / step / edge / note 是否都进入布局，缺一个就报错。

## acceptance

每条验收问题必须能映射到可见元素：

```json
{
  "id": "q1",
  "question": "一次成功演示的主路径依次经过哪些节点？",
  "answer": "浏览器 → 门禁 → 工作台 → 代理 → OCR 服务 → tokens。",
  "answerRefs": ["r-enter", "r-allow", "r-upload", "r-forward", "r-return"],
  "visibleRefs": ["node-reader-browser", "node-dynamic-gate"]
}
```

`visibleRefs` 指向 `view.elements[].id`，不是语义 id。门禁会检查这些 id 是否存在。

## 门禁规则

`tools/visual-spec-lint.mjs` 当前执行 12 条：

1. 所有 entity / relation / claim / evidence / metric / unknown / inference / view element 的 id 唯一。
2. 每条 relation 的 `from` / `to` 必须是已存在 entity。
3. `supported` 项必须有 sourceRefs；evidence 行号与 `textHash` 必须和源文件一致。
4. `inferred` 项必须有非空 `reason`。
5. `unknown` 不能是 `solid`。
6. `view.elements[].ref` 必须存在。
7. metric 必须有 `unit` 和 sourceRef。
8. `view.focus` 必须指向已有 claim。
9. `acceptance[].visibleRefs` 必须指向已有 view element。
10. `source.sha256` 必须和源文件一致。
11. `view.grammar` 必须是 `sequence` 或 `state`。
12. `state` 的 lane / state / loop step / feedback / edge / note 引用必须存在，并且 `view.elements` 必须覆盖每个可见元素。

门禁失败时构建器直接退出，不生成“看起来还行”的图。

## 构建

```bash
node tools/visual-spec-lint.mjs art/agent-delivery-gate.visual.json
node tools/build-explainer.mjs art/agent-delivery-gate.visual.json out

node tools/visual-spec-lint.mjs art/automation-equipment-state.visual.json
node tools/build-explainer.mjs art/automation-equipment-state.visual.json out
```

输出：

- `out/<id>.svg`：1200×675 桌面版。
- `out/<id>.mobile.svg`：390×860 竖版。
- `out/<id>.scene.json` / `.mobile.scene.json`：可见元素、bbox、status。
- `out/<id>.semantic-report.json`：门禁报告。

## 当前限制

- `sequence` 仍是第一篇文章的固定坐标模板；`state` 是第一个由数据驱动的通用布局。两种图法的抽象程度不一致，不能把 `sequence` 当成通用布局。
- 只有 `sequence` / `state`；`hierarchy` / `comparison` 还没有布局器。
- `state` 的状态板是固定四列/2×2，闭环是固定一行/单列；超过 4 个维度或 8 个 step 会拥挤。
- 文本宽度是估算，不是浏览器真实排版；需要 `typeBlock` 的宽度检查兜底。
- 只有两个真实样本；还没有外部开发者 30 分钟上手记录，也没有 3–5 名读者的理解测试。
