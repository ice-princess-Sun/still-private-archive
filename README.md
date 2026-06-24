# STILL

极简、全站私有的图文网站，使用 Next.js 16 与 Supabase。

## 已实现

- 邮箱密码登录及全站访问保护
- 管理员和普通成员权限隔离
- 私有照片上传与签名链接展示
- 上传前本地图片预览、排序和移除
- 每篇图文最多 10 张图片
- 记录并展示图文发布者
- 新建、编辑、删除图文
- 草稿与发布状态
- Supabase PostgreSQL、RLS 和私有 Storage

## 初始化

1. 复制 `.env.example` 为 `.env.local`，填写 Supabase Project URL 与 Publishable key。
2. 在 Supabase SQL Editor 中执行 `supabase/schema.sql`。
3. 脚本会把最早创建的 Supabase 用户设为首位管理员。
4. 启动网站：

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

5. 登录后访问 `http://localhost:3000/admin`。

## 权限

- 未登录用户无法访问任何内容页。
- 普通成员只能读取已发布图文和私有图片。
- 管理员可以查看草稿，并创建、修改、删除图文及照片。
- `archive-images` Bucket 保持 Private。

## 图片限制

- 支持 JPG、PNG、WebP、GIF。
- 单张图片最大 10 MB。
- 每篇图文最多 10 张图片，第 1 张作为首页封面。
- 上传文件存储在 `archive-images/{user-id}/`。
