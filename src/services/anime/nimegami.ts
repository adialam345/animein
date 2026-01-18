// Nimegami Provider - Alternative video source

import { PROVIDERS, fetchOptions } from './config';
import { resolveDirectVideoUrl, fixMegaLink, proxyFetch } from './utils';
import type { VideoSource } from './types';

export async function getNimegamiVideo(title: string, episode: string): Promise<VideoSource[]> {
    try {
        // 1. Clean title thoroughly
        const baseTitle = title
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/Sub Indo|Episode \d+|Season \d+/gi, '')
            .trim();
        const cleanTitle = baseTitle.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
        const titleWords = cleanTitle.split(' ').filter(w => w.length > 2);

        console.log('[DEBUG Nimegami] Clean title:', cleanTitle, 'Words:', titleWords);

        // Try multiple search strategies
        const searchQueries = [
            titleWords.slice(0, 2).join(' '),
            titleWords[titleWords.length - 1],
            titleWords.slice(-2).join(' '),
            titleWords[0],
            titleWords.length > 2 ? titleWords[1] : ''
        ].filter(q => q && q.length >= 3);

        let animeList: any[] = [];
        let usedQuery = '';

        for (const query of searchQueries) {
            console.log('[DEBUG Nimegami] Trying search:', query);

            const searchRes = await proxyFetch(`${PROVIDERS.nimegami}/search/${encodeURIComponent(query)}`, fetchOptions);
            const searchData = await searchRes.json();
            animeList = searchData.anime_list || [];

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
        const scoredResults = animeList.map((item: any) => {
            const itemTitle = item.title.toLowerCase();
            const originalClean = cleanTitle.toLowerCase();
            let score = 0;

            if (itemTitle === originalClean || itemTitle.startsWith(originalClean)) {
                score += 100;
            }

            const matchedWords = titleWords.filter(w => itemTitle.includes(w.toLowerCase()));
            score += matchedWords.length * 10;

            if (item.type === 'TV' || itemTitle.includes('(tv)') || itemTitle.includes('tv')) {
                score += 20;
            }

            const titleLength = item.title.split(' ').length;
            score -= titleLength;

            if (item.title.includes(':')) {
                score -= 30;
            }

            if (item.type === 'Movie' || item.type === 'Special' || item.type === 'OVA') {
                score -= 25;
            }

            return { ...item, score };
        });

        scoredResults.sort((a: any, b: any) => b.score - a.score);
        const candidates = scoredResults.slice(0, 3);

        console.log(`[DEBUG Nimegami] Checking ${candidates.length} candidates for episode ${episode}...`);

        // 2. Parallel check candidates for the requested episode
        const results = await Promise.all(candidates.map(async (anime: any) => {
            try {
                const detailRes = await proxyFetch(`${PROVIDERS.nimegami}/detail/${anime.slug}`, fetchOptions);
                const data = await detailRes.json();

                let foundSources: VideoSource[] = [];
                const normEp = episode.replace(/^0+/, '');
                const normEpNum = parseInt(normEp);

                // Check streams_by_episode
                const streamsObj = data.streams_by_episode || {};
                let targetKey = Object.keys(streamsObj).find(k => {
                    const kl = k.toLowerCase();
                    if (kl.includes('episode') || kl.includes('ep')) {
                        const keyNumMatch = k.match(/\d+/);
                        if (keyNumMatch) return parseInt(keyNumMatch[0]) === normEpNum;
                    }
                    return kl === "movie" || kl === "full movie" || kl === "full";
                });

                if (targetKey) {
                    const streams = streamsObj[targetKey];
                    if (Array.isArray(streams)) {
                        streams.forEach(s => {
                            foundSources.push({
                                reso: `Nimegami - ${s.resolution || s.name || 'HD'}`,
                                link: fixMegaLink(s.url),
                                provide: 99,
                                id: Math.random()
                            });
                        });
                    }
                } else {
                    const resKeys = Object.keys(streamsObj).filter(k => k.match(/\d+p/));
                    resKeys.forEach(k => {
                        const s = streamsObj[k];
                        if (typeof s === 'string') {
                            foundSources.push({ reso: `Nimegami - ${k}`, link: fixMegaLink(s), provide: 99, id: Math.random() });
                        } else if (Array.isArray(s)) {
                            s.forEach((item: any) => {
                                foundSources.push({ reso: `Nimegami - ${k} (${item.name || 'Server'})`, link: fixMegaLink(item.url || item.link), provide: 99, id: Math.random() });
                            });
                        }
                    });
                }

                // Check download_groups
                const downloadGroups = data.download_groups || {};
                for (const groupName of Object.keys(downloadGroups)) {
                    const links = downloadGroups[groupName];
                    if (!Array.isArray(links)) continue;

                    const groupNameLower = groupName.toLowerCase();
                    let isMatchingGroup = false;

                    if (groupNameLower.includes('episode')) {
                        const epMatch = groupName.match(/episode\s*(\d+)/i);
                        if (epMatch && parseInt(epMatch[1]) === normEpNum) isMatchingGroup = true;
                    }

                    if (isMatchingGroup || ((anime.episode === "1" || anime.type === 'BD' || anime.type === 'Movie') && !groupNameLower.includes('batch'))) {
                        for (const l of links) {
                            let finalLink = l.url;
                            let isDirect = false;
                            if (l.url && (l.url.includes('berkasdrive.com') || l.url.includes('mitedrive.com'))) {
                                const directUrl = await resolveDirectVideoUrl(l.url);
                                if (directUrl) { finalLink = directUrl; isDirect = true; }
                            }
                            foundSources.push({
                                reso: `Nimegami - ${l.resolution || 'HD'} (${l.name || 'DL'})`,
                                link: fixMegaLink(finalLink),
                                provide: 99,
                                id: Math.random(),
                                isDirect
                            });
                        }
                    }
                }

                return { anime, sources: foundSources, hasEpisode: foundSources.length > 0 };
            } catch (e) {
                return { anime, sources: [], hasEpisode: false };
            }
        }));

        // Pick the best candidate that actually has sources for this episode
        const bestResult = results.find(r => r.hasEpisode);
        if (!bestResult) return [];

        console.log('[DEBUG Nimegami] Selected:', bestResult.anime.title, 'Found:', bestResult.sources.length, 'sources');

        // Remove duplicates
        return bestResult.sources.filter((v, i, a) => a.findIndex(t => t.link === v.link) === i);
    } catch (error) {
        console.error('Error fetching Nimegami video:', error);
        return [];
    }
}
