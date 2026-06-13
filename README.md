# Rail Radar 🚆

鉄道をフライトトラッカー風に可視化するサイト（Mini Metro × ミッドセンチュリー デザイン）。
現在は **山手線** を表示し、公共交通オープンデータセンター（ODPT）の
「JR東日本 列車ロケーション情報」を使って内回り・外回りの列車をリアルタイム表示します。
将来は他の路線・鉄道へ拡張していく前提の構成です。

## 構成

```
.
├── index.html              # サイト本体（静的）
├── functions/
│   └── api/
│       └── [type].js       # Cloudflare Pages Function（/api/trains, /api/info のプロキシ）
└── README.md
```

- 公開時はブラウザが同一オリジンの `/api/trains`・`/api/info` を叩く。
- Function が**サーバー側の環境変数 `ODPT_KEY`** を使って ODPT へ代理アクセスするため、**APIキーはブラウザに出ない**。
- Function はエッジで最大 15 秒キャッシュするので、アクセスが増えても ODPT への呼び出し回数（quota）を抑えられる。
- キー未設定 / 取得失敗時は、**実時刻（JST）に連動した擬似ダイヤ**へ自動フォールバック。
  時計は実際の現在時刻で進み、運行時間帯（始発04:26〜終電01:20）も反映する（実データではない）。
  キーを設定して再デプロイすると自動で実運行（LIVE）へ切り替わる。

## デプロイ（Cloudflare Pages）

### A. ダッシュボードから（おすすめ・git連携）

1. このフォルダを GitHub リポジトリに push。
2. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
3. ビルド設定は **なし**（静的）でOK:
   - Framework preset: `None`
   - Build command: 空欄
   - Build output directory: `/`（ルート）
4. デプロイ後、**Settings → Environment variables → Production** に追加:
   - `ODPT_KEY` = 発行された consumerKey
   - 保存したら **Retry deployment**（再デプロイ）して反映。
5. 割り当てられた `https://<project>.pages.dev` を開けば LIVE 表示。

> プレビュー環境でも試すなら、Preview 用にも同じ `ODPT_KEY` を設定。

### B. Wrangler CLI から

```bash
npm i -g wrangler
wrangler login

# 初回デプロイ（プロジェクト名は任意）
wrangler pages deploy . --project-name rail-radar

# 環境変数（シークレット）を登録
wrangler pages secret put ODPT_KEY --project-name rail-radar
# プロンプトに consumerKey を貼り付け → 再デプロイ
wrangler pages deploy . --project-name rail-radar
```

## ローカル確認

```bash
# Functions も含めて動かす（/api が効く）
npx wrangler pages dev .
# 環境変数を渡す場合:
ODPT_KEY=あなたのキー npx wrangler pages dev .
```

`index.html` を直接ブラウザで開いた場合（`file://`）は `/api` が無いので、
画面下のバーに**手動キー入力欄**が出る → そこに consumerKey を貼れば LIVE 確認できる
（このキーはそのブラウザの localStorage に保存され、デプロイ物には含まれない）。

## データ / クレジット

- データ: [公共交通オープンデータセンター](https://www.odpt.org/) ／ JR東日本「列車ロケーション情報」
- 本アプリは ODPT 提供データを利用していますが、その正確性・即時性等を保証するものではなく、
  ODPT および事業者とは無関係です。ODPT の利用規約に従ってください。
