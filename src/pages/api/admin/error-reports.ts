
import type { APIRoute } from 'astro';
export const prerender = false;
import { validateSession } from '../../../lib/admin';

interface ErrorReport {
    id: string;
    url: string;
    description?: string;
    userAgent: string;
    ip: string;
    timestamp: number;
    resolved: boolean;
}

interface ErrorReportsStore {
    reports: ErrorReport[];
}

declare global {
    var errorReportsStore: ErrorReportsStore | undefined;
}

function getErrorReportsStore(): ErrorReportsStore {
    if (!globalThis.errorReportsStore) {
        globalThis.errorReportsStore = {
            reports: []
        };
    }
    return globalThis.errorReportsStore;
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { url, description } = body;

        const store = getErrorReportsStore();
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const ip = request.headers.get('x-forwarded-for') || 'Unknown';

        const report: ErrorReport = {
            id: `err_${Date.now()}`,
            url: url || 'General Report',
            description: description || '',
            userAgent,
            ip: ip.split(',')[0].trim(),
            timestamp: Date.now(),
            resolved: false
        };

        store.reports.unshift(report);
        if (store.reports.length > 50) store.reports = store.reports.slice(0, 50);

        return new Response(JSON.stringify({ success: true, id: report.id }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }
};

export const GET: APIRoute = async ({ cookies }) => {
    const sessionCookie = cookies.get('admin_session');
    if (!sessionCookie || !validateSession(sessionCookie.value)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const store = getErrorReportsStore();
    return new Response(JSON.stringify({
        reports: store.reports,
        totalCount: store.reports.length,
        unresolvedCount: store.reports.filter(r => !r.resolved).length
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
    const sessionCookie = cookies.get('admin_session');
    if (!sessionCookie || !validateSession(sessionCookie.value)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, action } = body;
        const store = getErrorReportsStore();

        if (action === 'delete') {
            store.reports = store.reports.filter(r => r.id !== id);
        } else if (action === 'clear-all') {
            store.reports = [];
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }
};
