# 删除恢复日志的预期结果

运行 `node demos/incident-state/verify-downgrade.mjs`，基准 spec 先通过，然后删除第 9 行：

```text
2026-11-24T13:45:48.564Z health_probe status=200
```

预期：

```json
{
  "baselineOk": true,
  "mutatedOk": false,
  "rules": [
    "sourceSha256",
    "supportedEvidence"
  ],
  "expectedFailure": true
}
```

实际运行还额外捕获到 6 条 `supportedEvidence`，因为删除该行后，后续证据的行号整体上移，`textHash` 不再匹配：

- `e-log-health-2`
- `e-log-recovered`
- `e-log-teardown`
- `e-runbook-states`
- `e-runbook-steps`
- `e-runbook-unknown`

结论：删除恢复日志不会被静默忽略，也不会继续显示为 `supported`；它会让构建失败，符合“降级为 unknown 或触发构建失败”的硬验收。
