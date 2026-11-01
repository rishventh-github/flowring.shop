# Deploy FlowRing as flowring.shop (Vercel)

FlowRing is hosted on **Vercel** (not Render). Pages live in **`public/`**. The Express API handles `/api/*` (admin, blog, accounts, cart, contact).

Vercel has **no persistent local disk**, so production data uses **Turso** (hosted SQLite). Local `npm start` still uses `data/flowring.db`.

---

## 1. Create a Turso database (required for production)

1. Sign up at [turso.tech](https://turso.tech) and install the CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   source ~/.zshrc
   turso auth login
   turso db create flowring
   turso db show flowring --url
   turso db tokens create flowring
   ```
2. Copy:
   - **`TURSO_DATABASE_URL`** — looks like `libsql://flowring-….turso.io`
   - **`TURSO_AUTH_TOKEN`** — the token you created

You can also create Turso from the [Vercel Marketplace → Turso](https://vercel.com/marketplace/tursocloud/database).

---

## 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and import **`rishventh-github/flowring.shop`**.
2. Framework preset: **Other**.
3. Environment variables:

   | Name | Value |
   |------|--------|
   | `ADMIN_PASSWORD` | Strong password for `/admin/login` |
   | `SESSION_SECRET` | Long random string |
   | `TURSO_DATABASE_URL` | From Turso |
   | `TURSO_AUTH_TOKEN` | From Turso |
   | `CONTACT_TO_EMAIL` | Optional (defaults to `rishenth.ramoshan@gmail.com`) |
   | `RESEND_API_KEY` | Optional (more reliable contact emails than FormSubmit) |

4. Deploy and confirm the `*.vercel.app` URL works (`/`, `/contact.html`, `/api/content`).

---

## 3. Point flowring.shop at Vercel (required — leave Render)

**`flowring.shop` may still resolve to Render.** Contact/admin work reliably on Vercel. Cut over like this:

### A. In Vercel
1. **Project → Settings → Domains** → add `flowring.shop` and `www.flowring.shop`.
2. Leave that page open. Vercel shows the **exact** DNS records to create (copy those values).

### B. At your domain registrar (where you bought flowring.shop)
Open **DNS / Manage DNS / Advanced DNS** for `flowring.shop`.

1. **Remove Render website records** for the site only:
   - Any **A** / **AAAA** for `@` (or blank / `flowring.shop`) that pointed at the old host
   - Any **CNAME** for `www` pointing at Render (often `….onrender.com`)
   - Do **not** delete email **MX** or unrelated **TXT** records unless you know you don’t need them
2. **Add the Vercel records** from the Domains page. Common pattern (confirm with Vercel’s UI):

   | Type | Host / Name | Value |
   |------|-------------|--------|
   | **A** | `@` (or blank) | Vercel’s IP (often `76.76.21.21`) |
   | **CNAME** | `www` | Vercel’s CNAME target (e.g. `cname.vercel-dns.com` or a `….vercel-dns-….com` value) |

3. Save.

### C. Turn off Render
In the **Render** dashboard, **Suspend** or **Delete** the old FlowRing web service.

### D. Wait and verify
DNS can take minutes to a few hours. In Vercel Domains, status should become **Valid**. Then https://flowring.shop should be served by Vercel (not Render).

Until DNS finishes, use your Vercel URL (e.g. `https://flowring-shop.vercel.app`) to test contact/admin.

---

## Local development

```bash
npm install
cp .env.example .env
# Set ADMIN_PASSWORD and SESSION_SECRET (Turso vars optional locally)
npm start
```

---

## After deploy

1. **Code** — push to `main`; Vercel redeploys automatically.
2. **Admin** — `https://flowring.shop/admin/login` (or your `*.vercel.app` URL).
3. **Contact form** — submissions are saved in Turso and emailed to `CONTACT_TO_EMAIL` / the default Gmail when email delivery succeeds.
