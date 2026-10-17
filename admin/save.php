<?php
// ===== 内容保存接口 =====
// 校验密码后，把 JSON 内容写入 _data/ 目录，或把上传的图片写入 images/uploads/。
header('Content-Type: application/json; charset=utf-8');

const PASSWORD_HASH = '0631730f0dc0a1f47dbbb72f2d9fef75d72b86a73f08b502370f68a2564d1df2';
const SALT = 'sb!2026#xK9';
// 允许写入的内容文件（防止任意路径写入）
const ALLOWED_FILES = ['home', 'about', 'join', 'work', 'donations'];

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'msg' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// 只接受 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('只允许 POST 请求', 405);

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) fail('请求格式错误');

// 密码校验（服务端真正的验证）
if (hash('sha256', ($input['password'] ?? '') . SALT) !== PASSWORD_HASH) {
    fail('密码错误', 403);
}

$action = $input['action'] ?? 'save';

// ---------- 图片上传 ----------
if ($action === 'upload') {
    $data = $input['data'] ?? '';
    $name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $input['name'] ?? 'image.jpg');
    if (!preg_match('/\.(jpe?g|png|gif|webp|svg)$/i', $name)) fail('只支持 jpg / png / gif / webp / svg 图片');
    if (strpos($data, 'data:image') !== 0) fail('图片数据无效');
    if (strlen($data) > 8 * 1024 * 1024) fail('图片不能超过 8MB');

    $bin = base64_decode(preg_replace('/^data:image\/[a-z]+;base64,/', '', $data));
    if (!$bin) fail('图片解码失败');

    if (!is_dir(__DIR__ . '/../images/uploads')) {
        mkdir(__DIR__ . '/../images/uploads', 0755, true);
    }
    $filename = date('Ymd-His') . '-' . $name;
    $path = __DIR__ . '/../images/uploads/' . $filename;
    if (file_put_contents($path, $bin) === false) fail('图片保存失败，请检查目录权限');

    echo json_encode(['ok' => true, 'path' => '/images/uploads/' . $filename], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------- 保存内容 ----------
$file = $input['file'] ?? '';
if (!in_array($file, ALLOWED_FILES, true)) fail('不允许的文件名');

$json = $input['data'] ?? null;
if (!is_array($json)) fail('内容必须是 JSON 对象');

$dir = __DIR__ . '/../_data';
if (!is_dir($dir)) mkdir($dir, 0755, true);

$content = json_encode($json, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
if ($content === false) fail('JSON 编码失败');

if (file_put_contents($dir . '/' . $file . '.json', $content) === false) {
    fail('保存失败，请检查 _data 目录权限', 500);
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
