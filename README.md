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

## Kuzana Growth MVP

The dashboard also includes a `Growth` section for the Kuzana x MiniHack bounty direction:

```
business profile → business knowledge → trend signal → campaign brief → storyboard → CTA/payment prompt
```

Demo flow:

1. Open `http://localhost:3030/#growth`.
2. Use the included `Nairobi Tax Clinic` sample business or create a new one.
3. Add business knowledge such as founder voice, offers, customer FAQs, or pasted notes.
4. Paste a social/news trend manually, or fetch candidate signals from GDELT, Reddit, YouTube, or an RSS feed.
5. Generate a campaign brief with a script, storyboard, image prompts, CTA, and optional payment details.

The first MVP intentionally keeps TikTok, Instagram, and X as manual paste inputs because their automated APIs are access- and pricing-constrained. RSS, GDELT, Reddit, and YouTube are the first automated monitoring paths.

Growth files are stored as Markdown:

```
content/businesses/    # Business profiles
content/knowledge/     # Manual docs and notes for grounding content
content/trends/        # Captured trend signals
content/briefs/        # Generated content briefs and scripts
content/storyboards/   # Remotion-ready scene plans
content/video-specs/   # JSON scene specs for future Remotion rendering
content/campaigns/     # CTA, payment prompt, and metrics tracking
content/lead-searches/ # Lead discovery searches
content/leads/         # Lead CRM records
content/outreach/      # Personalized cold email drafts
```

Optional source keys:

- `YOUTUBE_API_KEY` — enables YouTube signal search

Avalanche is represented in the MVP as a payment request field on campaign generation. Add an Avalanche C-Chain address or payment reference to produce a campaign payment prompt; wallet verification can be added later.

### Lead Generator

The Growth section includes a lead generator:

```
business type + city + your offer
→ lead records
→ inferred customer pain points
→ personalized outreach draft
→ simple CRM status
```

The current implementation works without paid APIs by using a deterministic fallback provider. It does not claim fake verified contacts. Add one of these providers later for live Google Maps/review/contact enrichment:

- `SERPAPI_KEY`
- `OUTSCRAPER_API_KEY`
- `APIFY_TOKEN`
- `APIFY_GOOGLE_MAPS_ACTOR_ID` or `APIFY_ACTOR_ID`

Provider order is SerpAPI first, then Apify, then demo fallback. For Apify, set the actor id for the Google Maps scraper actor you want to use; actor input formats vary, so this MVP sends a common Google Maps search payload.

## API Keys

Copy `.env.example` to `.env` and add keys for the providers you use:

- `GEMINI_API_KEY` — research, editing, final review
- `GROQ_API_KEY` — routing, checks, metadata
- `QWEN_API_KEY` — outlines, drafting, technical posts
- `OLLAMA_BASE_URL` — local private drafts (default: http://localhost:11434)
- `OLLAMA_API_KEY` — optional, only for hosted Ollama-compatible endpoints

## Publishing

Post on your own blog website first, then syndicate to Medium. The `content/ready/` folder contains the Medium-ready package for manual copy-paste. Automated Medium API publishing can be added later.
