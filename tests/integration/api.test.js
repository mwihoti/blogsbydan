import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

let baseUrl;
let cleanup;

function fetchJson(url, options = {}) {
  return fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  }).then(async (r) => ({ status: r.status, data: await r.json() }));
}

before(async () => {
  const { createApp } = await import("../../scripts/serve.js");
  const server = createApp();

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  cleanup = () => new Promise((resolve) => server.close(resolve));
});

after(async () => {
  if (cleanup) await cleanup();
});

describe("GET /api/posts", () => {
  it("returns all posts as an array", async () => {
    const { status, data } = await fetchJson(`${baseUrl}/api/posts`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.posts));
    assert.ok(data.posts.length >= 3);
  });

  it("includes posts with correct fields", async () => {
    const { data } = await fetchJson(`${baseUrl}/api/posts`);
    const first = data.posts[0];
    assert.ok(first.slug);
    assert.ok(first.title);
    assert.ok(first.status);
    assert.ok(first.path);
  });
});

describe("GET /api/posts/:slug", () => {
  it("returns a single post by slug", async () => {
    const { data } = await fetchJson(`${baseUrl}/api/posts`);
    const first = data.posts[0];
    if (!first) return;

    const { status, data: postData } = await fetchJson(`${baseUrl}/api/posts/${first.slug}`);
    assert.equal(status, 200);
    assert.equal(postData.post.slug, first.slug);
  });

  it("returns 404 for unknown slug", async () => {
    const { status, data } = await fetchJson(`${baseUrl}/api/posts/nonexistent-slug-xyz`);
    assert.equal(status, 404);
    assert.equal(data.error, "Not found");
  });
});

describe("GET /api/status", () => {
  it("returns counts and total", async () => {
    const { status, data } = await fetchJson(`${baseUrl}/api/status`);
    assert.equal(status, 200);
    assert.ok(typeof data.total === "number");
    assert.ok(data.total >= 3);
  });

  it("includes status counts", async () => {
    const { data } = await fetchJson(`${baseUrl}/api/status`);
    assert.ok(typeof data.counts === "object");
    assert.ok(Object.keys(data.counts).length >= 2);
  });
});

describe("POST /api/workflow/run", () => {
  it("rejects requests without post path", async () => {
    const { status, data } = await fetchJson(`${baseUrl}/api/workflow/run`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(status, 400);
    assert.equal(data.error, "Missing post path");
  });
});
