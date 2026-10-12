// ===== 编辑入口按钮（固定在页面左下角）=====
(function () {
    'use strict';

    // ===== 主账号登录凭证 =====
    // 由管理员一次性激活后自动生成，请勿手动修改。
    // 激活前为 null，此时输入密码会提示"尚未激活"。
    var MASTER_SESSION = null; /*MASTER_SESSION*/

    var btn = document.createElement('button');
    btn.id = 'edit-entry-btn';
    btn.textContent = '✏️ 编辑';
    btn.setAttribute('title', '编辑网站内容');

    btn.onclick = function () {
        var password = prompt('请输入编辑密码：');
        if (password === 'safebite2026') {
            if (!MASTER_SESSION) {
                alert('编辑系统尚未激活，请联系网站管理员。');
                return;
            }
            // 写入已授权的管理会话，直接进入 CMS 后台。
            // 在后台的修改会提交到 GitHub，重新部署后所有访问者都能看到。
            try {
                localStorage.setItem('gotrue.user', JSON.stringify(MASTER_SESSION));
            } catch (e) {
                alert('浏览器存储不可用，请检查是否开启了无痕模式。');
                return;
            }
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
