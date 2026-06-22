#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const REQUIRED_DIRS = [
  "agents", "content/ideas", "content/research", "content/outlines",
  "content/drafts", "content/reviewed", "content/ready", "content/published",
  "providers", "requirements", "scripts",
];

const REQUIRED_AGENTS = [
  "router-agent.md", "research-agent.md", "outline-agent.md",
  "draft-agent.md", "editor-agent.md", "checker-agent.md",
  "final-reviewer-agent.md", "metadata-agent.md", "publisher-agent.md",
];

const REQUIRED_FILES = [
  "package.json", "README.md", "index.html",
  "requirements/blog-checklist.md",
  "requirements/medium-checklist.md",
  "requirements/style-guide.md",
  "scripts/run-workflow.js", "scripts/serve.js", "scripts/lint.js",
  "providers/index.js", "providers/gemini.js", "providers/groq.js",
  "providers/qwen.js", "providers/ollama.js",
];

let errors = 0;

async function check() {
  console.log("Checking project structure...\n");

  for (const dir of REQUIRED_DIRS) {
    try {
      await stat(join(ROOT, dir));
    } catch {
      console.error(`  MISSING DIR: ${dir}`);
      errors++;
    }
  }

  for (const file of REQUIRED_FILES) {
    try {
      await stat(join(ROOT, file));
    } catch {
      console.error(`  MISSING FILE: ${file}`);
      errors++;
    }
  }

  for (const agent of REQUIRED_AGENTS) {
    try {
      const content = await readFile(join(ROOT, "agents", agent), "utf-8");
      if (!content.startsWith("# ")) {
        console.error(`  AGENT MISSING HEADER: ${agent}`);
        errors++;
      }
    } catch {
      console.error(`  MISSING AGENT: ${agent}`);
      errors++;
    }
  }

  try {
    const content = await readFile(join(ROOT, "package.json"), "utf-8");
    const pkg = JSON.parse(content);
    const requiredScripts = ["start", "workflow", "lint", "check"];
    for (const s of requiredScripts) {
      if (!pkg.scripts?.[s]) {
        console.error(`  MISSING SCRIPT: ${s} in package.json`);
        errors++;
      }
    }
  } catch {
    console.error("  INVALID package.json");
    errors++;
  }

  console.log(`\n${errors === 0 ? "All checks passed." : `${errors} issue(s) found.`}`);
  process.exit(errors > 0 ? 1 : 0);
}

check().catch((err) => {
  console.error("Lint error:", err);
  process.exit(1);
});
