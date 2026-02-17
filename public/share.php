<?php
$slug = isset($_GET['slug']) ? $_GET['slug'] : '';

if (empty($slug)) {
    header('Location: /blog');
    exit;
}

$slug = preg_replace('/[^a-zA-Z0-9\-_]/', '', $slug);
$apiUrl = 'https://lgrugpsyewvinlkgmeve.supabase.co/functions/v1/blog-share?slug=' . urlencode($slug);

$html = false;

// Tenta file_get_contents primeiro
$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'header' => "Accept: text/html\r\n"
    ]
]);
$html = @file_get_contents($apiUrl, false, $context);

// Fallback para cURL
if ($html === false && function_exists('curl_init')) {
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: text/html']);
    $html = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $html = false;
    }
}

if ($html === false) {
    header('Location: /blog');
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=3600');
echo $html;
