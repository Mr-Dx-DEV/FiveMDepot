<?php
/**
 * FiveMDepot — API v1 entry point
 *
 *   api/v1.php?r=<path>        e.g.  GET  api/v1.php?r=admin/categories
 *                                    POST api/v1.php?r=admin/categories/{id}
 *
 * Non-GET requests must send the X-CSRF-Token header (token from GET auth/me).
 * Responses: { data, meta? }  or  { error: { code, message, fields? } }
 */

require_once __DIR__ . '/../core/bootstrap.php';

$ROUTES = [];
function route(string $method, string $pattern, callable $handler): void
{
  global $ROUTES;
  $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[A-Za-z0-9_-]+)', $pattern) . '$#';
  $ROUTES[] = [$method, $regex, $handler];
}

foreach (glob(__DIR__ . '/v1/*.php') as $file) {
  require_once $file;
}

$path = trim((string)($_GET['r'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'HEAD') $method = 'GET';

$pathMatched = false;
foreach ($ROUTES as [$m, $regex, $handler]) {
  if (!preg_match($regex, $path, $params)) continue;
  $pathMatched = true;
  if ($m !== $method) continue;
  if ($method !== 'GET') csrf_check();
  $handler(array_filter($params, 'is_string', ARRAY_FILTER_USE_KEY));
  ok(null); // handlers normally exit through ok()
}
fail($pathMatched ? 405 : 404, $pathMatched ? 'Method not allowed' : 'Not found');
