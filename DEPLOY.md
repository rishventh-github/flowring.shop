# Deploy FlowRing as flowring.shop

You can deploy this site so it’s live on the internet and use the domain **flowring.shop**. After deployment, you can still change the website anytime (see bottom).

---

## Option 1: Render (recommended)

Render runs your Node server, keeps SQLite data on a disk, and supports a custom domain.

### 1. Push your code to GitHub

- Create a repo at [github.com/new](https://github.com/new) (e.g. `flowring-shop`).
- Push your project:
  ```bash
  git init
  git add .
  git commit -m "FlowRing site"
  git branch -M main
  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
  git push -u origin main
  ```

### 2. Deploy on Render

1. Go to [render.com](https://render.com) and sign up (or log in).
2. **New → Web Service**.
3. Connect your GitHub repo and select this project.
4. Use:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free (or paid if you need more).
5. Under **Environment**, add:
   - `ADMIN_PASSWORD` — pick a strong password (for `/admin/login`). Gogreen1009!
   - `SESSION_SECRET` — random string (e.g. from [randomkeygen.com](https://randomkeygen.com)).
6. Under **Disks**, add a disk:
   - Name: `flowring-data`
   - Mount path: `data`
   - Size: 1 GB  
   (So the SQLite DB and uploads persist.)
7. Click **Create Web Service**. Wait for the first deploy to finish.
8. Your site will be at `https://YOUR_SERVICE_NAME.onrender.com`.

### 3. Use flowring.shop as the domain

1. **Buy the domain** (if you don’t own it yet) from a registrar (e.g. Namecheap, Google Domains, Cloudflare).
2. In **Render dashboard → your service → Settings → Custom Domains**:
   - Add custom domain: `flowring.shop`
   - Also add `www.flowring.shop` if you want.
3. Render will show **CNAME** (and sometimes A) records. In your domain registrar’s DNS:
   - For `flowring.shop`: add the CNAME or A record Render gives you.
   - For `www.flowring.shop`: CNAME to the host Render shows (e.g. `YOUR_SERVICE_NAME.onrender.com`).
4. Wait for DNS to propagate (minutes to a few hours). Render will issue HTTPS for flowring.shop.

Your live site will be **https://flowring.shop** (and optionally **https://www.flowring.shop**).

---

## Option 2: Railway

1. Go to [railway.app](https://railway.app) and connect GitHub.
2. **New Project → Deploy from GitHub** and select this repo.
3. Add **Variables:** `ADMIN_PASSWORD`, `SESSION_SECRET`.
4. Railway will assign a URL. Under **Settings → Domains**, add **flowring.shop** and point your domain’s DNS (CNAME) to the host Railway shows.

---

## Option 3: Fly.io

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/) and run `fly launch` in the project folder.
2. Add a **volume** for the `data` folder so SQLite persists (see [Fly volumes](https://fly.io/docs/reference/volumes/)).
3. Set secrets: `fly secrets set ADMIN_PASSWORD=xxx SESSION_SECRET=xxx`
4. Add custom domain: **fly.io dashboard → your app → Certificates** and add flowring.shop; then set the DNS record Fly shows.

---

## Can I still change the website after it’s deployed?

**Yes.** You can change the site whenever you want:

1. **Code/content changes**  
   Edit the repo (HTML, CSS, JS, server, etc.), commit, and push to the branch you deploy from (e.g. `main`). Render/Railway/Fly will redeploy automatically if you have “auto-deploy” on.

2. **Content via admin**  
   If the Node server is deployed, use **https://flowring.shop/admin/login** to edit content blocks and blog posts. Those changes apply immediately; no redeploy needed.

3. **Domain**  
   The title and domain **flowring.shop** stay the same; only the code and content change when you push or edit in admin.

So: deploy once, set the title/domain to flowring.shop, then keep updating the site as needed.
