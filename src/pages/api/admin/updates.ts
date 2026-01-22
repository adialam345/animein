
import type { APIRoute } from 'astro';
export const prerender = false;
import { validateSession } from '../../../lib/admin';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_FILE = path.join(process.cwd(), 'public/data/updates.json');

async function getUpdates() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) { return []; }
}

async function saveUpdates(updates: any[]) {
    const dir = path.dirname(DATA_FILE);
    try { await fs.access(dir); } catch { await fs.mkdir(dir, { recursive: true }); }
    await fs.writeFile(DATA_FILE, JSON.stringify(updates, null, 2), 'utf-8');
}

export const GET: APIRoute = async ({ cookies }) => {
    const sessionCookie = cookies.get('admin_session');
    if (!sessionCookie || !validateSession(sessionCookie.value)) return new Response(null, { status: 401 });
    const updates = await getUpdates();
    return new Response(JSON.stringify({ updates }), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
    const sessionCookie = cookies.get('admin_session');
    if (!sessionCookie || !validateSession(sessionCookie.value)) return new Response(null, { status: 401 });
    try {
        const body = await request.json();
        const updates = await getUpdates();
        const newItem = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('id-ID'),
            title: body.title,
            content: body.content,
            timestamp: Date.now()
        };
        updates.unshift(newItem);
        await saveUpdates(updates.slice(0, 20));
        return new Response(JSON.stringify({ success: true, item: newItem }), { status: 201 });
    } catch (e) { return new Response(null, { status: 500 }); }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
    const sessionCookie = cookies.get('admin_session');
    if (!sessionCookie || !validateSession(sessionCookie.value)) return new Response(null, { status: 401 });
    try {
        const { id } = await request.json();
        let updates = await getUpdates();
        updates = updates.filter((u: any) => u.id !== id);
        await saveUpdates(updates);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) { return new Response(null, { status: 500 }); }
};
