# Rail Radar 🚆

鉄道をフライトトラッカー風に可視化するサイト（Mini Metro × ミッドセンチュリー デザイン）。
現在は **山手線** を表示し、公共交通オープンデータセンター（ODPT）の
「JR東日本 列車ロケーション情報」を使って内回り・外回りの列車をリアルタイム表示します。
将来は他の路線・鉄道へ拡張していく前提の構成です。

## 構成（Cloudflare Workers / 静的アセット）

```
.
├── public/
│   ├── index.html          # サイト本体（静的）
│   └── og.png              # OGP画像（1200x630）
├── worker.js               # Worker本体：静的配信 + /api プロキシ
├── wrangler.jsonc          # Workers 設定（assets=public, main=worker.js）
├── og.html                 # og.png の生成元（デプロイ対象外）
└── README.md
```

- 公開時はブラウザが同一オリジンの `/api/trains`・`/api/info` を叩く。
- Worker が**サーバー側の環境変数 `ODPT_KEY`** を使って ODPT へ代理アクセスするため、**APIキーはブラウザに出ない**。
- `/api` レスポンスはエッジで最大 15 秒キャッシュし、アクセスが増えても ODPT 呼び出し回数（quota）を抑える。
- それ以外のパスは `public/` の静的アセットを配信。
- キー未設定 / 取得失敗時は、**実時刻（JST）に連動した擬似ダイヤ**へ自動フォールバック。
  時計は実際の現在時刻で進み、運行時間帯（始発04:26〜終電01:20）も反映する（実データではない）。
  `ODPT_KEY` を設定すると自動で実運行（LIVE）へ切り替わる。

## デプロイ（Cloudflare Workers・GitHub連携）

`main` ブランチに push すると Workers Builds が `wrangler.jsonc` を読んで自動デプロイする。

1. Cloudflare ダッシュボード → **Compute (Workers)** → **Create** → **Import a repository** で `rail-radar` を連携（初回のみ）。
2. **Settings → Variables and Secrets** に `ODPT_KEY`（Secret）＝発行された consumerKey を追加。
3. 以降は `git push` で自動再デプロイ。`https://rail-radar.<subdomain>.workers.dev` で公開。

### Wrangler CLI から（任意）

```bash
npm i -g wrangler
wrangler login
wrangler deploy                       # wrangler.jsonc に従ってデプロイ
wrangler secret put ODPT_KEY          # consumerKey を登録
```

## ローカル確認

```bash
# Worker + 静的アセット + /api を一緒に動かす
ODPT_KEY=あなたのキー npx wrangler dev
```

`public/index.html` を直接ブラウザで開いた場合（`file://`）は `/api` が無いので、
画面下のバーに**手動キー入力欄**が出る → そこに consumerKey を貼れば LIVE 確認できる
（このキーはそのブラウザの localStorage に保存され、デプロイ物には含まれない）。

## データ / クレジット

- データ: [公共交通オープンデータセンター](https://www.odpt.org/) ／ JR東日本「列車ロケーション情報」
- 本アプリは ODPT 提供データを利用していますが、その正確性・即時性等を保証するものではなく、
  ODPT および事業者とは無関係です。ODPT の利用規約に従ってください。
