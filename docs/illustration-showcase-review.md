# AI Graph 本地场景库验收

Last updated: 2026-11-28

[打开工作台](../showcase/index.html) · [运行与嵌入说明](../README.md) · [场景及构建输入](../showcase/scenes.json)

## 页面走查

在 macOS Chrome 中直接打开本地 HTML，以 1440px 桌面视口、390px 移动视口和工作台内 390px 模式逐一查看实际页面。手机默认打开窄屏布局，也可切换到缩放后的桌面布局。320px 视口另检查了横向溢出。

[桌面完整页面](../out/showcase-review/desktop-full.png) · [手机完整页面](../out/showcase-review/mobile-full.png) · [桌面工作台](../out/showcase-review/desktop-studio.png) · [手机工作台](../out/showcase-review/mobile-studio.png)

| 场景 | 页面使用方式和画面走查 | Chrome 截图 |
| --- | --- | --- |
| 从代码到部署 | 发布平台首屏保留火箭、代码编辑器和动作轨迹。手机端标题上移，完整插画随后呈现。 | [桌面](../out/showcase-review/launch-desktop.png) · [手机](../out/showcase-review/launch-mobile.png) |
| 一起审阅改动 | 功能区的审阅板、共享指针和人物完整，文案留在独立列，手机端重排至图上方。 | [桌面](../out/showcase-review/team-review-desktop.png) · [手机](../out/showcase-review/team-review-mobile.png) |
| 付款成功 | 卡片和终端构成中心动作，终端内确认勾在小屏仍可见，下方显示交易状态。 | [桌面](../out/showcase-review/finance-payment-desktop.png) · [手机](../out/showcase-review/finance-payment-mobile.png) |
| 包裹在路上 | 物流步骤保留网页文字，车、两端标记和连续路线说明正在运输。手机端上下排列。 | [桌面](../out/showcase-review/logistics-route-desktop.png) · [手机](../out/showcase-review/logistics-route-mobile.png) |
| 从标本读懂叶脉 | 放大镜内保留叶片和叶脉，图跟随解释文字，适合正文宽度。 | [桌面](../out/showcase-review/learning-field-guide-desktop.png) · [手机](../out/showcase-review/learning-field-guide-mobile.png) |

## 复现与交互验收

- `npm run illustrate:example` 成功。部署 SVG 与既有参考文件、工作台原配色文件字节一致。
- `npm run showcase:build` 构建五个场景的两套配色。10 份均通过原结构检查和视觉检查；XML 可解析。`npm run showcase:check` 从输入重新构建，生成文件逐字节一致。
- 在 Chrome 操作全部场景入口、两套配色、桌面和手机按钮、下载以及指南导航。实际运行页面显示的十条单图命令，输出与所选 SVG 一致。Chrome 实际下载了 10 份 SVG、10 份 Brief 和 5 份 SceneSpec，文件名和字节均与仓库对应文件一致。页面无外部请求或控制台报错。
- 复跑原运行时测试 15/15 和评估样本 32/32。旧目录另试跑 18 个实验模板，7 个通过，11 个仍触发人物与物件重叠检查。明细见[旧场景检查报告](../out/showcase-review/legacy-scenes.json)。
- 审查模式为同一 AI 自审。截图是本机的审核记录，保存在 `out/showcase-review/`。

## 单文件入口回归检查

用户报告场景图空白。将旧 HTML 单独复制到空目录后，在 Chrome 复现了图片和脚本加载失败。现有入口内嵌插画、样式、脚本和下载文件。将新 HTML 单独复制到空目录，在 Chrome 跑过全部场景、换色、预览和下载。断网时图库可见，禁用 JavaScript 时图库仍可浏览并下载原配色 SVG。仓库说明和技能文档的相对链接需要从原仓库位置打开。

## 已知边界

浏览器预览提供每景两套预设配色，自定义色值和新构图需编辑输入后重建。页面是五个用途明确的示例，移动端重排页面并复用同一 SVG。视觉和交互覆盖桌面 Chrome 与模拟移动视口，真实设备、其他浏览器、外部开发者首次使用和实际采用待验证。
