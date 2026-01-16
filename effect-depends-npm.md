# Effect Depends via NPM（工程化接入）

目标：在 Web App/组件库/长期维护场景下，用 NPM 把三方依赖纳入你方工程治理（锁版本、审计、可回滚）。

建议：
- 使用 lockfile（`package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`）锁版本。
- 按需引入与 tree-shaking（ESM 优先）。
- 动效相关依赖尽量“少而精”：同一项目避免同时引入多个“主动画引擎”（例如同时用 GSAP + Anime.js），除非有明确边界。

---

## 统一安装（按需选择）

```bash
# 复杂时间线/滚动
npm i gsap

# React 动效（组件化/转场）
npm i framer-motion

# 轻量 DOM 动效（非 React 依赖）
npm i motion

# 通用补间/轻量时间线
npm i animejs

# SVG 节点构建/操作（SceneSpec 渲染器常用）
npm i @svgdotjs/svg.js

# SVG path 形变（可选，高级转场）
npm i flubber
npm i d3-interpolate-path

# 3D
npm i three

# Lottie 播放
npm i lottie-web

# Rive 运行时（Canvas）与 React 封装（可选）
npm i @rive-app/canvas
npm i @rive-app/react-canvas
```

---

## GSAP（含插件）

```ts
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
gsap.to(".box", { x: 200, duration: 0.6, ease: "power2.out" });
```

建议：
- 插件用到再引（例如 `ScrollTrigger`/`Draggable`），避免无谓体积。
- 组件卸载时 kill timeline/trigger（避免泄漏）。

---

## Framer Motion（React）

```tsx
import { motion } from "framer-motion";

export function FadeIn() {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />;
}
```

建议：
- 用 variants 统一节奏（时长/缓动集中配置）。
- 与路由转场结合时，管理好 exit/enter 的中断与并发。

---

## Motion One（motion）

```ts
import { animate } from "motion";

animate(".box", { x: 120, opacity: 1 }, { duration: 0.5, easing: "ease-out" });
```

建议：
- 适合偏“参数动画”的工程化场景；复杂编排可引入 timeline（按需）。

---

## anime.js

```ts
import anime from "animejs";

anime({ targets: ".dot", translateX: 120, duration: 500, easing: "easeOutQuad" });
```

---

## three.js

```ts
import * as THREE from "three";

const scene = new THREE.Scene();
console.log(scene);
```

建议：
- 控制像素比与渲染频率（尤其移动端）。
- 资源加载加占位与降级（低模/静态图）。

---

## lottie-web

```ts
import lottie from "lottie-web";

lottie.loadAnimation({
  container: document.getElementById("anim")!,
  renderer: "svg",
  loop: true,
  autoplay: true,
  animationData: {} as any
});
```

建议：
- `animationData` 建议走构建产物（本地 json）或受控 CDN；避免运行时从不可信域拉取。

---

## Rive（Canvas runtime）

```ts
import { Rive } from "@rive-app/canvas";

const rive = new Rive({
  src: "/path/to/file.riv",
  canvas: document.querySelector("canvas")!,
  autoplay: true
});
```

---

## Rive（React 封装，可选）

```tsx
import { useRive } from "@rive-app/react-canvas";

export function RiveHero() {
  const { RiveComponent } = useRive({ src: "/path/to/file.riv", autoplay: true });
  return <RiveComponent />;
}
```

---

## 场景化推荐（怎么选库）

- **单页/营销页**：优先 CDN（见 `front-end-effect/effect-depends-cdn.md`），或只用 CSS/WAAPI。
- **复杂编排/滚动叙事**：GSAP（时间线 + 插件生态）。
- **React 应用动效**：Framer Motion（组件化 + 生态习惯）。
- **设计交互动效**：Rive（状态机）/ Lottie（播放为主）。
- **3D 展示**：three.js（必要时配合 GSAP 驱动参数）。
