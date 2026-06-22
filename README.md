# Blogs by Dan

Markdown-first blog center with AI-powered writing workflow. Write in Obsidian, use AI agents for research/outline/draft/edit, and publish to your own blog and Medium.

## Quick Start

```bash
# 1. Start the dashboard
npm start

# 2. Open http://localhost:3030

# 3. Or run a specific workflow step
npm run workflow -- --post content/ideas/local-first-ai-writing.md
```

## Directory Structure

```
content/
  ideas/       # Raw ideas
  research/    # Research notes
  outlines/    # Article outlines
  drafts/      # First drafts
  reviewed/    # Reviewed and checked drafts
  ready/       # Publishing packages
  published/   # Published posts
  templates/   # Obsidian templates
agents/         # Agent instruction files
requirements/   # Quality checklists and style guide
providers/      # AI provider integrations (Gemini, Groq, Qwen, Ollama)
scripts/        # CLI tools
docs/           # Architecture and workflow docs
```

## Use With Obsidian

Open this folder as an Obsidian vault. Use templates from `content/templates/` to create new ideas and posts.

## Available Commands

| Command | Description |
|---|---|
| `npm start` | Launch web dashboard at localhost:3030 |
| `npm run workflow -- --post <path>` | Run next workflow step for a post |
| `npm run workflow -- --post <path> --step <agent>` | Run a specific agent |
| `npm run workflow -- --post <path> --check` | Check current status |
| `npm run workflow -- --post <path> --dry-run` | Preview without API calls |
| `npm run medium -- --post <path>` | Prepare a post for Medium publishing |
| `npm run lint` | Verify project structure |

## Workflow

```
idea → researched → outlined → drafted → reviewed → checked → approved → metadata → ready → published
```

Run `npm start` to open the dashboard, which shows all posts by status and lets you run workflow steps with one click.

## API Keys

Copy `.env.example` to `.env` and add keys for the providers you use:

- `GEMINI_API_KEY` — research, editing, final review
- `GROQ_API_KEY` — routing, checks, metadata
- `QWEN_API_KEY` — outlines, drafting, technical posts
- `OLLAMA_BASE_URL` — local private drafts (default: http://localhost:11434)
- `OLLAMA_API_KEY` — optional, only for hosted Ollama-compatible endpoints

## Publishing

Post on your own blog website first, then syndicate to Medium. The `content/ready/` folder contains the Medium-ready package for manual copy-paste. Automated Medium API publishing can be added later.
