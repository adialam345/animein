/**
 * Cloudflare Worker - Multi-purpose Proxy
 * Digunakan untuk proxy Video (save bandwidth) & API (bypass IP Ban)
 * 
 * CARA DEPLOY:
 * 1. Login ke Cloudflare Dashboard → Workers & Pages
 * 2. Pilih worker yang sudah ada atau buat baru
 * 3. Edit Code → Copy paste seluruh kode ini
 * 4. Save and Deploy
 */

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);

    // Get target URL from query parameter
    const targetUrlString = url.searchParams.get('url');

    if (!targetUrlString) {
        return new Response(JSON.stringify({
            status: 'Nontonin Proxy Active',
            usage: '?url=<encoded_url>'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    try {
        const decodedUrl = decodeURIComponent(targetUrlString);
        const targetUrl = new URL(decodedUrl);

        // ALLOWLIST: Domains that are allowed to be proxied
        const allowedDomains = [
            'sankavollerei.com',      // Anime API
            'sansekai.my.id',         // Anime API
            'cdn-cf.berkasdrive.com',  // Video Source
            'miterequest.my.id',      // Video Source
            'mitedrive.com',          // Video Source
            'blogger.com',            // Video Source
            'video.google.com',
            'googlevideo.com',
            'bp.blogspot.com',
            'lh3.googleusercontent.com'
        ];

        const isAllowed = allowedDomains.some(d => targetUrl.hostname.includes(d));

        if (!isAllowed) {
            return new Response(JSON.stringify({
                error: 'Domain not allowed',
                domain: targetUrl.hostname
            }), {
                status: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Handle OPTIONS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        // Prepare request headers
        const headers = new Headers();

        // Copy standard headers from original request
        const headersToCopy = ['Range', 'Accept', 'Accept-Language', 'Content-Type'];
        headersToCopy.forEach(h => {
            if (request.headers.has(h)) headers.set(h, request.headers.get(h));
        });

        // Add custom User-Agent
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Fetch from source
        const response = await fetch(decodedUrl, {
            method: request.method,
            headers: headers,
            body: request.method === 'POST' ? await request.arrayBuffer() : null,
            redirect: 'follow'
        });

        // Prepare response headers
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
        responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

        // CACHING LOGIC
        // Video sources (MP4/m3u8) should be cached long term
        // API responses (JSON) should be cached short term or not at all
        const isVideo = decodedUrl.match(/\.(mp4|m3u8|mkv|webm|ts)(\?|$)/) || response.headers.get('Content-Type')?.includes('video');

        if (isVideo) {
            responseHeaders.set('Cache-Control', 'public, max-age=86400'); // 24 hours
        } else {
            responseHeaders.set('Cache-Control', 'public, max-age=60'); // 1 minute for API
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

