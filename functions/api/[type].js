// Cloudflare Pages Function — ODPT への代理アクセス（APIキーを隠蔽）
// /api/trains  -> odpt:Train（列車ロケーション）
// /api/info    -> odpt:TrainInformation（運行情報）
//
// キーは Cloudflare Pages の環境変数 ODPT_KEY に設定する（コードには書かない）。

const ENDPOINTS = {
  trains: 'odpt:Train',
  info: 'odpt:TrainInformation',
};
const RAILWAY = 'odpt.Railway:JR-East.Yamanote';
const CACHE_SECONDS = 15; // 多人数アクセス時に上流呼び出しをまとめてquotaを節約

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet({ env, params, request, waitUntil }) {
  const endpoint = ENDPOINTS[params.type];
  if (!endpoint) return json({ error: 'not found' }, 404);
  if (!env.ODPT_KEY) return json({ error: 'ODPT_KEY env var is not set' }, 500);

  // エッジキャッシュ（同一URL）
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream =
    `https://api.odpt.org/api/v4/${endpoint}` +
    `?odpt:railway=${encodeURIComponent(RAILWAY)}` +
    `&acl:consumerKey=${encodeURIComponent(env.ODPT_KEY)}`;

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
  if (r.ok) waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
