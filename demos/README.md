# Demos

三个 demo 共用同一套 MCP 工具，不允许为单个 demo 写专用工具。

每个 demo 目录至少包含：

```text
demos/<demo-name>/
  README.md          # 场景、输入、验收问题、已知边界
  spec.json          # VisualSpec v0.2
  sources/           # 真实来源快照或来源说明；没有真实素材就不建这个 demo
  expected/          # 可选的验收输出说明，不提交大文件
```

三个目录已跑通：

- `pr-change/`：代码 Agent 的 PR 变更解释；真实 commit `94c3a63` 的 diff，9 证据、19 可见元素。
- `incident-state/`：事故响应 Agent 的状态投影；本机真实中断日志 + demo runbook，14 证据、29 可见元素。
- `research-claims/`：研究 Agent 的主张与证据图；三篇独立原文，18 证据、27 可见元素。

约束：

- 不编造 diff、日志、研究结论或用户评价。
- 没有真实素材时，宁可暂停该 demo，也不要用合成数据冒充。
- 每个 demo 的 artifact 必须能由 `visual_validate` → `visual_compile` → `visual_query` 复现。
- 三个 demo 共用同一套 `visual_validate / visual_compile / visual_query`，没有专用工具。
- 30 个 eval fixture 在 `eval/`；运行 `npm run eval:run`。
