/**
 * Jahitan — Cloudflare Worker
 *
 * Converts the original Pages Function (functions/api/state.js) into a
 * plain Worker, because this Cloudflare account's Git-connected project
 * was created as a "Worker" application (not classic "Pages"), and the
 * auto-generated build token for Worker projects doesn't have permission
 * to run `wrangler pages deploy`. This avoids that entirely — same
 * behavior, deployed with `wrangler deploy` instead.
 *
 * Routes:
 *   GET  /api/state  -> returns the saved JSON state, or `null` if none yet
 *   POST /api/state  -> overwrites (upserts) the saved state with the JSON body
 *
 * Anything else falls through to the static frontend (public/index.html)
 * via the `assets` binding configured in wrangler.toml.
 *
 * NOTE ON SECURITY: same as the original project — /api/state has no
 * authentication. Anyone who knows the URL can read and overwrite all
 * data. Fine for a trusted internal team; add protection (e.g. Cloudflare
 * Access) before making the URL public.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/state') {
      if (request.method === 'GET') return handleGet(env);
      if (request.method === 'POST') return handlePost(request, env);
      return new Response('Method not allowed', { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleGet(env) {
  try {
    const row = await env.DB
      .prepare('SELECT data FROM app_state WHERE id = 1')
      .first();

    if (!row) {
      return new Response('null', { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(row.data, { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Gagal membaca data dari database', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handlePost(request, env) {
  try {
    const bodyText = await request.text();
    JSON.parse(bodyText); // validate it's actually JSON before saving

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    ).bind(bodyText, now).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Gagal menyimpan data ke database', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
