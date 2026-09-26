// ===== 网站内容编辑器 =====
(function() {
    'use strict';

    // 检查是否已登录
    const isLoggedIn = localStorage.getItem('safebite_editor_auth') === 'true';
    
    // 创建编辑工具栏
    function createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'editor-toolbar';
        toolbar.innerHTML = `
            <div class="toolbar-content">
                <span class="toolbar-title">📝 编辑模式</span>
                <button class="toolbar-btn" onclick="toggleEdit()">✏️ 编辑内容</button>
                <button class="toolbar-btn save-btn" onclick="saveChanges()" style="display:none">💾 保存</button>
                <button class="toolbar-btn cancel-btn" onclick="cancelEdit()" style="display:none">❌ 取消</button>
                <button class="toolbar-btn" onclick="logout()">🚪 退出</button>
            </div>
        `;
        document.body.appendChild(toolbar);
    }

    // 登录功能
    function login() {
        const password = prompt('请输入编辑密码：');
        if (password === 'safebite2026') {  // 编辑密码
            localStorage.setItem('safebite_editor_auth', 'true');
            location.reload();
        } else if (password !== null) {
            alert('密码错误！');
        }
    }

    // 退出登录
    function logout() {
        if (confirm('确定要退出编辑模式吗？')) {
            localStorage.removeItem('safebite_editor_auth');
            location.reload();
        }
    }

    // 进入编辑模式
    let editMode = false;
    let originalContent = {};

    function toggleEdit() {
        editMode = !editMode;
        const saveBtn = document.querySelector('.save-btn');
        const cancelBtn = document.querySelector('.cancel-btn');
        const editBtn = document.querySelector('.toolbar-btn:not(.save-btn):not(.cancel-btn)');
        
        if (editMode) {
            // 进入编辑模式
            document.body.classList.add('edit-mode');
            saveBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'inline-block';
            editBtn.style.display = 'none';
            
            // 使所有文本可编辑
            makeEditable();
        } else {
            // 退出编辑模式
            document.body.classList.remove('edit-mode');
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            editBtn.style.display = 'inline-block';
        }
    }

    // 使内容可编辑
    function makeEditable() {
        // 保存原始内容
        originalContent = {};
        
        // 所有标题、段落、按钮文字都可编辑
        const editableSelectors = 'h1, h2, h3, p, .tagline, .btn-enter, .btn-submit, .card-tag, .section-title, .section-subtitle';
        
        document.querySelectorAll(editableSelectors).forEach((el, index) => {
            const id = 'edit-' + index;
            el.setAttribute('data-edit-id', id);
            originalContent[id] = el.innerHTML;
            el.contentEditable = true;
            el.classList.add('editable');
        });

        // 图片上传功能
        document.querySelectorAll('.photo-item, .card-image, .achievement-card .icon').forEach((el, index) => {
            const id = 'img-' + index;
            el.setAttribute('data-img-id', id);
            originalContent[id] = el.innerHTML;
            
            // 创建上传按钮
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'img-upload-btn';
            uploadBtn.innerHTML = '📷 更换图片';
            uploadBtn.onclick = function(e) {
                e.preventDefault();
                uploadImage(el);
            };
            el.appendChild(uploadBtn);
            el.classList.add('editable-image');
        });
    }

    // 上传图片
    function uploadImage(container) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    // 保存图片到 localStorage
                    const imgId = container.getAttribute('data-img-id');
                    localStorage.setItem('safebite_img_' + imgId, event.target.result);
                    
                    // 更新显示
                    container.innerHTML = `<img src="${event.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
                    container.appendChild(createUploadBtn(container));
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    // 创建上传按钮
    function createUploadBtn(container) {
        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'img-upload-btn';
        uploadBtn.innerHTML = '📷 更换图片';
        uploadBtn.onclick = function(e) {
            e.preventDefault();
            uploadImage(container);
        };
        return uploadBtn;
    }

    // 保存更改
    function saveChanges() {
        // 保存文本内容
        document.querySelectorAll('[data-edit-id]').forEach(el => {
            const id = el.getAttribute('data-edit-id');
            localStorage.setItem('safebite_text_' + id, el.innerHTML);
        });

        alert('✅ 保存成功！刷新页面后更改仍然有效。');
        toggleEdit();
    }

    // 取消编辑
    function cancelEdit() {
        if (confirm('确定要放弃所有更改吗？')) {
            // 恢复原始内容
            document.querySelectorAll('[data-edit-id]').forEach(el => {
                const id = el.getAttribute('data-edit-id');
                if (originalContent[id]) {
                    el.innerHTML = originalContent[id];
                }
                el.contentEditable = false;
                el.classList.remove('editable');
            });

            // 移除图片上传按钮
            document.querySelectorAll('.img-upload-btn').forEach(btn => btn.remove());
            document.querySelectorAll('.editable-image').forEach(el => el.classList.remove('editable-image'));

            toggleEdit();
        }
    }

    // 加载保存的内容
    function loadSavedContent() {
        // 加载文本
        document.querySelectorAll('h1, h2, h3, p, .tagline, .btn-enter, .btn-submit, .card-tag, .section-title, .section-subtitle').forEach((el, index) => {
            const id = 'edit-' + index;
            const saved = localStorage.getItem('safebite_text_' + id);
            if (saved) {
                el.innerHTML = saved;
            }
        });

        // 加载图片
        document.querySelectorAll('.photo-item, .card-image, .achievement-card .icon').forEach((el, index) => {
            const id = 'img-' + index;
            const saved = localStorage.getItem('safebite_img_' + id);
            if (saved) {
                el.innerHTML = `<img src="${saved}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
            }
        });
    }

    // 初始化
    if (isLoggedIn) {
        createToolbar();
        loadSavedContent();
    } else {
        // 显示登录按钮
        const loginBtn = document.createElement('button');
        loginBtn.id = 'editor-login-btn';
        loginBtn.innerHTML = '🔐 编辑登录';
        loginBtn.onclick = login;
        document.body.appendChild(loginBtn);
    }

    // 全局函数
    window.toggleEdit = toggleEdit;
    window.saveChanges = saveChanges;
    window.cancelEdit = cancelEdit;
    window.logout = logout;
})();
