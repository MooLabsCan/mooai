<?php
// Common config for backend endpoints.
// - Loads OPENAI_API_KEY from environment or .env file if present.
// - Supports .env in backend/ and project root; populates getenv, $_ENV, and $_SERVER.
// - Sets basic CORS headers for local development.

// Load .env files (simple parser, KEY=VALUE lines)
function load_env_file($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || strpos($trimmed, '#') === 0) continue;
        // allow KEY="VALUE with = inside" by splitting once
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $k = trim($parts[0]);
            $v = trim($parts[1]);
            // strip optional quotes
            $len = strlen($v);
            if ($len >= 2) {
                $first = $v[0];
                $last = $v[$len - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $v = substr($v, 1, -1);
                }
            }
            // Only set if not already set to a non-empty value
            $existing = getenv($k);
            if ($existing === false || $existing === '') {
                putenv("$k=$v");
            }
            if (!isset($_ENV[$k]) || $_ENV[$k] === '') {
                $_ENV[$k] = $v;
            }
            if (!isset($_SERVER[$k]) || $_SERVER[$k] === '') {
                $_SERVER[$k] = $v;
            }
        }
    }
}

$backendEnvPath = __DIR__ . DIRECTORY_SEPARATOR . '.env';
$rootEnvPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
load_env_file($backendEnvPath);
load_env_file($rootEnvPath);

// CORS: allow local Vite dev origin by default
$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost',
    'http://127.0.0.1'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function get_openai_api_key() {
    $key = getenv('OPENAI_API_KEY');
    if ($key === false || $key === '') {
        // fallback to superglobals
        if (isset($_ENV['OPENAI_API_KEY']) && $_ENV['OPENAI_API_KEY'] !== '') {
            $key = $_ENV['OPENAI_API_KEY'];
        } elseif (isset($_SERVER['OPENAI_API_KEY']) && $_SERVER['OPENAI_API_KEY'] !== '') {
            $key = $_SERVER['OPENAI_API_KEY'];
        } else {
            $key = '';
        }
    }
    if (!is_string($key) || trim($key) === '') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Server misconfiguration: OPENAI_API_KEY not set',
            'hint' => 'Create backend/.env or project-root/.env with OPENAI_API_KEY=your_key or set the environment variable in the web server.'
        ]);
        exit;
    }
    return $key;
}

function read_json_body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode([ 'error' => 'Invalid JSON body' ]);
        exit;
    }
    return $data;
}
