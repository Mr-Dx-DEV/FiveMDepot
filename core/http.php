<?php
/**
 * Small HTTP client for talking to Google / payment gateways (cURL, falls back to streams).
 * Returns [status, decodedJson, rawBody].
 */
function http_request(string $method, string $url, array $form = [], array $headers = [], ?string $rawBody = null): array
{
  $body = $rawBody !== null ? $rawBody : ($form ? http_build_query($form) : null);
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CONNECTTIMEOUT => 10,
      CURLOPT_HTTPHEADER => $headers, CURLOPT_CUSTOMREQUEST => $method,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $resp = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
  } else {
    $hdr = $headers;
    if ($form && $rawBody === null) $hdr[] = 'Content-Type: application/x-www-form-urlencoded';
    $ctx = stream_context_create(['http' => [
      'method' => $method, 'timeout' => 20, 'ignore_errors' => true,
      'header' => implode("\r\n", $hdr), 'content' => $body,
    ]]);
    $resp = @file_get_contents($url, false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) if (preg_match('#^HTTP/\S+ (\d+)#', $h, $m)) $status = (int)$m[1];
  }
  $raw = is_string($resp) ? $resp : '';
  return [$status, json_decode($raw, true) ?: [], $raw];
}
