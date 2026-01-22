
import type { APIRoute } from 'astro';
export const prerender = false;
import { getAnalyticsStore } from '../../../lib/analytics';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
        return new Response('Missing sessionId', { status: 400 });
    }

    const store = getAnalyticsStore();
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Content-Encoding': 'none',
        'Access-Control-Allow-Origin': '*'
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('data: connected\n\n'));

            const pingInterval = setInterval(() => {
                try { controller.enqueue(encoder.encode(': ping\n\n')); } catch (e) { clearInterval(pingInterval); }
            }, 15000);

            const onKick = (kickedSessionId: string) => {
                if (kickedSessionId === sessionId) {
                    try {
                        controller.enqueue(encoder.encode(`data: kick\n\n`));
                        setTimeout(() => { try { controller.close(); } catch (e) { } }, 100);
                    } catch (e) { clearInterval(pingInterval); }
                }
            };

            const onMaintenance = (data: any) => {
                try { controller.enqueue(encoder.encode(`data: maintenance|${JSON.stringify(data)}\n\n`)); } catch (e) { }
            };

            store.events.on('kick', onKick);
            store.events.on('maintenance', onMaintenance);

            request.signal.addEventListener('abort', () => {
                store.events.off('kick', onKick);
                store.events.off('maintenance', onMaintenance);
                clearInterval(pingInterval);
            });
        }
    });

    return new Response(stream, { headers });
};
