# Research: Why Local-First AI Writing Wins

## Summary

The landscape of AI-assisted writing is undergoing a quiet division. On one side are monolithic, cloud-based "all-in-one" platforms like Notion AI, Lex, and Jasper. These platforms offer seamless, one-click convenience but trap writers in proprietary ecosystems, subscription loops, and database-locked formats. On the other side is the emerging philosophy of "local-first" AI writing. This approach prioritizes markdown files stored on local disks, open protocols, and modular AI integrations—using local runners like Ollama or developer APIs (Anthropic, OpenAI) via local text editors (Obsidian, VS Code, Logseq). 

This research reveals that local-first AI writing is not just about privacy or offline access; it is about decoupling the **writing environment** from the **intelligence layer**. By keeping source files in plain Markdown, writers can swap out AI models, editors, and publishing pipelines without losing their core intellectual assets. This approach treats AI as a transient collaborator and plain text as the permanent record.

---

## Key Facts

*   **File over App Philosophy:** Popularized by Obsidian's CEO Steph Ango, the "file over app" philosophy posits that your data should outlive your software. Standard Markdown (CommonMark) is universally readable, while cloud platforms store content in proprietary database schemas that make perfect exports notoriously difficult [Source: Steph Ango].
*   **The Cost Discrepancy:** All-in-one writing platforms typically charge flat monthly subscriptions ($10–$30/month) for AI access. In contrast, running local models via Ollama is completely free (utilizing local compute), and pay-as-you-go APIs (like Claude 3.5 Sonnet or GPT-4o-mini) cost fractions of a cent per query, often resulting in massive savings for moderate-to-heavy writers [Source: API Pricing Sheets].
*   **Privacy & Ownership Risks:** Cloud platforms often reserves the right to use user interactions and documents to train future models unless users actively opt-out (which is often hidden or restricted to enterprise tiers) `[opinion]`.
*   **Performance of Local Models:** Small, open-weights models (such as Llama 3.1 8B, Mistral 7B, and Gemma 2) can now run comfortably on consumer-grade hardware (especially Apple Silicon M-series chips) and perform comparably to older proprietary models on drafting and editing tasks [Source: LMSYS Chatbot Arena].
*   **API and Tool Interoperability:** Standardizing on text files allows developers and writers to pipe their writing through command-line tools, local LLM integrations, and static site generators (like Hugo, Astro, or Jekyll) using simple shell scripts or lightweight extensions.

---

## Useful Examples

### 1. The Obsidian + Local Copilot Setup
Many writers have migrated to Obsidian using plugins like **Copilot** or **Smart Connections**. This setup index local markdown vaults using local vector databases (RAG) to allow writers to query their own archives. 
*   *Why it wins:* It allows the writer to say, "Based on my previous essays on gardening, draft an outline for..." without uploading their entire personal diary or journal to a third-party server.

### 2. Simon Willison's CLI-based Writing Pipeline
Programmer and writer Simon Willison pioneered a workflow using his open-source `llm` CLI tool. He pipes local text files into different LLM models directly from his terminal, comparing outputs and saving drafts directly into Git repositories.
*   *Why it wins:* The workflow is completely modular. If Anthropic releases a better model, he changes one word in his terminal command. He is never locked into a single vendor's interface.

### 3. Continue.dev / Roo-Code in VS Code
While designed for code, many technical writers are using IDE-based AI extensions (like Continue or Roo-Code) to edit Markdown. They configure these tools to use local Ollama models (like `llama3.1`) for autocomplete and inline editing, bypassing the cloud entirely for drafting sensitive content.

---

## Source List

*   **"File over app" Manifesto** — Steph Ango (CEO of Obsidian): [stephango.com/file-over-app](https://stephango.com/file-over-app)
*   **Simon Willison's blog** — "LLM: A CLI utility and Python library for interacting with Large Language Models": [simonwillison.net](https://simonwillison.net/)
*   **Ollama Project** — Run Llama 3.1, Mistral, and other models locally: [ollama.com](https://ollama.com/)
*   **LMSYS Chatbot Arena Leaderboard** — For comparing local model performance against proprietary models: [chat.lmsys.org](https://chat.lmsys.org/)

---

## Contradictions or Uncertainty

*   **The "Quality Gap" for Creative Editing:** While small local models (8B-14B parameters) are excellent at grammar, formatting, and summarizing, they often lack the nuanced "voice" and complex reasoning of frontier cloud models like Claude 3.5 Sonnet or GPT-4o `[weak evidence]`. Writers must often choose between complete privacy (fully local) and maximum creative quality (using cloud APIs over local files).
*   **Setup Friction:** Local-first tools require a degree of technical comfort (e.g., managing API keys, installing Ollama, configuring plugins). For non-technical writers, the convenience of a polished cloud interface like Lex still outweighs the benefits of file ownership `[opinion]`.

---

## Open Questions

*   How can local-first tools achieve the same seamless collaborative editing (multiplayer Google Docs-style) without introducing central servers that break the local-first ethos?
*   Will mobile devices (tablets and phones, where many writers draft) soon be powerful enough to run high-quality 8B parameter models locally without draining the battery in an hour?

---

## Angle Recommendations

### 1. The "Anti-Rent" Angle (Financial & Practical)
*   **Premise:** Stop paying $20/month for writing apps that restrict your inputs and own your formatting. Treat your writing environment like a home you own, not a flat you rent.
*   **Tone:** Empowering, practical, slightly rebellious.
*   **Focus:** Comparing the costs and longevity of subscription databases (Notion, Lex) versus Git-backed Markdown folders with pay-as-you-go APIs or free Ollama setups.

### 2. The "Digital Archaeologist" Angle (Longevity)
*   **Premise:** Will your AI-assisted drafts be readable in 30 years? If they are in Notion's cloud, probably not. If they are in plain Markdown on your drive, absolutely.
*   **Tone:** Philosophical, slow-tech, archival-focused.
*   **Focus:** The "File over App" concept. Why separation of the "Brain" (the LLM) and the "Page" (the Markdown file) is essential for preserving the historical record of a writer's process.

### 3. The Modular Agentic Setup (Technical/DIY)
*   **Premise:** A step-by-step conceptual guide on how to build a personalized "Editorial Board" using local Markdown files, git, and custom CLI prompts.
*   **Tone:** Tutorial-adjacent, inspiring, developer-friendly.
*   **Focus:** Showing how to set up Ollama, standard markdown frontmatter, and simple scripts to automate copyediting, proofreading, and publishing.