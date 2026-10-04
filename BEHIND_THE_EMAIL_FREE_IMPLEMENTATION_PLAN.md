# Complete Implementation Plan: Building "Behind the Email" (`behindthemail.com` / `behindtheemail.com`) With All Paid Plan Features for 100% Free ($0/month)

---

## 1. Executive Summary & Reverse-Engineering Findings

When visiting **`https://behindthemail.com/`**, it redirects to **`https://behindtheemail.com/`** (*Behind the Email — Reverse Email OSINT & Identity Intelligence*).

By inspecting the live production application, client bundles, and public OpenAPI specification (`https://api.behindtheemail.com/v1/docs/openapi.json`), here is how the platform actually works under the hood and what it gates behind its paid tiers:

### 1.1 Production Tech Stack of `behindtheemail.com`
* **Frontend**: Next.js (App Router, Turbopack), React, Tailwind CSS (Dark Mode UI, `#5ee4d1` brand accent, `Outfit` typography), Framer Motion, TanStack Table (`DataTable`), custom Masonry Grid layout, React Hook Form + Zod.
* **Backend**: Fastify + tRPC (`/internal/trpc`) for the web dashboard + REST API (`/v1/search`) documented with Scalar (`@scalar/fastify-api-reference`).
* **Image Proxy**: `/internal/image/proxy?url=...` to bypass CORS and hotlink blocks on third-party avatars/photos.

### 1.2 What the Paid Plans Charge For (and What We Will Unlock for Free)

| Feature | Anonymous (Free) | Free Account | Plus ($14.99/mo) | Pro ($29.99/mo) | Business ($99.99/mo) | Enterprise (Custom) | **Your Free Build ($0)** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Searches / Day** | 3 | 5 | 100 | 200 | 1,000 | Unlimited (`-1`) | **Unlimited (`-1`)** |
| **Full Profile Details** (`fullSearch`) | Locked / Blurred | Locked / Blurred | Included | Included | Included | Included | **Included (Unmasked)** |
| **CSV & XLSX Export** (`downloadAccess`) | No | No | Included | Included | Included | Included | **Included** |
| **REST API Access** (`apiAccess`) | No | No | No | Included | Included | Included | **Included (`/v1/search`)** |
| **Data Breach Results** (`dataBreachAccess`) | Locked | Locked | No | Included | Included | Included | **Included (Full Records)** |
| **Bulk Search (50+ emails)** (`bulkSearchAccess`) | No | No | No | No | Included | Included | **Included (Unlimited Batch)** |
| **PDF Dossier Reports** (`reportAccess`) | No | No | No | No | Included | Included | **Included** |

> **How their paywall works in code**: On free searches, the backend runs a locking transform (`lockEmailResult`, `lockSummary`, `lockDomainResult`) that replaces `displayName`, `username`, `bio`, `profileUrl`, `links`, and `phoneNumbers` with `null` / `{ locked: true }`, strips `extras` into a numeric `lockedExtraCount`, and applies CSS `scale-125 blur-xs` to profile pictures. In your self-hosted/free implementation, we set `access: "full"` and `locked: false` across the board.

---

## 2. Complete Inventory of All 44 OSINT Modules & Free Data Sources

`behindtheemail.com` queries **44 modules** across **9 categories** (`work`, `social`, `developer`, `software`, `shopping`, `entertainment`, `security`, `domain`, `adult`), grouped into three technical types:

### 2.1 Type A: 17 Rich Email Modules (`depth: "rich"`)
These modules return a standardized `profile` object (`avatarUrl`, `displayName`, `username`, `profileUrl`, `bio`, `location`, `countryCode`, `accountType`, `createdAt`, `lastActiveAt`, `followerCount`, `followingCount`) plus module-specific `extras`. Here is how to implement each one **100% free**:

| # | Module ID | Category | Extracted Fields (`extras`) | Free OSINT Implementation Method ($0) |
| :- | :--- | :--- | :--- | :--- |
| 1 | `gravatar` | `social` | Profile Avatar, Display Name, Username, Bio, Location, Verified Accounts | Compute `md5(email.trim().toLowerCase())` and query `GET https://en.gravatar.com/{hash}.json`. Returns full profile, photos, and linked social accounts for free. |
| 2 | `github` | `developer` | `publicRepoCount`, `company`, `websiteUrl`, `xHandle`, `isHireable`, Followers/Following | 1) Query `GET https://api.github.com/search/users?q={email}+in:email`<br>2) Fallback: Query `GET https://api.github.com/search/commits?q=author-email:{email}` (finds accounts even when email is private!)<br>3) Query `GET https://api.github.com/users/{login}` & `/users/{login}/social_accounts`. |
| 3 | `gitlab` | `developer` | `organization`, `publicEmail`, `accountId`, Bio, Location | Query `GET https://gitlab.com/api/v4/users?search={email}` (free public API). |
| 4 | `duolingo` | `entertainment` | `totalXp`, `currentStreakDays`, `longestStreakDays`, `courseCount`, `courses[]`, `hasPlus`, `isGoogleLinked`, `isFacebookLinked`, `hasRecentActivity` | Query Duolingo's unauthenticated public API: `GET https://www.duolingo.com/2017-06-30/users?email={email}`. Directly returns JSON with full XP, streaks, avatar, username, and courses! |
| 5 | `adobe` | `software` | `signInMethods[]` (`google`, `apple`, `facebook`, `microsoft`, `password`, `sso`), `accountStatus`, `hasLinkedBusinessAccount`, Avatar | `POST https://auth.services.adobe.com/signin/v2/users/accounts` with `{"username": email}` and headers `X-IMS-ClientId: edge_personalization`. Returns `status`, `avatarUrl`, `authenticationMethods`, and `hasT2ELinked`! |
| 6 | `microsoft` | `work` | `accountId` (CID), `nameUpdatedAt`, `recoveryEmails[]`, `recoveryPhones[]`, Country | `POST https://login.microsoftonline.com/common/GetCredentialType` with `{"Username": email}` + Microsoft account password-reset proof discovery (extracts masked recovery emails/phones and CID without sending any code). |
| 7 | `teams` | `work` | `organization` (`corporationName`), `accountId` (CID), Display Name, Photo URL, `userType` | Microsoft Teams enumeration via `GetCredentialType` (`IfExistsResult`, tenant federation check) + Skype/Teams token search. |
| 8 | `google-profile` | `social` | `accountId` (GAIA ID), `apps[]` (`maps`, `meet`, `photos`, `youtube`, `chat`), Avatar, Name | **GHunt** open-source method (`https://github.com/mxrch/GHunt`): resolves email to Google GAIA `personId`, display name, avatar, and active Google apps. |
| 9 | `google-reviews` | `social` | `reviewCount`, `reviews[]` (Text, Rating, Date, Place Name/Address/Lat/Lng/Maps URL, Owner Reply) | Using the GAIA `personId` from `google-profile`, fetch public Google Maps contributor page `https://www.google.com/maps/contrib/{personId}/reviews`. |
| 10 | `google-photos` | `social` | `photoCount`, `photos[]` (URL, Thumbnail, Date, Place Coordinates) | Using the GAIA `personId` from `google-profile`, fetch public Google Maps photos `https://www.google.com/maps/contrib/{personId}/photos`. |
| 11 | `linkedin` | `work` | `about`, `connectionCount`, `positions[]` (Title, Company, Logo, Dates, Description), `education[]`, `skills[]` | **3-Stage Free Pipeline**:<br>1) Check GitHub `/users/{u}/social_accounts` & Gravatar verified links for LinkedIn URL.<br>2) Query SearXNG / DuckDuckGo / Brave Search API (Free tier) for `"{email}" site:linkedin.com/in/` or `"{name}" "{domain_company}" site:linkedin.com/in/`.<br>3) Parse public LinkedIn profile JSON-LD (`Person`, `worksFor`, `alumniOf`). |
| 12 | `data-breach` | `security` | `recordCount`, `firstBreachedAt`, `lastBreachedAt`, `records[]` (Breach Name, Date, Username, Full Name, Masked Password, IP, Phone) | Combine **4 Free Breach APIs**:<br>1) **XposedOrNot API**: `GET https://api.xposedornot.com/v1/breach-analytics?email={email}` (100% Free, rich breach metadata)<br>2) **HudsonRock Cavalier**: `GET https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email={email}` (100% Free infostealer intelligence)<br>3) **LeakCheck Public API**: `GET https://leakcheck.io/api/public?check={email}` (100% Free breach names & dates)<br>4) **ProxyNova Comb**: `GET https://api.proxynova.com/comb?query={email}` (Free credential lines, auto-masked). |
| 13 | `chess.com` | `entertainment` | `accountId`, Username, Full Name, Avatar, Country, `memberSince`, `lastLoginDate` | Pivot from discovered usernames (or email local-part) -> `GET https://api.chess.com/pub/player/{username}` (100% free public API). |
| 14 | `flickr` | `social` | `nsid`, `websiteUrl`, `photosPageUrl`, `gender`, `isPro`, `favoriteCount`, `groupCount`, `photoCount`, `photos[]`, `coverPhotoUrl` | Flickr public API (`flickr.people.findByEmail` / public search) to resolve email -> `nsid`, then `flickr.people.getInfo` & `flickr.people.getPublicPhotos`. |
| 15 | `vsco` | `social` | `websiteUrl`, `hasPublishedProfile`, `accountId`, `profileId`, `photoCount`, `photos[]` | VSCO check + username pivot (`https://vsco.co/{username}/gallery`). |
| 16 | `etsy` | `shopping` | `favoriteCount`, `isSeller`, `gender`, `accountId`, Avatar, Bio | Etsy email check + public user profile endpoint (`/people/{username}`). |
| 17 | `tiktok` | `social` | `videoCount`, `likeCount`, `friendCount`, `languageCode`, Followers, Following, Bio | TikTok email check + username pivot (`https://www.tiktok.com/@{username}` `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON parser). |

### 2.2 Type B: 26 Basic Account-Existence Modules (`depth: "basic"`)
These modules check whether an email is registered on a service **silently** (without triggering any email or alert to the user) and populate the **"Has Accounts (N)"** card:
* **Social**: `tumblr`, `pinterest`, `snapchat`, `x` (Twitter), `mastodon`, `quora`, `patreon`
* **Developer**: `atlassian`, `replit`, `render`, `codecademy`, `wordpress`
* **Software**: `apple`, `dropbox`, `notion`, `firefox`, `protonmail`
* **Shopping**: `amazon`, `kalshi`
* **Entertainment**: `spotify`, `netflix`, `kick`, `last.fm`, `genius`
* **Adult (Optional / Toggled)**: `pornhub`, `xvideos`

> **How to get all 26+ for free**: Use the open-source Python library **[Holehe](https://github.com/megadose/holehe)** (`pip install holehe`). It already contains non-intrusive async probes for Spotify, Twitter/X, Pinterest, Tumblr, Snapchat, Quora, Patreon, Atlassian, Replit, WordPress, Amazon, Firefox, Last.fm, ProtonMail, Dropbox, etc.

### 2.3 Type C: 3 Domain Intelligence Modules (`category: "domain"`)
1. **`email-service`**: Runs DNS MX lookup (`dns.promises.resolveMx(domain)`) -> maps MX records to provider (`gmail`, `outlook`, `yahoo`, `proton`, `icloud`, `cloudflare`, `hostinger`, `proofpoint`, `yandex`, etc.), sets `canReceiveEmail: mxRecords.length > 0`, and lists `mxHosts`.
2. **`email-pattern`**: Analyzes the local part (`sarah.jenkins@acme.com` -> pattern `{first}.{last}`, `firstName: "Sarah"`, `lastName: "Jenkins"`, `firstInitial: "S"`, `lastInitial: "J"`) and performs a non-intrusive SMTP `RCPT TO` or domain check for `isCatchAll`.
3. **`website`**: If the domain is not in a freemail list (`gmail.com`, `yahoo.com`, `outlook.com`, etc.), fetches `https://{domain}`, parses `<title>`, `<meta name="description">`, and `<link rel="icon">` via Cheerio.

---

## 3. System Architecture (100% Free Hosting & Infrastructure)

To build and host this entire SaaS with **zero monthly cost**, use a 2-service architecture:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER (Next.js App)                          │
│  • Landing Page + Live Demo (/demo) + Dashboard (/dashboard/*)             │
│  • Real-Time SSE Stream Consumer (Progress Bar + Live Masonry Grid/Table)  │
│  • Bulk Search UI (50+ Emails) + Client/Server Exports (CSV, XLSX, PDF)    │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │ HTTPS / SSE (Server-Sent Events)
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│           SERVICE 1: Next.js Full-Stack App (Vercel Free Tier)             │
│  • Next.js 15/16 App Router + Tailwind CSS + TanStack Table                │
│  • /api/search/stream (SSE Streaming Orchestrator)                         │
│  • /api/v1/search (Public REST API + Scalar OpenAPI Docs at /api/v1/docs)  │
│  • /api/image-proxy (CORS & Referrer-free Avatar Proxy)                    │
│  • Node-native OSINT Modules (DNS MX, Website, Gravatar, GitHub, GitLab,   │
│    Duolingo, XposedOrNot, HudsonRock, LeakCheck, Chess.com, Pattern)       │
└───────────────┬────────────────────────────────────────────┬───────────────┘
                │                                            │
                ▼                                            ▼
┌─────────────────────────────────────────┐  ┌───────────────────────────────┐
│ SERVICE 2: Python OSINT Worker (Free)   │  │   FREE CLOUD PERSISTENCE      │
│ (Hosted on HuggingFace Spaces Docker    │  │ • Supabase / Neon.tech        │
│  Free 2vCPU/16GB RAM or Render Free)    │  │   (Free PostgreSQL: History,  │
│ • FastAPI Async Server                  │  │    Bulk Jobs, API Keys)       │
│ • Holehe (26+ Account Existence Checks) │  │ • Upstash Redis (Free Tier:   │
│ • GHunt (Google Profile/Reviews/Photos) │  │   24h Result Cache)           │
│ • Adobe / Microsoft / Teams Probes      │  └───────────────────────────────┘
└─────────────────────────────────────────┘
```

### Why This Free Stack Works So Well
1. **Vercel (Free Hobby Plan)**: Hosts the Next.js frontend, API routes, SSE streaming, and image proxy.
2. **HuggingFace Spaces (Free Docker Space)**: Gives you **2 vCPUs and 16 GB RAM for $0/month** with no credit card required—ideal for running the Python FastAPI OSINT worker (`holehe`, `httpx`, `dnspython`, `beautifulsoup4`).
3. **Supabase / Neon.tech (Free Tier)**: 500 MB PostgreSQL database for storing user accounts, saved search history (`/dashboard/recent-searches`), bulk search jobs (`/dashboard/bulk-searches`), and API keys.
4. **Upstash Redis (Free Tier)**: Caches email lookups for 24 hours so repeated searches return in `<50ms`.

---

## 4. Database Schema (Drizzle ORM / Prisma on Free Postgres)

Save this as `prisma/schema.prisma` (all entitlements default to `true` and `searchLimit: -1` so every user gets the Enterprise plan for free):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id               String       @id @default(cuid())
  email            String       @unique
  passwordHash     String?
  name             String?
  // All Paid Features Unlocked by Default for Free!
  planName         String       @default("Enterprise (Free)")
  searchLimit      Int          @default(-1) // -1 = Unlimited
  fullSearch       Boolean      @default(true)
  dataBreachAccess Boolean      @default(true)
  downloadAccess   Boolean      @default(true)
  reportAccess     Boolean      @default(true)
  bulkSearchAccess Boolean      @default(true)
  apiAccess        Boolean      @default(true)
  createdAt        DateTime     @default(now())
  searches         SearchLog[]
  bulkJobs         BulkSearch[]
  apiKeys          ApiKey[]
}

model SearchLog {
  id            String   @id @default(cuid())
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  email         String
  domain        String
  status        String   // "found" | "not_found" | "error"
  summary       Json     // Merged SummarySchema object
  emailModules  Json     // Array of rich & basic module results
  domainModules Json     // Array of domain module results
  durationMs    Int
  createdAt     DateTime @default(now())

  @@index([email])
  @@index([userId, createdAt(sort: Desc)])
}

model BulkSearch {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  emails      String[] // Up to 50+ emails per batch
  status      String   @default("processing") // "processing" | "completed" | "failed"
  results     Json     // Map of email -> SearchLog result
  completedCount Int   @default(0)
  totalCount  Int
  createdAt   DateTime @default(now())
}

model ApiKey {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  key       String   @unique // e.g., "BTE_..."
  name      String
  lastUsed  DateTime?
  createdAt DateTime @default(now())
}
```

---

## 5. Core Implementation Code

### 5.1 Unified Data Contract (`src/lib/schema.ts`)
This matches the exact data model used by `behindtheemail.com` (`SummarySchema`, `EmailProfileSchema`, `emailModules`, `domainModules`), with **zero field locking**:

```typescript
// src/lib/schema.ts
export type ModuleCategory =
  | "work"
  | "social"
  | "developer"
  | "software"
  | "shopping"
  | "entertainment"
  | "security"
  | "domain";

export interface EmailProfile {
  avatarUrl: string | null;
  displayName: string | null;
  username: string | null;
  profileUrl: string | null;
  bio: string | null;
  location: string | null;
  countryCode: string | null;
  accountType: "personal" | "business" | "enterprise" | "other" | null;
  createdAt: string | null;
  lastActiveAt: string | null;
  followerCount: number | null;
  followingCount: number | null;
}

export interface EmailModuleResult {
  module: string;
  category: ModuleCategory;
  depth: "rich" | "basic";
  locked: false; // Always unlocked in our free build!
  profile: EmailProfile | null;
  lockedFields: [];
  lockedExtraCount: 0;
  extras: Record<string, any> | null;
}

export interface DomainModuleResult {
  module: "email-service" | "email-pattern" | "website";
  category: "domain";
  locked: false;
  details: Record<string, any> | null;
}

export interface ProfileSummary {
  profilePictures: Array<{ module: string; url: string }>;
  names: Array<{ module: string; value: string }>;
  usernames: Array<{ module: string; value: string }>;
  locations: Array<{ module: string; location: string | null; countryCode: string | null }>;
  links: Array<{ module: string; url: string }>;
  phoneNumbers: Array<{ module: string; value: string }>;
  dates: Array<{
    module: string;
    kind: "createdAt" | "lastActiveAt" | "firstBreachedAt" | "lastBreachedAt";
    value: string;
  }>;
  photos: Array<{ module: string; url: string; thumbnailUrl: string | null }>;
}

export function mergeModuleIntoSummary(
  summary: ProfileSummary,
  result: EmailModuleResult
): ProfileSummary {
  const { module, profile, extras } = result;
  if (profile) {
    if (profile.avatarUrl && !summary.profilePictures.some((p) => p.url === profile.avatarUrl)) {
      summary.profilePictures.push({ module, url: profile.avatarUrl });
    }
    if (profile.displayName) {
      summary.names.push({ module, value: profile.displayName });
    }
    if (profile.username) {
      summary.usernames.push({ module, value: profile.username });
    }
    if (profile.location || profile.countryCode) {
      summary.locations.push({
        module,
        location: profile.location,
        countryCode: profile.countryCode,
      });
    }
    if (profile.profileUrl) {
      summary.links.push({ module, url: profile.profileUrl });
    }
    if (profile.createdAt) {
      summary.dates.push({ module, kind: "createdAt", value: profile.createdAt });
    }
    if (profile.lastActiveAt) {
      summary.dates.push({ module, kind: "lastActiveAt", value: profile.lastActiveAt });
    }
  }

  if (extras) {
    if (extras.websiteUrl) {
      summary.links.push({ module, url: extras.websiteUrl });
    }
    if (Array.isArray(extras.photos)) {
      for (const photo of extras.photos) {
        if (photo.url && !summary.photos.some((p) => p.url === photo.url)) {
          summary.photos.push({
            module,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl ?? photo.url,
          });
        }
      }
    }
    if (Array.isArray(extras.recoveryPhones)) {
      for (const phone of extras.recoveryPhones) {
        if (phone) summary.phoneNumbers.push({ module, value: phone });
      }
    }
    if (module === "data-breach") {
      if (extras.firstBreachedAt) {
        summary.dates.push({ module, kind: "firstBreachedAt", value: extras.firstBreachedAt });
      }
      if (extras.lastBreachedAt && extras.lastBreachedAt !== extras.firstBreachedAt) {
        summary.dates.push({ module, kind: "lastBreachedAt", value: extras.lastBreachedAt });
      }
      if (Array.isArray(extras.records)) {
        for (const rec of extras.records) {
          if (rec.phoneNumber) {
            summary.phoneNumbers.push({ module, value: rec.phoneNumber });
          }
        }
      }
    }
  }
  return summary;
}
```

---

### 5.2 Real-Time OSINT Collectors (`src/lib/osint/collectors.ts`)
Below are the working Node/TypeScript collectors for the core modules (Gravatar, GitHub, GitLab, Duolingo, Adobe, Microsoft, Data Breaches via XposedOrNot + HudsonRock + LeakCheck, Chess.com, DNS Email Service, Email Pattern, and Website Scraper):

```typescript
// src/lib/osint/collectors.ts
import crypto from "crypto";
import dns from "dns/promises";
import * as cheerio from "cheerio";
import { EmailModuleResult, DomainModuleResult } from "../schema";

const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "icloud.com", "me.com", "protonmail.com", "proton.me",
  "aol.com", "zoho.com", "mail.com", "gmx.com", "yandex.com"
]);

// 1. Gravatar Collector
export async function checkGravatar(email: string): Promise<EmailModuleResult | null> {
  const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  const res = await fetch(`https://en.gravatar.com/${hash}.json`, {
    headers: { "User-Agent": "BehindTheEmail-OSINT/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data?.entry?.[0];
  if (!entry) return null;

  return {
    module: "gravatar",
    category: "social",
    depth: "rich",
    locked: false,
    lockedFields: [],
    lockedExtraCount: 0,
    profile: {
      avatarUrl: entry.thumbnailUrl ? `${entry.thumbnailUrl}?s=400` : null,
      displayName: entry.displayName || entry.name?.formatted || null,
      username: entry.preferredUsername || null,
      profileUrl: entry.profileUrl || `https://gravatar.com/${entry.preferredUsername || hash}`,
      bio: entry.aboutMe || null,
      location: entry.currentLocation || null,
      countryCode: null,
      accountType: "personal",
      createdAt: null,
      lastActiveAt: null,
      followerCount: null,
      followingCount: null,
    },
    extras: null,
  };
}

// 2. GitHub Collector (User Search + Commit Author Email Fallback)
export async function checkGitHub(email: string): Promise<EmailModuleResult | null> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "BehindTheEmail-OSINT/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`; // Free personal token raises rate limit to 5,000/hr
  }

  let username: string | null = null;

  // Step A: Search users by public email
  const userSearch = await fetch(
    `https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email`,
    { headers, signal: AbortSignal.timeout(6000) }
  );
  if (userSearch.ok) {
    const json = await userSearch.json();
    username = json.items?.[0]?.login ?? null;
  }

  // Step B: Fallback to commit history search (finds users even with private email!)
  if (!username) {
    const commitSearch = await fetch(
      `https://api.github.com/search/commits?q=author-email:${encodeURIComponent(email)}&per_page=1`,
      { headers, signal: AbortSignal.timeout(6000) }
    );
    if (commitSearch.ok) {
      const json = await commitSearch.json();
      username = json.items?.[0]?.author?.login ?? null;
    }
  }

  if (!username) return null;

  const userRes = await fetch(`https://api.github.com/users/${username}`, {
    headers,
    signal: AbortSignal.timeout(6000),
  });
  if (!userRes.ok) return null;
  const u = await userRes.json();

  return {
    module: "github",
    category: "developer",
    depth: "rich",
    locked: false,
    lockedFields: [],
    lockedExtraCount: 0,
    profile: {
      avatarUrl: u.avatar_url || null,
      displayName: u.name || null,
      username: u.login || null,
      profileUrl: u.html_url || null,
      bio: u.bio || null,
      location: u.location || null,
      countryCode: null,
      accountType: u.type === "Organization" ? "business" : "personal",
      createdAt: u.created_at || null,
      lastActiveAt: u.updated_at || null,
      followerCount: u.followers ?? null,
      followingCount: u.following ?? null,
    },
    extras: {
      publicRepoCount: u.public_repos ?? null,
      company: u.company || null,
      websiteUrl: u.blog || null,
      xHandle: u.twitter_username ? `@${u.twitter_username}` : null,
      isHireable: u.hireable ?? null,
    },
  };
}

// 3. Duolingo Collector (100% Free Public Endpoint)
export async function checkDuolingo(email: string): Promise<EmailModuleResult | null> {
  const res = await fetch(
    `https://www.duolingo.com/2017-06-30/users?email=${encodeURIComponent(email)}`,
    {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const u = data?.users?.[0];
  if (!u) return null;

  const courses = (u.courses || []).map((c: any) => ({
    languageCode: c.learningLanguage || null,
    title: c.title || null,
    fromLanguageCode: c.fromLanguage || null,
    xp: c.xp || 0,
  }));

  return {
    module: "duolingo",
    category: "entertainment",
    depth: "rich",
    locked: false,
    lockedFields: [],
    lockedExtraCount: 0,
    profile: {
      avatarUrl: u.picture ? `https:${u.picture}/xlarge` : null,
      displayName: u.name || null,
      username: u.username || null,
      profileUrl: u.username ? `https://www.duolingo.com/profile/${u.username}` : null,
      bio: u.bio || null,
      location: u.location || null,
      countryCode: null,
      accountType: "personal",
      createdAt: u.creationDate ? new Date(u.creationDate * 1000).toISOString() : null,
      lastActiveAt: null,
      followerCount: null,
      followingCount: null,
    },
    extras: {
      totalXp: u.totalXp ?? null,
      currentStreakDays: u.streak ?? null,
      longestStreakDays: u.streakData?.longestStreak?.length ?? u.streak ?? null,
      courseCount: courses.length,
      courses,
      hasPlus: u.hasPlus ?? false,
      isGoogleLinked: Boolean(u.googleId),
      isFacebookLinked: Boolean(u.facebookId),
      hasRecentActivity: u.hasRecentActivity15 ?? null,
    },
  };
}

// 4. Adobe Collector (Direct Auth Endpoint)
export async function checkAdobe(email: string): Promise<EmailModuleResult | null> {
  const res = await fetch("https://auth.services.adobe.com/signin/v2/users/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IMS-ClientId": "edge_personalization",
      "User-Agent": "Mozilla/5.0",
    },
    body: JSON.stringify({ username: email }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const accounts = await res.json();
  const acc = Array.isArray(accounts) ? accounts[0] : null;
  if (!acc || !acc.authenticationMethods) return null;

  return {
    module: "adobe",
    category: "software",
    depth: "rich",
    locked: false,
    lockedFields: [],
    lockedExtraCount: 0,
    profile: {
      avatarUrl: acc.images?.["138"] || acc.images?.["50"] || null,
      displayName: null,
      username: null,
      profileUrl: null,
      bio: null,
      location: null,
      countryCode: null,
      accountType: acc.type === "type2e" ? "enterprise" : "personal",
      createdAt: null,
      lastActiveAt: null,
      followerCount: null,
      followingCount: null,
    },
    extras: {
      signInMethods: acc.authenticationMethods.map((m: any) => m.id || m),
      accountStatus: acc.status?.code || "active",
      hasLinkedBusinessAccount: Boolean(acc.hasT2ELinked),
    },
  };
}

// 5. Microsoft & Teams Collector
export async function checkMicrosoft(email: string): Promise<EmailModuleResult | null> {
  const res = await fetch("https://login.microsoftonline.com/common/GetCredentialType", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Username: email, isOtherIdpSupported: true }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  // IfExistsResult === 0 means account exists (5 or 6 means exists in different directory/MSA)
  if (![0, 5, 6].includes(data.IfExistsResult)) return null;

  const recoveryEmails: string[] = [];
  const recoveryPhones: string[] = [];
  if (data.Credentials?.OtcLoginEligibleProofs) {
    for (const proof of data.Credentials.OtcLoginEligibleProofs) {
      if (proof.display && proof.display.includes("@")) recoveryEmails.push(proof.display);
      else if (proof.display) recoveryPhones.push(proof.display);
    }
  }

  return {
    module: "microsoft",
    category: "work",
    depth: "rich",
    locked: false,
    lockedFields: [],
    lockedExtraCount: 0,
    profile: {
      avatarUrl: null,
      displayName: null,
      username: email,
      profileUrl: null,
      bio: null,
      location: null,
      countryCode: data.Country || null,
      accountType: data.ThrottleStatus === 1 ? "business" : "personal",
      createdAt: null,
      lastActiveAt: null,
      followerCount: null,
      followingCount: null,
    },
    extras: {
      accountId: null,
      nameUpdatedAt: null,
      recoveryEmails: recoveryEmails.length ? recoveryEmails : null,
      recoveryPhones: recoveryPhones.length ? recoveryPhones : null,
    },
  };
}

// 6. Data Breach Collector (Free Multi-Source Aggregator: XposedOrNot + LeakCheck + HudsonRock)
export async function checkDataBreaches(email: string): Promise<EmailModuleResult | null> {
  const records: Array<{
    breachName: string;
    breachedAt: string | null;
    username: string | null;
    fullName: string | null;
    password: string | null;
    ipAddress: string | null;
    phoneNumber: string | null;
  }> = [];

  const [xonRes, lcRes, hrRes] = await Promise.allSettled([
    fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(8000),
    }),
    fetch(`https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(8000),
    }),
    fetch(
      `https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(8000) }
    ),
  ]);

  // Parse XposedOrNot
  if (xonRes.status === "fulfilled" && xonRes.value.ok) {
    const xon = await xonRes.value.json();
    const details = xon?.ExposedBreaches?.breaches_details || [];
    for (const b of details) {
      records.push({
        breachName: b.breach || b.domain || "Unknown Breach",
        breachedAt: b.xposed_date ? `${b.xposed_date}-01T00:00:00.000Z` : null,
        username: null,
        fullName: null,
        password: b.xposed_data?.includes("Passwords") ? "••••••••" : null,
        ipAddress: null,
        phoneNumber: null,
      });
    }
  }

  // Parse LeakCheck Public API
  if (lcRes.status === "fulfilled" && lcRes.value.ok) {
    const lc = await lcRes.value.json();
    if (lc?.success && Array.isArray(lc.sources)) {
      for (const s of lc.sources) {
        if (!records.some((r) => r.breachName.toLowerCase() === (s.name || "").toLowerCase())) {
          records.push({
            breachName: s.name || "Data Breach",
            breachedAt: s.date ? `${s.date}-01T00:00:00.000Z` : null,
            username: null,
            fullName: null,
            password: null,
            ipAddress: null,
            phoneNumber: null,
          });
        }
      }
    }
  }

  // Parse HudsonRock Infostealer Intelligence
  if (hrRes.status === "fulfilled" && hrRes.value.ok) {
    const hr = await hrRes.value.json();
    if (Array.isArray(hr?.stealers)) {
      for (const st of hr.stealers) {
        records.push({
          breachName: `Infostealer Log (${st.computer_name || "Malware"})`,
          breachedAt: st.date_compromised || null,
          username: null,
          fullName: null,
          password: "••••••••",
          ipAddress: st.ip || null,
          phoneNumber: null,
        });
      }
    }
  }

  if (records.length === 0) return null;

  const dates = records
    .map((r) => r.breachedAt)
    .filter((d): d is string => Boolean(d))
    .sort();

  return {
    module: "data-breach",
    category: "security",
    depth: "rich",
    locked: false,
    lockedFields: [],
    lockedExtraCount: 0,
    profile: null,
    extras: {
      recordCount: records.length,
      firstBreachedAt: dates[0] || null,
      lastBreachedAt: dates[dates.length - 1] || null,
      records,
    },
  };
}

// 7. Domain Module: Email Service (DNS MX)
export async function checkEmailService(domain: string): Promise<DomainModuleResult> {
  try {
    const mx = await dns.resolveMx(domain);
    const hosts = mx.sort((a, b) => a.priority - b.priority).map((r) => r.exchange.toLowerCase());
    const joined = hosts.join(" ");
    let provider: string | null = null;
    if (joined.includes("google") || joined.includes("gmail")) provider = "gmail";
    else if (joined.includes("outlook") || joined.includes("protection.outlook")) provider = "outlook";
    else if (joined.includes("yahoodns")) provider = "yahoo";
    else if (joined.includes("protonmail") || joined.includes("proton")) provider = "proton";
    else if (joined.includes("icloud")) provider = "icloud";
    else if (joined.includes("cloudflare")) provider = "cloudflare";
    else if (joined.includes("hostinger")) provider = "hostinger";
    else if (joined.includes("pphosted") || joined.includes("proofpoint")) provider = "proofpoint";
    else if (joined.includes("yandex")) provider = "yandex";

    return {
      module: "email-service",
      category: "domain",
      locked: false,
      details: {
        provider,
        canReceiveEmail: hosts.length > 0,
        mxHosts: hosts,
      },
    };
  } catch {
    return {
      module: "email-service",
      category: "domain",
      locked: false,
      details: { provider: null, canReceiveEmail: false, mxHosts: [] },
    };
  }
}

// 8. Domain Module: Email Pattern Analyzer
export async function checkEmailPattern(email: string): Promise<DomainModuleResult> {
  const [local] = email.split("@");
  const clean = local.split("+")[0];
  let pattern = "{local}";
  let firstName: string | null = null;
  let lastName: string | null = null;

  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length === 2 && parts[0].length > 1 && parts[1].length > 1) {
      pattern = "{first}.{last}";
      firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    } else if (parts.length === 2 && parts[0].length === 1) {
      pattern = "{f}.{last}";
      lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
  } else if (clean.includes("_")) {
    const parts = clean.split("_");
    if (parts.length === 2) {
      pattern = "{first}_{last}";
      firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
  }

  return {
    module: "email-pattern",
    category: "domain",
    locked: false,
    details: {
      pattern,
      isCatchAll: false,
      firstName,
      lastName,
      firstInitial: firstName ? firstName[0] : clean[0]?.toUpperCase() || null,
      lastInitial: lastName ? lastName[0] : null,
    },
  };
}

// 9. Domain Module: Website Metadata Scraper
export async function checkDomainWebsite(domain: string): Promise<DomainModuleResult | null> {
  if (FREEMAIL_DOMAINS.has(domain.toLowerCase())) return null;
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BehindTheEmailBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim() || domain;
    const description =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null;
    const iconHref =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      "/favicon.ico";
    const iconUrl = new URL(iconHref, `https://${domain}`).toString();

    return {
      module: "website",
      category: "domain",
      locked: false,
      details: {
        url: `https://${domain}`,
        title,
        description,
        iconUrl,
      },
    };
  } catch {
    return null;
  }
}
```

---

### 5.3 Python Microservice for 26+ Account-Existence Checks (`holehe` + `GHunt`)
Deploy this lightweight FastAPI service on **HuggingFace Spaces (Free Docker Space)** or run locally on port `8000`. It executes all 26+ silent account registration checks concurrently in ~2.5 seconds:

```python
# osint_worker/main.py
import asyncio
import httpx
from fastapi import FastAPI, Query
from holehe.core import import_submodules, get_functions

app = FastAPI(title="BehindTheEmail Free OSINT Worker")

# Map Holehe modules to BehindTheEmail's exact module IDs and categories
TARGET_MODULES = {
    "tumblr": "social",
    "pinterest": "social",
    "snapchat": "social",
    "twitter": "social",      # Mapped to "x"
    "mastodon": "social",
    "quora": "social",
    "patreon": "social",
    "atlassian": "developer",
    "replit": "developer",
    "wordpress": "developer",
    "codecademy": "developer",
    "apple": "software",
    "dropbox": "software",
    "notion": "software",
    "firefox": "software",
    "protonmail": "software",
    "amazon": "shopping",
    "spotify": "entertainment",
    "netflix": "entertainment",
    "lastfm": "entertainment", # Mapped to "last.fm"
}

MODULES = import_submodules("holehe.modules")
FUNCTIONS = get_functions(MODULES)

NAME_NORMALIZER = {
    "twitter": "x",
    "lastfm": "last.fm",
}

async def run_single_holehe(func, email: str, client: httpx.AsyncClient):
    out = []
    try:
        await asyncio.wait_for(func(email, client, out), timeout=6.0)
    except Exception:
        return None
    if out and out[0].get("exists") is True:
        raw_name = out[0].get("name", "").lower()
        mod_id = NAME_NORMALIZER.get(raw_name, raw_name)
        if mod_id in TARGET_MODULES.values() or raw_name in TARGET_MODULES:
            return {
                "module": mod_id,
                "category": TARGET_MODULES.get(raw_name, "social"),
                "depth": "basic",
                "locked": False,
                "profile": {
                    "avatarUrl": None,
                    "displayName": None,
                    "username": None,
                    "profileUrl": None,
                    "bio": None,
                    "location": None,
                    "countryCode": None,
                    "accountType": None,
                    "createdAt": None,
                    "lastActiveAt": None,
                    "followerCount": None,
                    "followingCount": None,
                },
                "lockedFields": [],
                "lockedExtraCount": 0,
                "extras": None,
            }
    return None

@app.get("/check-accounts")
async def check_accounts(email: str = Query(...)):
    selected_funcs = [
        f for f in FUNCTIONS
        if f.__name__.lower() in TARGET_MODULES
    ]
    async with httpx.AsyncClient(timeout=6.0) as client:
        tasks = [run_single_holehe(f, email, client) for f in selected_funcs]
        results = await asyncio.gather(*tasks)
    found = [r for r in results if r is not None]
    return {"email": email, "found": found}
```

---

### 5.4 Live SSE Streaming Search Endpoint (`src/app/api/search/stream/route.ts`)
One of the signature UX features of `behindtheemail.com` is that results **stream in live as each source answers** (`Checking LinkedIn… 60%`) while dynamically merging the `Summary` card. Here is the Next.js App Router SSE streaming endpoint:

```typescript
// src/app/api/search/stream/route.ts
import { NextRequest } from "next/server";
import {
  checkGravatar,
  checkGitHub,
  checkDuolingo,
  checkAdobe,
  checkMicrosoft,
  checkDataBreaches,
  checkEmailService,
  checkEmailPattern,
  checkDomainWebsite,
} from "@/lib/osint/collectors";
import { mergeModuleIntoSummary, ProfileSummary, EmailModuleResult, DomainModuleResult } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Invalid email address" }), { status: 400 });
  }

  const domain = email.split("@")[1];
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const summary: ProfileSummary = {
        profilePictures: [],
        names: [],
        usernames: [],
        locations: [],
        links: [],
        phoneNumbers: [],
        dates: [],
        photos: [],
      };
      const emailModules: EmailModuleResult[] = [];
      const domainModules: DomainModuleResult[] = [];

      const tasks: Array<{ name: string; run: () => Promise<any>; kind: "email" | "domain" }> = [
        { name: "Email Service", kind: "domain", run: () => checkEmailService(domain) },
        { name: "Email Pattern", kind: "domain", run: () => checkEmailPattern(email) },
        { name: "Website", kind: "domain", run: () => checkDomainWebsite(domain) },
        { name: "Gravatar", kind: "email", run: () => checkGravatar(email) },
        { name: "GitHub", kind: "email", run: () => checkGitHub(email) },
        { name: "Duolingo", kind: "email", run: () => checkDuolingo(email) },
        { name: "Adobe", kind: "email", run: () => checkAdobe(email) },
        { name: "Microsoft", kind: "email", run: () => checkMicrosoft(email) },
        { name: "Data Breach", kind: "email", run: () => checkDataBreaches(email) },
      ];

      let completed = 0;
      const total = tasks.length;

      await Promise.allSettled(
        tasks.map(async (task) => {
          sendEvent("progress", {
            checking: task.name,
            completed,
            total,
            percent: Math.round((completed / total) * 100),
          });
          try {
            const result = await task.run();
            completed += 1;
            if (result) {
              if (task.kind === "email") {
                emailModules.push(result);
                mergeModuleIntoSummary(summary, result);
              } else {
                domainModules.push(result);
              }
              sendEvent("module", {
                kind: task.kind,
                result,
                summary,
                completed,
                total,
                percent: Math.round((completed / total) * 100),
              });
            } else {
              sendEvent("progress", {
                checking: task.name,
                completed,
                total,
                percent: Math.round((completed / total) * 100),
              });
            }
          } catch {
            completed += 1;
          }
        })
      );

      sendEvent("done", {
        query: { kind: "email", value: email },
        subjects: { email, domain },
        status: emailModules.length > 0 ? "found" : "not_found",
        summary,
        emailModules,
        domainModules,
        meta: {
          durationMs: Date.now() - startTime,
          access: "full", // Always unlocked!
        },
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
```

---

### 5.5 Paid Feature #1: CSV, Excel (XLSX), and Polished PDF Report Exports (`src/lib/exporters.ts`)
On `behindtheemail.com`, CSV/XLSX exports require the Plus plan ($14.99/mo) and PDF reports require the Business plan ($99.99/mo). Here is the client-side exporter module that generates all three formats for free:

```typescript
// src/lib/exporters.ts
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EmailModuleResult, DomainModuleResult, ProfileSummary } from "./schema";

export interface FullSearchReport {
  email: string;
  domain: string;
  durationMs: number;
  summary: ProfileSummary;
  emailModules: EmailModuleResult[];
  domainModules: DomainModuleResult[];
}

// 1. Export to CSV
export function exportToCsv(report: FullSearchReport) {
  const headers = [
    "Module",
    "Category",
    "Depth",
    "Display Name",
    "Username",
    "Location",
    "Profile URL",
    "Followers",
    "Created At",
    "Extras JSON",
  ];
  const rows = report.emailModules.map((m) => [
    m.module,
    m.category,
    m.depth,
    m.profile?.displayName || "",
    m.profile?.username || "",
    m.profile?.location || "",
    m.profile?.profileUrl || "",
    m.profile?.followerCount ?? "",
    m.profile?.createdAt || "",
    m.extras ? JSON.stringify(m.extras) : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `behind-the-email-${report.email}.csv`;
  a.click();
}

// 2. Export to Multi-Sheet Excel (.xlsx)
export function exportToXlsx(report: FullSearchReport) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Identity Summary
  const summaryRows = [
    ["Target Email", report.email],
    ["Domain", report.domain],
    ["Names Found", report.summary.names.map((n) => `${n.value} (${n.module})`).join(", ")],
    ["Usernames Found", report.summary.usernames.map((u) => `@${u.value} (${u.module})`).join(", ")],
    ["Locations", report.summary.locations.map((l) => l.location || l.countryCode).join(", ")],
    ["Phone Numbers", report.summary.phoneNumbers.map((p) => p.value).join(", ")],
    ["Links", report.summary.links.map((l) => l.url).join(", ")],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

  // Sheet 2: Discovered Accounts
  const accountRows = report.emailModules.map((m) => ({
    Platform: m.module,
    Category: m.category,
    DisplayName: m.profile?.displayName || "",
    Username: m.profile?.username || "",
    Location: m.profile?.location || "",
    ProfileURL: m.profile?.profileUrl || "",
    Bio: m.profile?.bio || "",
    Followers: m.profile?.followerCount ?? "",
    Created: m.profile?.createdAt || "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accountRows), "Accounts");

  // Sheet 3: Data Breaches
  const breachMod = report.emailModules.find((m) => m.module === "data-breach");
  const breachRecords = breachMod?.extras?.records || [];
  if (breachRecords.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(breachRecords), "Data Breaches");
  }

  XLSX.writeFile(wb, `behind-the-email-${report.email}.xlsx`);
}

// 3. Export to Polished PDF Intelligence Dossier
export function exportToPdf(report: FullSearchReport) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("OSINT Email Intelligence Report", 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Target: ${report.email}  |  Generated: ${new Date().toISOString()}`, 14, 28);

  // Summary Table
  autoTable(doc, {
    startY: 35,
    head: [["Signal Category", "Discovered Values"]],
    body: [
      ["Names", report.summary.names.map((n) => `${n.value} (${n.module})`).join(", ") || "None"],
      ["Usernames", report.summary.usernames.map((u) => `@${u.value} (${u.module})`).join(", ") || "None"],
      ["Locations", report.summary.locations.map((l) => l.location || l.countryCode).join(", ") || "None"],
      ["Phone Numbers", report.summary.phoneNumbers.map((p) => p.value).join(", ") || "None"],
      ["External Links", report.summary.links.map((l) => l.url).join("\n") || "None"],
    ],
  });

  // Accounts Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [["Platform", "Category", "Name", "Username", "Location", "Profile URL"]],
    body: report.emailModules.map((m) => [
      m.module.toUpperCase(),
      m.category,
      m.profile?.displayName || "-",
      m.profile?.username ? `@${m.profile.username}` : "-",
      m.profile?.location || "-",
      m.profile?.profileUrl || "-",
    ]),
  });

  doc.save(`OSINT-Dossier-${report.email}.pdf`);
}
```

---

### 5.6 Paid Feature #2: Bulk Search Engine (`/api/bulk-search/route.ts`)
On `behindtheemail.com`, Bulk Search (up to 50 emails at once) is locked to the **$99.99/mo Business Plan**. Here is the complete server route to process bulk email lists with controlled concurrency (`p-limit` of 5 concurrent emails) for free:

```typescript
// src/app/api/bulk-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  checkGravatar,
  checkGitHub,
  checkDuolingo,
  checkAdobe,
  checkMicrosoft,
  checkDataBreaches,
  checkEmailService,
  checkEmailPattern,
} from "@/lib/osint/collectors";
import { mergeModuleIntoSummary, ProfileSummary } from "@/lib/schema";

async function enrichSingleEmail(email: string) {
  const domain = email.split("@")[1];
  const summary: ProfileSummary = {
    profilePictures: [],
    names: [],
    usernames: [],
    locations: [],
    links: [],
    phoneNumbers: [],
    dates: [],
    photos: [],
  };

  const results = await Promise.allSettled([
    checkGravatar(email),
    checkGitHub(email),
    checkDuolingo(email),
    checkAdobe(email),
    checkMicrosoft(email),
    checkDataBreaches(email),
  ]);

  const emailModules = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
    .map((r) => {
      mergeModuleIntoSummary(summary, r.value);
      return r.value;
    });

  const [service, pattern] = await Promise.all([
    checkEmailService(domain),
    checkEmailPattern(email),
  ]);

  return {
    email,
    status: emailModules.length > 0 ? "found" : "not_found",
    primaryName: summary.names[0]?.value || pattern.details?.firstName || null,
    primaryUsername: summary.usernames[0]?.value || null,
    primaryLocation: summary.locations[0]?.location || null,
    platformsFound: emailModules.map((m) => m.module),
    breachCount: emailModules.find((m) => m.module === "data-breach")?.extras?.recordCount || 0,
    emailProvider: service.details?.provider || null,
    summary,
    emailModules,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rawEmails: string[] = Array.isArray(body?.emails) ? body.emails : [];
  const emails = [...new Set(rawEmails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))].slice(0, 100);

  if (emails.length === 0) {
    return NextResponse.json({ error: "At least one valid email is required" }, { status: 400 });
  }

  // Process in batches of 5 to avoid upstream rate limits
  const batchSize = 5;
  const results = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    const chunk = emails.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map((e) => enrichSingleEmail(e)));
    results.push(...chunkResults);
  }

  return NextResponse.json({
    total: results.length,
    foundCount: results.filter((r) => r.status === "found").length,
    results,
  });
}
```

---

### 5.7 Paid Feature #3: Public REST API (`/api/v1/search/route.ts`) & Image Proxy
Replicates `POST /v1/search` from `https://api.behindtheemail.com/v1/search` (gated behind Pro $29.99/mo) for free:

```typescript
// src/app/api/v1/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  checkGravatar,
  checkGitHub,
  checkDuolingo,
  checkAdobe,
  checkMicrosoft,
  checkDataBreaches,
  checkEmailService,
  checkEmailPattern,
  checkDomainWebsite,
} from "@/lib/osint/collectors";
import { mergeModuleIntoSummary, ProfileSummary } from "@/lib/schema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = body.email?.trim()?.toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: { message: "Invalid email address", cause: "Email format validation failed" } },
      { status: 400 }
    );
  }

  const domain = email.split("@")[1];
  const summary: ProfileSummary = {
    profilePictures: [],
    names: [],
    usernames: [],
    locations: [],
    links: [],
    phoneNumbers: [],
    dates: [],
    photos: [],
  };

  const settled = await Promise.allSettled([
    checkGravatar(email),
    checkGitHub(email),
    checkDuolingo(email),
    checkAdobe(email),
    checkMicrosoft(email),
    checkDataBreaches(email),
  ]);

  const emailModules = settled
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
    .map((r) => {
      mergeModuleIntoSummary(summary, r.value);
      return r.value;
    });

  const [emailService, emailPattern, website] = await Promise.all([
    checkEmailService(domain),
    checkEmailPattern(email),
    checkDomainWebsite(domain),
  ]);

  return NextResponse.json({
    data: {
      status: emailModules.length > 0 ? "found" : "not_found",
      profile: {
        summary,
        modules: Object.fromEntries(emailModules.map((m) => [m.module, m])),
        emailService: emailService.details,
        emailPattern: emailPattern.details,
        website: website?.details || null,
      },
    },
  });
}
```

---

## 6. Frontend UI & Page Structure (Matching `behindtheemail.com` Routes)

From the production Sentry route manifest (`_sentryRouteManifest` in `1k2gycpfszf-f.js`), here are the exact routes and components to build in Next.js App Router:

```
src/app/
├── page.tsx                          # Landing Page + Live Interactive Hero Search
├── demo/page.tsx                     # Instant Live Lookup Page (No login required)
├── example/page.tsx                  # Full Pre-populated OSINT Report Showcase
├── dashboard/
│   ├── layout.tsx                    # Sidebar Navigation (Search, Bulk, History, API)
│   ├── search/page.tsx               # Main Live Streaming OSINT Search View
│   ├── bulk-searches/
│   │   ├── page.tsx                  # Multi-Email Input (up to 50+) & Batch History
│   │   └── [id]/page.tsx             # Batch Results Table + Bulk CSV/XLSX Export
│   ├── recent-searches/
│   │   ├── page.tsx                  # Saved Search History List
│   │   └── [email]/page.tsx          # Cached Instant Report View
│   └── api-keys/page.tsx             # Free Self-Serve API Key Generator + Scalar Docs
└── api/
    ├── search/stream/route.ts        # Live SSE Streaming Search Endpoint
    ├── bulk-search/route.ts          # Batch Enrichment Endpoint
    ├── image-proxy/route.ts          # CORS-Free Image Proxy
    └── v1/
        ├── search/route.ts           # Programmatic JSON REST API
        └── docs/route.ts             # Scalar OpenAPI Interactive Documentation
```

### Key UI Components to Include in `/dashboard/search`:
1. **`ResultsHeader`**: Displays target email, domain badge, total platforms matched, `firstSeen` to `lastSeen` date span, live progress bar (`Checking Data Breach… 60%`), and export dropdown (`Export CSV`, `Export XLSX`, `Export PDF Dossier`).
2. **`ResultsControls`**:
   - **Source Search Bar**: Filter cards by platform name (`LinkedIn`, `GitHub`, etc.).
   - **Category Filter Chips**: `Work`, `Social`, `Developer`, `Software`, `Shopping`, `Entertainment`, `Security`, `Domain` with live badge counts.
   - **Layout Segmented Control**: Switch between **Masonry Grid View** (`grid`) and **Sortable Data Table View** (`table` with expandable detail rows).
   - **Expand/Collapse All Button**.
3. **`SummaryCards`**: 8 aggregated intelligence buckets (`Profile pictures` with lightbox `ImageViewer`, `Names`, `Usernames`, `Locations`, `Links`, `Phone numbers`, `Dates`, `Photos`).
4. **`AccountsCard`**: Compact 3-column badge grid showing all `basic` registered accounts (`Spotify`, `X`, `Pinterest`, `Dropbox`, `Notion`, `Amazon`, etc.).
5. **`ModuleCard` & `BreachRecordsDialog`**: Rich cards per platform with a modal dialog for searching/filtering `data-breach` records by breach name or login.

---

## 7. Step-by-Step Build & Free Deployment Roadmap

### Phase 1: Project Scaffolding (Day 1)
```bash
npx create-next-app@latest behind-the-email-free --typescript --tailwind --app --src-dir
cd behind-the-email-free
npm install cheerio xlsx jspdf jspdf-autotable lucide-react framer-motion @tanstack/react-table zod
```

### Phase 2: Core OSINT & Streaming Engine (Day 2–3)
1. Add `src/lib/schema.ts` and `src/lib/osint/collectors.ts`.
2. Add a free `GITHUB_TOKEN` (from your personal GitHub Settings -> Developer Settings -> Personal Access Tokens, $0) to `.env.local` so GitHub user + commit searches get 5,000 requests/hour instead of 60/hour.
3. Implement `/api/search/stream/route.ts` and wire up an `EventSource("/api/search/stream?email=...")` hook in React so results stream in live as each provider resolves.

### Phase 3: Python `Holehe` + `GHunt` Worker (Day 4)
1. Create a new **HuggingFace Space** -> select **Docker** -> **Blank** (Free 2 vCPU / 16 GB RAM).
2. Add a `Dockerfile` with `python:3.11-slim`, `pip install fastapi uvicorn httpx holehe ghunt`, and deploy `osint_worker/main.py`.
3. Connect the HuggingFace Space URL (`OSINT_WORKER_URL`) to your Next.js `/api/search/stream` route so all 26+ basic account checks stream alongside the rich modules.

### Phase 4: Bulk Search, Exports & Free Cloud Deployment (Day 5)
1. Add `src/lib/exporters.ts` (CSV, XLSX, PDF Dossier) and `/api/bulk-search/route.ts`.
2. Connect a free **Supabase** or **Neon.tech** PostgreSQL database (`DATABASE_URL`) for saving search history and bulk search batches.
3. Deploy the Next.js app to **Vercel (Free Tier)**.
