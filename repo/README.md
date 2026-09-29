# Mepprec SA — House of Judah

Source for the Mepprec SA (House of Judah) church website.

## Project structure

```
index.html                        The whole site (structure/content)
css/styles.css                    All styles (precompiled Tailwind utilities + hand-written theme CSS)
js/main.js                        All interactivity: mobile nav, in-page scroll navigation, the
                                   giant 3D calendar, the live chat, sermon uploads, and the
                                   pastoral team
assets/logo.png                   Site logo (background removed)
assets/raissa-mutamba.webp        Senior Pastor — full bio photo
assets/raissa-mutamba-card.webp   Senior Pastor — leadership grid thumbnail (head-to-chest crop)
assets/gael-musoya.webp / -card.webp
assets/linda-elanga.webp / -card.webp
assets/patrick-luhembwe.webp / -card.webp
assets/nathan-mutombo.webp / -card.webp
supabase-schema.sql               Copy/paste into the Supabase SQL editor — creates every table
                                   and storage bucket the site expects
```

Everything runs with **zero build step** — it's plain HTML/CSS/JS. Open `index.html`
in a browser, or push this folder to any static host.

## Deploying it to your own domain

1. **Push to GitHub.** This folder already has an initial git commit. Create an empty
   repo on [github.com](https://github.com), then from inside this folder:
   ```
   git remote add origin <your-repo-url>
   git branch -M main
   git push -u origin main
   ```
2. **Deploy with Netlify** (or Vercel / Cloudflare Pages). Sign up free, "Add new site"
   → "Import an existing project" → GitHub → pick this repo. No build command needed,
   publish directory is the root. Deploy — you get a free `*.netlify.app` link
   immediately.
3. **Buy your domain** (if you don't already own it) through any registrar — Namecheap
   and Cloudflare Registrar are both solid, ~$10–15/year.
4. **Connect the domain**: in Netlify → Domain settings → Add a domain. Netlify gives
   you a DNS record to add at your registrar. Free HTTPS is issued automatically once
   it resolves.
5. **Connect your database** — see below. Push the change and Netlify redeploys
   automatically within a minute.

## Making it fully live (Supabase — your database)

Right now the live chat, sermon uploads, pastoral team, and calendar programs all
work **on whichever device is using them** — nothing is shared between visitors until
you connect a database:

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough).
2. Open the **SQL Editor**, paste in the contents of `supabase-schema.sql`, and run
   it. This creates the `comments`, `pastors`, and `events` tables, plus the
   `pastor-photos`, `pastor-videos`, and `sermons` storage buckets, with public
   read/write policies (see the security note below).
3. In Settings → API, copy your **Project URL** and **anon public key**.
4. Open `js/main.js` and edit the two lines near the very top:
   ```js
   var SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
   var SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY';
   ```
5. Commit and push — chat, pastors, sermons, and the calendar now sync for every
   visitor, live.

### ⚠️ About security

By request, **every login/admin gate has been removed** — anyone visiting the live
site can post to the chat, add or remove pastors, upload sermons, and add or remove
calendar programs, with no sign-in required. The SQL script sets Supabase's Row Level
Security policies to fully public read/write to match that. If you want to lock any
of this down later (e.g. require a login only for adding pastors), that's a policy
change in Supabase's Authentication + RLS settings.

## Things you'll want to personalize

| What | Where |
|---|---|
| WhatsApp prayer group link | `index.html` — search `whatsapp-group-link` |
| Telegram prayer group link | `index.html` — search `telegram-group-link` |
| YouTube live channel ID (for the embedded live player) | `index.html` — search `REPLACE_WITH_CHANNEL_ID` |
| Supabase URL/key | `js/main.js` — top of file |

Instagram and YouTube follow links are already wired to `@mepreccsa`.

## Calendar, chat, sermons & pastors — how they store data

- **Without Supabase configured:** everything falls back to `localStorage` on each
  visitor's own device, so every feature works immediately, but nothing is shared
  between visitors.
- **With Supabase configured:** the site talks to your tables directly from the
  browser using the public anon key. The 24-hour chat expiry is enforced by the
  client on every page load (it deletes anything older than 24h) — for a guaranteed
  cleanup even when nobody visits, add a Supabase scheduled Edge Function or a
  `pg_cron` job:
  ```sql
  delete from comments where created_at < now() - interval '24 hours';
  ```

## Notes on this build

- Video uploads accept any format (`.mov`, `.mp4`, etc.).
- All in-page navigation runs through JavaScript rather than plain `href="#section"`
  jumps, so it won't get mistaken for outbound navigation inside embedded/preview
  browsers.
- Every leadership photo is pre-cropped to a consistent head-to-chest frame for the
  grid, with a taller, fuller photo used on each person's individual bio page.

## Credits

Built with Tailwind CSS (precompiled, no CDN dependency at runtime), Google Fonts
(Fraunces, Work Sans, IBM Plex Mono), and Supabase for optional live data.
