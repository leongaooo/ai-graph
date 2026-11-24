# 研究主张与证据图 Demo（研究 Agent）

## 场景

研究 Agent / 投研 Agent / 政策分析 Agent / 知识整理 Agent 在多份文档之间建立 claim graph：哪些主张有原文支持，哪些只是分析者推断，哪些点没有证据，哪些主张并置后形成张力但不能被合并。

## 三份独立来源

这个 demo 不使用单一拼接稿。`sources` 有三条独立来源，每条有自己的 sha256 和 locator 行号：

| id | 文件 | 原文 | 行数 | sha256 |
|---|---|---|---|---|
| `source-dashboard` | `sources/dashboard-usability.mdx` | 可视化大屏：从炫技展示到真实可用（2026-01-16） | 93 | `94be605a...` |
| `source-three` | `sources/threejs-offscreen.mdx` | 三分视界：Three.js 离屏渲染与多重视角的艺术（2025-07-28） | 204 | `da311ee3...` |
| `source-flow` | `sources/design-flow.mdx` | 从设计意图到能跑的页面：一次首页改版的工程复盘（2026-11-21） | 83 | `41d0a845...` |

三个文件是原文的逐字快照，来自 `next-blog/data/blog/`；行号与原文章一致。

## 图要回答的问题

1. 三篇文章各自主张什么？
2. 哪条冲突不能被合并？
3. 哪些结论只是推断或未知？

## 主张与冲突

- **大屏**：价值不在炫技，而在重要信息被及时看见，让用户知道该处理哪里（`c-dashboard`，supported）。
- **Three.js**：离屏渲染、多视角、多 Pass 可以制造更丰富的视觉宇宙；但多 Pass 是性能与画质取舍（`c-three` / `c-three-cost`，supported）。
- **首页改版**：先定判断标准与取舍，再由 AI 并行实现，人逐条验收（`c-flow`，supported）。

冲突处理：

- `r-tension` 是 `unknown` 关系，连接“服务判断”和“视觉冲击”。
- 原文没有直接互相评价，所以不能写成“两篇文章互相反驳”。
- `c-conflict` 是 `unknown` 主张：张力是分析者并置后的结果。
- `c-main` 是 `inferred`：三种取向可以并置，但不能合并成一条设计原则。

## 未知

- `u-reader`：三篇文章都没有真实访客/用户测试数据，无法判断哪种视觉策略更有效。
- `u-production`：Three.js 多 Pass 的线上性能未验证；首页改版也还没有发布。
- `u-scope`：两篇文章受众不同；张力是否适用于同一产品场景未知。
- `u-ai`：AI 并行实现的质量、回滚边界与团队协作规范没有团队数据。

## 来源更新后旧主张失效

`verify-stale.mjs` 只改大屏文章结论一行：

```text
可视化大屏的价值，不在于它有多酷，而在于它能不能让重要信息被及时看见。
```

改成相反含义后，预期：

```json
{
  "baselineOk": true,
  "mutatedOk": false,
  "rules": ["sourceSha256", "supportedEvidence"],
  "staleEvidence": ["e-dash-conclusion"],
  "expectedFailure": true
}
```

这满足“来源更新后过期主张不得继续显示为已证实”。

## 验收

```bash
node tools/demo/fill-hashes.mjs demos/research-claims/spec.json
node tools/runtime/cli.mjs validate demos/research-claims/spec.json
node tools/runtime/cli.mjs compile demos/research-claims/spec.json out/demos/research-claims both
node demos/research-claims/verify-stale.mjs
```

## 当前 artifact

- 桌面 SVG：`out/demos/research-claims/research-claims-visual-value.svg`
- 移动 SVG：`out/demos/research-claims/research-claims-visual-value.mobile.svg`
- 桌面 SHA-1：`0c026bc6bf336579d1ad1270927e0849416ca1a6`
- 移动 SHA-1：`29288152826aace41e354e2496f26846540f40f4`
- 桌面/移动 scene 各 27 个元素，文字越界 0
- 移动 `maxContentY = 840.57 / 860`

## 已知边界

- 三篇文章都是个人写作，不是同行评审论文；证据强度是“原文事实”，不是“学术共识”。
- 大屏与 Three.js 的张力是分析者并置后的判断，不是原文互相评论。
- 没有真实读者测试，不能声称某种视觉策略更有效。
- 多来源校验已进入 runtime：`visual_validate` 会逐来源校验 sha256 与 locator textHash；`visual_compile` 使用多来源预校验报告，不再要求把多篇文档拼成单文件。
