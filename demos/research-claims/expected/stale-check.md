# 来源更新后的预期结果

运行 `node demos/research-claims/verify-stale.mjs`，基准 spec 先通过，然后把大屏文章的结论行改成相反含义。

预期：

```json
{
  "baselineOk": true,
  "mutatedOk": false,
  "rules": ["sourceSha256", "supportedEvidence"],
  "staleEvidence": ["e-dash-conclusion"],
  "expectedFailure": true
}
```

结论：来源变化不会被静默忽略，引用该结论的 `c-dashboard` 不能继续显示为 `supported`；构建会失败，直到重新取行哈希并重新判断主张。
