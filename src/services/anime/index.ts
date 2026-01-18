// Anime API - Main Export
// This file combines all providers and exports a unified API

// Re-export types
export * from './types';

// Import all providers
import * as animasu from './animasu';
import { getNimegamiVideo } from './nimegami';
import { getSansekaiVideo } from './sansekai';
import { validateVideoUrl, resolveDirectVideoUrl } from './utils';

// Combined anime API object
export const animeApi = {
    // Animasu (Main provider)
    getLatest: animasu.getLatest,
    getRecommended: animasu.getRecommended,
    getMovies: animasu.getMovies,
    getDetail: animasu.getDetail,
    search: animasu.search,
    getVideo: animasu.getVideo,

    // Alternative video sources
    getNimegamiVideo,
    getSansekaiVideo,

    // Utilities
    validateVideoUrl,
    resolveDirectVideoUrl,
};

// Default export
export default animeApi;
