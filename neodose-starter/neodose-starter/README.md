# NeoDose — Single‑tool SaaS Starter (Cloudflare Pages + Workers + D1 + Supabase Auth)

A production‑ready starter to launch a **one‑page, one‑tool SaaS** with **zero upfront cost** on free tiers.
Stack: **Cloudflare Pages** (hosting) + **Pages Functions/Workers** (API) + **D1/SQLite** (DB) + **Supabase Auth (magic links)** + **Gumroad** (Merchant‑of‑Record) webhooks.

> ⚕️ **Important medical disclaimer**: The included dosing logic is **demonstration only**. Validate with your institutional guidelines before any clinical use.

---

## 1) Quick start

### Prerequisites
- Node 18+ and `npm`
- Cloudflare CLI: `npm i -g wrangler`
- A Supabase project (free): copy **SUPABASE_URL** and **SUPABASE_ANON_KEY**
- A Gumroad product (or Lemon Squeezy) for paid subscription **(optional at first)**

### Local dev

```bash
# 1) Install deps
npm install

# 2) Create the D1 database locally and apply schema
#    (Pages dev will auto-bind env.DB from wrangler.toml for local use)
npx wrangler d1 create neodose_db
npx wrangler d1 execute neodose_db --file=./schema.sql

# 3) Run locally (serves static + functions)
npx wrangler pages dev .
```

Open http://localhost:8788

### Deploy on Cloudflare Pages (free)

1. Push this repo to GitHub.
2. In Cloudflare Dashboard → **Pages** → **Create project** → connect repo.
3. **Build command**: none (static). **Build output**: `.`  
4. Under **Functions**, ensure your `/functions` folder is detected.
5. Under **Settings → Environment Variables** (Project > Settings > Environment variables), add:
   - `SUPABASE_URL` = `https://<YOUR-PROJECT>.supabase.co`
   - `SUPABASE_ANON_KEY` = `ey...` (public anon key)
   - `GUMROAD_WEBHOOK_SECRET` = `your-random-string` (keep secret)
   - `CHECKOUT_URL` = `https://gumroad.com/l/<your-product>` (or Lemon Squeezy checkout)
   - `FREE_DAILY_LIMIT` = `5` (default if omitted)

6. Under **Functions → D1 databases**, bind your D1 DB:
   - Binding name: **DB**
   - Database: select created D1 database

7. Upload schema to production D1:
   - Dashboard → D1 → your DB → **Console** → paste `schema.sql` → **Run**

### Configure Supabase Auth (magic link)
- Supabase Dashboard → Authentication → URL Configuration
  - **Site URL**: your Pages domain (e.g., `https://neodose.pages.dev`)
  - **Additional Redirect URLs**: same (and your custom domain once mapped)
- Authentication → Providers → **Email (magic link)** → Enabled

### Configure Gumroad (optional, for monetization)
- Gumroad → **Settings → Advanced** → **Ping Webhooks**
  - Ping URL: `https://<your-domain>/api/webhooks/gumroad`
  - Secret: set the same string as `GUMROAD_WEBHOOK_SECRET`
- Ensure buyers use the **same email** they sign in with, so the webhook can grant **Pro**.
- Alternatively, set `CHECKOUT_URL` to Lemon Squeezy and adapt webhooks accordingly (the handler supports generic HMAC verify with `X-Signature`).

---

## 2) What’s included

- **Static frontend** (`index.html`, `public/assets/app.js`)  
  - Tailwind (CDN), bilingual EN/UR, email magic-link auth, simple dosing UI.
- **API** (Pages Functions)  
  - `POST /api/calc/neodose` — demo dosing logic + free/pro gating + usage logging  
  - `GET  /api/user/me` — returns current user and subscription status  
  - `GET  /api/public/env` — exposes *public* runtime config to frontend  
  - `POST /api/webhooks/gumroad` — HMAC verify and grant **Pro**
- **D1 schema** (`schema.sql`) with tables: `users`, `subscriptions`, `calculations`, `audit`.
- **Security & privacy basics**: no PHI required; server-side auth; rate limit free users.

---

## 3) Environment variables

| Name | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | e.g., `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Public anon key from Supabase project settings |
| `GUMROAD_WEBHOOK_SECRET` | optional | Shared secret for webhook HMAC verification |
| `CHECKOUT_URL` | optional | Link to your checkout (Gumroad/Lemon Squeezy) |
| `FREE_DAILY_LIMIT` | optional | Defaults to 5 |

> Production: Configure these in **Cloudflare Pages → Settings → Environment Variables**.  
> Local dev: `wrangler pages dev` reads from your shell; you can also set an `.env` and export before running.

---

## 4) Notes on validation & ethics
- **Auth validation**: Server-side fetch to Supabase `auth/v1/user` using the bearer token to validate sessions. Token never trusted blindly.
- **Clinical safety**: Demo calculator uses textbook values for **caffeine citrate** as an example. Replace with your validated, local protocol tables before use.
- **Islamic perspective**: Monetization via subscriptions/sales is permissible. Avoid interest-based financing or unethical ads.

---

## 5) Next steps
- Replace demo dosing with your validated algorithms.
- Add PDF export (client-side `window.print()` already usable; for advanced PDFs, add a Worker that renders HTML to PDF via a service).
- Point a custom domain to the Pages project.
- Announce launch and collect feedback.

— Generated: 2025-08-19
