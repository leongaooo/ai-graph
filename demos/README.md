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

计划中的三个目录：

- `pr-change/`：代码 Agent 的 PR 变更解释；输入是真实 diff、测试、接口文档。
- `incident-state/`：事故响应 Agent 的状态投影；输入是真实日志时间段、告警记录、runbook。
- `research-claims/`：研究 Agent 的主张与证据图；输入是多篇真实文章 / 报告。

约束：

- 不编造 diff、日志、研究结论或用户评价。
- 没有真实素材时，宁可暂停该 demo，也不要用合成数据冒充。
- 每个 demo 的 artifact 必须能由 `visual_validate` → `visual_compile` → `visual_query` 复现。
