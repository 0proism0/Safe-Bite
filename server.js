// ===== SafeBite 本地开发服务器（零依赖，Node.js 即可运行）=====
// 用法：node server.js  （默认 http://localhost:8000）
// 提供静态文件服务，并实现与 admin/save.php 完全相同的保存 / 上传接口，
// 因此本地没有 PHP 也能完整使用内容管理后台。
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 8000;

// 与 admin/save.php 保持一致
const PASSWORD_HASH = '0631730f0dc0a1f47dbbb72f2d9fef75d72b86a73f08b502370f68a2564d1df2';
const SALT = 'sb!2026#xK9';
const ALLOWED_FILES = ['home', 'about', 'join', 'work', 'donations'];

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
    const body = JSON.stringify(obj);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
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
        let name = String(input.name || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!/\.(jpe?g|png|gif|webp|svg)$/i.test(name)) return fail(res, '只支持 jpg / png / gif / webp / svg 图片');
        if (data.indexOf('data:image') !== 0) return fail(res, '图片数据无效');
        if (data.length > 8 * 1024 * 1024) return fail(res, '图片不能超过 8MB');
        const bin = Buffer.from(data.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ''), 'base64');
        if (!bin.length) return fail(res, '图片解码失败');
        const dir = path.join(ROOT, 'images', 'uploads');
        fs.mkdirSync(dir, { recursive: true });
        const filename = timestamp() + '-' + rand() + '-' + name;
        fs.writeFileSync(path.join(dir, filename), bin);
        return sendJson(res, 200, { ok: true, path: '/images/uploads/' + filename });
    }

    if (action === 'upload-file') {
        const data = input.data || '';
        let name = String(input.name || 'file.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!/\.(pdf|docx?|txt|md|pptx?|xlsx?)$/i.test(name)) return fail(res, '只支持 pdf / doc / docx / txt / md / ppt / xls / xlsx 文件');
        if (data.indexOf('data:') !== 0) return fail(res, '文件数据无效');
        if (data.length > 40 * 1024 * 1024) return fail(res, '文件不能超过 30MB');
        const bin = Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64');
        if (!bin.length) return fail(res, '文件解码失败');
        const dir = path.join(ROOT, 'files');
        fs.mkdirSync(dir, { recursive: true });
        const filename = timestamp() + '-' + rand() + '-' + name;
        fs.writeFileSync(path.join(dir, filename), bin);
        return sendJson(res, 200, { ok: true, path: '/files/' + filename });
    }

    // 保存内容
    const file = input.file || '';
    if (ALLOWED_FILES.indexOf(file) === -1) return fail(res, '不允许的文件名');
    if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) return fail(res, '内容必须是 JSON 对象');
    const dir = path.join(ROOT, '_data');
    fs.mkdirSync(dir, { recursive: true });
    const content = JSON.stringify(input.data, null, 2);
    try {
        fs.writeFileSync(path.join(dir, file + '.json'), content);
    } catch (e) {
        return fail(res, '保存失败：' + e.message, 500);
    }
    sendJson(res, 200, { ok: true });
}

function pad(n) { return String(n).padStart(2, '0'); }
function timestamp() {
    const d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
        pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}
function rand() { return crypto.randomBytes(4).toString('hex'); }

// ---------- 静态文件 ----------
function serveStatic(urlPath, res) {
    let rel = decodeURIComponent(urlPath.split('?')[0]);
    if (rel === '/') rel = '/index.html';
    if (rel.endsWith('/')) rel += 'index.html';
    // 防目录穿越
    const filePath = path.normalize(path.join(ROOT, rel));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

    fs.stat(filePath, function (err, stat) {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found: ' + rel);
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        fs.createReadStream(filePath).pipe(res);
    });
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
    console.log('✅ SafeBite 本地服务器已启动： http://localhost:' + PORT);
    console.log('   后台地址： http://localhost:' + PORT + '/admin/');
});
