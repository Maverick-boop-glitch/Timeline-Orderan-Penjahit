// Cloudflare Pages Function — menangani request ke /api/state
//
// GET  /api/state  -> kembalikan seluruh state (JSON) yang tersimpan
//                      di D1, atau `null` bila belum pernah disimpan.
// POST /api/state  -> timpa (upsert) state tersimpan dengan body
//                      JSON yang dikirim dari frontend.
//
// Membutuhkan D1 database binding bernama "DB" (lihat wrangler.toml
// dan README.md untuk cara menghubungkannya).

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const row = await env.DB
      .prepare('SELECT data FROM app_state WHERE id = 1')
      .first();

    if (!row) {
      return new Response('null', {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(row.data, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Gagal membaca data dari database', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const bodyText = await request.text();

    // validasi ringan: pastikan body memang JSON yang valid sebelum disimpan
    JSON.parse(bodyText);

    const now = new Date().toISOString();
    await env.DB
      .prepare(
        `INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .bind(bodyText, now)
      .run();

    return new Response(JSON.stringify({ ok: true, updatedAt: now }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Gagal menyimpan data ke database', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
