
import type { APIRoute } from 'astro';
export const prerender = false;
import { validateSession } from '../../../lib/admin';
import { getAnalyticsStore } from '../../../lib/analytics';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_FILE = path.join(process.cwd(), 'public/data/maintenance.json');

interface MaintenanceData {
    isMaintenance: boolean;
    message: string;
    expectedReturn: string;
}

async function getMaintenance(): Promise<MaintenanceData> {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {
            isMaintenance: false,
            message: 'Situs sedang dalam pemeliharaan rutin.',
            expectedReturn: 'Segera'
        };
    }
}

async function saveMaintenance(data: MaintenanceData) {
    const dir = path.dirname(DATA_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export const GET: APIRoute = async ({ cookies }) => {
    const sessionCookie = cookies.get('admin_session');
    if (!sessionCookie || !validateSession(sessionCookie.value)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const maintenance = await getMaintenance();
    return new Response(JSON.stringify(maintenance), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
    const sessionCookie = cookies.get('admin_session');
    if (!sessionCookie || !validateSession(sessionCookie.value)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const body = await request.json();
        const maintenance: MaintenanceData = {
            isMaintenance: !!body.isMaintenance,
            message: body.message || 'Situs sedang dalam pemeliharaan rutin.',
            expectedReturn: body.expectedReturn || 'Segera'
        };

        await saveMaintenance(maintenance);

        const store = getAnalyticsStore();
        store.events.emit('maintenance', maintenance);

        return new Response(JSON.stringify({ success: true, data: maintenance }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
    }
};
