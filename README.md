# SafeBite Website

让每一口都安心。

纯静态网站 + 轻量 PHP 保存接口：无需数据库、无需构建工具（Jekyll/Netlify 等），任何支持 PHP 的虚拟主机 / 服务器均可直接部署。

## 功能特性

- 🏠 主页 + 4 个官网页面（关于我们 / 加入我们 / 我们的成果 / 捐赠）
- ✏️ 内置内容管理后台：改文字、传图片、增删条目，保存即生效
- 📎 文章支持上传附件（PDF / Word / TXT 等），访客可在页面一键下载
- 📦 内容全部存于 JSON 文件，不依赖数据库
- 🪶 服务器没有 PHP 也能运行（后台会给出手动替换文件的方案）

## 网站结构

```
safebite/
├── index.html            # 主页（入口）
├── _data/                # 内容数据（JSON，后台编辑的就是这些文件）
│   ├── home.json
│   ├── about.json
│   ├── join.json
│   ├── work.json
│   └── donations.json
├── css/
│   ├── style.css         # 网站样式
│   └── edit.css          # 编辑按钮样式
├── js/
│   ├── content.js        # 页面内容加载器（读取 _data/*.json 填充页面）
│   └── edit.js           # 左下角「编辑」入口按钮
├── official/             # 官网页面
│   ├── index.html        # 关于我们
│   ├── join-us.html      # 加入我们
│   ├── our-work.html     # 我们的成果
│   └── donations.html    # 捐赠
├── admin/                # 内容管理后台
│   ├── index.html
│   ├── admin.js
│   └── save.php          # 保存接口（需要 PHP）
├── files/                # 后台上传的文章附件（首次上传时自动创建）
├── server.js             # 本地开发服务器（Node.js，无需 PHP）
└── images/
    └── uploads/          # 后台上传的图片
```

## 本地运行（开发调试）

本机没有安装 PHP 也能完整开发调试——仓库自带一个零依赖的 Node.js 服务器，提供静态文件服务并实现了与 `save.php` 相同的保存 / 上传接口：

```bash
node server.js
# 打开 http://localhost:8000（后台：http://localhost:8000/admin/）
```

需要 Node.js 任意较新版本，无需 `npm install`。指定其他端口：`PORT=3000 node server.js`。

## 部署到自己的服务器

1. 把整个文件夹上传到网站目录（如 `public_html`），站点需部署在**域名根目录**（代码中使用 `/css/`、`/_data/` 等根相对路径）
2. 确保服务器支持 PHP 5.6+（保存功能需要）
3. 确保 `_data/`、`images/uploads/` 和 `files/` 目录可被 PHP 写入（`files/` 会在首次上传附件时自动创建）
4. 部署后**第一时间修改编辑密码**（见下文）

GitHub 仓库仅作为代码备份，网站运行不依赖 GitHub。

## 内容管理

1. 打开网站任意页面，点击左下角「✏️ 编辑」按钮
2. 输入编辑密码进入后台
3. 在后台可以：编辑所有文字、上传图片、添加/删除文章·视频·项目条目
4. 点「保存更改」→ 内容直接写入服务器上的 `_data/*.json`，刷新页面即可看到效果

如果服务器**没有启用 PHP**，保存时会自动弹出对话框，显示需要手动替换的 JSON 内容——复制后替换服务器上对应的 `_data/*.json` 文件即可。

## 修改编辑密码

默认密码仅用于本地开发，**上线前务必修改**：

1. 生成新密码的哈希（可在终端运行）：
   ```bash
   php -r "echo hash('sha256', '你的新密码' . 'sb!2026#xK9'), PHP_EOL;"
   ```
2. 把输出的哈希替换 `admin/save.php` 中的 `PASSWORD_HASH`，同时修改 `admin/save.php` 里的 `SALT` 为新的随机字符串（修改后需重新生成哈希）
3. 把明文密码同步到 `js/edit.js` 和 `admin/admin.js` 中的 `safebite2026`（共 2 处）

> ⚠️ 说明：前端密码只是进入后台的「门槛」，真正的安全校验在 `save.php` 的哈希比对。任何能看到 JS 的人都能找到密码，所以请：
> - 使用强密码，不要复用其他账号的密码
> - 后台地址 `yoursite.com/admin/` 属于公开路径，仅靠密码保护

## 安全与限制

- 后台保存接口有密码校验，允许写入的文件名白名单（`home/about/join/work/donations`）；图片限 8MB，附件限 30MB
- 图片支持 jpg / png / gif / webp / svg；附件支持 pdf / doc / docx / txt / md / ppt / xls 等
- **注意 SVG 可内嵌脚本**，请只上传自己生成的 SVG
- 没有登录次数限制，请配合强密码使用；如对安全性要求更高，建议给 `admin/` 目录加服务器层认证（如 Apache `.htpasswd` / Nginx `auth_basic`）

## 故障排查

| 现象 | 原因与解决 |
| --- | --- |
| 保存提示「服务器未返回有效结果」 | 服务器未启用 PHP，或 PHP 运行错误——按弹窗提示手动替换 JSON 文件 |
| 保存提示「请检查 _data 目录权限」 | 给 `_data/` 目录写权限：`chmod 755 _data`（或按主机面板设置） |
| 图片上传失败 | 检查 `images/uploads/` 目录写权限；图片不能超过 8MB |
| 页面内容没有更新 | 浏览器缓存——强制刷新（Cmd/Ctrl + Shift + R）；确认保存的是当前页面的数据文件 |
| 页面样式/内容加载不出来 | 站点必须部署在域名根目录，不能放在子目录 |
