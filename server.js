// ===== SafeBite 本地/自有服务器（零依赖，Node.js 即可运行）=====
// 用法：node server.js  （默认 http://localhost:8787，可用 PORT 环境变量改端口）
//
// 提供静态文件服务，并实现保存 / 图片上传 / 附件上传接口（与 admin/save.php 等价）。
//
// ★ 权限自适应：启动时检测 _data / images/uploads / files 是否可写。
//   不可写（例如目录归 root 所有）时，自动改用当前用户主目录下的
//   ~/.safebite-data / ~/.safebite-uploads，对外 URL 保持不变。
//   因此把本文件上传到服务器后无需 chmod/chown，直接可用。
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 8787;

// 与 admin/save.php 保持一致
const PASSWORD_HASH = '0631730f0dc0a1f47dbbb72f2d9fef75d72b86a73f08b502370f68a2564d1df2';
const SALT = 'sb!2026#xK9';
const ALLOWED_FILES = ['home', 'about', 'join', 'work', 'donations'];

// ---------- 可写目录自适应 ----------
// 优先使用站点目录；不可写则回退到用户主目录（任何用户都能写自己的家目录）
function pickWritable(preferred, fallback) {
    const out = { preferred: preferred, alt: fallback, dir: null, fallback: false };
    try {
        fs.mkdirSync(preferred, { recursive: true });
        fs.accessSync(preferred, fs.constants.W_OK);
        out.dir = preferred;
    } catch (e) {
        fs.mkdirSync(fallback, { recursive: true });
        out.dir = fallback;
        out.fallback = true;
    }
    return out;
}

const DATA = pickWritable(path.join(ROOT, '_data'), path.join(os.homedir(), '.safebite-data'));
const IMAGES = pickWritable(path.join(ROOT, 'images', 'uploads'), path.join(os.homedir(), '.safebite-uploads', 'images'));
const FILES = pickWritable(path.join(ROOT, 'files'), path.join(os.homedir(), '.safebite-uploads', 'files'));

// 回退迁移：站点目录里有旧数据、回退目录是空的 → 自动复制过去，避免内容“消失”
function migrateInto(picked, preferred) {
    if (!picked.fallback) return;
    let existing = [];
    try { existing = fs.readdirSync(preferred); } catch (e) { return; }
    existing.forEach(function (name) {
        const from = path.join(preferred, name);
        const to = path.join(picked.dir, name);
        try {
            if (!fs.existsSync(to) && fs.statSync(from).isFile()) {
                fs.copyFileSync(from, to);
                console.log('   ↳ 已迁移: ' + name);
            }
        } catch (e) { /* 读取失败则跳过 */ }
    });
}
migrateInto(DATA, path.join(ROOT, '_data'));
migrateInto(IMAGES, path.join(ROOT, 'images', 'uploads'));
migrateInto(FILES, path.join(ROOT, 'files'));

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function sendJson(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
}

function fail(res, msg, code) {
    sendJson(res, code || 400, { ok: false, msg: msg });
}

function readBody(req, limit) {
    return new Promise(function (resolve, reject) {
        const chunks = [];
        let size = 0;
        req.on('data', function (c) {
            size += c.length;
            if (size > limit) { reject(new Error('请求太大')); req.destroy(); return; }
            chunks.push(c);
        });
        req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
        req.on('error', reject);
    });
}

function pad(n) { return String(n).padStart(2, '0'); }
function timestamp() {
    const d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
        pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}
function rand() { return crypto.randomBytes(4).toString('hex'); }

function writeFileSafe(res, store, filename, bin, what) {
    // 在指定目录写入；EACCES/EPERM 时先尝试“临时文件 + 改名”原子替换
    //（旧文件归其他用户所有、但目录可写时，直接覆盖会被拒绝，改名替换可以成功），
    // 仍失败则自动切换到备用目录（用户主目录）重试一次。
    function attempt(dir) {
        const target = path.join(dir, filename);
        try {
            fs.writeFileSync(target, bin);
            return true;
        } catch (e) {
            if (e.code !== 'EACCES' && e.code !== 'EPERM') throw e;
            try {
                const tmp = target + '.tmp-' + rand();
                fs.writeFileSync(tmp, bin);
                fs.renameSync(tmp, target);
                return true;
            } catch (e2) {
                if (e2.code !== 'EACCES' && e2.code !== 'EPERM') throw e2;
                return false;
            }
        }
    }

    try {
        if (attempt(store.dir)) return true;

        if (!store.fallback) {
            fs.mkdirSync(store.alt, { recursive: true });
            // 切换前把旧文件带过去，避免内容“丢回默认值”
            try {
                const from = path.join(store.preferred, filename);
                const to = path.join(store.alt, filename);
                if (!fs.existsSync(to) && fs.existsSync(from)) fs.copyFileSync(from, to);
            } catch (e) { /* 复制失败不阻塞 */ }
            if (attempt(store.alt)) {
                store.dir = store.alt;
                store.fallback = true;
                console.log('   ↳ ' + what + '目录不可写，已自动切换到： ' + store.alt);
                return true;
            }
        }
    } catch (e) {
        fail(res, '保存失败：' + e.message, 500);
        return false;
    }
    fail(res, '保存失败：' + what + '目录不可写，请联系管理员检查权限', 500);
    return false;
}

// ---------- 保存接口（与 save.php 相同） ----------
async function handleSave(req, res) {
    let input;
    try {
        input = JSON.parse(await readBody(req, 50 * 1024 * 1024));
    } catch (e) {
        return fail(res, '请求格式错误');
    }
    if (!input || typeof input !== 'object') return fail(res, '请求格式错误');

    const hash = crypto.createHash('sha256').update((input.password || '') + SALT).digest('hex');
    const a = Buffer.from(hash, 'utf8');
    const b = Buffer.from(PASSWORD_HASH, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail(res, '密码错误', 403);

    const action = input.action || 'save';

    if (action === 'upload') {
        const data = input.data || '';
        const name = String(input.name || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!/\.(jpe?g|png|gif|webp|svg)$/i.test(name)) return fail(res, '只支持 jpg / png / gif / webp / svg 图片');
        if (data.indexOf('data:image') !== 0) return fail(res, '图片数据无效');
        if (data.length > 8 * 1024 * 1024) return fail(res, '图片不能超过 8MB');
        const bin = Buffer.from(data.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ''), 'base64');
        if (!bin.length) return fail(res, '图片解码失败');
        const filename = timestamp() + '-' + rand() + '-' + name;
        if (!writeFileSafe(res, IMAGES, filename, bin, '图片上传')) return;
        return sendJson(res, 200, { ok: true, path: '/images/uploads/' + filename });
    }

    if (action === 'upload-file') {
        const data = input.data || '';
        const name = String(input.name || 'file.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!/\.(pdf|docx?|txt|md|pptx?|xlsx?)$/i.test(name)) return fail(res, '只支持 pdf / doc / docx / txt / md / ppt / xls / xlsx 文件');
        if (data.indexOf('data:') !== 0) return fail(res, '文件数据无效');
        if (data.length > 40 * 1024 * 1024) return fail(res, '文件不能超过 30MB');
        const bin = Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64');
        if (!bin.length) return fail(res, '文件解码失败');
        const filename = timestamp() + '-' + rand() + '-' + name;
        if (!writeFileSafe(res, FILES, filename, bin, '附件上传')) return;
        return sendJson(res, 200, { ok: true, path: '/files/' + filename });
    }

    // 保存内容
    const file = input.file || '';
    if (ALLOWED_FILES.indexOf(file) === -1) return fail(res, '不允许的文件名');
    if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) return fail(res, '内容必须是 JSON 对象');
    const content = JSON.stringify(input.data, null, 2);
    if (!writeFileSafe(res, DATA, file + '.json', content, '内容')) return;
    sendJson(res, 200, { ok: true });
}

// ---------- 静态文件与数据路由 ----------
function sendFile(filePath, res) {
    fs.stat(filePath, function (err, stat) {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        fs.createReadStream(filePath).pipe(res);
    });
}

// 把对外 URL 映射到实际存储目录（可能是回退目录）
function resolveUrl(rel) {
    let base = null;
    let rest = null;
    if (rel === '/_data' || rel.startsWith('/_data/')) {
        base = DATA.dir;
        rest = rel.slice('/_data'.length);
    } else if (rel.startsWith('/images/uploads/')) {
        base = IMAGES.dir;
        rest = rel.slice('/images/uploads'.length);
    } else if (rel.startsWith('/files/')) {
        base = FILES.dir;
        rest = rel.slice('/files'.length);
    }
    if (base === null) return null;
    const full = path.normalize(path.join(base, rest || '/'));
    if (!full.startsWith(path.normalize(base))) return null; // 防目录穿越
    return full;
}

function serveStatic(urlPath, res) {
    let rel = decodeURIComponent(urlPath.split('?')[0]);
    if (rel === '/') rel = '/index.html';
    if (rel.endsWith('/')) rel += 'index.html';

    // 数据类路径优先走存储目录（支持回退位置）
    const mapped = resolveUrl(rel);
    if (mapped) return sendFile(mapped, res);

    const filePath = path.normalize(path.join(ROOT, rel));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
    sendFile(filePath, res);
}

const server = http.createServer(function (req, res) {
    const urlPath = req.url.split('?')[0];
    if (req.method === 'POST' && urlPath === '/admin/save.php') {
        handleSave(req, res).catch(function (e) { fail(res, '服务器错误：' + e.message, 500); });
        return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    serveStatic(urlPath, res);
});

server.listen(PORT, function () {
    console.log('✅ SafeBite 服务器已启动： http://localhost:' + PORT);
    console.log('   后台地址： http://localhost:' + PORT + '/admin/');
    [ ['内容数据', DATA], ['上传图片', IMAGES], ['上传附件', FILES] ].forEach(function (x) {
        console.log('   ' + x[0] + '： ' + x[1].dir + (x[1].fallback ? '（站点目录不可写，已自动切换）' : ''));
    });
});
