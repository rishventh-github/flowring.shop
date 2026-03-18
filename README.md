# FlowRing — flowring.shop

**Preserving Every Drop Smarter — For Anyone, Anywhere.**

This is the marketing website for FlowRing, a compact AI-powered device that attaches to your faucet and reduces water waste in real time.

## Pages

- **Home** (`index.html`) — Hero, how it works, why we’re different, impact
- **About** (`about.html`) — Mission, how it works, why we’re different
- **Team** (`team.html`) — Team member cards
- **Gallery** (`gallery.html`) — Product and in-use image placeholders
- **Blog** (`blogs.html`) — Blog listing; posts from API when server is running
- **Reviews** (`reviews.html`) — Reviews and expert feedback
- **Pricing** (`pricing.html`) — Single, 3-Pack, 6-Pack product options

## Blog and admin (Node server)

To **write and post blogs** and **edit site content** (text, images) as admin:

1. **Install and run the server**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env and set ADMIN_PASSWORD to a secret only you know
   npm start
   ```
2. **Open the site** at `http://localhost:3000` (or your `PORT` in `.env`).
3. **Log in as admin** at `http://localhost:3000/admin/login` with your `ADMIN_PASSWORD`.
4. **In the admin dashboard** you can:
   - Edit any content block (hero tagline, hero title, section titles, footer, etc.). Changes appear for all visitors.
   - Add new content blocks (key, type text/image, value). Use keys that match `data-content-key` on the site, or add new keys and add `data-content-key="your.key"` in the HTML.
   - Create, edit, and delete blog posts (title, slug, excerpt, body HTML, published/draft).

**Security:** Only you have access to the admin. Set a strong `ADMIN_PASSWORD` in `.env` and keep `.env` out of version control.

## Run locally (static only)

Without the Node server you can still open the site, but:

- Blog list and posts will not load (API not available).
- Editable content will show the default text from the HTML (no content API).

To serve static files only:

```bash
# Python
python3 -m http.server 8000

# Node (npx)
npx serve .
```

Then visit `http://localhost:8000`.

## Deploy (and use flowring.shop)

**Full steps to go live with the domain flowring.shop:** see **[DEPLOY.md](DEPLOY.md)**.

- **Static only:** Upload the folder to any static host. Blog, account, and editable content will not work unless you run the Node server elsewhere.
- **With blog + admin + account:** Deploy to a host that runs Node (e.g. **Render**, Railway, Fly.io). Set `ADMIN_PASSWORD` and `SESSION_SECRET` in the environment. Add a persistent disk for the `data` folder so SQLite and sessions persist. Then add your custom domain **flowring.shop** in the host’s dashboard and point DNS there.

## Customize

- **Gallery images** — Replace placeholder divs with `<img>` or use content blocks (type `image`) in admin.
- **Team** — Edit `team.html` or add content blocks for team names/bios.
- **Pricing / Cart** — “Add to cart” links are `#`. Connect them to your checkout.
- **Privacy / Terms** — Add `privacy.html` and `terms.html` and link them from the footer.

## Tech

- **Front:** HTML, CSS, vanilla JS (nav, scroll-reveal, page transitions, content loader, blog list/post).
- **Back (optional):** Node.js, Express, SQLite (better-sqlite3), express-session. One admin password in env; content blocks and posts stored in `data/flowring.db`.
