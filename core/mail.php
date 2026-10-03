<?php
/**
 * Email: order received / approved / rejected, ticket replies, admin alerts.
 * Uses SMTP when SMTP_HOST is defined in config.local.php (recommended), otherwise PHP mail().
 * Sending never throws — a failed email must not break an order approval.
 */

function mail_from_address(): string
{
  $from = setting('mail_from');
  if ($from && filter_var($from, FILTER_VALIDATE_EMAIL)) return $from;
  if (defined('SITE_EMAIL') && filter_var(SITE_EMAIL, FILTER_VALIDATE_EMAIL)) return SITE_EMAIL;
  $host = preg_replace('/^www\./', '', parse_url(defined('SITE_URL') ? SITE_URL : 'https://example.com', PHP_URL_HOST) ?: 'example.com');
  return 'info@' . $host;
}

/** Wrap content in the branded email layout. */
function mail_layout(string $title, string $bodyHtml, ?string $buttonText = null, ?string $buttonUrl = null): string
{
  $site = htmlspecialchars(setting('site_name', 'FiveMDepot'));
  $btn = $buttonText && $buttonUrl
    ? '<p style="margin:28px 0 8px"><a href="' . htmlspecialchars($buttonUrl) . '" style="display:inline-block;background:#ff2e63;color:#fff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px">' . htmlspecialchars($buttonText) . '</a></p>'
    : '';
  $discord = setting('social_discord');
  return '<!doctype html><html><body style="margin:0;background:#0b0b10;font-family:Segoe UI,Arial,sans-serif;color:#e6e6ee">' .
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b10;padding:30px 12px"><tr><td align="center">' .
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#13131a;border:1px solid #26262f;border-radius:16px;overflow:hidden">' .
    '<tr><td style="padding:22px 28px;border-bottom:1px solid #26262f;font-size:20px;font-weight:800;color:#fff">' .
      '<span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;background:#ff2e63;color:#fff;margin-right:8px">M</span>' . $site . '</td></tr>' .
    '<tr><td style="padding:28px">' .
      '<h1 style="margin:0 0 14px;font-size:22px;color:#fff">' . htmlspecialchars($title) . '</h1>' .
      '<div style="font-size:15px;line-height:1.6;color:#c9c9d4">' . $bodyHtml . '</div>' . $btn .
    '</td></tr>' .
    '<tr><td style="padding:18px 28px;border-top:1px solid #26262f;font-size:12.5px;color:#8b8b98">' .
      'Need help? ' . ($discord ? '<a href="' . htmlspecialchars($discord) . '" style="color:#ff6b8f">Open a ticket on Discord</a> or ' : '') .
      'reply in your support tickets on our website.</td></tr>' .
    '</table></td></tr></table></body></html>';
}

/** Send one email. Returns true on success. */
function send_mail(string $to, string $subject, string $html): bool
{
  if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
  $from = mail_from_address();
  $name = setting('site_name', 'FiveMDepot');
  $subject = mb_substr(str_replace(["\r", "\n"], ' ', $subject), 0, 200);
  $text = trim(html_entity_decode(strip_tags(str_replace(['<br>', '</p>', '</h1>', '</li>'], "\n", $html)), ENT_QUOTES, 'UTF-8'));
  $boundary = 'b' . bin2hex(random_bytes(8));
  $headers = [
    'From: ' . mb_encode_mimeheader($name) . ' <' . $from . '>',
    'Reply-To: ' . $from,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    'X-Mailer: FiveMDepot',
  ];
  $body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode(preg_replace('/\n{3,}/', "\n\n", $text))) .
          "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$boundary--\r\n";
  try {
    $ok = defined('SMTP_HOST') && SMTP_HOST !== ''
      ? smtp_send($from, $to, mb_encode_mimeheader($subject, 'UTF-8'), $headers, $body)
      : @mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $headers), '-f' . $from);
  } catch (Throwable $e) {
    error_log('[mail] ' . $e->getMessage());
    $ok = false;
  }
  if (!$ok) error_log("[mail] failed to send '$subject' to $to");
  return (bool)$ok;
}

/** Minimal SMTP client (STARTTLS on 587 or SSL on 465, AUTH LOGIN). */
function smtp_send(string $from, string $to, string $subject, array $headers, string $body): bool
{
  $host = SMTP_HOST;
  $port = defined('SMTP_PORT') ? (int)SMTP_PORT : 587;
  $secure = defined('SMTP_SECURE') ? SMTP_SECURE : ($port === 465 ? 'ssl' : 'tls');
  $fp = @stream_socket_client(($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port, $errno, $errstr, 15);
  if (!$fp) throw new RuntimeException("SMTP connect failed: $errstr");
  stream_set_timeout($fp, 15);
  $read = function () use ($fp): string {
    $data = '';
    while (($line = fgets($fp, 515)) !== false) { $data .= $line; if (isset($line[3]) && $line[3] === ' ') break; }
    return $data;
  };
  $cmd = function (string $c, array $okCodes) use ($fp, $read): string {
    if ($c !== '') fwrite($fp, $c . "\r\n");
    $r = $read();
    if (!in_array((int)substr($r, 0, 3), $okCodes, true)) throw new RuntimeException('SMTP error after "' . explode(' ', $c)[0] . '": ' . trim($r));
    return $r;
  };
  $cmd('', [220]);
  $me = parse_url(defined('SITE_URL') ? SITE_URL : 'http://localhost', PHP_URL_HOST) ?: 'localhost';
  $cmd("EHLO $me", [250]);
  if ($secure === 'tls') {
    $cmd('STARTTLS', [220]);
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) throw new RuntimeException('STARTTLS failed');
    $cmd("EHLO $me", [250]);
  }
  if (defined('SMTP_USER') && SMTP_USER !== '') {
    $cmd('AUTH LOGIN', [334]);
    $cmd(base64_encode(SMTP_USER), [334]);
    $cmd(base64_encode(defined('SMTP_PASS') ? SMTP_PASS : ''), [235]);
  }
  $cmd("MAIL FROM:<$from>", [250]);
  $cmd("RCPT TO:<$to>", [250, 251]);
  $cmd('DATA', [354]);
  $msg = implode("\r\n", array_merge(['To: <' . $to . '>', 'Subject: ' . $subject, 'Date: ' . date('r')], $headers)) . "\r\n\r\n" . $body;
  $msg = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $msg));
  $cmd($msg . "\r\n.", [250]);
  fwrite($fp, "QUIT\r\n");
  fclose($fp);
  return true;
}

// ============================================================
// Templates
// ============================================================

function order_mail_data(string $orderId): ?array
{
  $o = Db::one("SELECT o.id, o.total_amount, o.payment_method, o.admin_note, u.name, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?", [$orderId]);
  if (!$o) return null;
  $o['items'] = Db::all("SELECT p.title, op.price_paid FROM order_products op LEFT JOIN products p ON p.id = op.product_id WHERE op.order_id = ?", [$orderId]);
  $o['list'] = '<ul style="padding-left:18px;margin:12px 0">' . implode('', array_map(fn($i) => '<li>' . htmlspecialchars($i['title'] ?: 'Product') . ' — $' . number_format((float)$i['price_paid'], 2) . '</li>', $o['items'])) . '</ul>';
  $o['short'] = strtoupper(substr($o['id'], 0, 8));
  return $o;
}

function mail_order_received(string $orderId): void
{
  $o = order_mail_data($orderId);
  if (!$o) return;
  $hours = setting('verify_hours', '2–3 hours');
  send_mail($o['email'], 'Order #' . $o['short'] . ' received — we are verifying your payment', mail_layout(
    'We received your order',
    '<p>Hi ' . htmlspecialchars($o['name']) . ',</p><p>Thanks for your order <b>#' . $o['short'] . '</b>. We are checking your payment now — this usually takes <b>' . htmlspecialchars($hours) . '</b>. You will get another email as soon as your downloads are ready.</p>' . $o['list'] .
    '<p>Total: <b>$' . number_format((float)$o['total_amount'], 2) . '</b></p>',
    'View my order', site_root_url() . 'dashboard/buyer.html?tab=orders'));
  $admin = setting('admin_notify_email');
  if ($admin) send_mail($admin, 'New order #' . $o['short'] . ' to verify ($' . number_format((float)$o['total_amount'], 2) . ', ' . $o['payment_method'] . ')', mail_layout(
    'New order waiting for verification', '<p>' . htmlspecialchars($o['name']) . ' (' . htmlspecialchars($o['email']) . ') paid via <b>' . htmlspecialchars($o['payment_method']) . '</b>.</p>' . $o['list'],
    'Open in admin', site_root_url() . 'admin/#/orders?id=' . rawurlencode($o['id'])));
}

function mail_order_approved(string $orderId): void
{
  $o = order_mail_data($orderId);
  if (!$o) return;
  send_mail($o['email'], 'Your order #' . $o['short'] . ' is ready to download 🎉', mail_layout(
    'Payment approved — your downloads are ready',
    '<p>Hi ' . htmlspecialchars($o['name']) . ',</p><p>Your payment for order <b>#' . $o['short'] . '</b> is confirmed. Log in to your account to download:</p>' . $o['list'] .
    '<p>All future updates are free and will appear in your library.</p>',
    'Download now', site_root_url() . 'dashboard/buyer.html'));
}

function mail_order_rejected(string $orderId, string $reason): void
{
  $o = order_mail_data($orderId);
  if (!$o) return;
  send_mail($o['email'], 'Order #' . $o['short'] . ' — payment could not be verified', mail_layout(
    'We could not verify your payment',
    '<p>Hi ' . htmlspecialchars($o['name']) . ',</p><p>We could not confirm the payment for order <b>#' . $o['short'] . '</b>.</p>' .
    '<p style="padding:12px 14px;border-radius:10px;background:#2a1218;border:1px solid #5b2232;color:#ffb3c4"><b>Reason:</b> ' . htmlspecialchars($reason) . '</p>' .
    '<p>If you think this is a mistake, open a support ticket with your transaction details and we will sort it out.</p>',
    'Open a support ticket', site_root_url() . 'dashboard/buyer.html?tab=support'));
}

function mail_ticket_reply(string $ticketId, string $message): void
{
  $t = Db::one("SELECT t.number, t.subject, u.name, u.email FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE t.id = ?", [$ticketId]);
  if (!$t) return;
  send_mail($t['email'], 'Re: [Ticket #' . $t['number'] . '] ' . $t['subject'], mail_layout(
    'New reply to your ticket #' . $t['number'],
    '<p>Hi ' . htmlspecialchars($t['name']) . ', our team replied:</p><div style="padding:14px;border-radius:10px;background:#1b1b23;border:1px solid #2c2c37;white-space:pre-wrap">' . htmlspecialchars($message) . '</div>',
    'View ticket', site_root_url() . 'dashboard/buyer.html?tab=support&ticket=' . rawurlencode($ticketId)));
}

function mail_admin_ticket(string $ticketId, string $message, bool $isNew): void
{
  $admin = setting('admin_notify_email');
  if (!$admin) return;
  $t = Db::one("SELECT t.number, t.subject, u.name, u.email FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE t.id = ?", [$ticketId]);
  if (!$t) return;
  send_mail($admin, ($isNew ? 'New ticket' : 'Customer reply') . ' #' . $t['number'] . ': ' . $t['subject'], mail_layout(
    ($isNew ? 'New support ticket' : 'New customer reply') . ' #' . $t['number'],
    '<p><b>' . htmlspecialchars($t['name']) . '</b> (' . htmlspecialchars($t['email']) . ') wrote:</p><div style="padding:14px;border-radius:10px;background:#1b1b23;white-space:pre-wrap">' . htmlspecialchars($message) . '</div>',
    'Reply in admin', site_root_url() . 'admin/#/tickets?id=' . rawurlencode($ticketId)));
}
