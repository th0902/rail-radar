// Cloudflare Worker (static assets + ODPT proxy)
// 静的ファイルは public/ から配信し、/api/* だけ Worker が処理して
// ODPT API へ代理アクセスする（APIキーは環境変数 ODPT_KEY に隠す）。

const RAILWAY = 'odpt.Railway:JR-East.Yamanote';
const ENDPOINTS = {
  '/api/trains': 'odpt:Train',          // 列車ロケーション
  '/api/info': 'odpt:TrainInformation', // 運行情報
};
const CACHE_SECONDS = 15;               // 多人数アクセス時に上流呼び出しをまとめてquota節約

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const endpoint = ENDPOINTS[url.pathname];

    // 静的アセット（index.html, og.png, ...）
    if (!endpoint) return env.ASSETS.fetch(request);

    if (!env.ODPT_KEY) return json({ error: 'ODPT_KEY env var is not set' }, 500);

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // フィルタは whitelist（railway / operator）のみ転送。無指定は山手線（後方互換）。
    const rw = url.searchParams.get('railway');
    const op = url.searchParams.get('operator');
    const filter = rw ? `odpt:railway=${encodeURIComponent(rw)}`
                 : op ? `odpt:operator=${encodeURIComponent(op)}`
                 : `odpt:railway=${encodeURIComponent(RAILWAY)}`;
    const upstream =
      `https://api.odpt.org/api/v4/${endpoint}` +
      `?${filter}&acl:consumerKey=${encodeURIComponent(env.ODPT_KEY)}`;

    let r;
    try {
      r = await fetch(upstream);
    } catch (e) {
      return json({ error: 'upstream fetch failed', detail: String(e) }, 502);
    }

    const body = await r.text();
    const res = new Response(body, {
      status: r.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_SECONDS}`,
      },
    });
    if (r.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
