import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
    let serverIp = 'Unknown';
    let apiStatus = 'Pending';
    let isOk = false;

    try {
        // 1. Cek IP Server
        const ipRes = await fetch('https://api64.ipify.org?format=json');
        const ipData = await ipRes.json();
        serverIp = ipData.ip;

        // 2. Test Hit API via Server
        const apiRes = await fetch('https://www.sankavollerei.com/anime/animasu/latest?page=1');
        if (apiRes.status === 200) {
            apiStatus = '✅ SUCCESS: Server bisa hit API.';
            isOk = true;
        } else {
            apiStatus = `❌ FAILED: Server kena status ${apiRes.status}`;
        }
    } catch (e) {
        apiStatus = '❌ ERROR: Gagal koneksi dari server.';
    }

    return new Response(JSON.stringify({
        ip: serverIp,
        apiStatus,
        isOk
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    });
};
