// ===== SafeBite 内容管理后台 =====
(function () {
    'use strict';

    // 页面结构定义：每个内容文件有哪些字段
    var SCHEMAS = {
        home: {
            label: '🏠 主页',
            fields: [
                { key: 'title', label: '网站标题（浏览器标签上显示的）', type: 'text' },
                { key: 'logo', label: '网站名称（大标题）', type: 'text' },
                { key: 'tagline', label: '标语（副标题）', type: 'text' },
                { key: 'button_text', label: '按钮文字', type: 'text' }
            ]
        },
        about: {
            label: 'ℹ️ 关于我们',
            fields: [
                { key: 'page_title', label: '页面标题（浏览器标签）', type: 'text' },
                { key: 'hero_title', label: '大标题', type: 'text' },
                { key: 'hero_desc', label: '副标题', type: 'textarea' },
                {
                    key: 'about_sections', label: '📋 简介段落', type: 'list', itemName: '段落', fields: [
                        { key: 'heading', label: '小标题', type: 'text' },
                        { key: 'content', label: '正文内容（支持 **加粗**、- 列表）', type: 'textarea' }
                    ]
                },
                {
                    key: 'team_photos', label: '📷 团队照片', type: 'list', itemName: '照片', fields: [
                        { key: 'photo', label: '照片', type: 'image' },
                        { key: 'caption', label: '照片说明（可选）', type: 'text' }
                    ]
                },
                {
                    key: 'achievements', label: '🏆 成果展示', type: 'list', itemName: '成果', fields: [
                        { key: 'icon', label: '图标（emoji，如 🏆 📊 🤝）', type: 'text' },
                        { key: 'title', label: '成果标题', type: 'text' },
                        { key: 'description', label: '成果描述', type: 'textarea' }
                    ]
                }
            ]
        },
        join: {
            label: '🙋 加入我们',
            fields: [
                { key: 'page_title', label: '页面标题（浏览器标签）', type: 'text' },
                { key: 'hero_title', label: '大标题', type: 'text' },
                { key: 'hero_desc', label: '副标题', type: 'textarea' },
                {
                    key: 'content_sections', label: '📝 内容段落', type: 'list', itemName: '段落', fields: [
                        { key: 'heading', label: '小标题', type: 'text' },
                        { key: 'content', label: '正文内容（支持 **加粗**、- 列表）', type: 'textarea' }
                    ]
                }
            ]
        },
        work: {
            label: '💼 我们的成果',
            fields: [
                { key: 'page_title', label: '页面标题（浏览器标签）', type: 'text' },
                { key: 'hero_title', label: '大标题', type: 'text' },
                { key: 'hero_desc', label: '副标题', type: 'textarea' },
                {
                    key: 'work_items', label: '📄 文章 / 🎬 视频 / 📁 项目', type: 'list', itemName: '条目', fields: [
                        {
                            key: 'category', label: '类型', type: 'select', options: [
                                { value: 'articles', label: '📄 文章' },
                                { value: 'videos', label: '🎬 视频' },
                                { value: 'projects', label: '📁 项目' }
                            ]
                        },
                        { key: 'image', label: '封面图片', type: 'image' },
                        { key: 'title', label: '标题', type: 'text' },
                        { key: 'description', label: '简短描述', type: 'textarea' },
                        { key: 'date', label: '发布日期', type: 'date' }
                    ]
                }
            ]
        },
        donations: {
            label: '💰 捐赠页面',
            fields: [
                { key: 'page_title', label: '页面标题（浏览器标签）', type: 'text' },
                { key: 'hero_title', label: '大标题', type: 'text' },
                { key: 'hero_desc', label: '副标题', type: 'textarea' },
                { key: 'message', label: '提示信息（支持 **加粗**、- 列表）', type: 'textarea' }
            ]
        }
    };

    var EDIT_PASSWORD = 'safebite2026';
    var PAGE_KEYS = Object.keys(SCHEMAS);

    var currentPage = null;
    var password = sessionStorage.getItem('sb_admin_pwd') || '';

    // ---------- 登录 ----------
    var loginScreen = document.getElementById('login-screen');
    var loginForm = document.getElementById('login-form');
    var loginError = document.getElementById('login-error');

    function tryLogin() {
        if (password === EDIT_PASSWORD) {
            sessionStorage.setItem('sb_admin_pwd', password);
            loginScreen.style.display = 'none';
            document.getElementById('editor').style.display = 'block';
            document.getElementById('status-bar').style.display = 'flex';
            initTabs();
            openPage(PAGE_KEYS[0]);
        } else {
            loginScreen.style.display = 'flex';
        }
    }

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = document.getElementById('login-password').value;
        if (input === EDIT_PASSWORD) {
            password = input;
            loginError.textContent = '';
            tryLogin();
        } else {
            loginError.textContent = '密码错误，请重试。';
        }
    });

    document.getElementById('logout-btn').onclick = function () {
        sessionStorage.removeItem('sb_admin_pwd');
        window.location.reload();
    };

    // ---------- 标签页 ----------
    function initTabs() {
        var tabs = document.getElementById('tabs');
        tabs.innerHTML = '';
        PAGE_KEYS.forEach(function (key) {
            var btn = document.createElement('button');
            btn.className = 'tab';
            btn.textContent = SCHEMAS[key].label;
            btn.setAttribute('data-page', key);
            btn.onclick = function () { openPage(key); };
            tabs.appendChild(btn);
        });
    }

    function setActiveTab(key) {
        document.querySelectorAll('.tab').forEach(function (t) {
            t.classList.toggle('active', t.getAttribute('data-page') === key);
        });
    }

    // ---------- 表单生成 ----------
    function fieldHtml(field, value, prefix) {
        var name = prefix + '.' + field.key;
        var v = (value === undefined || value === null) ? '' : value;
        var html = '<div class="field"><label>' + field.label + '</label>';
        if (field.type === 'textarea') {
            html += '<textarea data-name="' + name + '">' + escapeHtml(v) + '</textarea>';
        } else if (field.type === 'select') {
            html += '<select data-name="' + name + '">';
            field.options.forEach(function (o) {
                html += '<option value="' + o.value + '"' + (o.value === v ? ' selected' : '') + '>' + o.label + '</option>';
            });
            html += '</select>';
        } else if (field.type === 'image') {
            html += '<div class="img-row"><div class="field"><input type="text" data-name="' + name + '" value="' + escapeAttr(v) + '" placeholder="图片地址，或点击右侧上传"></div>';
            html += '<button type="button" class="btn btn-small" data-upload="' + name + '">📤 上传图片</button></div>';
            if (v) html += '<img class="img-preview" src="' + escapeAttr(v) + '">';
            html += '<div class="hint">建议先用手机/电脑压缩图片，越小加载越快</div>';
        } else if (field.type === 'date') {
            html += '<input type="date" data-name="' + name + '" value="' + escapeAttr(String(v).slice(0, 10)) + '">';
        } else {
            html += '<input type="text" data-name="' + name + '" value="' + escapeAttr(v) + '">';
        }
        html += '</div>';
        return html;
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function escapeAttr(s) {
        return escapeHtml(s).replace(/"/g, '&quot;');
    }

    function renderForm(key, data) {
        var schema = SCHEMAS[key];
        var panel = document.getElementById('form-panel');
        var html = '';

        schema.fields.forEach(function (field) {
            if (field.type === 'list') {
                html += '<div class="field"><label>' + field.label + '</label><div data-list="' + field.key + '">';
                var items = Array.isArray(data[field.key]) ? data[field.key] : [];
                items.forEach(function (item, i) {
                    html += listItemHtml(field, item, i);
                });
                html += '</div><button type="button" class="btn btn-small add-item" data-add="' + field.key + '">＋ 添加' + field.itemName + '</button></div>';
            } else {
                html += fieldHtml(field, data[field.key], 'f');
            }
        });

        panel.innerHTML = html;
        panel.setAttribute('data-page', key);

        // 绑定添加按钮
        panel.querySelectorAll('[data-add]').forEach(function (btn) {
            btn.onclick = function () {
                var listKey = btn.getAttribute('data-add');
                var field = schema.fields.find(function (f) { return f.key === listKey; });
                var listEl = panel.querySelector('[data-list="' + listKey + '"]');
                var count = listEl.children.length;
                var wrap = document.createElement('div');
                wrap.innerHTML = listItemHtml(field, {}, count);
                var node = wrap.firstChild;
                listEl.appendChild(node);
                bindListButtons(panel);
            };
        });

        bindListButtons(panel);
        bindUploadButtons(panel);
    }

    function listItemHtml(field, item, index) {
        var html = '<div class="list-item" data-list-key="' + field.key + '">';
        html += '<div class="list-item-head"><span class="title">' + field.itemName + ' #' + (index + 1) + '</span>';
        html += '<div class="list-actions"><button type="button" class="btn btn-small btn-danger" data-remove>🗑 删除</button></div></div>';
        field.fields.forEach(function (f) {
            html += fieldHtml(f, item[f.key], 'l.' + field.key + '.' + index);
        });
        html += '</div>';
        return html;
    }

    function bindListButtons(panel) {
        panel.querySelectorAll('.list-item [data-remove]').forEach(function (btn) {
            btn.onclick = function () {
                if (confirm('确定删除这一条吗？')) btn.closest('.list-item').remove();
            };
        });
    }

    // ---------- 图片上传 ----------
    function bindUploadButtons(panel) {
        panel.querySelectorAll('[data-upload]').forEach(function (btn) {
            btn.onclick = function () {
                var name = btn.getAttribute('data-upload');
                var input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = function () {
                    var file = input.files[0];
                    if (!file) return;
                    if (file.size > 8 * 1024 * 1024) { alert('图片不能超过 8MB'); return; }
                    var reader = new FileReader();
                    reader.onload = function () {
                        setStatus('正在上传图片…', '');
                        post('upload', { name: file.name, data: reader.result })
                            .then(function (res) {
                                var fieldInput = panel.querySelector('[data-name="' + name + '"]');
                                fieldInput.value = res.path;
                                var old = fieldInput.closest('.img-row').parentElement.querySelector('.img-preview');
                                if (old) old.remove();
                                var img = document.createElement('img');
                                img.className = 'img-preview';
                                img.src = res.path;
                                fieldInput.closest('.img-row').after(img);
                                setStatus('✅ 图片已上传', 'ok');
                            })
                            .catch(function (err) {
                                setStatus('❌ 上传失败：' + err.message, 'error');
                            });
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            };
        });
    }

    // ---------- 打开页面 ----------
    function openPage(key) {
        currentPage = key;
        setActiveTab(key);
        setStatus('正在加载…', '');
        fetch('/_data/' + key + '.json')
            .then(function (res) {
                if (!res.ok) throw new Error('加载失败：' + res.status);
                return res.json();
            })
            .then(function (data) {
                renderForm(key, data);
                setStatus('已加载「' + SCHEMAS[key].label + '」，修改后记得保存', '');
            })
            .catch(function (err) {
                setStatus('❌ ' + err.message, 'error');
            });
    }

    // ---------- 收集表单数据 ----------
    function collectData() {
        var panel = document.getElementById('form-panel');
        var schema = SCHEMAS[currentPage];
        var data = {};

        schema.fields.forEach(function (field) {
            if (field.type === 'list') {
                var items = [];
                panel.querySelectorAll('[data-list="' + field.key + '"] .list-item').forEach(function (itemEl) {
                    var item = {};
                    field.fields.forEach(function (f) {
                        // 按字段名后缀匹配（删除条目后索引会不连续）
                        var input = Array.prototype.find.call(
                            itemEl.querySelectorAll('[data-name]'),
                            function (inp) {
                                var n = inp.getAttribute('data-name');
                                return n.indexOf('.' + field.key + '.') === 1 && n.slice(-f.key.length - 1) === '.' + f.key;
                            }
                        );
                        item[f.key] = input ? input.value : '';
                    });
                    items.push(item);
                });
                data[field.key] = items;
            } else {
                var el = panel.querySelector('[data-name="f.' + field.key + '"]');
                data[field.key] = el ? el.value : '';
            }
        });
        return data;
    }

    // ---------- 保存 ----------
    var saveBtn = document.getElementById('save-btn');
    var statusMsg = document.getElementById('status-msg');

    function setStatus(text, cls) {
        statusMsg.textContent = text;
        statusMsg.className = cls || '';
    }

    function post(action, extra) {
        var body = Object.assign({ password: password, action: action }, extra || {});
        return fetch('save.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (res) {
            return res.json().catch(function () {
                throw new Error('服务器未返回有效结果（可能没有启用 PHP）');
            }).then(function (data) {
                if (!res.ok || !data.ok) throw new Error(data.msg || '保存失败');
                return data;
            });
        });
    }

    saveBtn.onclick = function () {
        if (!currentPage) return;
        var data = collectData();
        saveBtn.disabled = true;
        setStatus('正在保存…', '');
        post('save', { file: currentPage, data: data })
            .then(function () {
                setStatus('✅ 已保存！刷新网站即可看到更改', 'ok');
            })
            .catch(function (err) {
                // 服务器没有 PHP：提供手动复制方案
                showManual(currentPage, data, err.message);
                setStatus('❌ ' + err.message, 'error');
            })
            .finally(function () {
                saveBtn.disabled = false;
            });
    };

    // ---------- 手动保存 ----------
    var overlay = document.getElementById('manual-overlay');

    function showManual(file, data, reason) {
        document.getElementById('manual-file').textContent = file;
        document.getElementById('manual-json').value =
            '// 保存为 _data/' + file + '.json（原因：' + reason + '）\n' +
            JSON.stringify(data, null, 2);
        overlay.classList.add('open');
    }

    document.getElementById('manual-copy').onclick = function () {
        var ta = document.getElementById('manual-json');
        ta.select();
        document.execCommand('copy');
        this.textContent = '✅ 已复制';
        var self = this;
        setTimeout(function () { self.textContent = '📋 复制内容'; }, 1500);
    };
    document.getElementById('manual-close').onclick = function () {
        overlay.classList.remove('open');
    };

    // ---------- 启动 ----------
    tryLogin();
})();
