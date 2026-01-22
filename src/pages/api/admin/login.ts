
import type { APIRoute } from 'astro';
export const prerender = false;
import { checkRateLimit, incrementRateLimit, resetRateLimit, createSession, verifyCredentials } from '../../../lib/admin';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    const ip = request.headers.get('x-forwarded-for') || clientAddress;

    const { blocked, remaining } = checkRateLimit(ip);
    if (blocked) {
        return new Response(JSON.stringify({
            error: 'Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.'
        }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { username, password } = body;

        if (verifyCredentials(username, password)) {
            resetRateLimit(ip);
            const token = createSession();

            cookies.set('admin_session', token, {
                path: '/',
                httpOnly: true,
                secure: import.meta.env.PROD,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 // 24 hours
            });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            incrementRateLimit(ip);
            return new Response(JSON.stringify({
                error: 'Username atau password salah',
                remainingAttempts: remaining - 1
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid Request' }), {
            status: 400
        });
    }
}

export const DELETE: APIRoute = async ({ cookies }) => {
    cookies.delete('admin_session', { path: '/' });
    return new Response(JSON.stringify({ success: true }));
}
