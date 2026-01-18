// Animasu Provider - Main anime source

import { PROVIDERS, fetchOptions } from './config';
import { proxyFetch } from './utils';
import type { AnimeLatest, AnimeRecommended, AnimeDetail, VideoData } from './types';

export async function getLatest(): Promise<AnimeLatest[]> {
    const fetchPage = async (page: number, retries = 2): Promise<any> => {
        try {
            const res = await proxyFetch(`${PROVIDERS.animasu}/latest?page=${page}`, fetchOptions);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            if (retries > 0) {
                console.log(`[Animasu] Retrying getLatest page ${page}... (${retries} left)`);
                await new Promise(r => setTimeout(r, 500));
                return fetchPage(page, retries - 1);
            }
            console.warn(`[Animasu] Page ${page} failed for getLatest:`, error instanceof Error ? error.message : error);
            return { animes: [] }; // Return empty instead of throwing
        }
    };

    try {
        const pagePromises = [1, 2, 3, 4].map(page => fetchPage(page));
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
}

export async function getRecommended(): Promise<AnimeRecommended[]> {
    const fetchPage = async (page: number, retries = 2): Promise<any> => {
        try {
            const res = await proxyFetch(`${PROVIDERS.animasu}/popular?page=${page}`, fetchOptions);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            if (retries > 0) {
                console.log(`[Animasu] Retrying getRecommended page ${page}... (${retries} left)`);
                await new Promise(r => setTimeout(r, 500));
                return fetchPage(page, retries - 1);
            }
            console.warn(`[Animasu] Page ${page} failed for getRecommended:`, error instanceof Error ? error.message : error);
            return { animes: [] };
        }
    };

    try {
        const pagePromises = [1, 2, 3, 4].map(page => fetchPage(page));
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
}

export async function getMovies(): Promise<AnimeLatest[]> {
    const fetchPage = async (page: number, retries = 2): Promise<any> => {
        try {
            const res = await proxyFetch(`${PROVIDERS.animasu}/movies?page=${page}`, fetchOptions);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            if (retries > 0) {
                console.log(`[Animasu] Retrying getMovies page ${page}... (${retries} left)`);
                await new Promise(r => setTimeout(r, 500));
                return fetchPage(page, retries - 1);
            }
            console.warn(`[Animasu] Page ${page} failed for getMovies:`, error instanceof Error ? error.message : error);
            return { animes: [] };
        }
    };

    try {
        const pagePromises = [1, 2, 3, 4].map(page => fetchPage(page));
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
}

export async function getDetail(slug: string): Promise<AnimeDetail | null> {
    const url = `${PROVIDERS.animasu}/detail/${slug}`;
    const fetchWithRetry = async (retries = 2): Promise<any> => {
        try {
            const res = await proxyFetch(url, fetchOptions);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            if (retries > 0) {
                console.log(`[Animasu] Retrying getDetail for ${slug}... (${retries} left)`);
                await new Promise(r => setTimeout(r, 500));
                return fetchWithRetry(retries - 1);
            }
            throw error;
        }
    };

    try {
        const data = await fetchWithRetry();
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
                    date: ''
                })) || []
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching anime detail for ${slug}:`, error);
        return null;
    }
}

export async function search(query: string): Promise<AnimeRecommended[]> {
    const fetchPage = async (page: number, retries = 2): Promise<any> => {
        try {
            const res = await proxyFetch(`${PROVIDERS.animasu}/search/${query}?page=${page}`, fetchOptions);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            if (retries > 0) {
                console.log(`[Animasu] Retrying search page ${page} for ${query}... (${retries} left)`);
                await new Promise(r => setTimeout(r, 500));
                return fetchPage(page, retries - 1);
            }
            console.warn(`[Animasu] Page ${page} failed for search ${query}:`, error instanceof Error ? error.message : error);
            return { animes: [] }; // Don't crash search if one page is missing
        }
    };

    try {
        const pagePromises = [1, 2, 3, 4].map(page => fetchPage(page));
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
}

export async function getVideo(slug: string, provider: keyof typeof PROVIDERS = 'animasu'): Promise<VideoData | null> {
    const url = `${PROVIDERS[provider]}/episode/${slug}`;
    const fetchWithRetry = async (retries = 2): Promise<any> => {
        try {
            const res = await proxyFetch(url, fetchOptions);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            if (retries > 0) {
                console.log(`[Animasu] Retrying getVideo for ${slug}... (${retries} left)`);
                await new Promise(r => setTimeout(r, 500));
                return fetchWithRetry(retries - 1);
            }
            throw error;
        }
    };

    try {
        const data = await fetchWithRetry();
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
}
