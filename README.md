# Omnimath

The website for **Omnimath** — a real-world mathematics competition for students in
Years 5–8, based in Aotearoa New Zealand.

The site is a static React single-page app (SPA) that deploys to GitHub Pages, with an
optional free Supabase backend for contact messages, school registrations and online
challenge submissions. Without a backend configured, every form gracefully falls back to
a pre-filled email draft, so the site is always usable.

---

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # production build into dist/
pnpm preview      # preview the production build
```

Requires Node 22+ and pnpm 9+.

---

## What is in the site

| Route | Page |
| --- | --- |
| `/` | Home — hero, challenge overview, six worlds, how it works, schools, closing call to action |
| `/about` | Why Omnimath, values, who it is for, team placeholders |
| `/competition/challenges` | 15 challenge cards, interactive year-level map, year/world filters |
| `/competition/submissions` | What to submit, evidence types, 60-mark assessment, rubric |
| `/schools` | Coordinator guide, duties, weekly recognition, resources, registration form |
| `/submit` | Online challenge submission with optional file upload |
| `/contact` | Contact addresses and form |
| `/results` | Results & awards (built, deliberately not in the navigation yet) |
| `*` | A mathematically themed 404 page |

Notable details:

- **Animated 3D globe** in the hero: a latitude/longitude dot lattice over a deep-blue
  core, wrapped in a gold Möbius band. Built with Three.js and lazy-loaded; pointer
  parallax, pauses offscreen, static under `prefers-reduced-motion`.
- **Six photographic world cards** — one per competition world (elections, history,
  economics, games, science, everyday systems), duotoned to the site palette with a
  cursor spotlight and a question revealed on hover.
- **Command palette** (`⌘K` / `Ctrl+K`) across pages and actions.
- **Interactive year map** showing which of the 15 challenges belong to Years 5–8.
- **Accessible forms** with validation, honeypot spam trap, loading and success states.
- Per-page titles/descriptions, skip link, reduced-motion support, colour-contrast
  considered throughout.

---

## Editing content

Almost all content lives in a few predictable places.

- **Site identity, emails, navigation, year ranges:** `src/lib/site.ts`
- **The six worlds (titles, blurbs, formulas):** `src/data/worlds.ts`
- **The 15 challenges:** `src/data/challenges.ts`
  - Add `pdf: 'challenges/challenge-01.pdf'` when a pack is ready. Drop the PDF into
    `public/challenges/`; the card becomes a download link automatically.
- **Team names, roles, portraits:** `src/data/team.ts`
  - Add photos to `public/team/` and set `photo: 'team/name.jpg'`.
- **Copy for individual pages:** `src/pages/*.tsx`

### Before launch, replace these placeholders

- `site.emails.general` and `site.emails.schools` (currently `@omnimath.co.nz`)
- Team names and portraits
- Challenge PDFs, coordinator resources, results content
- Social links in `src/lib/site.ts` (currently empty)
- The domain used in `site.url`, `README`, and DNS

### A note on the competition brief

The supplied brief says “marked out of 100” once in the Home copy but “out of 60” (six
challenges × ten marks) everywhere else. The site consistently uses **60**, including the
assessment visual. Change it in `src/pages/Home.tsx` and `src/pages/Submissions.tsx` if
100 was intended.

---

## Backend: Supabase (free tier)

The frontend calls Supabase directly with the **anon** key. Row-level security allows only
`INSERT` from the website; rows and uploaded files are private and visible through the
Supabase dashboard (or a service-role tool) to the team.

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor** and run `supabase/schema.sql`.
   This creates `contact_messages`, `submissions`, the private `submissions` storage
   bucket, and insert-only RLS policies.
3. Copy **Project URL** and **anon public key** from Project Settings → API.
4. For local development, copy `.env.example` to `.env.local` and fill both values.
5. For GitHub Pages, add the same two values as **repository variables** (not secrets —
   the anon key is public by design):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Follow **Human verification** below before a public launch.

If the variables are missing, forms show a “One more step” panel with a pre-filled
`mailto:` draft instead of pretending to deliver. Uploads cannot be attached to a mail
draft, so the submission form tells the sender to attach the file.

### Human verification: Cloudflare Turnstile

Turnstile is free, usually invisible, and runs before any write. The browser receives a
single-use token; the Supabase Edge Function in `supabase/functions/submit/index.ts`
verifies it with the secret key and writes with the service role. The secret never enters
the browser bundle.

1. In the Cloudflare dashboard, create a Turnstile widget. Add your production hostnames
   (`omnimath.co.nz`, `www.omnimath.co.nz`) and `localhost` if you want to test locally.
2. Add the site key as a repository variable: `VITE_TURNSTILE_SITE_KEY` (also in
   `.env.local` for local testing).
3. Link the Supabase project and deploy the function:
   ```bash
   supabase link --project-ref <project-ref>
   supabase functions deploy submit --no-verify-jwt
   supabase secrets set TURNSTILE_SECRET_KEY=<turnstile-secret-key>
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase.
4. With both Supabase and a Turnstile site key configured, the forms post to
   `/functions/v1/submit`. Without them, the site uses the direct insert path (useful for
   local development) or the mailto fallback.

If Turnstile is enabled but the function is missing, submissions fail with a clear message
rather than silently bypassing verification. The function also validates lengths, file
type/size (10 MB, PDF/JPG/PNG), year and challenge ranges, and the honeypot.

Cloudflare's test keys (`1x00000000000000000000AA` site key and the matching secret) are
only for local validation: they always pass, so they are not a bot check. Replace both the
site key and the Supabase secret with a real widget before launch.

The Edge Function also checks the token's `action` (`contact` or `submission`) and the
hostname it was solved on. Set `TURNSTILE_HOSTNAMES` in Supabase to the comma-separated
production hosts (for example `omnimath.co.nz,www.omnimath.co.nz`). Do not include
`localhost` or `127.0.0.1` in a public deployment's allowlist; use Cloudflare's test keys
for local development instead.

### Abuse limits

Turnstile is a signal, not a guarantee. `schema.sql` also creates a small `rate_limits`
table and the `consume_rate_limit` RPC. The Edge Function hashes the client IP and email
with `RATE_LIMIT_SALT` (set it as a Supabase secret) and applies fixed-window limits for
both the contact and submission paths. Submission preparation also caps unfinished signed
uploads per email. The function fails closed if Siteverify or the rate-limit RPC is
unavailable.

The default limits are deliberately generous enough for a school behind one NAT: contact
is limited per email and per IP, and submissions have looser per-IP limits. Adjust the
rules in `supabase/functions/submit/index.ts` if a school reports a false positive. For a
public launch with more traffic, add Cloudflare WAF rate limiting in front of the Supabase
function as an outer layer.

### Staff inbox

`/admin` is a private, unlinked page for reading contact messages and student submissions.
It is not in the navigation and is marked `noindex`. The page talks to the `admin` Edge
Function, which checks a PBKDF2 password hash stored in the `ADMIN_PASSWORD_HASH` Supabase
secret, issues a random 12-hour bearer token, and stores only that token's SHA-256 in
`admin_sessions`. Files are returned as one-hour signed URLs; the page is read-only.

Deploy the function and set the hash:

```bash
supabase functions deploy admin --no-verify-jwt
supabase secrets set ADMIN_PASSWORD_HASH="<iterations>:<saltHex>:<hashHex>"
```

To generate a new password and hash:

```bash
node -e "const {randomBytes,pbkdf2Sync}=require('node:crypto');const p=randomBytes(18).toString('base64url');const s=randomBytes(16);const h=pbkdf2Sync(p,s,150000,32,'sha256');console.log('password:',p);console.log('hash:',\`150000:\${s.toString('hex')}:\${h.toString('hex')}\`)"
```

Login attempts are rate-limited per IP. To revoke every active admin session, delete the
rows in `public.admin_sessions` from the Supabase SQL editor or via the service role.

Files are not sent through the Edge Function. After verification the function creates a
short-lived **signed upload URL**; the browser uploads directly to Storage, then the
function marks the row `received`. Rows awaiting an upload are stored as `pending`, so the
team can see incomplete submissions in the dashboard.

Turnstile processes a challenge in a Cloudflare iframe. No analytics are added by us. For
higher-traffic public deployments, add rate limiting in front of the function (for example
Cloudflare WAF or Upstash) — the free Supabase tier has no built-in rate limiter.

Never expose a `service_role` key in the frontend. Only `VITE_` variables are bundled, and
they must contain public keys only.

---

## Deploying to GitHub Pages

The site is set up for the official **GitHub Actions → Pages** deployment flow.

1. Create a new repository under the official Omnimath account and push this folder to
   `main`.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds and deploys on every push.

### Base path

- **Custom domain** (`https://omnimath.co.nz`): leave `BASE_PATH` unset (defaults to `/`).
- **Project pages** (`https://<account>.github.io/omnimath/`): create a repository variable
  `BASE_PATH` with value `/omnimath/`.
- The build writes a `404.html` SPA fallback and `.nojekyll` automatically, so deep links
  such as `/competition/challenges` work on Pages.

### Custom `.co.nz` domain

1. Purchase the domain from any `.co.nz` registrar (e.g. Crazy Domains, Freeparking,
   Netim). Nothing in this repo can register it for you.
2. In GitHub: **Settings → Pages → Custom domain**, enter `omnimath.co.nz`.
3. At the registrar, add the apex `A` records:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   and the matching `AAAA` records:
   `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`,
   `2606:50c0:8003::153`.
4. Add `www` as a `CNAME` to `<account>.github.io`.
5. Enforce HTTPS once the certificate is issued.
6. Optional: to have Actions write the `CNAME` file during deployment, create a repository
   variable `CUSTOM_DOMAIN` = `omnimath.co.nz`.

---

## Tech

- **React 19 + TypeScript + Vite 8**
- **Tailwind CSS 4** with a small design-token theme
- **Motion** for scroll reveals, page chrome and the command palette
- **KaTeX** (lazy-loaded) for decorative real mathematics
- **Supabase JS** (loaded on demand) + a Turnstile-gated Edge Function
- Self-hosted fonts via Fontsource: Instrument Serif, Inter, JetBrains Mono
- **Three.js** (lazy-loaded) for the hero globe and Möbius band
- CC0 / public-domain photography from Wikimedia Commons, cropped and duotoned to WebP

### Structure

```
src/
  components/   Layout, header/footer, globe, world cards, forms, UI primitives
  data/         worlds, challenges, team
  lib/          site config, Supabase client, hooks, Three.js globe scene
  pages/        one file per route
  index.css     Tailwind theme + base styles
public/
  worlds/       six duotoned WebP world images
supabase/
  schema.sql                 tables, RLS, storage bucket
  functions/submit/index.ts  Turnstile verification + service-role writes
  functions/admin/index.ts   password-gated staff inbox
.github/
  workflows/deploy.yml
```

### Design notes

- Palette from the logo: navy `#003E8A`, sun `#FEDA12`, leaf `#74C74C`, paper `#FAF7F0`.
- Display type is Instrument Serif; body is Inter; labels and numerals are JetBrains Mono.
- The grain overlay, dot paper, and scroll reveals are intentional; all respect reduced
  motion.
- The logo PNG in `public/` was de-matted from the supplied white-background file. Replace
  it with a vector original if one becomes available.

### Image credits

The six world-card photographs are cropped and duotoned; the originals are CC0 or public
domain. Thanks to their photographers.

| World | Source on Wikimedia Commons | Author | Licence |
| --- | --- | --- | --- |
| Elections | [Beehive and Parliament House, Wellington](https://commons.wikimedia.org/wiki/File:Beehive_and_Parliament_House_-_Wellington_-_New_Zealand_-_DSC00165.jpg) | Daderot | CC0 |
| History | [Colosseum of Rome and Roman forum](https://commons.wikimedia.org/wiki/File:Colosseum_of_Rome_and_Roman_forum.jpg) | Wilfredor | CC0 |
| Economics | [Brussels Stock Exchange](https://commons.wikimedia.org/wiki/File:Brussels_Stock_Exchange_(1).jpg) | Bernard Lee | CC0 |
| Games | [Chess game Staunton No. 6](https://commons.wikimedia.org/wiki/File:Chess_game_Staunton_No._6.jpg) | Wilfredor | CC0 |
| Science | [Wind turbines](https://commons.wikimedia.org/wiki/File:Wind_turbines_(54089945252).jpg) | U.S. Fish and Wildlife Service | Public domain |
| Everyday systems | [San Diego highway interchange](https://commons.wikimedia.org/wiki/File:36-san-diego-highway-94-805-interchange.jpg) | Alfred Twu | CC0 |

---

## Licence and privacy

Content © Omnimath. Student information submitted through the forms is private and should
only be accessed by the Omnimath team. The site includes no analytics or third-party
tracking scripts.
