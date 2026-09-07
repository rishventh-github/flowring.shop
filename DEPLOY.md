# Deploy FlowRing as flowring.shop (Vercel)

FlowRing runs on **Vercel**: static pages (HTML/CSS/JS/images) plus a serverless API for admin, blog, accounts, and cart.

Vercel has **no persistent local disk**, so the database must be **Turso** (hosted SQLite). Local `npm start` still uses a file at `data/flowring.db`.

---

## 1. Create a Turso database (required for production)

1. Sign up at [turso.tech](https://turso.tech) and install the CLI if you want:
   ```bash
   brew install tursodatabase/tap/turso
   turso auth login
   turso db create flowring
   turso db show flowring --url
   turso db tokens create flowring
   ```
2. Copy:
   - **`TURSO_DATABASE_URL`** — looks like `libsql://flowring-….turso.io`
   - **`TURSO_AUTH_TOKEN`** — the token you created

You can also create Turso from the [Vercel Marketplace → Turso](https://vercel.com/marketplace/tursocloud/database) and it will inject these env vars.

---

## 2. Push your code to GitHub

If the repo is already on GitHub, skip this. Otherwise:

```bash
git add .
git commit -m "Deploy FlowRing on Vercel"
git push -u origin main
```

---

## 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub is easiest).
2. **Add New… → Project** and import **`rishventh-github/flowring.shop`** (or your fork).
3. Framework preset: **Other** (static + Node API). Build/install can stay default (`npm install`).
4. Under **Environment Variables**, add:

   | Name | Value |
   |------|--------|
   | `ADMIN_PASSWORD` | Strong password for `/admin/login` |
   | `SESSION_SECRET` | Long random string |
   | `TURSO_DATABASE_URL` | From Turso |
   | `TURSO_AUTH_TOKEN` | From Turso |

5. Click **Deploy**. When it finishes, open the `*.vercel.app` URL.
6. Confirm:
   - Home page loads
   - `/api/content` returns JSON
   - `/admin/login` accepts your `ADMIN_PASSWORD`
   - Saving in admin shows the persistence toast (data is in Turso)

Schema and default content are created automatically on first API request.

---

## 4. Use flowring.shop as the domain

1. In **Vercel → Project → Settings → Domains**, add `flowring.shop` and `www.flowring.shop` if you want.
2. At your DNS provider, add the records Vercel shows (usually **A** / **CNAME**).
3. Wait for DNS + HTTPS (often a few minutes).

Your live site will be **https://flowring.shop**.

---

## Local development

```bash
npm install
cp .env.example .env
# Set ADMIN_PASSWORD and SESSION_SECRET (Turso vars optional locally)
npm start
```

Without Turso env vars, the app uses **`data/flowring.db`**. To test against the same DB as production, put `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env`.

---

## Turning off Render (if you still have it)

1. In the Render dashboard, **suspend** or **delete** the old web service so it stops competing for DNS.
2. Point **flowring.shop** DNS to **Vercel** (remove old Render CNAME/A records).
3. You can delete `render.yaml` from the repo once you no longer need it (optional).

---

## Can I still change the website after it’s deployed?

**Yes.**

1. **Code** — Edit, commit, push to `main`. Vercel redeploys automatically.
2. **Admin content** — Use **https://flowring.shop/admin/login**. Saves go to **Turso** and survive every deploy.
3. **Domain** — Stay on flowring.shop; only hosting moves to Vercel.
