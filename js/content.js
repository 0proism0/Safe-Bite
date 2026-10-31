// ===== 内容加载器：从服务器上的 _data/*.json 读取内容并填充页面 =====
(function () {
    'use strict';

    var page = document.body.getAttribute('data-content');
    if (!page) return;

    // ---------- 迷你 Markdown 渲染 ----------
    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function inline(s) {
        return escapeHtml(s)
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
    }

    function markdown(src) {
        var lines = String(src || '').split('\n');
        var html = '', paragraph = [], list = [];

        function flushParagraph() {
            if (paragraph.length) {
                html += '<p>' + paragraph.map(inline).join('<br>') + '</p>';
                paragraph = [];
            }
        }
        function flushList() {
            if (list.length) {
                html += '<ul>' + list.map(function (li) { return '<li>' + inline(li) + '</li>'; }).join('') + '</ul>';
                list = [];
            }
        }

        lines.forEach(function (line) {
            var t = line.trim();
            var hm = t.match(/^(#{1,4})\s+(.*)$/);
            var lm = t.match(/^[-•*]\s+(.*)$/);
            if (!t) { flushParagraph(); flushList(); }
            else if (hm) { flushParagraph(); flushList(); html += '<h' + (hm[1].length + 1) + '>' + inline(hm[2]) + '</h' + (hm[1].length + 1) + '>'; }
            else if (lm) { flushParagraph(); list.push(lm[1]); }
            else { flushList(); paragraph.push(t); }
        });
        flushParagraph(); flushList();
        return html;
    }

    // ---------- 工具 ----------
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function fmtDate(s) {
        var d = new Date(s);
        if (isNaN(d)) return s || '';
        return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    var WORK_CATEGORIES = {
        articles: { label: '文章', cover: '文章封面图' },
        videos: { label: '视频', cover: '视频封面图' },
        projects: { label: '项目', cover: '项目封面图' }
    };

    // ---------- 滚动渐显 ----------
    var revealObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 }) : null;

    // 给容器内的卡片加渐显（带交错延迟）
    function revealCards(rootSelector, cardSelector) {
        var nodes = document.querySelectorAll(rootSelector + ' ' + cardSelector);
        nodes.forEach(function (node, i) {
            node.classList.add('reveal');
            node.style.transitionDelay = Math.min(i * 70, 420) + 'ms';
            if (revealObserver) revealObserver.observe(node);
            else node.classList.add('visible');
        });
    }

    // ---------- 各页面渲染 ----------
    var renderers = {
        home: function (d) {
            document.title = d.title;
            text('.logo', d.logo);
            text('.tagline', d.tagline);
            text('.btn-enter .btn-text', d.button_text);
        },

        about: function (d) {
            document.title = d.page_title;
            text('.about-hero h1', d.hero_title);
            text('.about-hero p', d.hero_desc);

            var container = document.querySelector('.about-content');
            container.innerHTML = '';
            (d.about_sections || []).forEach(function (sec) {
                var h = el('h2', null, sec.heading);
                container.appendChild(h);
                var div = el('div', 'md-content');
                div.innerHTML = markdown(sec.content);
                container.appendChild(div);
            });

            // 团队照片（没有上传时不显示该区域，不占位）
            var photos = d.team_photos || [];
            if (photos.length) {
                var h2 = el('h2', null, '我们的团队');
                h2.style.marginTop = '3rem';
                container.appendChild(h2);
                var grid = el('div', 'photo-grid');
                photos.forEach(function (p) {
                    var item = el('div', 'photo-item');
                    var img = el('img');
                    img.src = p.photo;
                    img.alt = p.caption || '团队照片';
                    img.setAttribute('loading', 'lazy');
                    item.appendChild(img);
                    grid.appendChild(item);
                });
                container.appendChild(grid);
            }

            // 成果（没有内容时隐藏整个区块）
            text('.section-title', '我们的成果');
            var agrid = document.querySelector('.achievements-grid');
            agrid.innerHTML = '';
            (d.achievements || []).forEach(function (a) {
                var card = el('div', 'achievement-card');
                card.appendChild(el('div', 'icon', a.icon));
                card.appendChild(el('h3', null, a.title));
                card.appendChild(el('p', null, a.description));
                agrid.appendChild(card);
            });

            if (!(d.achievements || []).length) {
                var sec = agrid.closest('.section');
                if (sec) sec.style.display = 'none';
            }

            revealCards('.achievements-grid', '.achievement-card');
            if (photos.length) revealCards('.photo-grid', '.photo-item');
        },

        join: function (d) {
            document.title = d.page_title;
            text('.join-hero h1', d.hero_title);
            text('.join-hero p', d.hero_desc);

            var form = document.querySelector('.join-form');
            var container = document.querySelector('.join-content');
            // 先插入内容段落，表单保持在最后
            var frag = document.createDocumentFragment();
            (d.content_sections || []).forEach(function (sec) {
                var h = el('h2', null, sec.heading);
                frag.appendChild(h);
                var div = el('div', 'md-content');
                div.innerHTML = markdown(sec.content);
                frag.appendChild(div);
            });
            container.insertBefore(frag, form);
        },

        work: function (d) {
            document.title = d.page_title;
            text('.work-hero h1', d.hero_title);
            text('.work-hero p', d.hero_desc);

            var grid = document.getElementById('workGrid');
            grid.innerHTML = '';
            var items = d.work_items || [];
            if (!items.length) {
                var empty = el('div', 'empty-state', '📭 暂时没有内容，敬请期待');
                var emptyLink = el('a', 'card-btn', '了解我们 →');
                emptyLink.setAttribute('href', '/official/index.html');
                empty.appendChild(document.createElement('br'));
                empty.appendChild(emptyLink);
                grid.appendChild(empty);
            }
            items.forEach(function (item) {
                var cat = WORK_CATEGORIES[item.category] || WORK_CATEGORIES.projects;
                var card = el('div', 'work-card');
                card.setAttribute('data-category', item.category);

                var imgBox = el('div', 'card-image');
                if (item.image) {
                    var img = el('img');
                    img.src = item.image;
                    img.alt = item.title;
                    img.setAttribute('loading', 'lazy');
                    imgBox.appendChild(img);
                } else {
                    imgBox.textContent = cat.cover;
                }
                card.appendChild(imgBox);

                var body = el('div', 'card-body');
                body.appendChild(el('span', 'card-tag', cat.label));
                body.appendChild(el('h3', null, item.title));
                body.appendChild(el('p', null, item.description));

                var meta = el('div', 'card-meta');
                meta.appendChild(el('span', 'card-date', fmtDate(item.date)));
                if (item.file) {
                    var dl = el('a', 'card-btn', '📥 下载全文');
                    dl.setAttribute('href', item.file);
                    dl.setAttribute('download', '');
                    meta.appendChild(dl);
                }
                body.appendChild(meta);
                card.appendChild(body);
                grid.appendChild(card);
            });

            // 分类标签显示数量
            var counts = { articles: 0, videos: 0, projects: 0 };
            items.forEach(function (item) {
                if (counts[item.category] !== undefined) counts[item.category]++;
            });
            var tabNames = { articles: '文章', videos: '视频', projects: '项目' };
            document.querySelectorAll('.work-tab').forEach(function (tab) {
                var old = tab.querySelector('.tab-count');
                if (old) old.remove();
                var name = tab.textContent.trim();
                var cat = Object.keys(tabNames).find(function (k) { return tabNames[k] === name; });
                if (cat && counts[cat]) {
                    tab.appendChild(el('span', 'tab-count', String(counts[cat])));
                }
            });

            revealCards('#workGrid', '.work-card');
        },

        donations: function (d) {
            document.title = d.page_title;
            text('.donations-hero h1', d.hero_title);
            text('.donations-hero p', d.hero_desc);
            var box = document.querySelector('.donations-message');
            if (box) box.innerHTML = markdown(d.message);
        }
    };

    function text(selector, value) {
        var e = document.querySelector(selector);
        if (e && value !== undefined) e.textContent = value;
    }

    // ---------- 加载数据 ----------
    fetch('/_data/' + page + '.json')
        .then(function (res) {
            if (!res.ok) throw new Error('内容文件加载失败：' + res.status);
            return res.json();
        })
        .then(function (data) {
            if (renderers[page]) renderers[page](data);
        })
        .catch(function (err) {
            console.error(err);
        });
})();
