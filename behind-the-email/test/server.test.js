const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "behind-the-email-test-"));
process.env.VERCEL = "1";
process.env.DATA_DIR = dataDir;

const app = require("../server");
let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("exports the Express app and initializes writable serverless storage", () => {
  assert.equal(typeof app, "function");
  assert.equal(typeof app.handle, "function");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dataDir, "history.json"), "utf8")), []);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dataDir, "bulk_jobs.json"), "utf8")), []);
});

test("health and history APIs return JSON in serverless mode", async () => {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.match(healthResponse.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await healthResponse.json(), { ok: true, runtime: "serverless" });

  const historyResponse = await fetch(`${baseUrl}/api/history`);
  assert.equal(historyResponse.status, 200);
  assert.deepEqual(await historyResponse.json(), { searches: [], bulkJobs: [] });
});

test("invalid searches fail with a JSON response", async () => {
  const response = await fetch(`${baseUrl}/api/search/stream?email=invalid`);
  assert.equal(response.status, 400);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await response.json(), { error: "Please enter a valid email address" });
});
