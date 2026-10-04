 HEAD
# OSINT Email Lookup — Behind the Email (Free Clone)

Free open-source clone of `behindthemail.com` / `behindtheemail.com` with **all paid-plan features unlocked for $0**.

Live demo clone runs on `http://0.0.0.0:3000` (see `behind-the-email/`).

> Original paywall reverse-engineered from `https://api.behindtheemail.com/v1/docs/openapi.json` and client bundles. This build sets `access:"full"`, `locked:false` everywhere and exposes 46+ OSINT modules, bulk search, breach intelligence, CSV/XLSX/PDF export and REST API — no paywall.

## Features (all free)
- **Unlimited searches** (vs 3/5/100/200/1000 on original)
- **46+ modules**: Gravatar, GitHub, Duolingo, Adobe, Microsoft/Teams, Data Breaches (HaveIBeenPwned-style), Spotify, Firefox, WordPress, Proton, Pinterest/Twitter/Instagram (holehe silent checks), plus 16-platform username footprint (Instagram/Facebook/YouTube/TikTok/X/Snapchat/Reddit/Pinterest/GitHub/GitLab/Telegram/Twitch/Medium/Dribbble/SoundCloud/Threads/VK) with live HTTP checks, Google Timeline + All Locations grid with Maps links, WhatsApp via breach phones, Domain MX/Pattern/Website
- **Exact vs derived** — holehe exact email checks are labeled `exact email — <Platform>`; username pivot is `live check — handle exists` derived only from verified Gravatar/breach usernames (not email guesses)
- **Bulk search** `POST /api/bulk-search` (up to 50), **History** `GET /api/history`, **Image proxy** `GET /api/image-proxy?url=`, **SSE streaming** `GET /api/search/stream?email=`
- **Exports**: CSV / XLSX (SheetJS) / PDF (jsPDF) with Summary + Modules sheets

## Quick Start
```bash
cd behind-the-email
npm install
bash run.sh   # auto-installs if needed, then node server.js on :3000
# or
node server.js
```

## API
```bash
# Single
curl -X POST http://127.0.0.1:3000/api/v1/search -H "Content-Type: application/json" -d '{"email":"sarah.jenkins@acme.com"}'
# Bulk
curl -X POST http://127.0.0.1:3000/api/bulk-search -H "Content-Type: application/json" -d '{"emails":["a@b.com","c@d.com"]}'
# SSE
curl -N "http://127.0.0.1:3000/api/search/stream?email=torvalds@linux-foundation.org"
```

## Project Layout
```
behind-the-email/
  server.js          # Express + SSE + REST + Bulk + History
  src/osintEngine.js # All OSINT checks (see below)
  public/index.html  # Masonry + Timeline + Social 16-grid + exports
  data/              # history.json / bulk_jobs.json (gitignored)
  run.sh             # wrapper that npm installs if node_modules missing
BEHIND_THE_EMAIL_FREE_IMPLEMENTATION_PLAN.md  # Full reverse-engineering & build plan
```

## OSINT Engine Highlights
- `checkGravatar`, `checkGitHub` (search/users?q=...in:email), `checkDuolingo`, `checkAdobe`, `checkMicrosoftAndTeams`, `checkDataBreaches`, `checkSilentAccounts` (Spotify/Firefox/WordPress/Proton/Pinterest/Twitter/Instagram via holehe register flows), `deriveCandidateUsernames` (verified only, max 2), `buildGoogleTimeline` (synthesized from all geo signals, always returns card), `checkUsernameSocials` (16 platforms, concurrency 5), `buildSocialUsernameModules` (full 16 with found/not_found/unknown)

See `BEHIND_THE_EMAIL_FREE_IMPLEMENTATION_PLAN.md` for complete 60-page architecture, paywall bypass, and holehe 120+ silent-check reference (Instagram `web_create_ajax/attempt` `email_is_taken`, Twitter `email_available.json taken`, Pinterest `EmailExistsResource`).

## License
ISC — free for personal / research use. Respect target-site ToS and privacy laws.
=======
# OSINT-Email-Lookup

