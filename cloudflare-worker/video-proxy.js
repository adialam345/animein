/**
 * Cloudflare Worker - Video Proxy
 * Untuk menghemat bandwidth VPS dengan proxy video melalui Cloudflare edge
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

    // Get video URL from query parameter
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
        return new Response(JSON.stringify({
            error: 'Missing url parameter',
            usage: '?url=<encoded_video_url>'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    try {
        // Decode the video URL
        const decodedUrl = decodeURIComponent(videoUrl);

        // Validate URL (only allow certain domains for security)
        const allowedDomains = [
            'cdn-cf.berkasdrive.com',
            'miterequest.my.id',
            'server10.miterequest.my.id',
            'server11.miterequest.my.id',
            'blogger.com',
            'video.google.com',
            'bp.blogspot.com',
            'lh3.googleusercontent.com',
            'rr',  // Google video servers (rrX.sn-xxx.googlevideo.com)
            'googlevideo.com'
        ];

        const targetUrl = new URL(decodedUrl);
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
                    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Content-Type',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        // Forward headers for video seeking
        const headers = new Headers();
        if (request.headers.has('Range')) {
            headers.set('Range', request.headers.get('Range'));
        }
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Fetch the video from source
        const response = await fetch(decodedUrl, {
            method: request.method,
            headers: headers
        });

        // Create response with proper headers
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
        responseHeaders.set('Cache-Control', 'public, max-age=86400'); // Cache 24 hours

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
