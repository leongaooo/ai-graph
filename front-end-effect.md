# Front-End Effect Guide（前端动效开发 Guide）

面向：让 AI/团队可落地地开发“优秀前端动效”（UI 微交互、页面转场、滚动叙事、2D/SVG/3D、数据可视化动画）。

本指南输出的目标：**可实现、可维护、可复用、性能稳、可访问**，并能在需求/设计不完整时，通过明确的约束与验收标准把动效做“对”。

---

## 1) 动效类型选择（先选对赛道）

用“目的 → 技术栈”的方式选择方案：

- **微交互（按钮/表单/hover/反馈）**：CSS / WAAPI / Framer Motion / GSAP（低成本高收益）
- **页面转场（路由切换/列表到详情）**：Framer Motion（React）、GSAP（通用）、View Transitions API（原生/渐进增强）
- **滚动叙事（滚动驱动进度/章节）**：GSAP + ScrollTrigger / 原生 IntersectionObserver + requestAnimationFrame
- **SVG 图形动画**：SVG + CSS/WAAPI / GSAP / Anime.js
- **Canvas/粒子/特效**：Canvas 2D + 自写引擎 / PixiJS（可选）/ GSAP 驱动参数
- **3D（产品展示/空间动效）**：three.js（必要时配合 GSAP/Anime 驱动时间线）
- **设计工具产出可交互矢量动效**：Rive（交互强）/ Lottie（资源生态强）
- **文案 → SVG 场景插画（确定性输出）**：SceneSpec + motifs（`<symbol>/<use>` 复用人物/道具），离线渲染避免“空白”

决策原则：
- “能用 CSS 就别上 JS”；“能用 WAAPI 就别自己写补间”；“能用时间线就别散落 setTimeout”。
- 复杂动效优先选 **时间线/状态机**（GSAP timeline / Rive state machine / Framer variants）。

---

## 2) 质量标准（优秀动效的验收清单）

**体验**
- 目的明确：动效回答“发生了什么/下一步是什么/因果关系是什么”
- 节奏统一：同类动效同曲线、同持续时间区间（避免“每处都不一样”）
- 物理一致：加速度/减速度、弹性参数符合预期（不要忽快忽慢）

**工程**
- 可配置：持续时间、延迟、强度、触发条件是参数，不是魔法数散落
- 可中断：支持取消/反向/快速切换，不产生“动画叠加”
- 可降级：低端机/省电/减少动态效果时仍可用

**性能**
- 不掉帧：关键路径避开 layout thrash；尽量用 transform/opacity
- 不泄漏：及时清理事件、observer、timeline、raf

**可访问**
- 支持 `prefers-reduced-motion`
- 动效不成为唯一信息载体（信息要有静态表达）

---

## 3) 平台/组织/库矩阵（从“学、找、做、交付”到“工程落地”）

| 名称 | 地址 | 类型 | 适用场景（建议） |
|---|---|---|---|
| GreenSock / GSAP | https://greensock.com/gsap/ | 动效库（时间线/补间） | 复杂时间线、滚动、跨框架通用 |
| Framer Motion | https://www.framer.com/motion/ | React 动效库 | 组件化动效、转场、手势联动 |
| Motion One | https://motion.dev/ | WAAPI 封装库 | 原生动画能力增强、体积较轻 |
| Anime.js | https://animejs.com/ | 通用 JS 动画库 | DOM/SVG/Canvas 参数补间 |
| three.js | https://threejs.org/ | 3D 引擎 | WebGL 3D 动效、产品展示 |
| Lottie（lottie-web） | https://github.com/airbnb/lottie-web | 动效运行时 | 设计产出（AE）播放、运营动效 |
| LottieFiles | https://lottiefiles.com/ | 平台/素材生态 | 找素材、预览、托管、插件 |
| Rive | https://rive.app/ | 平台 + 运行时 | 可交互矢量动效、状态机 |
| AntV Infographic | https://github.com/antvis/Infographic | 信息图引擎（SVG） | 文案 → 信息图语法 → 高质量 SVG（适合流程/结构/对比/列表类） |
| Lucide Icons | https://github.com/lucide-icons/lucide | 图标库（SVG） | 小装饰/小物品用现成 icon motifs（`lucide_*`）避免手搓路径 |
| Webflow Interactions | https://webflow.com/interactions-animations | 无代码平台 | 快速原型/营销页动效搭建 |
| CodePen | https://codepen.io/ | 社区/Demo | 找灵感、验证交互、分享实验 |
| Codrops | https://tympanus.net/codrops/ | 教程/案例库 | 交互与动效灵感、实现参考 |
| Awwwards | https://www.awwwards.com/ | 评选/灵感 | 高质量网站动效趋势与案例 |
| The FWA | https://thefwa.com/ | 评选/灵感 | 创意动效网站案例 |
| MDN | https://developer.mozilla.org/ | 文档/标准 | CSS/WAAPI/SVG 等标准实践 |

---

## 4) 设计到开发的交付接口（AI/人都按这个补齐信息）

向设计/需求方收集或由 AI 自动补齐的字段：
- 触发：hover / click / viewport enter / scroll progress / route change / data update
- 元素：参与动画的节点（选择器/组件名）、初始/结束状态
- 目的：强调层级、引导视线、反馈、叙事、品牌感
- 时序：持续时间区间（例如 120–240ms 微交互；300–600ms 转场；滚动按进度）
- 曲线：`ease-out`（进入）、`ease-in`（退出）、`ease-in-out`（往返），或自定义 cubic-bezier
- 中断：是否允许打断、是否可逆、是否需要队列
- 资源：是否依赖图片/视频/3D 模型；加载策略与占位
- 降级：低端机/减少动态效果/禁用 JS 时如何表现

交付产物建议（最少）：
- 交互说明（文字）
- 关键帧示意（GIF/视频或简图）
- 参数表（持续时间、延迟、缓动、位移、透明度、缩放）

---

## 5) 工程实现模式（推荐范式）

### 5.1 “状态驱动”优先（UI 更稳）

适用于：微交互/组件内动画。
- 状态：`idle / hover / pressed / loading / success / error / disabled`
- 动效：状态切换触发（React 用 Framer Motion variants；原生用 data-attribute + CSS/WAAPI）

### 5.2 “时间线驱动”处理复杂序列

适用于：复杂进入/退出、多个元素编排、滚动叙事。
- 统一管理：一个 timeline 控全部元素
- 支持：暂停/恢复/反向/seek 到任意进度
- 关键：避免多个 timeline 同时争夺同一属性

### 5.3 “滚动进度 = 0..1” 的连续映射

适用于：滚动叙事、视差、章节推进。
- 输入：scroll progress（0..1）
- 输出：属性映射（transform、opacity、滤镜、3D 参数）
- 关键：节流/合帧（用 raf），避免频繁读写布局

---

## 6) 性能与稳定性（必须遵守）

**首选动画属性**
- 推荐：`transform`、`opacity`
- 谨慎：`filter`（昂贵）、`box-shadow`（昂贵）、大面积模糊
- 避免：频繁改 `top/left/width/height` 引发布局

**避免 layout thrash**
- 读取布局（`getBoundingClientRect` 等）与写入样式分离
- 动画前一次性测量，动画中只写不读

**资源与渲染**
- 图片/视频：占位与渐进加载，避免动效依赖慢资源
- 3D：控制 draw call、贴图尺寸、像素比；提供降级（静态图/低精模型）

**清理与可中断**
- 组件卸载/路由切换必须 cleanup：observer、raf、timeline、事件监听
- 动画触发前取消上一次（尤其是 hover 快速进出）

---

## 7) 可访问与用户偏好（必须支持）

实现要求：
- 遵守 `prefers-reduced-motion: reduce`：减少位移/缩放，保留必要的淡入淡出或直接无动画
- 动效不应造成眩晕：避免大幅度视差、持续抖动、强闪烁
- 焦点可见与键盘可用：动效不遮挡焦点环，不依赖鼠标 hover 才能完成流程

建议约定：
- 提供全局开关：`motionEnabled`（结合系统偏好 + 产品设置）

---

## 8) 参考参数（可作为默认设计系统）

**时长（经验值）**
- 微交互：120–240ms
- 弹性/强调：240–420ms
- 页面转场：300–600ms（复杂内容可更长但要分段）

**位移（经验值）**
- 微位移：4–12px（提示/层级）
- 入场位移：16–48px（视图进入）

**缓动（建议）**
- 进入：`ease-out`
- 退出：`ease-in`
- 往返：`ease-in-out`
- 弹性：少用、慎用，统一参数避免“到处蹦”

---

## 9) AI 开发动效的“指令模板”（直接复制给 AI）

### 9.1 需求澄清模板

请先问我这些问题（若我未提供就给默认值并说明）：动效目的、触发条件、参与元素、时长区间、缓动、是否可中断/可逆、prefers-reduced-motion 的降级、性能预算（目标 60fps）、框架（React/Vue/原生）、是否允许引入库（GSAP/Framer Motion/WAAPI）。

### 9.2 实现输出模板（工程化）

请输出：
- 方案选择理由（CSS/WAAPI/库/3D）
- 组件/模块接口（输入参数、事件、生命周期 cleanup）
- 动画编排（状态机或时间线），参数集中配置
- reduced-motion 分支与降级策略
- 性能注意点（避免 layout thrash、合帧、清理）
- 最小可运行代码（含使用示例）

### 9.3 代码验收模板（让 AI 自检）

请自检并回答：
- 是否只动画 transform/opacity（或说明为何必须动画其他属性）？
- 是否支持快速重复触发且不叠加、不抖动？
- 是否在卸载/切换时清理所有副作用？
- 是否支持 `prefers-reduced-motion`？
- 是否能在 60fps 下运行（给出可能瓶颈与优化点）？

---

## 10) 建议的落地路线（从 0 到 1）

1. 先定义一套“动效设计系统”：时长、缓动、位移、层级、转场规则
2. 把常用模式组件化：按钮反馈、Modal 进出、列表项进入、骨架屏、Toast
3. 复杂页面用时间线统一编排（避免散落）
4. 为 reduced-motion 与低端机准备降级开关
5. 建立动效回归方式：关键路径录屏/GIF + 简单交互用例（避免改动后手感漂移）

---

## 11) SVG 场景插画动画（Prompt → SceneSpec）

当你希望“文案 → SVG 场景（结构化/流程图/插画）+ 动画”，用 SceneSpec 协议：
- 手册（含 Trigger）：`front-end-effect/user-prompt-to-svg-animate.md`
- Schema：`front-end-effect/brief-spec.schema.json`、`front-end-effect/scene-spec.schema.json`
- 库：`front-end-effect/templates/templates.manifest.json`、`front-end-effect/assets/scenes/scenes.manifest.json`
- 工具：`front-end-effect/tools/compose-scene.mjs`、`front-end-effect/tools/scene-spec-lint.mjs`
 - 关键约束：所有节点标注 `data-role`，decor 额外标注 `data-decor-type`（`texture/shadow/accent`），并通过 `scene-visual-lint` 保证装饰不覆盖前景
