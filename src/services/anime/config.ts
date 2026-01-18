// API Configuration and Constants

export const PROV_BASE = 'https://www.sankavollerei.com/anime';

export const PROVIDERS = {
    animasu: `${PROV_BASE}/animasu`,
    nimegami: `${PROV_BASE}/nimegami`
};

export const SANSEKAI_API = 'https://api.sansekai.my.id/api';

// Cloudflare Workers for proxying (saves VPS bandwidth & bypasses IP bans)
export const VIDEO_PROXY_WORKERS = [];

export const fetchOptions = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
    }
};

