// Anime Types and Interfaces

export interface AnimeLatest {
    id: string;
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
    id: string;
    ch: string;
    url: string;
    date: string;
}

export interface VideoData {
    episode_id: string;
    reso: string[];
    video: VideoSource[];
}

export interface VideoSource {
    reso: string;
    link: string;
    provide: number;
    id: number;
    isDirect?: boolean;
}
