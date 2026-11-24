# Eval

30 个 fixture 的目标不是“多跑几个样例”，而是测三件事：

1. 错误是否被捕获；
2. 诊断是否能让 Agent 在两轮内修好；
3. 失败是否被正确归类（补证据 / 改状态 / 改 grammar / 改布局）。

建议目录：

```text
eval/
  fixtures/
    001-missing-source-ref.json
    002-stale-source-hash.json
    003-unknown-solid.json
    ...
  expected/
    001-missing-source-ref.json
  run-eval.mjs
```

每个 fixture 是一份故意有问题的 VisualSpec（v0.2 或 v0.1），`expected` 记录：

```json
{
  "ok": false,
  "rule": "supportedEvidence",
  "path": "relations[2].sourceRefs",
  "ref": "r-forward",
  "repair": "补 sourceRefs 或把 status 改为 unknown",
  "maxCalls": 2
}
```

覆盖方向：

- sequence / state 各 5 个；
- 失败分支 4 个；
- unknown 线型 3 个；
- 过期来源 4 个；
- 布局冲突 / 文字越界 4 个；
- 非法 grammar 2 个；
- 无来源 supported 3 个；
- 端点不存在 / id 重复 3 个；
- 验收问题 visibleRefs 断裂 2 个。

在 `run-eval.mjs` 写出之前，不要先堆 30 个没有预期结果的 JSON。
