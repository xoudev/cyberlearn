/**
 * What a <PhpLab> runs a page with: the php.ini its PHP starts with, and the
 * PHP script (the harness) that plays one HTTP request against the lab's
 * files, the way a web server would, and leaves the response in
 * /lab/response.json. The worker (php-lab-core.mjs) runs it in a PHP made for
 * that one request.
 */

/**
 * A lab's pages run the learner's own code, so the php.ini takes away what a
 * page of a lesson has no use for: the bridge from PHP to JavaScript (the
 * vrzno functions and the Vrzno class, with which PHP could call the page's
 * own APIs), starting processes, mail, sockets, and fetching an address. What
 * is left is PHP the language, on an empty disk that is thrown away.
 */
export const INI = [
  "memory_limit=64M",
  "allow_url_fopen=0",
  "allow_url_include=0",
  "log_errors=0",
  "disable_classes=Vrzno",
  [
    "vrzno_eval",
    "vrzno_run",
    "vrzno_timeout",
    "vrzno_await",
    "vrzno_env",
    "vrzno_shared",
    "vrzno_import",
    "vrzno_target",
    "vrzno_zval",
    "exec",
    "system",
    "shell_exec",
    "passthru",
    "proc_open",
    "popen",
    "mail",
    "fsockopen",
    "pfsockopen",
    "stream_socket_client",
    "stream_socket_server",
    "dl",
  ].reduce((list, name) => (list === "" ? `disable_functions=${name}` : `${list},${name}`), ""),
].join("\n");

/**
 * The request is in /lab/request.json (method, path, query, body, cookie), the
 * pages in /app. Read it top to bottom as a web server would:
 *
 * 1. refuse to run at all if the php.ini above is not in force;
 * 2. turn each exit and die of the pages into a call that throws, so that a
 *    page that ends itself (a redirect, an "access denied") still has its
 *    status, headers and body collected: exit cannot be caught in PHP, and in
 *    this runtime nothing runs after it. The files are rewritten in the
 *    instance's own disk, which is thrown away with it, with PHP's tokenizer,
 *    so a string or a comment that says "exit" is left alone;
 * 3. set $_GET, $_POST, $_COOKIE and $_SERVER as PHP would for the request;
 * 4. run the page in an output buffer, and write what it answered.
 */
export const HARNESS = String.raw`<?php
foreach (['vrzno_eval', 'vrzno_import', 'exec', 'system', 'shell_exec', 'proc_open', 'popen', 'mail'] as $__f) {
    if (function_exists($__f) || filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        file_put_contents('/lab/response.json', json_encode([
            'status' => 500,
            'headers' => [],
            'body' => "Bac à sable mal configuré : la page n'a pas été exécutée.",
        ]));
        return;
    }
}

final class __LabExit extends Error
{
}

function __lab_exit($status = null): never
{
    if (is_string($status)) {
        echo $status;
    }
    throw new __LabExit();
}

/** The source with each exit and die made a call to __lab_exit, strings and comments left alone. */
function __lab_rewrite_exit(string $source): string
{
    $tokens = token_get_all($source);
    $out = '';
    $count = count($tokens);
    for ($i = 0; $i < $count; $i++) {
        $token = $tokens[$i];
        if (!is_array($token) || $token[0] !== T_EXIT) {
            $out .= is_array($token) ? $token[1] : $token;
            continue;
        }
        $out .= '__lab_exit';
        // exit and die may be written without parentheses.
        $next = $i + 1;
        while ($next < $count && is_array($tokens[$next]) && in_array($tokens[$next][0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
            $next++;
        }
        if (($tokens[$next] ?? null) !== '(') {
            $out .= '()';
        }
    }
    return $out;
}

foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator('/app', FilesystemIterator::SKIP_DOTS)) as $__f) {
    if ($__f->isFile() && str_ends_with($__f->getFilename(), '.php')) {
        file_put_contents($__f->getPathname(), __lab_rewrite_exit((string) file_get_contents($__f->getPathname())));
    }
}

$__lab = json_decode(file_get_contents('/lab/request.json'), true);

ini_set('display_errors', '1');
ini_set('html_errors', '0');
error_reporting(E_ALL);

$__path = (string) $__lab['path'];
$__method = $__lab['method'] === 'POST' ? 'POST' : 'GET';

$_GET = [];
$_POST = [];
parse_str((string) $__lab['query'], $_GET);
if ($__method === 'POST') {
    parse_str((string) $__lab['body'], $_POST);
}
$_COOKIE = [];
foreach (explode(';', (string) $__lab['cookie']) as $__pair) {
    $__pair = trim($__pair);
    if ($__pair === '' || !str_contains($__pair, '=')) {
        continue;
    }
    [$__k, $__v] = explode('=', $__pair, 2);
    $_COOKIE[urldecode(trim($__k))] = urldecode(trim($__v));
}
$_REQUEST = array_merge($_GET, $_POST);
$_FILES = [];
$_SERVER = [
    'REQUEST_METHOD' => $__method,
    'REQUEST_URI' => $__path . ((string) $__lab['query'] === '' ? '' : '?' . $__lab['query']),
    'QUERY_STRING' => (string) $__lab['query'],
    'SCRIPT_NAME' => $__path,
    'PHP_SELF' => $__path,
    'HTTP_HOST' => 'lab.cyberlearn.local',
    'SERVER_NAME' => 'lab.cyberlearn.local',
    'REMOTE_ADDR' => '127.0.0.1',
    'HTTP_COOKIE' => (string) $__lab['cookie'],
    'CONTENT_TYPE' => $__method === 'POST' ? 'application/x-www-form-urlencoded' : '',
];

$__file = '/app' . ($__path === '/' ? '/index.php' : $__path);
ob_start();
chdir('/app');

if (
    !preg_match('~^/[A-Za-z0-9_./-]*$~', $__path)
    || str_contains($__path, '..')
    || !str_ends_with($__file, '.php')
    || !is_file($__file)
) {
    http_response_code(404);
    echo '404 Not Found : ' . $__path;
} else {
    try {
        include $__file;
    } catch (__LabExit $__e) {
        // The page ended itself: what it printed so far is the page.
    } catch (Throwable $__e) {
        http_response_code(500);
        echo get_class($__e) . ': ' . $__e->getMessage() . ' in ' . $__e->getFile() . ' on line ' . $__e->getLine();
    }
}

$__chunks = [];
while (ob_get_level() > 0) {
    array_unshift($__chunks, (string) ob_get_clean());
}
$__status = http_response_code();
file_put_contents('/lab/response.json', json_encode([
    'status' => is_int($__status) ? $__status : 200,
    'headers' => headers_list(),
    'body' => str_replace('/app/', '', implode('', $__chunks)),
], JSON_INVALID_UTF8_SUBSTITUTE));
`;
