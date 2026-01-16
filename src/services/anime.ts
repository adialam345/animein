const PROV_BASE = 'https://www.sankavollerei.com/anime';
const PROVIDERS = {
    animasu: `${PROV_BASE}/animasu`,
    nimegami: `${PROV_BASE}/nimegami`
};

// Cloudflare Workers for video proxying (saves VPS bandwidth)
// Load balancing across multiple workers to avoid rate limits
const VIDEO_PROXY_WORKERS = [
    'https://summer-salad-402c.ticegen555.workers.dev',
    'https://silent-cloud-8ff2.koigwings1.workers.dev',
    'https://yellow-paper-787b.voolve1503.workers.dev'
];

let workerIndex = 0;
function getVideoProxyUrl(): string {
    if (VIDEO_PROXY_WORKERS.length === 0) return '';
    const url = VIDEO_PROXY_WORKERS[workerIndex];
    workerIndex = (workerIndex + 1) % VIDEO_PROXY_WORKERS.length; // Round-robin
    return url;
}

const fetchOptions = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
    }
};

export interface AnimeLatest {
    id: string; // Changed from number to string (slug)
    url: string; // Mapping slug to url for compatibility
    judul: string;
    cover: string;
    lastch: string;
    lastup: string;
}

export interface AnimeRecommended {
    id: string;
    url: string;
    judul: string;
    cover: string;
    score: string;
    rilis: string;
    total_episode: number;
    sinopsis: string;
}

export interface AnimeDetail {
    id: string;
    series_id: string;
    judul: string;
    cover: string;
    sinopsis: string;
    studio: string;
    score: string;
    status: string;
    rilis: string;
    total_episode: number;
    genre: string[];
    episodes: Episode[];
}

export interface Episode {
    id: string; // Changed from number to string (slug)
    ch: string;
    url: string;
    date: string;
}

export interface VideoData {
    episode_id: string; // Changed from number to string
    reso: string[];
    video: VideoSource[];
}

export interface VideoSource {
    reso: string;
    link: string;
    provide: number;
    id: number;
    isDirect?: boolean; // true if link is a direct mp4/video URL playable with HTML5
}

export const animeApi = {
    async getLatest(): Promise<AnimeLatest[]> {
        try {
            const pagePromises = [1, 2, 3, 4].map(page =>
                fetch(`${PROVIDERS.animasu}/latest?page=${page}`, fetchOptions).then(res => res.json())
            );
            const pagesData = await Promise.all(pagePromises);

            const allAnimes: AnimeLatest[] = [];
            pagesData.forEach(data => {
                const animes = data.animes || [];
                animes.forEach((item: any) => {
                    allAnimes.push({
                        id: item.slug,
                        url: item.slug,
                        judul: item.title,
                        cover: item.poster,
                        lastch: item.episode,
                        lastup: item.status_or_day
                    });
                });
            });
            return allAnimes;
        } catch (error) {
            console.error('Error fetching latest anime:', error);
            return [];
        }
    },

    async getRecommended(): Promise<AnimeRecommended[]> {
        try {
            const pagePromises = [1, 2, 3, 4].map(page =>
                fetch(`${PROVIDERS.animasu}/popular?page=${page}`, fetchOptions).then(res => res.json())
            );
            const pagesData = await Promise.all(pagePromises);

            const allAnimes: AnimeRecommended[] = [];
            pagesData.forEach(data => {
                const animes = data.animes || [];
                animes.forEach((item: any) => {
                    allAnimes.push({
                        id: item.slug,
                        url: item.slug,
                        judul: item.title,
                        cover: item.poster,
                        score: item.status_or_day.includes('★') ? item.status_or_day : 'N/A',
                        rilis: item.type,
                        total_episode: 0,
                        sinopsis: ''
                    });
                });
            });
            return allAnimes;
        } catch (error) {
            console.error('Error fetching recommended anime:', error);
            return [];
        }
    },

    async getMovies(): Promise<AnimeLatest[]> {
        try {
            const pagePromises = [1, 2, 3, 4].map(page =>
                fetch(`${PROVIDERS.animasu}/movies?page=${page}`, fetchOptions).then(res => res.json())
            );
            const pagesData = await Promise.all(pagePromises);

            const allAnimes: AnimeLatest[] = [];
            pagesData.forEach(data => {
                const animes = data.animes || [];
                animes.forEach((item: any) => {
                    allAnimes.push({
                        id: item.slug,
                        url: item.slug,
                        judul: item.title,
                        cover: item.poster,
                        lastch: item.episode,
                        lastup: item.type
                    });
                });
            });
            return allAnimes;
        } catch (error) {
            console.error('Error fetching movies:', error);
            return [];
        }
    },

    async getDetail(slug: string): Promise<AnimeDetail | null> {
        try {
            const res = await fetch(`${PROVIDERS.animasu}/detail/${slug}`, fetchOptions);
            const data = await res.json();
            const detail = data.detail;
            if (detail) {
                return {
                    id: slug,
                    series_id: slug,
                    judul: detail.title,
                    cover: detail.poster,
                    sinopsis: detail.synopsis,
                    studio: detail.studio,
                    score: detail.rating,
                    status: detail.status,
                    rilis: detail.aired,
                    total_episode: detail.episodes?.length || 0,
                    genre: detail.genres?.map((g: any) => g.name) || [],
                    episodes: detail.episodes?.map((ep: any) => ({
                        id: ep.slug,
                        ch: ep.name.replace('Episode ', ''),
                        url: ep.slug,
                        date: '' // Date not available in list
                    })) || []
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching anime detail for ${slug}:`, error);
            return null;
        }
    },

    async search(query: string): Promise<AnimeRecommended[]> {
        try {
            const pagePromises = [1, 2, 3, 4].map(page =>
                fetch(`${PROVIDERS.animasu}/search/${query}?page=${page}`, fetchOptions).then(res => res.json())
            );
            const pagesData = await Promise.all(pagePromises);

            const allAnimes: AnimeRecommended[] = [];
            pagesData.forEach(data => {
                const animes = data.animes || [];
                animes.forEach((item: any) => {
                    allAnimes.push({
                        id: item.slug,
                        url: item.slug,
                        judul: item.title,
                        cover: item.poster,
                        score: 'N/A',
                        rilis: item.type,
                        total_episode: 0,
                        sinopsis: ''
                    });
                });
            });
            return allAnimes;
        } catch (error) {
            console.error(`Error searching for ${query}:`, error);
            return [];
        }
    },

    async getVideo(slug: string, provider: keyof typeof PROVIDERS = 'animasu'): Promise<VideoData | null> {
        try {
            const res = await fetch(`${PROVIDERS[provider]}/episode/${slug}`, fetchOptions);
            const data = await res.json();
            if (data.streams) {
                return {
                    episode_id: data.title || slug,
                    reso: data.streams.map((s: any) => s.name),
                    video: data.streams.map((s: any, index: number) => ({
                        reso: s.name,
                        link: s.url,
                        provide: index,
                        id: index
                    }))
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching video for ${slug} on ${provider}:`, error);
            return null;
        }
    },

    // Helper: Validate if a video URL is accessible
    async validateVideoUrl(url: string): Promise<boolean> {
        try {
            // BLOCKLIST: Providers that don't work for streaming (download-only or require verification)
            const blockedProviders = [
                'terabox.com', '1024terabox.com',  // Requires verification
                'up-4ever.net', 'up4ever.net',     // Download only, not streamable
                'hxfile.co',                        // Download only
                'zippyshare.com',                   // Often dead/download only
                'uptobox.com',                      // Download only, requires login
                'krakenfiles.com',                  // Download only
                'filescdn.com',                     // Download only
            ];
            if (blockedProviders.some(p => url.includes(p))) {
                console.log('[Validate] Blocked provider:', url);
                return false; // Block these providers
            }

            // ALLOWLIST: Known embed providers that work (skip validation)
            const embedProviders = ['vidhide', 'blogger.com', 'mega.nz', 'drive.google', 'youtube', 'dailymotion', 'cdn-cf.berkasdrive.com'];
            if (embedProviders.some(p => url.includes(p))) {
                return true; // Assume embeds work
            }

            // For direct links, do a HEAD request with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            clearTimeout(timeout);
            return res.ok || res.status === 206; // 206 = Partial Content (valid for video)
        } catch (error) {
            console.log('[Validate] Failed:', url);
            return false;
        }
    },

    // Helper: Extract direct video URL from berkasdrive/mitedrive download pages
    async resolveDirectVideoUrl(url: string): Promise<string | null> {
        try {
            // Only process berkasdrive/mitedrive links
            if (!url.includes('berkasdrive.com') && !url.includes('mitedrive.com')) {
                return null;
            }

            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const html = await res.text();

            // Look for base64 encoded URL pattern: const a = "base64string";
            const base64Match = html.match(/const\s+a\s*=\s*["']([A-Za-z0-9+/=]+)["']/);
            if (base64Match && base64Match[1]) {
                // Decode base64 using atob (works in browser and Node 16+)
                const decoded = atob(base64Match[1]);
                if (decoded.startsWith('http') && (decoded.includes('.mp4') || decoded.includes('.m3u8'))) {
                    console.log('[DEBUG] Resolved direct video URL:', decoded);
                    // Wrap with proxy if configured (load balanced)
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

            return null;
        } catch (error) {
            console.error('Error resolving direct video URL:', error);
            return null;
        }
    },

    async getNimegamiVideo(title: string, episode: string): Promise<VideoSource[]> {
        try {
            // 1. Clean title thoroughly - remove brackets content, Sub Indo, etc.
            const baseTitle = title
                .replace(/\[.*?\]/g, '')           // Remove [content]
                .replace(/\(.*?\)/g, '')           // Remove (content)
                .replace(/Sub Indo|Episode \d+|Season \d+/gi, '')
                .trim();
            const cleanTitle = baseTitle.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
            const titleWords = cleanTitle.split(' ').filter(w => w.length > 2);

            console.log('[DEBUG Nimegami] Clean title:', cleanTitle, 'Words:', titleWords);

            // Try multiple search strategies - prioritize unique words
            const searchQueries = [
                titleWords.slice(0, 2).join(' '),   // First 2 words
                titleWords[titleWords.length - 1],  // Last word
                titleWords.slice(-2).join(' '),     // Last 2 words
                titleWords[0],                       // First word only
                titleWords.length > 2 ? titleWords[1] : '' // Second word (often the unique name)
            ].filter(q => q && q.length >= 3);

            let animeList: any[] = [];
            let usedQuery = '';

            for (const query of searchQueries) {
                console.log('[DEBUG Nimegami] Trying search:', query);

                const searchRes = await fetch(`${PROVIDERS.nimegami}/search/${encodeURIComponent(query)}`, fetchOptions);
                const searchData = await searchRes.json();
                animeList = searchData.anime_list || [];

                // Check if any result actually contains our search word
                if (animeList.length > 0) {
                    const matchingResult = animeList.find((item: any) =>
                        item.title.toLowerCase().includes(query.toLowerCase()) ||
                        query.toLowerCase().includes(item.title.split(' ')[0].toLowerCase())
                    );
                    if (matchingResult || animeList.length === 1) {
                        usedQuery = query;
                        console.log('[DEBUG Nimegami] Found with query:', query, '-> Results:', animeList.length);
                        break;
                    }
                }
            }

            if (animeList.length === 0) return [];

            // Find best match using scoring system
            // Priority: exact match > TV series > fewer extra words in title
            const scoredResults = animeList.map((item: any) => {
                const itemTitle = item.title.toLowerCase();
                const originalClean = cleanTitle.toLowerCase();
                let score = 0;

                // Exact match gets highest score
                if (itemTitle === originalClean || itemTitle.startsWith(originalClean)) {
                    score += 100;
                }

                // Contains all search words
                const matchedWords = titleWords.filter(w => itemTitle.includes(w.toLowerCase()));
                score += matchedWords.length * 10;

                // Prefer "TV" type or items with (TV) in title
                if (item.type === 'TV' || itemTitle.includes('(tv)') || itemTitle.includes('tv')) {
                    score += 20;
                }

                // Prefer shorter titles (less likely to be spinoffs/specials)
                // Spinoffs usually have longer titles like "Jujutsu Kaisen: Shimetsu Kaiyuu"
                const titleLength = item.title.split(' ').length;
                score -= titleLength; // Shorter = better

                // Penalize titles with colons (often spinoffs: "Title: Subtitle")
                if (item.title.includes(':')) {
                    score -= 30;
                }

                // Penalize movie/special types when looking for series
                if (item.type === 'Movie' || item.type === 'Special' || item.type === 'OVA') {
                    score -= 25;
                }

                return { ...item, score };
            });

            // Sort by score (highest first) and pick the best
            scoredResults.sort((a: any, b: any) => b.score - a.score);
            const firstResult = scoredResults[0];

            if (!firstResult) return [];

            console.log('[DEBUG Nimegami] Using anime:', firstResult.title, 'Slug:', firstResult.slug, 'Type:', firstResult.type, 'Score:', firstResult.score);

            // 2. Get detail
            const detailRes = await fetch(`${PROVIDERS.nimegami}/detail/${firstResult.slug}`, fetchOptions);
            const data = await detailRes.json();
            const detail = data.detail;

            console.log('[DEBUG Nimegami] Root keys:', Object.keys(data));
            console.log('[DEBUG Nimegami] Detail keys:', detail ? Object.keys(detail) : 'null');

            if (!detail) return [];

            let allFoundSources: VideoSource[] = [];

            // 3. Find in streams_by_episode - NOTE: This is at ROOT level, not inside detail!
            const streamsObj = data.streams_by_episode || {};
            console.log('[DEBUG Nimegami] streams_by_episode keys:', Object.keys(streamsObj));
            const normEp = episode.replace(/^0+/, '');

            // For series: match "Episode X" (case-insensitive, flexible matching)
            let targetKey = Object.keys(streamsObj).find(k => {
                const kl = k.toLowerCase();
                const normEpNum = parseInt(normEp);

                // Match various episode formats: "Episode 1", "Ep 1", "episode 01", etc.
                if (kl.includes('episode') || kl.includes('ep')) {
                    // Extract number from the key
                    const keyNumMatch = k.match(/\d+/);
                    if (keyNumMatch) {
                        const keyNum = parseInt(keyNumMatch[0]);
                        return keyNum === normEpNum;
                    }
                }

                // Also check for movie/full
                return kl === "movie" || kl === "full movie" || kl === "full";
            });

            if (targetKey) {
                const streams = streamsObj[targetKey];
                if (Array.isArray(streams)) {
                    streams.forEach(s => {
                        allFoundSources.push({
                            reso: `Nimegami - ${s.resolution || s.name || 'HD'}`,
                            link: s.url,
                            provide: 99,
                            id: Math.random()
                        });
                    });
                }
            } else {
                // For movies: keys ARE often resolutions (e.g. "1080p")
                const resKeys = Object.keys(streamsObj).filter(k => k.match(/\d+p/));
                if (resKeys.length > 0) {
                    resKeys.forEach(k => {
                        const s = streamsObj[k];
                        if (typeof s === 'string') {
                            allFoundSources.push({
                                reso: `Nimegami - ${k}`,
                                link: s,
                                provide: 99,
                                id: Math.random()
                            });
                        } else if (Array.isArray(s)) {
                            s.forEach((item: any) => {
                                allFoundSources.push({
                                    reso: `Nimegami - ${k} (${item.name || 'Server'})`,
                                    link: item.url || item.link,
                                    provide: 99,
                                    id: Math.random()
                                });
                            });
                        }
                    });
                }
            }

            // 4. Also check download_groups - NOTE: This is at ROOT level, not inside detail!
            const downloadGroups = data.download_groups || {};
            console.log('[DEBUG Nimegami] Download groups keys:', Object.keys(downloadGroups));

            for (const groupName of Object.keys(downloadGroups)) {
                const links = downloadGroups[groupName];
                if (Array.isArray(links)) {
                    // For movies/BD/single episode, always take all links
                    const isSingleEpisode = firstResult.episode === "1" || firstResult.type === 'BD' || firstResult.type === 'Movie';

                    for (const l of links) {
                        if (isSingleEpisode) {
                            let finalLink = l.url;
                            let isDirect = false;

                            // Try to resolve berkasdrive links to direct video URLs
                            if (l.url && (l.url.includes('berkasdrive.com') || l.url.includes('mitedrive.com'))) {
                                const directUrl = await this.resolveDirectVideoUrl(l.url);
                                if (directUrl) {
                                    finalLink = directUrl;
                                    isDirect = true;
                                }
                            }

                            allFoundSources.push({
                                reso: `Nimegami - ${l.resolution || 'HD'} (${l.name || 'DL'})`,
                                link: finalLink,
                                provide: 99,
                                id: Math.random(),
                                isDirect
                            });
                        }
                    }
                }
            }

            console.log('[DEBUG Nimegami] Total sources found:', allFoundSources.length);

            // Remove duplicates (by link)
            const uniqueSources = allFoundSources.filter((v, i, a) => a.findIndex(t => t.link === v.link) === i);
            return uniqueSources;
        } catch (error) {
            console.error('Error fetching Nimegami video:', error);
            return [];
        }
    }
};
