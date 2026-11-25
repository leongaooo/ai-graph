# 30 分钟 Quickstart（初稿）

目标：从干净 clone 到跑出两张解释图、两份门禁报告，并知道怎么加第三篇文章。

> 这是外部上手初稿，尚未由外部开发者实测。遇到卡点请直接记在 issue/PR 里，不要先改布局器。

## 0. 准备

- Node.js 18+
- 一篇文章的本地路径（当前样本在 `next-blog/data/blog/*.mdx`）
- 不需要 `npm install`；工具只依赖 Node 内置模块

## 1. 跑通两条真实样本

```bash
git clone https://github.com/leongaooo/ai-graph.git
cd ai-graph
node -v

npm run visual:check:all
npm run visual:build:all
```

预期：

```text
out/agent-delivery-gate.svg
out/agent-delivery-gate.mobile.svg
out/automation-equipment-state.svg
out/automation-equipment-state.mobile.svg
```

打开两张桌面图，确认：

- `sequence` 图是“浏览器 → 门禁 → 工作台 → 代理 → OCR 服务 → tokens”；
- `state` 图是“在线/运行/业务/风险四列状态 + 异常到复盘闭环”。

## 2. 读门禁报告

```bash
python3 -m json.tool out/automation-equipment-state.semantic-report.json
```

要看到：

- `ok: true`
- `checks` 12 项全为 `true`
- `summary.evidence = 14`、`entities = 27`、`relations = 9`、`claims = 6`

## 3. 加第三篇文章（约 10–15 分钟）

先复制一份现有 spec：

```bash
cp art/automation-equipment-state.visual.json art/my-topic.visual.json
```

改四处：

1. `id`：改成新文件名，例如 `my-topic`。
2. `source.path`：改成你的文章绝对路径。
3. `source.sha256`：先取整篇哈希：

   ```bash
   npm run visual:evidence -- /path/to/article.mdx 1 1
   ```

   输出里的 `sourceSha256` 就是 `source.sha256`。
4. `evidence[]`：每条证据用行号取哈希：

   ```bash
   npm run visual:evidence -- /path/to/article.mdx 25 30
   ```

   把输出的 `lineStart`、`lineEnd`、`textHash`、`excerpt` 填进对应 evidence。

然后改语义：

- `entities`：文章里真实出现的对象、状态、角色；
- `relations`：对象之间的边，`from` / `to` 必须是 entity；
- `claims`：文章真正主张的结论；
- `unknowns`：文章没有说明的阈值、时限、边界；
- `view`：先选 `sequence` 或 `state`，再改可见元素。

## 4. 跑门禁

```bash
npm run visual:lint -- art/my-topic.visual.json
npm run visual:build -- art/my-topic.visual.json out
```

门禁失败时，构建器不会生成“看起来还行”的图。常见错误：

| 错误 | 原因 | 修法 |
|---|---|---|
| `supportedEvidence` | `textHash` 和文章行号不一致 | 用 `visual:evidence` 重新取 |
| `sourceSha256` | 文章改了，spec 没更新 | 重取整篇哈希 |
| `edgeEndpoints` | relation 的 `from/to` 不是 entity | 改成已有 entity id |
| `inferredReason` | `inferred` 没写 `reason` | 补一句为什么是推断 |
| `unknownNotSolid` | unknown 用了实线 | 改成 `lineStyle: "dashed"` |
| `visibleRefs` | `view.elements[].ref` 不存在 | 改成语义集合里的 id |
| `grammarSupported` | `view.grammar` 不是 `sequence/state/timeline` | 改成支持值 |
| `stateLayoutRefs` | state 缺 lane/state/step/edge/note，或 `view.elements` 漏项 | 按报错补 id |
| `acceptanceVisibleRefs` | 验收问题引用了不存在的 view element id | 改成 `view.elements[].id` |

## 5. 验收

- 门禁 12/12 通过；
- 同一 spec 连续构建两次，SVG SHA-1 一致；
- 桌面/移动 `textOverflow: 0`；
- 3 个验收问题只看图能答，且答案能回指 `data-ref`；
- 不改坐标、不手调 SVG；如果布局失败，先改 spec 或报告布局器缺口。

## 5.5 看图核对（证据查看器）

编译产物可以变成一张能点的页面，用来回答“这根线凭什么画出来”：

```bash
node tools/runtime/cli.mjs compile demos/incident-timeline/spec.json out/incident-timeline both
node tools/evidence-viewer.mjs demos/incident-timeline/spec.json out/incident-timeline
# 产出 out/incident-timeline/<id>.evidence.html，可直接用浏览器打开
```

- 点图上任一元素，右侧给出：语义对象（claim / unknown / inference / metric / entity）、来源文件与行号、原文、`textHash` 复算是否一致；
- 底部汇总 `N 条来源定位`，全部复算通过才 `ok: true`；出现 `elementsWithoutSource` 或 `mismatches` 非 0 就说明有元素画了却无法追溯；
- 地址后加 `?sel=3` 可深链到第 4 个元素（编号与图左上角小字一致）。

## 6. 当前不要做的事

- 不要为第三篇文章写新的固定坐标模板；
- 不要先做工作台/编辑器；
- 不要把 `sequence` 当成通用布局；
- 不要在没有读者测试前声称“商业可用 / 行业可用”。
