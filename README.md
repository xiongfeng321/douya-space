# 豆芽空间

豆芽空间是一个基于 Next.js App Router 的双语作品平台，面向 Cloudflare Workers/OpenNext 部署。前台支持作品列表、搜索筛选和独立详情页；管理台支持作品列表、编辑、发布/下线、删除，以及浏览器端图片裁剪和 JPEG 压缩。

## 本地开发

安装依赖：

```sh
npm install
```

启动开发服务：

```sh
npm run dev
```

访问：

```text
http://localhost:3000
http://localhost:3000/admin
```

没有 Cloudflare 绑定时，页面会使用 `lib/sample-data.js` 内置作品；管理台的改动会在当前页面状态中预览。

## Cloudflare 部署

当前 Cloudflare 官方推荐 Next.js App Router 使用 OpenNext 适配到 Workers；这比旧的 `@cloudflare/next-on-pages` 更适合 App Router 和 API routes。配置文件：

- `wrangler.toml`
- `open-next.config.ts`
- `next.config.mjs`

部署前需要：

1. 创建 D1 数据库 `douya-space`，把 `wrangler.toml` 里的 `database_id` 替换为真实 ID。
2. 创建 R2 bucket `douya-space-media`。
3. 设置变量：
   - `PARENT_EMAILS=家长邮箱@example.com`
   - `MEDIA_PUBLIC_URL=R2公开访问域名`
   - 本地开发可复制 `.dev.vars.example` 为 `.dev.vars`
4. 执行迁移：

```sh
wrangler d1 migrations apply douya-space
```

5. 部署：

```sh
npm run deploy
```

也可以在 Cloudflare 控制台连接 Git 仓库，让 Cloudflare 用同样的 build/deploy 命令自动部署。

## 关键路由

- `/`：双语作品首页。
- `/works/[slug]`：独立作品详情页。
- `/admin`：作品管理台，建议用 Cloudflare Zero Trust Access 保护。
- `/api/works`：公开作品列表。
- `/api/works/[slug]`：公开作品详情。
- `/api/admin/works`：管理端作品列表和新建。
- `/api/admin/works/[slug]`：管理端编辑、下线和删除。
- `/api/admin/upload`：上传裁剪压缩后的封面到 R2。

## 数据模型

D1 表结构在 `migrations/0001_create_works.sql`。核心字段包括：

```text
id, slug, title_zh, title_en, summary_zh, summary_en, content_zh, content_en,
category, tags, cover_image, cover_style, gallery_images, code_url, demo_url,
is_published, published_at, author_role, created_at, updated_at
```

## 权限说明

Cloudflare Access 会把登录邮箱放入 `cf-access-authenticated-user-email` 请求头。邮箱出现在 `PARENT_EMAILS` 中时视为家长账号，可以发布作品；其他账号只能保存草稿，不能把 `is_published` 设置为 `true`。
