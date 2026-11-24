# PR 变更解释 Demo（代码 Agent）

## 场景

代码审查 Agent 在 PR 跨多个配置面时，需要回答：改了哪几层、谁受影响、风险在哪、哪些点没有运行时证据。这个 demo 使用 `next-blog` 的真实提交，而不是合成 diff。

## 真实素材

- 来源提交：`94c3a63c8d1aa2da14d1cee70f06f9ca9abe39d1`
- 提交标题：`fix(analytics): umami 脚本改走 cloud 域名并放行 CSP`
- 变更文件：`data/siteMetadata.js`、`next.config.js`
- 变更规模：2 个文件，4 insertions / 4 deletions
- 来源快照：`sources/pr.diff`，由 `git show --stat --unified=6 94c3a63` 生成
- 来源 SHA-256：`b8811be3a3d09502597f2f9b66d440041fb4d7edabea77312bbc1474c8b9d544`

## 图要回答的问题

1. 这次 PR 改了哪两层配置，最终影响哪个服务？
2. 如果只改脚本地址、不改 CSP 会怎样？
3. 哪些点还没有运行时证据？

## 结论

这次变更的核心不是换一个域名，而是让脚本地址和 CSP 允许列表同时对齐：脚本改走 `cloud.umami.is`，CSP 仍保留 `analytics.umami.is` 以覆盖缓存引用。

- 主链：`PR 94c3a63 → siteMetadata → next.config CSP → CSP script-src → cloud.umami`
- 风险分支：只改 src、不改 CSP → `cloud.umami.is` 不在 `script-src` 中 → 浏览器拦截新脚本
- 未知：CSP 响应头是否实际下发、cloud 脚本是否加载、旧缓存引用比例、`NEXT_UMAMI_ID` 的实际配置
- 推断：浏览器加载脚本、Umami 事件采集、CSP 缺失导致拦截；均有 reason，没有写成 supported

## 复现

```bash
node tools/demo/fill-hashes.mjs demos/pr-change/spec.json demos/pr-change/sources/pr.diff
node tools/runtime/cli.mjs validate demos/pr-change/spec.json
node tools/runtime/cli.mjs compile demos/pr-change/spec.json out/demos/pr-change both
node tools/runtime/cli.mjs query demos/pr-change/spec.json out/demos/pr-change/pr-change-umami-csp.scene.json main_path
```

当前 artifact：

- 桌面 SVG：`out/demos/pr-change/pr-change-umami-csp.svg`
- 移动 SVG：`out/demos/pr-change/pr-change-umami-csp.mobile.svg`
- 桌面 SHA-1：`ceea2e1ba04f608d8fd3ef630aa6d3c2901a60c5`
- 移动 SHA-1：`aa894c2cd8bbdf11b697d4b7f66b8d131e87295b`
- 桌面/移动 scene 各 19 个元素，文字越界 0

## 边界

- 这是真实 PR 的配置变更，不是生产运行时验证；没有抓包、CSP 响应头或访问日志。
- 不把“浏览器会加载/会拦截”写成 supported，只标 inferred 并给出 reason。
- 不声称这个 PR 修复了所有缓存问题；旧缓存比例未知。
