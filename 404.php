<?php
// Missing pages: send a real 404 with the site's 404 page. Routed from .htaccess,
// because the host turns Apache's static ErrorDocument into a 500.
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/404.html');
