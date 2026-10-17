# SafeBite Website

让每一口都安心。

纯静态网站，无需 Jekyll、无需 Netlify，任何支持 PHP 的虚拟主机 / 服务器均可直接部署。

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
│   └── edit.js           # 左下角编辑入口按钮
├── official/             # 官网页面
│   ├── index.html        # All About Us
│   ├── join-us.html      # Join Us
│   ├── our-work.html     # Our Work
│   └── donations.html    # Donations
├── admin/                # 内容管理后台
│   ├── index.html
│   ├── admin.js
│   └── save.php          # 保存接口（需要 PHP）
└── images/
    └── uploads/          # 后台上传的图片
```

## 内容管理

1. 打开网站任意页面，点击左下角「✏️ 编辑」按钮
2. 输入编辑密码进入后台（默认密码见 `js/edit.js` 和 `admin/save.php`，部署后请修改）
3. 在后台可以：编辑所有文字、上传图片、添加/删除文章·视频·项目条目
4. 点「保存更改」→ 内容直接写入服务器上的 `_data/*.json`，刷新页面即可看到效果

### 修改编辑密码

- 前端入口：`js/edit.js` 中的 `safebite2026`
- 服务端保存接口：`admin/save.php` 中的 `PASSWORD_HASH`（用 `sha256(新密码 + SALT)` 重新生成）

## 部署到自己的服务器

1. 把整个文件夹上传到网站目录（如 `public_html`）
2. 确保服务器支持 PHP 5.6+（保存功能需要）
3. 确保 `_data/` 和 `images/uploads/` 目录可被 PHP 写入
4. 如果服务器**没有** PHP：后台保存时会自动生成 JSON 内容，手动替换服务器上对应的 `_data/*.json` 文件即可

GitHub 仓库仅作为代码备份，网站运行不依赖 GitHub。
