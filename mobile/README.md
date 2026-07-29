# STILL Android

这是 STILL 的 Android 客户端，使用 Capacitor 封装原生 Android 能力，并与现有网站共用同一 Supabase 项目、账号和私有图片库。

## 已实现

- 邮箱密码登录与会话保留
- 成员浏览已发布图文、私有图片短期签名访问
- 管理员新建、编辑、删除和排序图文
- Android 原生拍照与系统相册多选
- 每篇最多 10 张图片、封面和图片排序
- 继续使用 `xxmi.still.space` 作为 Android 包名

## 本地构建

项目根目录的 `.env.local` 必须已有：

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

然后在本目录运行：

```powershell
npm.cmd run build
npx.cmd cap sync android
Set-Location android
.\gradlew.bat assembleDebug
```

成功后，测试 APK 位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

首次上架前还需要发布签名密钥、隐私政策页面和商店资料；这些不影响当前测试版开发。
