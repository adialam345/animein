
import type { APIRoute } from 'astro';
export const prerender = false;
import fs from 'node:fs/promises';
import path from 'node:path';

export const GET: APIRoute = async () => {
    const DATA_FILE = path.join(process.cwd(), 'public/data/maintenance.json');
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return new Response(data, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({
            isMaintenance: false,
            message: 'Situs sedang dalam pemeliharaan rutin.',
            expectedReturn: 'Segera'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
