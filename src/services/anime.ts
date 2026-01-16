const BASE_URL = 'https://api.sansekai.my.id/api';

const fetchOptions = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
    }
};

export interface AnimeLatest {
    id: number;
    url: string;
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
    id: number;
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
    id: number;
    ch: string;
    url: string;
    date: string;
}

export interface VideoData {
    episode_id: number;
    reso: string[];
    video: VideoSource[];
}

export interface VideoSource {
    reso: string;
    link: string;
    provide: number;
    id: number;
}

export const animeApi = {
    async getLatest(): Promise<AnimeLatest[]> {
        try {
            const res = await fetch(`${BASE_URL}/anime/latest`, fetchOptions);
            const data = await res.json();
            return data || [];
        } catch (error) {
            console.error('Error fetching latest anime:', error);
            return [];
        }
    },

    async getRecommended(): Promise<AnimeRecommended[]> {
        try {
            const res = await fetch(`${BASE_URL}/anime/recommended`, fetchOptions);
            const data = await res.json();
            return data || [];
        } catch (error) {
            console.error('Error fetching recommended anime:', error);
            return [];
        }
    },

    async getMovies(): Promise<AnimeLatest[]> {
        try {
            const res = await fetch(`${BASE_URL}/anime/movie`, fetchOptions);
            const data = await res.json();
            return data || [];
        } catch (error) {
            console.error('Error fetching movies:', error);
            return [];
        }
    },

    async getDetail(urlId: string): Promise<AnimeDetail | null> {
        try {
            const res = await fetch(`${BASE_URL}/anime/detail?urlId=${urlId}`, fetchOptions);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                return {
                    ...data.data[0],
                    episodes: data.episodes || []
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching anime detail for ${urlId}:`, error);
            return null;
        }
    },

    async search(query: string): Promise<AnimeRecommended[]> {
        try {
            const res = await fetch(`${BASE_URL}/anime/search?query=${query}`, fetchOptions);
            const data = await res.json();
            return data.data?.[0]?.result || [];
        } catch (error) {
            console.error(`Error searching for ${query}:`, error);
            return [];
        }
    },

    async getVideo(chapterUrlId: string): Promise<VideoData | null> {
        try {
            const res = await fetch(`${BASE_URL}/anime/getvideo?chapterUrlId=${chapterUrlId}`, fetchOptions);
            const data = await res.json();
            return data.data?.[0] || null;
        } catch (error) {
            console.error(`Error fetching video for ${chapterUrlId}:`, error);
            return null;
        }
    }
};
