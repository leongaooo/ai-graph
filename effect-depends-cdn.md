# Effect Depends via CDN（可验证链接）

目标：在“不打包/快速原型/营销页/低工程成本”的场景下，用**全球可访问**的 CDN 直连三方依赖。

约定：
- **固定版本**（不要用 `@latest`），避免线上被动升级。
- 优先 CDN：`cdn.jsdelivr.net`（jsDelivr）与 `unpkg.com`（unpkg）。本文件中的 URL 已做过 HTTP 可达性验证（200）。
- ESM 用 `<script type="module">`；传统脚本用 `<script defer>`.

---

## 选择指南（先选接入方式）

- **营销页/活动页/静态站点**：CDN + 少量 JS（可）
- **中大型 Web App（React/Vue/工程化）**：优先走 NPM（见 `front-end-effect/effect-depends-npm.md`）
- **需要严格缓存、回滚、审计**：建议自建静态资源镜像（把 CDN 文件纳入你方可控的 OSS/CDN）

---

## GSAP（含 ScrollTrigger）

> 适用：复杂时间线、滚动驱动、跨框架通用。

**jsDelivr**
- `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`
- `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/ScrollTrigger.min.js`

**unpkg**
- `https://unpkg.com/gsap@3.14.2/dist/gsap.min.js`
- `https://unpkg.com/gsap@3.14.2/dist/ScrollTrigger.min.js`

**示例（传统脚本）**
```html
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/ScrollTrigger.min.js"></script>
<script defer>
  gsap.registerPlugin(ScrollTrigger);
  gsap.to(".box", { x: 200, duration: 0.6, ease: "power2.out" });
</script>
```

---

## anime.js

> 适用：SVG/DOM 参数补间、轻量时间线。

**jsDelivr**
- `https://cdn.jsdelivr.net/npm/animejs@4.2.2/dist/bundles/anime.umd.min.js`

**unpkg**
- `https://unpkg.com/animejs@4.2.2/dist/bundles/anime.umd.min.js`

**示例（传统脚本）**
```html
<script defer src="https://cdn.jsdelivr.net/npm/animejs@4.2.2/dist/bundles/anime.umd.min.js"></script>
<script defer>
  anime({ targets: ".dot", translateX: 120, duration: 500, easing: "easeOutQuad" });
</script>
```

---

## svg.js（@svgdotjs/svg.js）

> 适用：以“节点 API”的方式构建/操作 SVG（适合做 SceneSpec 渲染器）。

**jsDelivr**
- `https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js@3.2.4/dist/svg.min.js`

**unpkg**
- `https://unpkg.com/@svgdotjs/svg.js@3.2.4/dist/svg.min.js`

---

## flubber（SVG path morph，可选）

> 适用：路径形变/图标变形（高级转场）。注意：对素材质量与约束要求更高。

**jsDelivr**
- `https://cdn.jsdelivr.net/npm/flubber@0.4.2/build/flubber.min.js`

**unpkg**
- `https://unpkg.com/flubber@0.4.2/build/flubber.min.js`

---

## d3-interpolate-path（SVG path 插值，可选）

> 适用：`d` 插值（当两条 path 点数不同）。unpkg 不提供 min 文件，这里给出非压缩版本。

**jsDelivr**
- `https://cdn.jsdelivr.net/npm/d3-interpolate-path@2.3.0/build/d3-interpolate-path.min.js`

**unpkg**
- `https://unpkg.com/d3-interpolate-path@2.3.0/build/d3-interpolate-path.js`

---

## three.js（ESM 模块）

> 适用：3D 展示/空间动效。three.js 新版本不再提供传统的 `three.min.js`，推荐直接走 ESM。

**jsDelivr**
- `https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.min.js`

**unpkg**
- `https://unpkg.com/three@0.182.0/build/three.module.min.js`

**示例（ESM）**
```html
<script type="module">
  import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.min.js";
  const scene = new THREE.Scene();
  console.log(scene);
</script>
```

---

## lottie-web

> 适用：设计产出动效（AE→Lottie）播放、运营动效。

**jsDelivr**
- `https://cdn.jsdelivr.net/npm/lottie-web@5.13.0/build/player/lottie.min.js`

**unpkg**
- `https://unpkg.com/lottie-web@5.13.0/build/player/lottie.min.js`

**示例（传统脚本）**
```html
<div id="anim" style="width:200px;height:200px"></div>
<script defer src="https://cdn.jsdelivr.net/npm/lottie-web@5.13.0/build/player/lottie.min.js"></script>
<script defer>
  lottie.loadAnimation({
    container: document.getElementById("anim"),
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: "/path/to/animation.json"
  });
</script>
```

---

## Rive（Canvas Runtime，含 WASM）

> 适用：可交互矢量动效（状态机）、更“产品化”的动效交互。

**jsDelivr**
- `https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.33.3/rive.js`
- `https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.33.3/rive.wasm`

**unpkg**
- `https://unpkg.com/@rive-app/canvas@2.33.3/rive.js`
- `https://unpkg.com/@rive-app/canvas@2.33.3/rive.wasm`

说明：`rive.js` 默认会从同目录加载 `rive.wasm`，所以建议两者同源同路径引用。

**示例（传统脚本）**
```html
<canvas id="rive" width="300" height="300"></canvas>
<script defer src="https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.33.3/rive.js"></script>
<script defer>
  const r = new rive.Rive({
    src: "/path/to/file.riv",
    canvas: document.getElementById("rive"),
    autoplay: true
  });
</script>
```

---

## Motion One（motion，ESM via jsDelivr +esm）

> 适用：不引入大库的 DOM 动效（偏工程化）。这里使用 jsDelivr 的 `+esm` 输出 ESM。

**jsDelivr（+esm）**
- `https://cdn.jsdelivr.net/npm/motion@12.24.12/+esm`

**示例（ESM）**
```html
<script type="module">
  import { animate } from "https://cdn.jsdelivr.net/npm/motion@12.24.12/+esm";
  animate(".box", { x: 120 }, { duration: 0.5, easing: "ease-out" });
</script>
```

---

## Framer Motion（不建议 CDN 直连）

原因：`framer-motion` 强依赖 React 生态与构建链路（tree-shaking/peer deps），CDN 直连可达但更容易踩坑（重复 React、版本不一致、体积不可控）。

建议：走 NPM（见 `front-end-effect/effect-depends-npm.md`）。
