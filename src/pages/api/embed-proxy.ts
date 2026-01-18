
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response('Missing URL', { status: 400 });
    }

    try {
        const decodedUrl = decodeURIComponent(targetUrl);

        // Fetch Mega content with Desktop User-Agent
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        let html = await response.text();

        // 1. Remove Apple Smart App Banners and other redirecting meta tags
        html = html.replace(/<meta name="apple-itunes-app"[^>]*>/gi, '');
        html = html.replace(/<meta name="viewport"[^>]*>/gi, '<meta name="viewport" content="width=1280">'); // Force desktop width

        // 2. Inject "Deep Spoof" Script
        const antiRedirect = `
        <script>
            (function() {
                try {
                    // Disable navigation assign/replace
                    const noop = () => console.log('Redirect blocked');
                    window.location.assign = noop;
                    window.location.replace = noop;

                    // Deep Navigator Spoofing
                    const deskUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                    Object.defineProperty(navigator, 'userAgent', { get: () => deskUA });
                    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
                    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
                    Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
                    
                    // Hardware spoofing
                    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
                    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

                    // Screen spoofing
                    Object.defineProperty(window.screen, 'width', { get: () => 1920 });
                    Object.defineProperty(window.screen, 'height', { get: () => 1080 });
                    Object.defineProperty(window, 'innerWidth', { get: () => 1920 });
                    Object.defineProperty(window, 'innerHeight', { get: () => 1080 });

                    // Prevent top level access and popups
                    Object.defineProperty(window, 'top', { get: () => window.self });
                    Object.defineProperty(window, 'parent', { get: () => window.self });
                    window.open = () => null; // Block any popup attempt

                    // Force Mega's global variables if they exist
                    window.isMobile = false;
                    window.is_mobile = false;
                    window.isIOS = false;
                    window.isAndroid = false;
                    window.isApple = false;
                    window.isSafari = false;

                } catch(e) {}
            })();
        </script>
        `;

        // Insert at the VERY beginning of head
        html = html.replace('<head>', '<head>' + antiRedirect);

        // Ensure base tag points to Mega
        if (!html.includes('<base')) {
            html = html.replace('<head>', `<head><base href="https://mega.nz/">`);
        }

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache', // Don't cache for testing
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        return new Response(`Error proxying: ${error}`, { status: 500 });
    }
}
