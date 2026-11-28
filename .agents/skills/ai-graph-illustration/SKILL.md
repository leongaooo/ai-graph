---
name: ai-graph-illustration
description: Generate or adapt SVG illustrations for software product pages, developer documentation, and app screens using the AI Graph repository. Use for a webpage hero, product feature, app state, workflow, or documentation illustration.
---

# AI Graph 插画

从 AI Graph 仓库根目录工作。先看插画要嵌入的页面，写清楚谁在做什么、插画承担什么职责、可用宽度及品牌色。

1. 打开 `showcase/index.html`，在对应的页面用途中选构图。五个示例覆盖部署首屏、团队功能介绍、付款成功、物流工作流和教育文档。工作台有两套配色及桌面／手机预览，可下载当前 SVG、Brief 和 SceneSpec，并查看对应的复现命令。入口配置 `showcase/scenes.json` 列出源文件。
2. 复用已有构图时复制 Brief。修改 `layout.slots` 中的色值、标题与替代描述，按配色调整描述。原版部署可运行 `npm run illustrate:example`。手动改色或使用自有场景时运行下方命令。
3. 新主题先确认主体和动作是否适配现有构图。需要新构图时按 `scene-spec.schema.json` 编写 SceneSpec，使用清楚的主形体、可辨识的动作和有节制的装饰。将品牌色和描述留在 Brief 插槽，界面文案放在 HTML。已有旧模板可能触发重叠检查，精选示例见 `assets/scenes/scenes.manifest.json` 中带 `showcase` 的条目。
4. 将 SVG 作为独立图片引入，自带的 `viewBox` 适配缩放。设置实际语境下的 `alt`。在目标页面桌面和手机宽度分别打开查看，确认动作可读、主体完整、与文案不互抢。结构和重叠检查之后仍要看实际页面。
5. 更新工作台示例时，同步 `showcase/scenes.json`、`assets/scenes/scenes.manifest.json` 和 `showcase/index.template.html` 中对应的页面模板。运行 `npm run showcase:build` 和 `npm run showcase:check`，再在浏览器打开生成的 `showcase/index.html`，验证两套配色、预览宽度和下载。

```bash
npm run illustrate -- \
  --brief examples/showcase/team-review.brief.json \
  --scene assets/scenes/team-review.scene.json \
  --outScene out/team-review.scene.json \
  --outSvg out/team-review.svg
```
