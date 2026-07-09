#!/usr/bin/env node

import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readPost, writePost, slugFromPath } from "./frontmatter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "..", "content");
const PUBLISHED_DIR = join(CONTENT_DIR, "published");

function usage() {
  console.log(`
Usage:
  node scripts/publish-medium.js --post <path> [--dry-run]

Options:
  --post <path>   Path to the ready post (content/ready/{slug}/post.md)
  --dry-run       Show what would happen without making changes
  --help          Show this help

Examples:
  node scripts/publish-medium.js --post content/ready/my-topic/post.md
  node scripts/publish-medium.js --post content/ready/my-topic/post.md --dry-run
`);
}

async function main() {
  const args = parseArgs({
    options: {
      post: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (args.values.help || !args.values.post) {
    usage();
    process.exit(args.values.help ? 0 : 1);
  }

  const postPath = args.values.post;
  const dryRun = args.values["dry-run"];
  const slug = slugFromPath(postPath);

  console.log(`\nPreparing to publish: ${postPath}\n`);

  const content = await readFile(postPath, "utf-8");

  const readyDir = dirname(postPath);
  const mediumFile = join(readyDir, "medium.md");
  let mediumContent;
  try {
    mediumContent = await readFile(mediumFile, "utf-8");
  } catch {
    mediumContent = content;
  }

  const publishedFile = join(PUBLISHED_DIR, `${slug}.md`);
  const canonicalUrl = `https://gemflow.com/posts/${slug}`;

  if (dryRun) {
    console.log("[Dry Run] Would perform the following:");
    console.log(`  1. Copy post to: ${publishedFile}`);
    console.log(`  2. Generate Medium-ready export`);
    console.log(`  3. Update front matter with canonical URL: ${canonicalUrl}`);
    console.log(`  4. Remove from content/ready/`);
    process.exit(0);
  }

  await mkdir(PUBLISHED_DIR, { recursive: true });

  const publishedContent = content.replace(
    /^---\n([\s\S]*?)---\n/,
    (match, fm) => {
      const lines = fm.split("\n");
      const updated = lines.map((line) => {
        if (line.startsWith("status:")) return "status: published";
        if (line.startsWith("canonical_url:"))
          return `canonical_url: ${canonicalUrl}`;
        return line;
      });
      if (!updated.some((l) => l.startsWith("canonical_url:"))) {
        updated.push(`canonical_url: ${canonicalUrl}`);
      }
      return `---\n${updated.join("\n")}\n---\n`;
    },
  );
  publishedContent.replace(/status: ready/, "status: published");

  await writeFile(publishedFile, publishedContent);
  console.log(`Published to: ${publishedFile}`);

  const mediumDir = join(CONTENT_DIR, "ready", slug);
  try {
    await rename(mediumDir, join(CONTENT_DIR, "published", `_medium-${slug}`));
    console.log(`Medium assets moved to: content/published/_medium-${slug}/`);
  } catch {
    console.log("Note: Could not move medium assets folder.");
  }

  console.log("\nPublishing complete.");
  console.log(`Canonical URL: ${canonicalUrl}`);
  console.log("\nNext steps:");
  console.log("  1. Copy the post to Medium manually");
  console.log("  2. Set canonical URL in Medium settings");
  console.log("  3. Save the Medium URL back into the post front matter");
}

main().catch((err) => {
  console.error("Publish error:", err);
  process.exit(1);
});
