
import type { APIRoute } from 'astro';
export const prerender = false;
import { getAnalyticsStore } from '../../../lib/analytics';
import { validateSession } from '../../../lib/admin';

function cleanupInactiveUsers() {
    const store = getAnalyticsStore();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    for (const [sessionId, activity] of store.activeUsers.entries()) {
        if (now - activity.lastSeen > fiveMinutes) {
            store.activeUsers.delete(sessionId);
        }
    }
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { action, sessionId, page, dramaTitle, dramaSource, episodeNumber } = body;

        const store = getAnalyticsStore();

        if (store.bannedSessions.has(sessionId)) {
            return new Response(JSON.stringify({ error: 'Banned' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (action === 'kick') {
            const cookie = request.headers.get('cookie') || '';
            if (!cookie.includes('admin_session=')) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
            }

            if (body.targetSessionId) {
                store.bannedSessions.add(body.targetSessionId);
                store.activeUsers.delete(body.targetSessionId);
                store.events.emit('kick', body.targetSessionId);
                return new Response(JSON.stringify({ success: true, message: 'User kicked' }));
            }
        }

        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'Unknown';

        if (action === 'pageview') {
            const isNewSession = !store.activeUsers.has(sessionId);
            if (isNewSession) {
                store.totalVisits++;
            }

            store.activeUsers.set(sessionId, {
                sessionId,
                ip: ip.split(',')[0].trim(),
                userAgent,
                currentPage: page || '/',
                dramaTitle,
                dramaSource,
                episodeNumber,
                timestamp: isNewSession ? Date.now() : (store.activeUsers.get(sessionId)?.timestamp || Date.now()),
                lastSeen: Date.now()
            });
        } else if (action === 'heartbeat') {
            const existing = store.activeUsers.get(sessionId);
            if (existing) {
                existing.lastSeen = Date.now();
                existing.currentPage = page || existing.currentPage;
                if (dramaTitle) existing.dramaTitle = dramaTitle;
                if (dramaSource) existing.dramaSource = dramaSource;
                if (episodeNumber) existing.episodeNumber = episodeNumber;
            }
        } else if (action === 'leave') {
            store.activeUsers.delete(sessionId);
        }

        cleanupInactiveUsers();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const GET: APIRoute = async ({ cookies }) => {
    const sessionCookie = cookies.get('admin_session');

    if (!sessionCookie || !validateSession(sessionCookie.value)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    cleanupInactiveUsers();
    const store = getAnalyticsStore();

    const activeUsers = Array.from(store.activeUsers.values()).map(user => {
        const isWatchingDrama = !!user.dramaTitle;
        return {
            ...user,
            isWatchingDrama,
            timeOnSite: Math.floor((Date.now() - user.timestamp) / 1000)
        };
    });

    const usersWatching = activeUsers.filter(u => u.isWatchingDrama);

    return new Response(JSON.stringify({
        totalVisits: store.totalVisits,
        activeUsersCount: activeUsers.length,
        activeUsers,
        usersWatchingDrama: usersWatching.length,
        serverTime: new Date().toISOString()
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};
