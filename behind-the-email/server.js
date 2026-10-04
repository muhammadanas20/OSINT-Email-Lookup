const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const {
  SHOWCASE_PROFILES,
  mergeModuleIntoSummary,
  checkEmailService,
  checkEmailPattern,
  checkDomainWebsite,
  checkGravatar,
  checkGitHub,
  checkDuolingo,
  checkAdobe,
  checkMicrosoftAndTeams,
  checkDataBreaches,
  checkSilentAccounts,
  deriveCandidateUsernames,
  buildGoogleTimeline,
  checkUsernameSocials,
  buildSocialUsernameModules,
  buildWhatsAppModules,
} = require("./src/osintEngine");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Vercel's deployed function bundle is read-only. Use its writable /tmp volume there,
// while keeping the existing project-local files for normal Node deployments.
// Serverless history is best-effort and lasts only as long as the warm instance.
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = process.env.DATA_DIR || (IS_SERVERLESS
  ? path.join("/tmp", "behind-the-email")
  : path.join(__dirname, "data"));
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const BULK_FILE = path.join(DATA_DIR, "bulk_jobs.json");

function initializeJsonStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, "[]");
    if (!fs.existsSync(BULK_FILE)) fs.writeFileSync(BULK_FILE, "[]");
  } catch (error) {
    // Search must remain available even when optional history persistence is not.
    console.warn(`History storage unavailable at ${DATA_DIR}: ${error.message}`);
  }
}

initializeJsonStore();

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to write JSON:", e.message);
  }
}

function saveToHistory(report) {
  const history = readJson(HISTORY_FILE);
  const filtered = history.filter((h) => h.subjects?.email !== report.subjects.email);
  filtered.unshift({
    ...report,
    searchedAt: new Date().toISOString(),
  });
  writeJson(HISTORY_FILE, filtered.slice(0, 100));
}

const PLATFORM_CATEGORY_MAP = {
  linkedin: "work",
  dropbox: "software",
  x: "social",
  tumblr: "social",
  patreon: "social",
  "last.fm": "entertainment",
  atlassian: "developer",
  adobe: "software",
  spotify: "entertainment",
  firefox: "software",
  wordpress: "developer",
  protonmail: "software",
};

// Helper to run full enrichment (used by REST API & Bulk Search)
async function runFullEnrichment(rawEmail) {
  const startTime = Date.now();
  const email = String(rawEmail || "").trim().toLowerCase();
  const domain = email.split("@")[1] || "";

  const summary = {
    profilePictures: [],
    names: [],
    usernames: [],
    locations: [],
    links: [],
    phoneNumbers: [],
    dates: [],
    photos: [],
  };

  const emailModules = [];
  const domainModules = [];
  const seenModules = new Set();

  const addEmailModule = (mod) => {
    if (!mod || seenModules.has(mod.module)) return;
    seenModules.add(mod.module);
    emailModules.push(mod);
    mergeModuleIntoSummary(summary, mod);
  };

  // If showcase profile exists, add its rich modules
  const showcase = SHOWCASE_PROFILES[email];
  if (showcase) {
    for (const m of showcase.modules) {
      addEmailModule(JSON.parse(JSON.stringify(m)));
    }
  }

  // Run live checks in parallel
  const [
    serviceRes,
    patternRes,
    websiteRes,
    gravatarRes,
    githubRes,
    duolingoRes,
    adobeRes,
    msTeamsRes,
    breachRes,
    silentRes,
  ] = await Promise.allSettled([
    checkEmailService(domain),
    checkEmailPattern(email),
    showcase?.domainOverride?.website
      ? Promise.resolve(showcase.domainOverride.website)
      : checkDomainWebsite(domain),
    checkGravatar(email),
    checkGitHub(email),
    checkDuolingo(email),
    checkAdobe(email),
    checkMicrosoftAndTeams(email),
    checkDataBreaches(email),
    checkSilentAccounts(email),
  ]);

  if (serviceRes.status === "fulfilled" && serviceRes.value) domainModules.push(serviceRes.value);
  if (patternRes.status === "fulfilled" && patternRes.value) domainModules.push(patternRes.value);
  if (websiteRes.status === "fulfilled" && websiteRes.value) domainModules.push(websiteRes.value);

  if (gravatarRes.status === "fulfilled" && gravatarRes.value) addEmailModule(gravatarRes.value);
  if (githubRes.status === "fulfilled" && githubRes.value) addEmailModule(githubRes.value);
  if (duolingoRes.status === "fulfilled" && duolingoRes.value) addEmailModule(duolingoRes.value);
  if (adobeRes.status === "fulfilled" && adobeRes.value) addEmailModule(adobeRes.value);

  if (msTeamsRes.status === "fulfilled" && Array.isArray(msTeamsRes.value)) {
    for (const m of msTeamsRes.value) addEmailModule(m);
  }

  if (breachRes.status === "fulfilled" && breachRes.value) {
    if (breachRes.value.breachModule) addEmailModule(breachRes.value.breachModule);
    for (const plat of breachRes.value.discoveredPlatforms || []) {
      addEmailModule({
        module: plat,
        category: PLATFORM_CATEGORY_MAP[plat] || "social",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      });
    }
  }

  if (silentRes.status === "fulfilled" && Array.isArray(silentRes.value)) {
    for (const m of silentRes.value) addEmailModule(m);
  }

  // ——— Phase 2: Google Timeline synthesis (from whatever geo we have so far) ———
  try {
    const tl = buildGoogleTimeline(email, emailModules, summary);
    if (tl) addEmailModule(tl);
  } catch {}

  // ——— Phase 3: Username social footprint (derive handles → check platforms) ———
  // Showcase profiles already contain a curated social footprint. Re-probing every
  // platform adds no data and can push a serverless request past its time limit.
  if (!showcase) {
    try {
      const knownUsernames = [
        ...summary.usernames.map((u) => u.value),
        ...emailModules.filter((m) => m.profile?.username).map((m) => m.profile.username),
        ...emailModules.filter((m) => m.extras?.username).map((m) => m.extras.username),
      ];
      const candidates = deriveCandidateUsernames(email, knownUsernames);
      if (candidates.length > 0) {
        const socialResults = await checkUsernameSocials(candidates);
        const socialModules = buildSocialUsernameModules(socialResults);
        for (const sm of socialModules) addEmailModule(sm);
      }
    } catch (e) {
      console.warn("username social check failed", e.message);
    }
  }

  // ——— Phase 4: WhatsApp via phone numbers (breach / recovery) ———
  try {
    if (summary.phoneNumbers.length > 0) {
      const waMods = buildWhatsAppModules(summary.phoneNumbers);
      for (const w of waMods) addEmailModule(w);
    }
  } catch {}

  const report = {
    query: { kind: "email", value: email },
    subjects: { email, domain },
    status: emailModules.length > 0 ? "found" : "not_found",
    summary,
    emailModules,
    domainModules,
    meta: {
      durationMs: Date.now() - startTime,
      access: "full",
    },
  };

  saveToHistory(report);
  return report;
}

// 1. Live SSE Streaming Endpoint (/api/search/stream)
app.get("/api/search/stream", async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let clientClosed = false;
  req.on("close", () => { clientClosed = true; });
  req.on("aborted", () => { clientClosed = true; });

  const startTime = Date.now();
  const domain = email.split("@")[1];

  const sendEvent = (event, data) => {
    if (clientClosed || res.writableEnded) return false;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (e) {
      clientClosed = true;
      return false;
    }
  };

  const summary = {
    profilePictures: [],
    names: [],
    usernames: [],
    locations: [],
    links: [],
    phoneNumbers: [],
    dates: [],
    photos: [],
  };
  const emailModules = [];
  const domainModules = [];
  const seenModules = new Set();

  const showcase = SHOWCASE_PROFILES[email];

  // Build task queue for live streaming
  const tasks = [
    {
      name: "Email Service (DNS MX)",
      kind: "domain",
      run: () => checkEmailService(domain),
    },
    {
      name: "Email Pattern",
      kind: "domain",
      run: () => checkEmailPattern(email),
    },
    {
      name: "Domain Website",
      kind: "domain",
      run: () =>
        showcase?.domainOverride?.website
          ? Promise.resolve(showcase.domainOverride.website)
          : checkDomainWebsite(domain),
    },
    {
      name: "Gravatar",
      kind: "email",
      run: () => checkGravatar(email),
    },
    {
      name: "GitHub",
      kind: "email",
      run: () => checkGitHub(email),
    },
    {
      name: "Duolingo",
      kind: "email",
      run: () => checkDuolingo(email),
    },
    {
      name: "Adobe",
      kind: "email",
      run: () => checkAdobe(email),
    },
    {
      name: "Microsoft & Teams",
      kind: "email-multi",
      run: () => checkMicrosoftAndTeams(email),
    },
    {
      name: "Data Breach Intelligence",
      kind: "breach",
      run: () => checkDataBreaches(email),
    },
    {
      name: "Registered Accounts (Spotify, Firefox, WordPress, Proton)",
      kind: "email-multi",
      run: () => checkSilentAccounts(email),
    },
  ];

  // Showcase modules: emit instantly as pre-enriched signals (no extra tasks)
  const showcaseModulesToStream = showcase ? showcase.modules.map((m) => JSON.parse(JSON.stringify(m))) : [];
  // Adjust domain task if showcase has domainOverride
  let completed = 0;
  const total = tasks.length + (showcaseModulesToStream.length > 0 ? 1 : 0); // +1 batch for showcase burst

  const emitEmailModule = (mod) => {
    if (!mod || seenModules.has(mod.module)) return;
    seenModules.add(mod.module);
    emailModules.push(mod);
    mergeModuleIntoSummary(summary, mod);
    sendEvent("module", {
      kind: "email",
      result: mod,
      summary,
      completed,
      total,
      percent: Math.min(99, Math.round((completed / total) * 100)),
    });
  };

  // Burst showcase modules first. Avoid artificial delays in serverless functions:
  // they consume the execution budget without doing useful work.
  if (showcaseModulesToStream.length > 0) {
    for (let i = 0; i < showcaseModulesToStream.length; i++) {
      const mod = showcaseModulesToStream[i];
      if (!IS_SERVERLESS) await new Promise((r) => setTimeout(r, 20));
      // Temporarily set completed to reflect burst progress for correct percent
      const burstCompleted = i;
      const savedCompleted = completed;
      completed = burstCompleted;
      emitEmailModule(mod);
      completed = savedCompleted;
      sendEvent("progress", {
        checking: mod.module,
        completed: i + 1,
        total,
        percent: Math.min(95, Math.round(((i + 1) / total) * 100)),
      });
    }
    completed = 1;
  }

  await Promise.allSettled(
    tasks.map(async (task) => {
      sendEvent("progress", {
        checking: task.name,
        completed,
        total,
        percent: Math.min(95, Math.round((completed / total) * 100)),
      });
      try {
        const result = await task.run();
        completed += 1;

        if (task.kind === "domain" && result) {
          domainModules.push(result);
          sendEvent("module", {
            kind: "domain",
            result,
            summary,
            completed,
            total,
            percent: Math.min(99, Math.round((completed / total) * 100)),
          });
        } else if (task.kind === "email" && result) {
          emitEmailModule(result);
        } else if (task.kind === "email-multi" && Array.isArray(result)) {
          for (const m of result) emitEmailModule(m);
        } else if (task.kind === "breach" && result) {
          if (result.breachModule) emitEmailModule(result.breachModule);
          for (const plat of result.discoveredPlatforms || []) {
            emitEmailModule({
              module: plat,
              category: PLATFORM_CATEGORY_MAP[plat] || "social",
              depth: "basic",
              locked: false,
              lockedFields: [],
              lockedExtraCount: 0,
              profile: null,
              extras: null,
            });
          }
        }

        sendEvent("progress", {
          checking: task.name,
          completed,
          total,
          percent: Math.min(99, Math.round((completed / total) * 100)),
        });
      } catch {
        completed += 1;
      }
    })
  );

  // ——— Phase: Google Timeline synthesis (streamed) ———
  try {
    sendEvent("progress", { checking: "Google Location Timeline", completed, total: total + 2, percent: Math.min(96, Math.round(((completed + 1) / (total + 2)) * 100)) });
    const tl = buildGoogleTimeline(email, emailModules, summary);
    if (tl) emitEmailModule(tl);
  } catch {}

  // ——— Phase: Username social footprint ———
  // Curated showcases already include these modules, so only probe live searches.
  if (!showcase) {
    try {
      sendEvent("progress", { checking: "Username social footprint", completed, total: total + 2, percent: Math.min(97, Math.round(((completed + 1) / (total + 2)) * 100)) });
      const knownUsernames = [
        ...summary.usernames.map((u) => u.value),
        ...emailModules.filter((m) => m.profile?.username).map((m) => m.profile.username),
      ];
      const cands = deriveCandidateUsernames(email, knownUsernames);
      if (cands.length > 0) {
        const socialResults = await checkUsernameSocials(cands);
        const socialModules = buildSocialUsernameModules(socialResults);
        for (const sm of socialModules) {
          emitEmailModule(sm);
        }
      }
    } catch (e) { console.warn("SSE username social failed", e.message); }
  }

  // ——— Phase: WhatsApp via phones ———
  try {
    if (summary.phoneNumbers.length > 0) {
      const waMods = buildWhatsAppModules(summary.phoneNumbers);
      for (const w of waMods) emitEmailModule(w);
    }
  } catch {}

  const finalReport = {
    query: { kind: "email", value: email },
    subjects: { email, domain },
    status: emailModules.length > 0 ? "found" : "not_found",
    summary,
    emailModules,
    domainModules,
    meta: {
      durationMs: Date.now() - startTime,
      access: "full",
    },
  };

  saveToHistory(finalReport);
  if (!clientClosed && !res.writableEnded) {
    sendEvent("done", finalReport);
    try { res.end(); } catch {}
  }
});

// 2. Public REST API v1 (POST /api/v1/search)
app.post("/api/v1/search", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({
      error: {
        message: "Invalid email address",
        cause: "Provide a valid email in the request body: { \"email\": \"user@example.com\" }",
      },
    });
  }

  try {
    const report = await runFullEnrichment(email);
    return res.json({
      data: {
        status: report.status,
        meta: report.meta,
        profile: {
          email: report.subjects.email,
          domain: report.subjects.domain,
          summary: report.summary,
          emailModules: report.emailModules,
          domainModules: report.domainModules,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { message: "Internal search error", cause: err.message },
    });
  }
});

// 3. Bulk Search API (POST /api/bulk-search) — Paid Business Plan Feature Unlocked Free
app.post("/api/bulk-search", async (req, res) => {
  const rawEmails = Array.isArray(req.body?.emails) ? req.body.emails : [];
  const emails = [
    ...new Set(
      rawEmails
        .map((e) => String(e || "").trim().toLowerCase())
        .filter((e) => e.includes("@") && e.length <= 255)
    ),
  ].slice(0, 50);

  if (emails.length === 0) {
    return res.status(400).json({ error: "Provide at least one valid email address" });
  }

  const startTime = Date.now();
  const batchSize = 4;
  const results = [];

  for (let i = 0; i < emails.length; i += batchSize) {
    const chunk = emails.slice(i, i + batchSize);
    const settled = await Promise.all(chunk.map((e) => runFullEnrichment(e)));
    results.push(...settled);
  }

  const bulkJob = {
    id: `bulk_${Date.now()}`,
    createdAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    totalCount: results.length,
    foundCount: results.filter((r) => r.status === "found").length,
    results,
  };

  const jobs = readJson(BULK_FILE);
  jobs.unshift(bulkJob);
  writeJson(BULK_FILE, jobs.slice(0, 30));

  return res.json(bulkJob);
});

// 4. Saved History & Bulk Jobs Endpoints
app.get("/api/history", (req, res) => {
  res.json({
    searches: readJson(HISTORY_FILE),
    bulkJobs: readJson(BULK_FILE),
  });
});

app.delete("/api/history", (req, res) => {
  writeJson(HISTORY_FILE, []);
  res.json({ ok: true });
});

// 5. Image Proxy (/api/image-proxy)
app.get("/api/image-proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== "string") {
    return res.status(400).send("Missing url");
  }
  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return res.status(response.status).send("Upstream image error");
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch {
    res.status(502).send("Failed to proxy image");
  }
});

// Lightweight deployment diagnostic that does not call any external services.
app.get("/api/health", (req, res) => {
  res.json({ ok: true, runtime: IS_SERVERLESS ? "serverless" : "node" });
});

// Keep API failures machine-readable so the frontend never receives Express HTML.
app.use("/api", (err, req, res, next) => {
  console.error("API request failed:", err);
  if (res.headersSent) return res.end();
  return res.status(500).json({
    error: {
      message: "Internal server error",
      cause: process.env.NODE_ENV === "production" ? undefined : err.message,
    },
  });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Vercel imports the Express app as a function. A real listener is only needed
// when this file is launched directly for local/self-hosted use.
if (!IS_SERVERLESS && require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Behind the Email (Free Enterprise Edition) listening on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
