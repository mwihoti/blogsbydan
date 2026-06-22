import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let frontmatter;
let tmpDir;

before(async () => {
  frontmatter = await import("../../scripts/frontmatter.js");
  tmpDir = await mkdtemp(join(tmpdir(), "bbd-test-"));
});

after(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

describe("parseFrontMatter", () => {
  it("parses basic front matter", () => {
    const content = `---
title: My Post
date: 2026-06-15
status: idea
---

Body text here.`;
    const { data, body } = frontmatter.parseFrontMatter(content);
    assert.equal(data.title, "My Post");
    assert.equal(data.date, "2026-06-15");
    assert.equal(data.status, "idea");
    assert.equal(body.trim(), "Body text here.");
  });

  it("parses array tags", () => {
    const content = `---
title: Test
tags:
  - Writing
  - AI
---

Body.`;
    const { data } = frontmatter.parseFrontMatter(content);
    assert.deepEqual(data.tags, ["Writing", "AI"]);
  });

  it("returns empty data for content without front matter", () => {
    const { data, body } = frontmatter.parseFrontMatter("Just body text.");
    assert.deepEqual(data, {});
    assert.equal(body, "Just body text.");
  });

  it("returns empty body for front matter only", () => {
    const content = `---
title: Only metadata
---`;
    const { data, body } = frontmatter.parseFrontMatter(content);
    assert.equal(data.title, "Only metadata");
    assert.equal(body, "");
  });

  it("handles empty values", () => {
    const content = `---
title:
status: draft
---

Body.`;
    const { data } = frontmatter.parseFrontMatter(content);
    assert.equal(data.title, undefined);
    assert.equal(data.status, "draft");
  });
});

describe("stringifyFrontMatter", () => {
  it("produces valid front matter", () => {
    const result = frontmatter.stringifyFrontMatter({
      title: "My Post",
      date: "2026-06-15",
      status: "idea",
    });
    assert.match(result, /^---\n/);
    assert.match(result, /title: My Post/);
    assert.match(result, /date: 2026-06-15/);
    assert.match(result, /status: idea/);
    assert.match(result, /\n---$/);
  });

  it("serializes arrays", () => {
    const result = frontmatter.stringifyFrontMatter({
      tags: ["Writing", "AI"],
    });
    assert.match(result, /tags: \["Writing","AI"\]/);
  });
});

describe("readPost and writePost", () => {
  it("writes and reads a post", async () => {
    const filePath = join(tmpDir, "test-post.md");
    await frontmatter.writePost(filePath, { title: "Test", status: "idea" }, "Body.");

    const content = await readFile(filePath, "utf-8");
    assert.match(content, /---/);
    assert.match(content, /title: Test/);
    assert.match(content, /status: idea/);
    assert.match(content, /Body\./);

    const post = await frontmatter.readPost(filePath);
    assert.equal(post.data.title, "Test");
    assert.equal(post.data.status, "idea");
    assert.equal(post.body.trim(), "Body.");
    assert.equal(post.filePath, filePath);
  });

  it("preserves body with multiple lines", async () => {
    const filePath = join(tmpDir, "multiline-body.md");
    const body = "First line.\n\nSecond paragraph.\n\n- List item";
    await frontmatter.writePost(filePath, { title: "Multi" }, body);

    const post = await frontmatter.readPost(filePath);
    assert.equal(post.body.trim(), body);
  });
});

describe("slugFromPath", () => {
  it("extracts slug from simple path", () => {
    assert.equal(frontmatter.slugFromPath("content/ideas/my-post.md"), "my-post");
  });

  it("extracts slug from path with suffix", () => {
    assert.equal(
      frontmatter.slugFromPath("content/drafts/my-post.draft.md"),
      "my-post.draft",
    );
  });

  it("extracts slug without extension", () => {
    assert.equal(frontmatter.slugFromPath("my-post.md"), "my-post");
  });
});
