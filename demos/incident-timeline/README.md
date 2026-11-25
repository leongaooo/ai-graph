# incident-timeline（事故时间轴）

## 场景

事故响应 Agent 把一段本机真实中断日志投影成**时间轴**：启动、进程退出、探活拒绝、重启、单次 200 后标记 recovered。

与 `../incident-state/` 的关系：同一份来源，两种图法。state 版按「服务状态 / 信号与动作 / 用户影响 / 证据状态」四条泳道横向铺开，读者要自己把先后拼起来；timeline 版按日志毫秒字段从左到右排，先后是图本身带来的。

## 输入

- `sources/incident.log`：本机真实中断日志（13:45:47.246 → 13:45:48.564，共 1.3 秒）
- `sources/runbook.md`：demo 演练手册，要求连续两次 200 才能标 recovered
- `sources/incident-case.txt`：上述两份按行号打包，供 evidence 的 textHash 校验

## 验收问题

1. 全过程发生了什么？按时间说。
2. 哪一步是事实，哪一步只是推断？
3. 为什么最后一步的 recovered 只能画成虚线？

## 已知边界

- 这是本地可复现中断，不是生产事故；生产 SLA、告警阈值、回退策略均未定义。
- 进程退出根因没有日志证据，标 unknown。
- 时间轴只覆盖 1.3 秒内的单次事件，不表示服务长期稳定。

## 复现

```bash
node tools/runtime/cli.mjs validate demos/incident-timeline/spec.json
node tools/runtime/cli.mjs compile demos/incident-timeline/spec.json out/incident-timeline both
```
