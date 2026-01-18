// Sansekai Provider - Additional video source

import { SANSEKAI_API, fetchOptions } from './config';
import { cleanTitle as cleanTitleUtil, fixMegaLink, proxyFetch } from './utils';
import type { VideoSource } from './types';

export async function getSansekaiVideo(title: string, episode: string): Promise<VideoSource[]> {
    const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
        try {
            const res = await proxyFetch(url, fetchOptions);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            if (retries > 0) {
                console.log(`[Sansekai] Retrying fetch for ${url}... (${retries} left)`);
                await new Promise(r => setTimeout(r, 800));
                return fetchWithRetry(url, retries - 1);
            }
            throw error;
        }
    };

    try {
        // 1. Clean title for search
        const cleanTitle = cleanTitleUtil(title);
        const titleWords = cleanTitle.split(' ').filter(w => w.length >= 3);

        // Try multiple search strategies
        const searchQueries = [
            titleWords.slice(0, 3).join(' '),
            titleWords.slice(0, 2).join(' '),
            titleWords[0]
        ].filter(q => q && q.length >= 3);

        let results: any[] = [];
        for (const query of searchQueries) {
            try {
                console.log('[DEBUG Sansekai] Trying search:', query);
                const searchData = await fetchWithRetry(`${SANSEKAI_API}/anime/search?query=${encodeURIComponent(query)}`);
                results = searchData.data?.[0]?.result || [];
                if (results.length > 0) break;
            } catch (e) {
                console.log(`[DEBUG Sansekai] Search failed:`, e instanceof Error ? e.message : e);
            }
        }

        if (results.length === 0) return [];

        // 3. Find best match using enhanced scoring
        const scoredResults = results.map((item: any) => {
            const itemTitle = (item.judul || '').toLowerCase();
            const originalTitleLower = title.toLowerCase();
            let score = 0;

            // Exact match or contains full cleaned title
            if (itemTitle.includes(cleanTitle.toLowerCase())) score += 50;

            // Check for specific keywords (Season 2, S2, etc)
            const seasonMatch = originalTitleLower.match(/season\s*(\d+)|s(\d+)/);
            if (seasonMatch) {
                const sNum = seasonMatch[1] || seasonMatch[2];
                if (itemTitle.includes(`season ${sNum}`) || itemTitle.includes(`s${sNum}`)) {
                    score += 40;
                }
            }

            // Word matching logic
            const searchWords = cleanTitle.toLowerCase().split(' ');
            let matchedCount = 0;
            searchWords.forEach(w => {
                if (itemTitle.includes(w)) {
                    matchedCount++;
                    score += 10;
                } else if (w.length > 3) {
                    score -= 5; // Penalty for missing important word
                }
            });

            // Bonus for newer entries (higher ID usually means newer on some platforms)
            if (item.id) score += Math.min(Number(item.id) / 10000, 10);

            return { ...item, score };
        });

        scoredResults.sort((a: any, b: any) => b.score - a.score);
        const candidates = scoredResults.slice(0, 3); // Take top 3 candidates

        console.log(`[DEBUG Sansekai] Checking ${candidates.length} candidates for episode ${episode}...`);

        // 4. Check which candidate actually has the episode (Parallel Check)
        const chapterChecks = await Promise.all(candidates.map(async (anime: any) => {
            try {
                const detailData = await fetchWithRetry(`${SANSEKAI_API}/anime/detail?urlId=${encodeURIComponent(anime.url)}`);
                const chapters = detailData.data?.[0]?.chapter || [];
                const normEp = episode.replace(/^0+/, '');
                const targetChapter = chapters.find((ch: any) => {
                    const chNum = String(ch.ch).replace(/^0+/, '');
                    return chNum === normEp;
                });
                return { ...anime, targetChapter, hasEpisode: !!targetChapter };
            } catch (e) {
                return { ...anime, hasEpisode: false };
            }
        }));

        // Pick the best candidate that HAS the episode
        const bestCandidate = chapterChecks.find(c => c.hasEpisode);

        if (!bestCandidate || !bestCandidate.targetChapter) {
            console.log('[DEBUG Sansekai] No anime found that contains this episode number');
            return [];
        }

        console.log('[DEBUG Sansekai] Selected:', bestCandidate.judul, 'URL:', bestCandidate.url);
        const targetChapter = bestCandidate.targetChapter;

        // 5. Get video links
        const videoData = await fetchWithRetry(`${SANSEKAI_API}/anime/getvideo?chapterUrlId=${encodeURIComponent(targetChapter.url)}`);
        const videoList = videoData.data?.[0]?.video || videoData.data?.[0]?.stream || [];
        const allSourcesMap = new Map<string, VideoSource>();

        for (const v of videoList) {
            if (v.link) {
                let cleanedLink = v.link.replace(/[?&]download[^&]*/g, '');
                if (cleanedLink.includes('pixeldrain.com/api/file/')) cleanedLink = cleanedLink.split('?')[0];

                // Fix Mega links
                cleanedLink = fixMegaLink(cleanedLink);

                const reso = v.reso || '480p';
                const isDirect = cleanedLink.includes('.mp4') || cleanedLink.includes('.m3u8') || cleanedLink.includes('.mkv');

                if (!allSourcesMap.has(reso) || (isDirect && !allSourcesMap.get(reso)?.isDirect)) {
                    allSourcesMap.set(reso, {
                        reso: `Sansekai - ${reso}`,
                        link: cleanedLink,
                        provide: v.provide || 100,
                        id: v.id || Math.random(),
                        isDirect
                    });
                }
            }
        }
        return Array.from(allSourcesMap.values());
    } catch (error) {
        console.error('Error fetching Sansekai video:', error);
        return [];
    }
}
