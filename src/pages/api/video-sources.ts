
import type { APIRoute } from 'astro';
import { animeApi } from '../../services/anime';
import { proxyFetch } from '../../services/anime/utils';

export const GET: APIRoute = async ({ url }) => {
    const title = url.searchParams.get('title');
    const episode = url.searchParams.get('episode');
    const animasuSlug = url.searchParams.get('animasuSlug');

    if (!title || !episode) {
        return new Response(JSON.stringify({ error: 'Missing title or episode' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        console.log(`[API] Fetching background sources for: ${title} Ep: ${episode}`);

        // Fetch from Nimegami and Sansekai in parallel
        const [nimegamiSources, sansekaiSources] = await Promise.all([
            animeApi.getNimegamiVideo(title, episode).catch(() => []),
            animeApi.getSansekaiVideo(title, episode).catch(() => [])
        ]);

        const allSources = [...nimegamiSources, ...sansekaiSources];

        // Basic validation logic (simplified for API)
        const validatedSources = await Promise.all(allSources.map(async (v) => {
            try {
                // Skrip validation ringan (HEAD request)
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);

                const res = await proxyFetch(v.link, {
                    method: 'HEAD',
                    signal: controller.signal,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                clearTimeout(timeout);

                if (res.ok || res.status === 405 || res.status === 403) { // 403/405 often allow embed anyway
                    return v;
                }
                return null;
            } catch {
                // If link is Mega or something that blocks HEAD, assume OK for now
                if (v.link.includes('mega.nz') || v.link.includes('api/mega-proxy') || v.link.includes('blogger.com')) {
                    return v;
                }
                return null;
            }
        }));

        const finalSources = validatedSources.filter(v => v !== null);

        return new Response(JSON.stringify(finalSources), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
