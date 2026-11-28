# 发布与部署

这份文档回答一个问题：做出来的东西怎么上线，以及卡住时先看哪里。

## 三条发布路径

| 去处 | 入口 | 触发方式 | 适用 |
|---|---|---|---|
| 个人站（www.leongao.me） | `next-blog` 仓库 → Vercel | push 到 `main`，Vercel 自动构建 | 案例页、场景库页面长期展示 |
| 自托管 CVM（SRV-01） | `154.8.178.202:/var/www/ai-graph` | 经 Tabby 会话 `Ubuntu-ts` 登录后覆盖目录 | 需要完整目录结构、带其他资源的演示 |
| 豆包静态托管 | `lark-cli apps +deploy` | 上传单文件 HTML，返回 `online_url` | 临时给人看，不作为长期入口 |

个人站是当前主入口：`https://www.leongao.me/projects/ai-graph`，场景库页面在 `https://www.leongao.me/ai-graph`。

## 场景库页面的构建

```bash
npm run showcase:build   # 由 showcase/index.template.html 生成 showcase/index.html
npm run showcase:check   # 检查尺寸、溢出与素材引用
```

产物是单个自包含 HTML（内联样式、脚本与 base64 图片），放到 `next-blog/public/ai-graph/index.html` 即可通过 `/ai-graph` 访问；
`next.config.js` 里有一条 rewrite：`/ai-graph` → `/ai-graph/index.html`，所以链接不需要带 `index.html`。

改动页面后本地核对：

```bash
cd ../next-blog && npx next build && npx next start -p 3100
open http://localhost:3100/ai-graph
```

## 自托管 CVM 的部署

前置：这台机器只开密码登录，`PermitRootLogin yes`；控制台救援通道不可用，任何锁门类变更都要先停手。

1. 连接：本机 Tabby → 会话 `Ubuntu-ts`（用户 `ubuntu`，`sudo -n` 免密）。密码由本人保管，不在仓库里。
2. 站点根目录：`/var/www/ai-graph`，nginx 站点配置 `/etc/nginx/sites-available/ai-graph`（`listen 80 default_server`，`/` 302 到 `/ai-graph/`）。
3. 上传：本地打包后 base64 单行，粘进会话解包，避免逐文件传输：

```bash
# 本地
tar -czf /tmp/ag.tgz -C showcase . && base64 -i /tmp/ag.tgz | pbcopy

# 服务器
mkdir -p /tmp/ag && base64 -d > /tmp/ag.tgz <<'EOF'
<粘贴内容>
EOF
tar -xzf /tmp/ag.tgz -C /tmp/ag && sudo rm -rf /var/www/ai-graph.bak \
  && sudo mv /var/www/ai-graph /var/www/ai-graph.bak \
  && sudo mv /tmp/ag /var/www/ai-graph \
  && sudo chown -R www-data:www-data /var/www/ai-graph \
  && sudo nginx -t && sudo systemctl reload nginx
```

4. 回滚：把 `ai-graph.bak` 移回原位，reload nginx。
5. 变更要落账：资产卡在 `Feature/02-career-assets/servers/tencent-cloud-ubuntu-ts.md`，写清日期、动作、证据。

## 门禁与凭据

演示的访客入口走 `gate` 服务（`~/gate/gate.py`，systemd 单元 `gate.service`，监听 18480）：本人登录 `/admin` 生成一小时有效口令，访客用口令进 `/app`。凭据与运维细节记在私有资产卡里，不写进仓库。

## 排障

- git 走 https 时会命中 `http.proxy=127.0.0.1:7890`，代理没起就整条不通。仓库已改用 SSH 远端（`git@github.com:leongaooo/...`），`ssh -T git@github.com` 通过即可推。
- `EXPORT=1 next build` 会因为 `app/ads.txt`、`app/adx.txt` 缺少 `dynamic = 'force-static'` 报错；Vercel 走的是默认构建，不要用 `EXPORT` 本地复现线上。
- 页面截断或空白：多为滚动显现动画，headless 截图加 `--force-prefers-reduced-motion` 再看。
