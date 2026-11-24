# Eval

30 个 fixture 测三件事：

1. 错误是否被捕获；
2. 诊断是否能让 Agent 在两轮内修好；
3. 失败是否被正确归类（补证据 / 改状态 / 改 grammar / 改布局）。

## 目录

```text
eval/
  fixtures/       # 30 份故意有问题的 VisualSpec（纯 spec）
  expected/       # 每份 fixture 的预期规则、path、ref、repair
  run-eval.mjs    # 批量 validate + 基线 compile + 确定性修复
  reports/        # 最新报告（生成物）
```

## 覆盖配额（合计 30）

- sequence 5
- state 6
- 失败分支 4
- unknown 线型 3
- 过期来源 4
- 布局 / 可见元素 4
- 非法 grammar 2
- 无来源 supported 2

## expected 契约

```json
{
  "id": "002-sequence-entity-no-source",
  "category": "sequence",
  "base": "pr",
  "expect": {
    "rule": "supportedEvidence",
    "path": "entities[1]",
    "ref": "site-metadata"
  },
  "repair": [
    { "op": "set", "path": ["semantic", "entities", 1, "sourceRefs"], "value": ["e-umami-object", "e-umami-src"] }
  ],
  "maxCalls": 2
}
```

- `base`：`pr` 或 `incident`，runner 从 demo 的真实来源读取 `sourceText`。
- `source_mutation`：可选，支持 `append`，用于 stale source 场景。
- `repair`：确定性的修复补丁；runner 只执行 1 次，加上首次检查共 2 次调用。
- `maxCalls`：固定 2，对应“两次工具调用内自修”。

## 运行

```bash
npm run eval:run
```

## 当前结果（2026-11-24）

- 30/30 fixture 通过；
- 无来源 supported：4/4 捕获；
- stale source：4/4 拒绝；
- 确定性修复：28/28（100%），2 个 baseline 无需修复；
- 分类：sequence 5/5、state 6/6、failure-branch 4/4、unknown 3/3、stale 4/4、layout 4/4、grammar 2/2、no-source 2/2。

**口径**：修复 harness 是确定性的 patch 执行器，不是 LLM Agent。它证明“诊断 + 预期修复路径”在两次调用内可闭合；真实 Agent 的自修率仍需外部模型实测。

## 注意

- `reports/latest.json` 和 `latest.md` 是生成物，默认不提交。
- 不要先堆没有 expected 的 fixture；每份 fixture 必须有可断言的规则、path、ref。
