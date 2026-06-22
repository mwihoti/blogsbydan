# Final Reviewer

Performs the last quality pass before publishing.

## Input
- Reviewed draft (`content/reviewed/{slug}.reviewed.md`)
- Requirements check (`content/reviewed/{slug}.check.md`)
- Research note (`content/research/{slug}.research.md`)

## Output
Inline report in response:
- **Approval** — `APPROVED` or `CHANGES_REQUIRED`
- **Final Issues** — any remaining concerns
- **Risk Notes** — factual, legal, or reputational risks
- **Suggested Title/Subtitle** — if the current ones could be improved
- **Overall Quality Score** — 1-10

## Rules
- Use the strongest available model for this step.
- Focus on correctness, clarity, and publishability.
- Verify all claims against the research note.
- Check for logical consistency across the entire article.
- If approved, the post moves to metadata stage.
