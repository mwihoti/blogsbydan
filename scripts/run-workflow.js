#!/usr/bin/env node

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadEnvFile } from "node:process";
import { readPost, writePost, slugFromPath } from "./frontmatter.js";
import { loadAgentInstruction } from "./load-agent.js";
import { callProvider, AGENT_PROVIDER_MAP } from "../providers/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "..", "content");

try {
  loadEnvFile(join(__dirname, "..", ".env"));
} catch {
  // .env is optional; shell-provided environment variables still work.
}

const STATUS_ORDER = [
  "idea", "researched", "outlined", "drafted",
  "reviewed", "checked", "approved", "metadata", "ready",
];

const AGENT_BY_STATUS = {
  idea: "research",
  researched: "outline",
  outlined: "draft",
  drafted: "editor",
  reviewed: "checker",
  checked: "final-reviewer",
  approved: "metadata",
  metadata: "publisher",
};

const NEXT_STATUS = {
  idea: "researched",
  researched: "outlined",
  outlined: "drafted",
  drafted: "reviewed",
  reviewed: "checked",
  checked: "approved",
  approved: "metadata",
  metadata: "ready",
};

function usage() {
  console.log(`
Usage:
  node scripts/run-workflow.js --post <path> [--step <agent>] [--check] [--help]

Options:
  --post <path>     Path to the post file (in ideas/, drafts/, reviewed/, etc.)
  --step <agent>    Run a specific agent (research, outline, draft, editor, checker, final-reviewer, metadata, publisher)
  --check           Show current status without running agents
  --help            Show this help
  --dry-run         Show what would happen without calling any API

Examples:
  node scripts/run-workflow.js --post content/ideas/my-topic.md
  node scripts/run-workflow.js --post content/drafts/my-topic.draft.md --step editor
  node scripts/run-workflow.js --post content/ideas/my-topic.md --check
`);
}

async function fileExists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

function wordCount(value = "") {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function buildClarifyingQuestions(post, slug) {
  const title = post.data.title || slug;
  const summary = post.data.summary || "";
  const targetReader = post.data.target_reader || "";
  const style = post.data.writing_style || "";
  const body = post.body || "";
  const combinedWords = wordCount(`${summary}\n${body}`);
  const hasUsefulBody = wordCount(body) >= 50;

  const missing = [];
  if ((!summary || wordCount(summary) < 6) && !hasUsefulBody) {
    missing.push("a clearer one-sentence summary");
  }
  if (!targetReader || wordCount(targetReader) < 2) missing.push("the target reader");
  if (!style) missing.push("the writing style");
  if (combinedWords < 30) missing.push("more context about the idea");

  if (missing.length === 0) return null;

  return `# More Information Needed: ${title}

The idea is saved, but there is not enough context to run useful research yet.

## Missing Context

${missing.map((item) => `- ${item}`).join("\n")}

## Questions To Answer

1. Who is this post for?
2. What is the main point you want the reader to understand?
3. Is this post about a product, community, personal story, tutorial, or analysis?
4. What should the article include or avoid?
5. Should the tone be personal, educational, technical, promotional, or analytical?
6. Are there specific sources, competitors, examples, or keywords to research?

## Current Inputs

- Title: ${title}
- Summary: ${summary || "Not provided"}
- Target reader: ${targetReader || "Not provided"}
- Writing style: ${style || "Not provided"}

Add those answers to the post body, then run the research step again.
`;
}

async function runAgent(agentName, post, slug) {
  const instruction = await loadAgentInstruction(agentName);
  const providerConfig = AGENT_PROVIDER_MAP[agentName];
  const providerName = providerConfig?.provider || "unknown";

  const articleContent = post.body || post.content || "";
  let extraContext = "";

  if (agentName === "research") {
    const questionsPath = join(CONTENT_DIR, "research", `${slug}.questions.md`);
    if (await fileExists(questionsPath)) {
      extraContext = await readFile(questionsPath, "utf-8");
    }
  }

  const prompt = `Current post: ${post.filePath}

Title: ${post.data.title || slug}
Status: ${post.data.status}

Article:
${articleContent}

${extraContext ? `Additional answers and clarification:\n${extraContext}\n\n` : ""}Follow your agent instructions carefully.`;

  console.log(`\n[${agentName}] Running ${agentName} via ${providerName}...`);

  const output = await callProvider(agentName, prompt, instruction);

  return output;
}

async function getOutputPath(agentName, slug) {
  const paths = {
    research: join(CONTENT_DIR, "research", `${slug}.research.md`),
    outline: join(CONTENT_DIR, "outlines", `${slug}.outline.md`),
    draft: join(CONTENT_DIR, "drafts", `${slug}.draft.md`),
    editor: join(CONTENT_DIR, "reviewed", `${slug}.reviewed.md`),
    checker: join(CONTENT_DIR, "reviewed", `${slug}.check.md`),
    "final-reviewer": join(CONTENT_DIR, "reviewed", `${slug}.final-review.md`),
    metadata: join(CONTENT_DIR, "ready", slug, "metadata.md"),
    publisher: join(CONTENT_DIR, "ready", slug, "post.md"),
  };
  return paths[agentName] || join(CONTENT_DIR, "ready", slug, `${agentName}-output.md`);
}

async function updatePostStatus(post, newStatus) {
  post.data.status = newStatus;
  const fm = ["---"];
  for (const [key, val] of Object.entries(post.data)) {
    if (Array.isArray(val)) {
      fm.push(`${key}: ${JSON.stringify(val)}`);
    } else {
      fm.push(`${key}: ${val}`);
    }
  }
  fm.push("---");
  const output = fm.join("\n") + "\n\n" + post.body;
  await writeFile(post.filePath, output);
}

async function main() {
  const args = parseArgs({
    options: {
      post: { type: "string" },
      step: { type: "string", default: "" },
      check: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
  });

  if (args.values.help || !args.values.post) {
    usage();
    process.exit(args.values.help ? 0 : 1);
  }

  const postPath = args.values.post;
  const dryRun = args.values["dry-run"];

  if (!await fileExists(postPath)) {
    console.error(`File not found: ${postPath}`);
    process.exit(1);
  }

  const post = await readPost(postPath);
  const slug = slugFromPath(postPath);
  const currentStatus = post.data.status || "idea";
  console.log(`\nPost: ${post.data.title || slug}`);
  console.log(`Current status: ${currentStatus}`);

  if (args.values.check) {
    const idx = STATUS_ORDER.indexOf(currentStatus);
    if (idx === -1) {
      console.log(`Status "${currentStatus}" not in workflow.`);
      process.exit(0);
    }
    const nextAgent = AGENT_BY_STATUS[currentStatus];
    const outputPath = nextAgent ? await getOutputPath(nextAgent, slug) : "N/A";
    console.log(`Next step: ${nextAgent || "None (ready for publishing)"}`);
    if (nextAgent) console.log(`Output will be written to: ${outputPath}`);
    process.exit(0);
  }

  let agentName = args.values.step;
  if (!agentName) {
    agentName = AGENT_BY_STATUS[currentStatus];
    if (!agentName) {
      if (currentStatus === "ready") {
        console.log("Post is ready for publishing. Run `node scripts/publish-medium.js` to publish.");
      } else if (currentStatus === "published") {
        console.log("Post is already published.");
      } else {
        console.log(`No agent mapped for status "${currentStatus}".`);
      }
      process.exit(0);
    }
  }

  const nextStatus = NEXT_STATUS[currentStatus] || currentStatus;
  const outputPath = await getOutputPath(agentName, slug);

  console.log(`Running agent: ${agentName}`);
  console.log(`Target output: ${outputPath}`);

  if (dryRun) {
    console.log("\n[Dry Run] No API calls were made.");
    process.exit(0);
  }

  await mkdir(dirname(outputPath), { recursive: true });

  if (agentName === "research") {
    const clarification = buildClarifyingQuestions(post, slug);
    if (clarification) {
      const questionsPath = join(CONTENT_DIR, "research", `${slug}.questions.md`);
      await writeFile(questionsPath, clarification);
      console.log("\nMore information is needed before research can run.");
      console.log(`Questions written to: ${questionsPath}`);
      console.log("\nAnswer the questions in the original idea note, then run Idea → Researched again.");
      process.exit(0);
    }
  }

  const output = await runAgent(agentName, post, slug);
  await writeFile(outputPath, output);
  console.log(`\nOutput written to: ${outputPath}`);

  if (agentName !== "checker" && agentName !== "final-reviewer") {
    await updatePostStatus(post, nextStatus);
    console.log(`Status updated to: ${nextStatus}`);
  } else {
    console.log("Status not auto-updated (review step). Use --step to continue.");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Workflow error:", err);
  process.exit(1);
});
