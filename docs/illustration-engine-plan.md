# AI Graph 插画生成工具主线

Last updated: 2026-11-28

## 产品定义

AI Graph 的公开价值是让前端开发者、设计师和 AI Agent 用一份结构化输入，快速得到好看、先进、容易理解、可以直接放进软件产品和网页的 SVG 插画与配图。

用户提供 Brief 或 SceneSpec，工具完成素材选择、构图、文字排版、视觉门禁和静态输出。输出可以直接进入 React、Vue、Svelte 或原生 HTML，现有流水线交付 SVG。CLI 直接导出 PNG 和 HTML 预览列入后续。

场景和 Brief 可以随软件项目一起版本管理。证据链和查询由现有解释图运行时提供，插画流程当前使用独立的场景流水线。

## 目标用户

- 前端开发者，需要一张能直接放进产品页的配图，不想手工拼 SVG。
- 设计师，需要可编辑、可复用、可批量生成的插画素材和版式。
- AI Agent，需要用结构化输入调用插画工具，得到可验证的静态资产。

## 交付承诺

每个公开场景至少同时满足以下条件。

- 一眼能看出主体、动作、对象和关系。
- 画面有明确的视觉主次、节奏和留白，不是节点和卡片的堆叠。
- 人物、物品、背景和文字拥有统一的材质语言。
- 中文和英文文字都能稳定排版，移动版不依赖缩小桌面版。
- 输出为纯 SVG，能被前端直接引入、分层、动画化和局部替换。
- 同一份输入重复构建，输出字节稳定，素材和文字来源可回查。

## 当前资产

- `assets/motifs/` 已有 hand-drawn、paper、commerce、people、props 和 Lucide 图形素材。
- `assets/scenes/` 已有 hero、commerce、ops、service、team、backoffice、portal、booking 和 payments 场景模板。
- `tools/pipeline.mjs` 已提供 Brief → SceneSpec → motif 注入 → lint → SVG 的流水线。
- `tools/scene-auto-fill.mjs` 已能根据 domain、style 和 seed 生成候选布局。
- `tools/scene-visual-lint.mjs` 已能检查装饰越界、层级和文字遮挡。
- `tools/runtime/` 已提供 validate、compile、query 和 MCP 调用面。

## 本地审核版本

使用 [本地工作台](../showcase/index.html) 查看五个精选场景。首屏沿用已认可的火箭插画，其他四图为围绕改动审阅、刷卡确认、车辆配送及观察叶脉的独立构图。各自配有贴近用途的网页示例、两套可下载配色及对应输入。

`npm run showcase:build` 通过现有 Brief → SceneSpec → SVG 流水线逐一构建 10 个文件。`npm run showcase:check` 对比第二次构建和仓库生成物的字节。[交互与实际页面验收](illustration-showcase-review.md)

此前旧目录的 19 个模板曾以示例文案试跑，8 个构建成功，11 个触发人物与物件重叠检查。本轮工作台使用单独标记的 5 个精选场景。

## 主要缺口

- 当前浏览器可切换两套配色。自定义颜色、叙事和新构图通过修改 Brief 与 SceneSpec 再构建。
- 手机预览重排 HTML，静态插画使用同一份响应式 SVG。
- 外部开发者首次上手时间、实际产品采用和读者反馈仍待验证。
- auto-fill 的素材与布局覆盖仍有限。PNG 输出和插画 MCP 为后续选项。

## 下一步

先由本人审核五张插画及页面适配，确认哪些动作和风格值得保留。在自己的实际软件或文档中复用一张，记录是否改色、嵌入所用时间和遇到的问题。
