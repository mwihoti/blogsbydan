# Blogs by Dan Agent Architecture

This architecture turns the repo into a Markdown-first writing center that uses specialized agents for research, outlining, drafting, editing, checking, and publishing preparation.

Markdown files in this repo remain the source of truth. Obsidian is an optional writing interface, not a requirement. The browser dashboard can also create, edit, review, and prepare posts for publishing. Medium publishing can start manually and later become automated.

## Goals

- Keep all posts portable as Markdown.
- Use local models when privacy or cost matters.
- Use fast hosted models for repetitive checks.
- Use stronger hosted models for research, editing, and final review.
- Make every agent output auditable and easy to revise in Obsidian.
- Support both a local CLI and a web dashboard.
- Allow writing directly in the browser when Obsidian is not installed.
- Require human approval only before publishing.
- Use web search by default for research-backed posts.

## Provider Strategy

| Provider | Primary Use | Notes |
|---|---|---|
| Ollama | Local private drafts, offline work, local checks | Best for early thinking and sensitive drafts. |
| Groq | Fast routing, metadata, summaries, checklist validation | Best for speed and cheap repeated runs. |
| Gemini | Research, long-context editing, final review | Best for quality, large context, synthesis. |
| Qwen | Outlines, drafting, reasoning, technical posts | Use hosted Qwen or local Qwen through Ollama. |

All four providers are assumed to be available through API keys or local setup.

## Recommended Models

| Agent | Preferred Model | Fallback |
|---|---|---|
| Router Agent | Groq fast model | Ollama Qwen |
| Research Agent | Gemini Pro / Gemini Flash | Qwen hosted |
| Outline Agent | Qwen | Gemini Flash |
| Draft Agent | Qwen hosted or Ollama Qwen | Gemini Flash |
| Editor Agent | Gemini Pro / Gemini Flash | Qwen |
| Requirements Checker | Groq fast model | Qwen |
| Final Reviewer | Gemini Pro | Gemini Flash |
| Metadata Agent | Groq fast model | Qwen |
| Publisher Agent | Qwen or Gemini Flash | Groq |

## Folder Layout

```txt
content/
  ideas/
  research/
  outlines/
  drafts/
  reviewed/
  ready/
  published/
  posts/
agents/
  router-agent.md
  research-agent.md
  outline-agent.md
  draft-agent.md
  editor-agent.md
  checker-agent.md
  final-reviewer-agent.md
  metadata-agent.md
  publisher-agent.md
requirements/
  blog-checklist.md
  medium-checklist.md
  style-guide.md
docs/
  architecture.md
  workflows.md
```

The existing `content/posts/` folder can keep final public-facing posts. The workflow folders keep intermediate agent outputs organized.

## Post Front Matter

Each post should keep consistent metadata:

```yaml
---
title:
subtitle:
date:
status: idea
tags:
summary:
target_reader:
thesis:
medium_url:
canonical_url:
source_files:
---
```

Recommended status values:

```txt
idea -> researched -> outlined -> drafted -> reviewed -> ready -> published
```

## Agent Responsibilities

### Router Agent

Decides what should happen next.

Input:
- User request
- Current file path
- Current post status

Output:
- Next agent to run
- Required input files
- Reason for routing

Rules:
- Do not write the article.
- Do not modify research or drafts.
- Keep output short.

### Research Agent

Collects and summarizes source material.

Input:
- Topic
- Target reader
- Research questions
- Optional angle

Output file:

```txt
content/research/{slug}.research.md
```

Output sections:
- Summary
- Key facts
- Useful examples
- Source list
- Contradictions or uncertainty
- Open questions

Rules:
- Separate facts from opinion.
- Mark weak claims.
- Include source links when web research is used.

### Outline Agent

Turns research into a structure.

Input:
- Idea note
- Research note
- Target reader
- Desired length

Output file:

```txt
content/outlines/{slug}.outline.md
```

Output sections:
- Working title options
- Thesis
- Reader promise
- Section outline
- Claims that need evidence

Rules:
- Keep the argument focused.
- Flag missing research instead of inventing facts.

### Draft Agent

Writes the first full Markdown draft.

Input:
- Outline
- Research note
- Style guide

Output file:

```txt
content/drafts/{slug}.draft.md
```

Rules:
- Use Markdown headings.
- Preserve source references.
- Mark unresolved items as `TODO:`.
- Do not publish or move files to ready status.

### Editor Agent

Improves clarity, flow, and style.

Input:
- Draft
- Style guide
- Target reader

Output file:

```txt
content/reviewed/{slug}.reviewed.md
```

Rules:
- Preserve the core argument.
- Improve structure where needed.
- Do not add unsupported claims.

### Requirements Checker

Checks whether the draft meets requirements.

Input:
- Reviewed draft
- `requirements/blog-checklist.md`
- `requirements/medium-checklist.md`

Output file:

```txt
content/reviewed/{slug}.check.md
```

Output sections:
- Verdict: Pass or Fail
- Failed requirements
- Suggested fixes
- Medium readiness

Rules:
- Be strict.
- Do not rewrite the article.
- Reference exact sections that need work.

### Final Reviewer

Performs the last quality pass before publishing.

Input:
- Reviewed draft
- Requirement check
- Research note

Output:
- Approval or final issues
- Risk notes
- Suggested title/subtitle if needed

Rules:
- Use stronger model.
- Focus on correctness, clarity, and publishability.

### Metadata Agent

Creates publishing metadata.

Input:
- Final draft

Output:
- Title
- Subtitle
- Excerpt
- Tags
- SEO description
- Medium topics
- Social post snippets

### Publisher Agent

Prepares the final publishing package.

Input:
- Final draft
- Metadata
- Medium checklist

Output folder:

```txt
content/ready/{slug}/
  post.md
  metadata.md
  checklist.md
```

Rules:
- Manual Medium publishing first.
- API publishing can be added later.
- After publishing, save `medium_url` back into front matter.

## System Flow

```txt
User idea
  -> Router Agent
  -> Research Agent
  -> Outline Agent
  -> Draft Agent
  -> Editor Agent
  -> Requirements Checker
  -> Final Reviewer
  -> Metadata Agent
  -> Publisher Agent
  -> Medium-ready package
```

## Data Flow

```txt
content/ideas/topic.md
  -> content/research/topic.research.md
  -> content/outlines/topic.outline.md
  -> content/drafts/topic.draft.md
  -> content/reviewed/topic.reviewed.md
  -> content/reviewed/topic.check.md
  -> content/ready/topic/post.md
  -> content/published/topic.md
```

## Human Approval Points

Human approval is required only before publishing.

The system can move automatically through research, outline, draft, edit, check, final review, and packaging. It must stop before any external publishing action.

Optional review checkpoints can still be enabled later for sensitive, technical, legal, financial, medical, or reputation-sensitive posts.

## Automation Phases

### Phase 1: Manual Agent Prompts

- Store agent instructions as Markdown files.
- Run agents manually from your AI tool.
- Save outputs into the folder structure.

### Phase 2: Local CLI Orchestrator

- Add a script such as `scripts/run-workflow.js`.
- Read a topic file.
- Call provider APIs.
- Save each agent output.
- Require confirmation before moving to `ready`.

The CLI is best for repeatable workflows, automation, cron jobs, and Obsidian-triggered commands.

### Phase 3: Obsidian Integration

- Add Obsidian templates for ideas, research, drafts, and final posts.
- Add commands or scripts that can be launched from Obsidian.
- Use front matter status to decide the next workflow step.

### Phase 4: Web Dashboard

- Show all posts by status.
- Create a new blog idea or draft from the browser.
- Edit Markdown directly in the browser.
- Save browser edits back to repo Markdown files.
- Start agent workflows from a button.
- Display current step, output files, and failed requirements.
- Edit metadata before publishing.
- Approve or reject publishing packages.

The dashboard is best for visibility, writing without Obsidian, review, status tracking, and publishing control.

Recommended browser editor features:

```txt
New post
Markdown editor
Front matter editor
Preview mode
Autosave or explicit save
Run next agent step
Show requirement failures
Prepare website post
Prepare Medium post
Approve publishing
```

Browser-created posts should use the same file format as Obsidian-created posts, so either interface can edit the same content.

### Phase 5: Publishing

- Generate a Medium-ready package.
- Start with manual copy/paste.
- Later add Medium API publishing if the API access and publishing rules fit your needs.

## Publishing Targets

Medium is a useful distribution channel, but the long-term source should be your own blog website.

Recommended publishing order:

```txt
1. Own blog website
2. Medium as syndication
3. Dev.to or Hashnode for technical posts
4. LinkedIn for professional excerpts
5. Newsletter later if you build an audience
```

### Own Blog Website

Best primary target. You control design, URLs, analytics, SEO, canonical links, and long-term ownership.

Good implementation options:

| Option | Best For |
|---|---|
| Next.js | Full custom blog, dashboard, API routes, future login/admin features |
| Astro | Fast content-heavy blog with Markdown/MDX |
| Hugo | Very fast static blog with simple hosting |
| Eleventy | Lightweight static Markdown site |

Recommended choice for this repo: Next.js if you want the dashboard and automation in one app. Astro if you want the simplest high-quality writing site.

### Medium

Best as a syndication target. Publish the canonical version on your site first, then repost to Medium with a canonical URL.

### Dev.to

Good for software, AI, and developer articles. Less useful for personal essays or broad business writing.

### Hashnode

Good for developer blogging with custom domain support.

### LinkedIn

Good for shorter professional summaries that link back to the full article.

### Newsletter

Useful later when you have a consistent audience. Do not make it the first publishing system unless email growth is the main goal.

## Writing Styles

The style guide should support multiple modes. Each post can set `writing_style` in front matter.

| Style | Best For | Notes |
|---|---|---|
| Personal essay | Lessons, opinions, reflections | First-person, honest, story-driven. |
| Technical tutorial | How-to posts, coding, tools | Step-by-step, precise, reproducible. |
| Explainer | Concepts, trends, architecture | Clear examples, simple language, structured sections. |
| Analytical | Comparing tools, market/tech analysis | Evidence-heavy, balanced, shows tradeoffs. |
| Journalistic | News-style posts and interviews | Neutral tone, facts first, attribution. |
| Founder/build-in-public | Product updates, experiments | Direct, practical, transparent. |
| Opinion/editorial | Strong point of view | Clear thesis, persuasive argument, acknowledges counterpoints. |
| Case study | Project breakdowns | Context, constraints, decisions, results, lessons. |

Writing style is selected per post. The system should not force one permanent default.

```txt
Allowed styles:
- Personal essay
- Technical tutorial
- Explainer
- Analytical
- Journalistic
- Founder/build-in-public
- Opinion/editorial
- Case study
- Educational + personal + practical
```

Recommended front matter:

```yaml
writing_style: educational + personal + practical
```

The Router Agent can choose a style when the field is empty, but the user can override it per post.

## Image Generation

Image generation should be optional and should not block publishing.

Recommended options:

| Tool | Best For | Notes |
|---|---|---|
| Gemini image generation | Blog covers, conceptual images, edits when already using Gemini | Good fit because Gemini is already part of the stack. |
| Qwen-Image | Text-heavy visuals, multilingual typography, posters, infographics, image editing | Use if available through Alibaba Cloud, ModelScope, Hugging Face, Replicate, or local deployment. |
| OpenAI image generation | High-quality illustrations, precise prompt following, image edits | Useful if you add OpenAI later. |
| Stability AI / Stable Diffusion | Stylized visuals, local or semi-local creative control | Good when you want more control over style. |
| Replicate | Access to many open image models through one API | Good for experimentation. |
| Canva / Figma | Manual design polish, templates, thumbnails | Good for final human design pass. |

Recommended first setup:

```txt
Primary: Gemini image generation
Alternative: Qwen-Image when available
Secondary: Canva or Figma for final cover polish
Later: Stable Diffusion or Replicate for custom styles
```

Qwen can be used for image generation if the selected environment exposes Qwen-Image or Qwen-Image-Edit. It is especially relevant for covers that need reliable text, poster layouts, multilingual text, or infographic-style composition. Gemini remains the safer first default because it is already planned as a core hosted provider for research and review.

Suggested image workflow:

```txt
1. Metadata Agent proposes image brief.
2. Image Agent generates 3 cover prompts.
3. Human picks one prompt.
4. Image model generates image.
5. Human approves or edits in Canva/Figma.
6. Final image path is saved in front matter.
```

Recommended image front matter:

```yaml
cover_image:
cover_prompt:
cover_alt:
image_credit:
```

## Open Questions

Confirmed decisions:

- Run as both local CLI and web dashboard.
- API keys are available for Gemini, Groq, and Qwen.
- Publishing is the only required human approval point.
- Research uses web search by default.
- Build an owned blog website and treat Medium as a syndication channel.

Remaining decisions:

1. Should the blog website be Next.js or Astro?
2. Should the Router Agent auto-select writing style when `writing_style` is empty?
3. Should image generation use Gemini first, Qwen first, or choose per image type?
4. Should generated images require approval before being saved to a post?
