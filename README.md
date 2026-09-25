# SafeBite Website

让每一口都安心。

## 网站结构

```
safebite/
├── index.html          # 主页（入口）
├── css/
│   └── style.css       # 样式
├── official/           # 官网页面
│   ├── index.html      # All About Us
│   ├── join-us.html    # Join Us
│   ├── our-work.html   # Our Work
│   └── donations.html  # Donations
├── admin/              # CMS 后台
│   ├── index.html
│   └── config.yml
└── images/             # 上传的图片
    └── uploads/
```

## 内容管理

访问 `/admin` 路径可以进入 CMS 后台，登录后可以：
- 编辑所有页面文字内容
- 上传和管理图片
- 添加/编辑文章、视频、项目

## 本地开发

```bash
# 安装 Jekyll
gem install bundler jekyll

# 本地运行
jekyll serve

# 访问 http://localhost:4000
```

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages。
