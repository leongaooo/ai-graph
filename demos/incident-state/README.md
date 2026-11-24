# 事故响应状态投影 Demo（值班 Agent）

## 场景

事故响应 Agent / 值班助手 / runbook Agent 在服务中断时，需要把日志、健康探测和 runbook 投影成 state：现在确认了什么、哪些只是推断、哪些点没有证据、删掉一条日志后哪些关系必须失效。

## 真实素材

这个 demo 不使用伪造的生产日志。它在本机启动一个临时服务，真实地执行一次：

1. 服务启动，`/health` 返回 200；
2. 发送 SIGTERM，进程退出；
3. `/health` 返回 `ECONNREFUSED`；
4. 重启服务，`/health` 再次返回 200；
5. 记录一次恢复探测，然后清理进程。

- 真实日志：`sources/incident.log`，11 行，时间戳为 UTC（`Z`）
- demo runbook：`sources/runbook.md`，明确标注“非生产”
- spec 来源文件：`sources/incident-case.txt`，日志 + runbook 合并，带行号
- 复现脚本：`reproduce.mjs`，端口 `3199`，只在本机运行

**边界**：这是本地可复现中断，不是生产事故；不能外推生产影响、SLA 或根因。

## 图要回答的问题

1. 现在确认了什么，哪些只是推断？
2. 删除恢复日志后，哪条关系必须失效？
3. 哪些点没有证据？

## 真实冲突

日志第 10 行写 `state=recovered note=one_probe_only`，但 runbook 第 31 行要求“至少连续两次 200 才能标记 recovered，单次 200 只能标记 recovering”。

因此：

- `st-recovered` 只能是 `inferred`，不能是 `supported`
- `c-recovery-gap` 是 `unknown`，不是“已恢复”
- `r-recover` 带 reason：单次 200 与 runbook 的两次要求冲突
- 结论明确写“recovered 仍是推断，不能当成稳定恢复”

## 验收

删除第 9 行恢复日志后，`verify-downgrade.mjs` 会得到：

- `sourceSha256` 失败（源文件整体变化）
- 6 条 `supportedEvidence` 失败（后续证据行号/文本哈希失配）
- `ok: false`

这满足“删除某条日志后，相关关系必须降级为 unknown 或触发构建失败”；不允许继续显示为已证实。

```bash
node demos/incident-state/reproduce.mjs
node tools/demo/fill-hashes.mjs demos/incident-state/spec.json demos/incident-state/sources/incident-case.txt
node tools/runtime/cli.mjs validate demos/incident-state/spec.json
node tools/runtime/cli.mjs compile demos/incident-state/spec.json out/demos/incident-state both
node demos/incident-state/verify-downgrade.mjs
```

## 当前 artifact

- 桌面 SVG：`out/demos/incident-state/incident-state-local-outage.svg`
- 移动 SVG：`out/demos/incident-state/incident-state-local-outage.mobile.svg`
- 桌面 SHA-1：`6d79045324c2c3961830686edb0bcd22d76018ed`
- 移动 SHA-1：`42822732eb70575f7bd99681e426fbaae331bd50`
- 桌面/移动 scene 各 29 个元素，文字越界 0
- 移动 `maxContentY = 840.57 / 860`

## 已知边界

- 日志只有健康探测，没有用户请求日志；用户影响只能是推断。
- 日志只有一次恢复 200；runbook 要求两次，恢复稳定性未知。
- 进程退出码为 `0`，信号为 `null`；脚本没有记录退出根因。
- 生产 SLA、告警阈值、回滚策略未定义。
