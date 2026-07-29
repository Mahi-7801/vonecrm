<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class GzipCompressionMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $startTime = microtime(true);
        $response = $next($request);

        // Add execution time header
        $elapsed = round((microtime(true) - $startTime) * 1000, 2);
        $response->headers->set('X-Response-Time', $elapsed . 'ms');
        $response->headers->set('X-Powered-By', 'V ONE SPEED ENGINE');

        // Apply Gzip compression if client accepts it
        $acceptEncoding = $request->header('Accept-Encoding', '');
        if (str_contains($acceptEncoding, 'gzip') && function_exists('gzencode')) {
            $content = $response->getContent();
            if ($content && strlen($content) > 512 && !$response->headers->has('Content-Encoding')) {
                $compressed = gzencode($content, 6);
                if ($compressed !== false) {
                    $response->setContent($compressed);
                    $response->headers->set('Content-Encoding', 'gzip');
                    $response->headers->set('Content-Length', (string) strlen($compressed));
                    $response->headers->set('Vary', 'Accept-Encoding');
                }
            }
        }

        return $response;
    }
}
