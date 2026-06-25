# 更新日志

本文件记录 STILL 网站的重要功能、优化与修复。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，日期使用 `YYYY-MM-DD`。

## [未发布]

用于记录已经完成、但尚未正式发布的修改。

## [0.5.0] - 2026-06-25

### 优化

- 为私有图片提供稳定的认证访问地址。
- 复用 Supabase 短期签名 URL，减少重复签名和图片回源。
- 增加约 55 分钟的浏览器私有缓存。
- 首页与管理后台图片改为懒加载。
- 详情页仅立即加载首图，其余图片滚动到附近时加载。
- 图片文件继续由 Supabase 直接传输，避免占用 Render 的大文件带宽。

### 对应提交

- `7f24dac` Optimize private image caching and lazy loading

## [0.4.0] - 2026-06-25

### 优化

- 图片改为从浏览器直接上传到 Supabase Storage。
- 发布请求不再携带大图片文件，避免 Render 或 Server Action 请求超限。
- 上传过程中显示进度状态和明确错误信息。

### 修复

- 修复手机一次上传多张原图时出现 “This page couldn't load” 的问题。

### 对应提交

- `603fe7e` Upload images directly to Supabase
- `fda4c82` Fix mobile multi-image upload limit

## [0.3.0] - 2026-06-25

### 新增

- 每篇图文最多支持 10 张图片。
- 选择图片后立即显示本地预览。
- 支持移除图片和调整展示顺序。
- 第一张图片自动作为首页封面。
- 数据库记录发布者，并在首页、详情页和后台显示。
- 旧的单张封面自动迁移到多图片数据表。

### 对应提交

- `939ab41` Add multiple images and post authors

## [0.2.0] - 2026-06-25

### 优化

- 手机端显示 About 和 Admin 导航。
- 手机端退出入口统一使用 `Logout`。
- Logout 的字体、字号、字距和颜色与 Admin 导航一致。

### 对应提交

- `6d0f1e4` Fix mobile navigation
- `682ebce` Style logout navigation

## [0.1.0] - 2026-06-25

### 新增

- 创建极简风格的私人图文网站。
- 接入 Supabase 邮箱密码认证。
- 增加全站登录保护。
- 区分管理员和普通成员权限。
- 支持图文新建、编辑、删除、草稿与发布。
- 使用私有 Supabase Storage 保存照片。
- 提供桌面端和移动端响应式布局。

### 对应提交

- `d9d535e` Initial website
