<?php
require_once __DIR__ . DIRECTORY_SEPARATOR . 'config.php';

header('Content-Type: application/json');

$data = read_json_body();
$model = isset($data['model']) ? $data['model'] : '';
$messages = isset($data['messages']) ? $data['messages'] : null;
$temperature = isset($data['temperature']) ? $data['temperature'] : 0.7;

if (!$model) {
    http_response_code(400);
    echo json_encode([ 'error' => 'Missing "model"' ]);
    exit;
}
if (!is_array($messages) || count($messages) === 0) {
    http_response_code(400);
    echo json_encode([ 'error' => '"messages" must be a non-empty array' ]);
    exit;
}

$apiKey = get_openai_api_key();

$payload = json_encode([
    'model' => $model,
    'messages' => $messages,
    'temperature' => $temperature
]);

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey,
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode([ 'error' => 'Upstream request failed', 'detail' => $error ]);
    exit;
}

http_response_code($httpCode ?: 200);
echo $response;
