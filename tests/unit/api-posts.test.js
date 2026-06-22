import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

describe("api/posts.js (against real project content)", () => {
  let listPosts, getPost;

  before(async () => {
    const mod = await import("../../api/posts.js");
    listPosts = mod.listPosts;
    getPost = mod.getPost;
  });

  it("lists posts from content directories", async () => {
    const posts = await listPosts();
    assert.ok(Array.isArray(posts));
    assert.ok(posts.length >= 3, `Expected >= 3 posts, got ${posts.length}`);
  });

  it("returns posts with required fields", async () => {
    const posts = await listPosts();
    for (const p of posts) {
      assert.ok(p.slug, `Post missing slug`);
      assert.ok(p.title, `Post ${p.slug} missing title`);
      assert.ok(p.status, `Post ${p.slug} missing status`);
      assert.ok(p.path, `Post ${p.slug} missing path`);
    }
  });

  it("finds the sample idea post", async () => {
    const posts = await listPosts();
    const idea = posts.find((p) => p.slug === "local-first-ai-writing");
    assert.ok(idea, "Could not find local-first-ai-writing post");
    assert.equal(idea.status, "idea");
    assert.ok(idea.tags.length > 0);
  });

  it("finds the sample draft post", async () => {
    const posts = await listPosts();
    const draft = posts.find((p) => p.slug === "start-here-building-a-markdown-first-blog.draft");
    assert.ok(draft, "Could not find start-here draft");
    assert.equal(draft.status, "drafted");
  });

  it("finds the published post", async () => {
    const posts = await listPosts();
    const published = posts.find((p) => p.slug === "medium-publishing-notes");
    assert.ok(published, "Could not find medium-publishing-notes");
    assert.equal(published.status, "published");
  });

  it("sorts posts by status order", async () => {
    const posts = await listPosts();
    const statusOrder = [
      "idea", "researched", "outlined", "drafted",
      "reviewed", "checked", "approved", "metadata",
      "ready", "published",
    ];
    const statuses = posts.map((p) => p.status);
    const ideaIdx = statuses.indexOf("idea");
    const draftedIdx = statuses.indexOf("drafted");
    const publishedIdx = statuses.indexOf("published");
    assert.ok(ideaIdx >= 0, "No idea posts");
    assert.ok(publishedIdx >= 0, "No published posts");
    assert.ok(ideaIdx < publishedIdx, "idea should come before published");
    if (draftedIdx >= 0) {
      assert.ok(ideaIdx < draftedIdx, "idea should come before draft");
      assert.ok(draftedIdx < publishedIdx, "draft should come before published");
    }
  });

  it("getPost returns post by slug", async () => {
    const post = await getPost("local-first-ai-writing");
    assert.ok(post);
    assert.equal(post.title, "Why Local-First AI Writing Wins");
    assert.equal(post.status, "idea");
  });

  it("getPost returns null for unknown slug", async () => {
    const post = await getPost("nonexistent-slug");
    assert.equal(post, null);
  });

  it("all posts have valid status values", async () => {
    const posts = await listPosts();
    const validStatuses = [
      "idea", "researched", "outlined", "drafted",
      "reviewed", "checked", "approved", "metadata",
      "ready", "published",
    ];
    for (const p of posts) {
      assert.ok(validStatuses.includes(p.status), `Invalid status "${p.status}" on post ${p.slug}`);
    }
  });
});
