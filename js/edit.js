// ===== 编辑入口按钮（固定在页面左下角）=====
(function () {
    'use strict';

    var btn = document.createElement('button');
    btn.id = 'edit-entry-btn';
    btn.textContent = '✏️ 编辑';
    btn.setAttribute('title', '编辑网站内容');

    btn.onclick = function () {
        var password = prompt('请输入编辑密码：');
        if (password === 'safebite2026') {
            // 进入 CMS 后台；在后台的修改会提交到 GitHub，
            // 重新部署后所有访问者都能看到。
            window.location.href = '/admin/';
        } else if (password !== null) {
            alert('密码错误！');
        }
    };

    // 页面加载完成后添加到 body
    if (document.body) {
        document.body.appendChild(btn);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.appendChild(btn);
        });
    }
})();
