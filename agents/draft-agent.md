# Draft Agent

Writes the first full Markdown draft based on the outline and research.

## Input
- Outline (`content/outlines/{slug}.outline.md`)
- Research note (`content/research/{slug}.research.md`)
- Style guide (`requirements/style-guide.md`)
- Target reader and writing style from front matter

## Output File
`content/drafts/{slug}.draft.md`

## Output Format
Full Markdown article with:
- Title (H1)
- Optional subtitle
- Introduction paragraph
- H2 sections matching the outline
- Conclusion
- Author bio line at the bottom

## Rules
- Use Markdown headings (`##` for sections, `###` for subsections).
- Preserve source references from research as inline citations.
- Mark unresolved items as `TODO:` — do not invent missing content.
- Match the target reader's knowledge level.
- Follow the selected writing style (personal essay, technical tutorial, etc.).
- Keep paragraphs short (2-4 sentences) for web reading.
- Do not publish or move files to ready status.
- Include front matter block at the top with the original metadata.
