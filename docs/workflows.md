# GemFlow Workflows

This document shows the practical workflows for the agent-based writing system.

## Workflow 1: New Blog Idea To Draft

```txt
1. Create idea note in Obsidian or the browser dashboard
2. Router decides next step
3. Research Agent creates research note
4. Outline Agent creates outline
5. Human approves outline
6. Draft Agent writes first draft
7. Draft is saved in content/drafts/
```

Input:

```txt
content/ideas/{slug}.md
```

Outputs:

```txt
content/research/{slug}.research.md
content/outlines/{slug}.outline.md
content/drafts/{slug}.draft.md
```

Best models:

```txt
Router:   Groq
Research: Gemini
Outline:  Qwen
Draft:    Qwen
```

## Workflow 2: Draft To Reviewed Article

```txt
1. Editor Agent reads draft
2. Editor Agent improves clarity and flow
3. Requirements Checker checks the reviewed draft
4. Human fixes or approves issues
5. Final Reviewer performs high-quality review
```

Input:

```txt
content/drafts/{slug}.draft.md
```

Outputs:

```txt
content/reviewed/{slug}.reviewed.md
content/reviewed/{slug}.check.md
```

Best models:

```txt
Editor:             Gemini
Requirements Check: Groq or Qwen
Final Review:       Gemini Pro
```

## Workflow 3: Ready For Medium

```txt
1. Metadata Agent creates title, subtitle, tags, excerpt
2. Publisher Agent creates website-ready package
3. Human approves publishing
4. Post is published on your own blog website
5. Medium-ready syndication package is created
6. Human publishes manually to Medium
7. Medium URL is saved back into front matter
8. Final copy moves to content/published/
```

Input:

```txt
content/reviewed/{slug}.reviewed.md
```

Output:

```txt
content/ready/{slug}/post.md
content/ready/{slug}/metadata.md
content/ready/{slug}/checklist.md
content/ready/{slug}/medium.md
```

Best models:

```txt
Metadata: Groq
Package:  Qwen or Gemini Flash
```

Publishing rule:

```txt
No external publishing happens without human approval.
```

## Workflow 4: Quick Opinion Post

Use this when the post is personal opinion and does not need heavy research.

```txt
1. Create idea note
2. Outline Agent creates short outline
3. Draft Agent writes draft
4. Requirements Checker checks draft
5. Editor Agent polishes it
6. Human approves
```

Best models:

```txt
Outline: Qwen
Draft:   Ollama Qwen or hosted Qwen
Check:   Groq
Edit:    Gemini Flash
```

## Workflow 5: Technical Post

Use this when a post includes code, architecture, tools, or implementation details.

```txt
1. Research Agent gathers docs and references
2. Outline Agent separates concept, setup, and implementation
3. Draft Agent writes the tutorial
4. Requirements Checker verifies commands, assumptions, and missing steps
5. Final Reviewer checks correctness and reader flow
```

Best models:

```txt
Research: Gemini
Outline:  Qwen
Draft:    Qwen Coder
Check:    Qwen or Gemini
Review:   Gemini Pro
```

## Workflow 6: Local Private Draft

Use this when you do not want early writing sent to hosted APIs.

```txt
1. Write idea in Obsidian
2. Ollama Qwen creates outline
3. Ollama Qwen creates draft
4. Human edits locally
5. Hosted models are used only after approval
```

Best models:

```txt
Outline: Ollama Qwen
Draft:   Ollama Qwen
Check:   Ollama Qwen
Final:   Gemini only after human approval
```

## State Machine

```txt
idea
  -> researched
  -> outlined
  -> drafted
  -> reviewed
  -> ready
  -> published
```

Allowed manual rollback:

```txt
reviewed -> drafted
ready -> reviewed
published -> reviewed
```

## Minimal First Implementation

Start with this before building a full orchestrator:

```txt
1. Create the folder structure.
2. Create agent instruction files.
3. Create checklist files.
4. Manually run each agent.
5. Save outputs into the correct folders.
6. Add automation only after the workflow feels right.
```

## Later Automation

The first script should support:

```txt
scripts/run-workflow.js --post content/ideas/my-topic.md --step research
scripts/run-workflow.js --post content/ideas/my-topic.md --step outline
scripts/run-workflow.js --post content/ideas/my-topic.md --step draft
scripts/run-workflow.js --post content/drafts/my-topic.draft.md --step check
scripts/run-workflow.js --post content/reviewed/my-topic.reviewed.md --step package
```

The script should:

- Read front matter.
- Choose the right provider and model.
- Load the matching agent instruction.
- Save output to the right folder.
- Refuse to publish without human approval.

## Dashboard Workflow

The web dashboard should show:

```txt
Ideas
Researching
Outlined
Drafted
Reviewed
Ready
Published
```

Each post row should support:

```txt
Create new post
Write/edit in browser
Open in Obsidian
Run next step
View latest output
View failed checks
Prepare website post
Prepare Medium post
Approve publishing
```

Only the final publishing action needs human approval. Earlier workflow steps can run automatically.

## Browser Writing Workflow

Use this when Obsidian is not installed or when you want to write from another device.

```txt
1. Open dashboard.
2. Click New Post.
3. Enter title, writing style, tags, summary, and target reader.
4. Write Markdown in the browser editor.
5. Save to content/ideas/ or content/drafts/.
6. Run the next agent step.
7. Review preview and requirement checks.
8. Approve publishing only when ready.
```

Browser writing and Obsidian writing use the same Markdown files:

```txt
content/ideas/{slug}.md
content/drafts/{slug}.draft.md
content/reviewed/{slug}.reviewed.md
```

This keeps the workflow portable even if Obsidian is not used.

## Image Workflow

Use this after the article passes requirements:

```txt
1. Metadata Agent summarizes the visual need.
2. Image Agent creates cover image prompts.
3. Human picks or edits a prompt.
4. Image model generates draft image.
5. Human approves image.
6. Image path, prompt, alt text, and credit are saved in front matter.
```

Recommended first implementation:

```txt
Gemini image generation for general covers
Qwen-Image for text-heavy posters, diagrams, and infographic-style covers when available
Canva or Figma for manual polish
```
