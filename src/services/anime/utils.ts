// Utility Functions

import { VIDEO_PROXY_WORKERS, fetchOptions } from './config';

let videoWorkerIndex = 0;

export function getVideoProxyUrl(): string {
    if (VIDEO_PROXY_WORKERS.length === 0) return '';
    const url = VIDEO_PROXY_WORKERS[videoWorkerIndex % VIDEO_PROXY_WORKERS.length];
    videoWorkerIndex = (videoWorkerIndex + 1) % VIDEO_PROXY_WORKERS.length;
    return url;
}

export function getApiProxyUrl(): string {
    return '';
}

export async function proxyFetch(url: string, options: any = fetchOptions): Promise<Response> {
    try {
        // Cek IP yang sedang digunakan saat ini
        const ipCheck = await fetch('https://api64.ipify.org?format=json');
        const ipData = await ipCheck.json();
        console.log(`[Fetch] 🌐 Requesting: ${url.split('?')[0].replace('https://www.sankavollerei.com/anime', '..')}`);
        console.log(`[Fetch] 🏠 Current IP (Server): ${ipData.ip}`);
    } catch (e) {
        console.log(`[Fetch] 🌐 Requesting: ${url}`);
    }

    return fetch(url, options);
}

// Validate if a video URL is accessible
export async function validateVideoUrl(url: string): Promise<boolean> {
    try {
        // BLOCKLIST: Providers that don't work for streaming
        const blockedProviders = [
            'terabox.com', '1024terabox.com',
            'up-4ever.net', 'up4ever.net',
            'hxfile.co',
            'zippyshare.com',
            'uptobox.com',
            'krakenfiles.com',
            'filescdn.com',
        ];
        if (blockedProviders.some(p => url.includes(p))) {
            console.log('[Validate] Blocked provider:', url);
            return false;
        }

        // ALLOWLIST: Only trust providers that are guaranteed embeds (Youtube, Blogger, etc.)
        // We REMOVED Sansekai-specific domains (pixeldrain, animekita, etc.) so they ARE actually checked.
        const embedProviders = [
            'vidhide', 'blogger.com', 'mega.nz', 'drive.google',
            'youtube', 'dailymotion', 'cdn-cf.berkasdrive.com'
        ];
        if (embedProviders.some(p => url.includes(p))) {
            return true;
        }

        // For direct links (including Sansekai's pixeldrain/animekita), do a real check
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });

        clearTimeout(timeout);
        return res.ok || res.status === 206;
    } catch (error) {
        console.log('[Validate] Failed:', url);
        return false;
    }
}

// Extract direct video URL from berkasdrive/mitedrive download pages
export async function resolveDirectVideoUrl(url: string): Promise<string | null> {
    try {
        if (!url.includes('berkasdrive.com') && !url.includes('mitedrive.com')) {
            return null;
        }

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const html = await res.text();

        // Look for base64 encoded URL pattern
        const base64Match = html.match(/const\s+a\s*=\s*["']([A-Za-z0-9+/=]+)["']/);
        if (base64Match && base64Match[1]) {
            const decoded = atob(base64Match[1]);
            if (decoded.startsWith('http') && (decoded.includes('.mp4') || decoded.includes('.m3u8'))) {
                console.log('[DEBUG] Resolved direct video URL:', decoded);
                const proxyUrl = getVideoProxyUrl();
                if (proxyUrl) {
                    return `${proxyUrl}?url=${encodeURIComponent(decoded)}`;
                }
                return decoded;
            }
        }

        // Fallback: Look for streaming URL pattern
        const streamMatch = html.match(/streaming\.php\?id=([^"'\s]+)/);
        if (streamMatch) {
            return `https://dl.berkasdrive.com/streaming.php?id=${streamMatch[1]}`;
        }

        return null; // Ensure content is checked
    } catch (error) {
        return null;
    }
}

// Fix Mega.nz links to embed format and route through local proxy to prevent mobile redirects
export function fixMegaLink(url: string): string {
    if (!url) return url;

    let targetUrl = url;

    // Convert to embed format first
    if (url.includes('mega.nz/file/')) {
        targetUrl = url.replace('mega.nz/file/', 'mega.nz/embed/');
    } else if (url.includes('mega.nz/#!')) {
        targetUrl = url.replace('mega.nz/#!', 'mega.nz/embed/#!');
    }

    // Wrap with local proxy
    // We must encode the URL but keep the hash fragment intact for the client-side decryption
    // Since hashes are not sent to server, we split it.
    if (targetUrl.includes('mega.nz/embed/')) {
        const [baseUrl, hash] = targetUrl.split('#!');
        if (hash) {
            // Reconstruct with Hash staying on the client side with '#!'
            const encodedBase = encodeURIComponent(baseUrl + '#!');
            return `/api/mega-proxy?url=${encodedBase}#!${hash}`;
        } else {
            // Fallback for non-hash urls (rare for embed)
            const encoded = encodeURIComponent(targetUrl);
            return `/api/mega-proxy?url=${encoded}`;
        }
    }

    return targetUrl;
}

// Clean title for search
export function cleanTitle(title: string): string {
    return title
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/Sub Indo|Episode \d+|Season \d+/gi, '')
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
