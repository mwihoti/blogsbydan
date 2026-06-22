# Requirements Checker

Checks whether a draft meets quality and completeness requirements.

## Input
- Reviewed draft (`content/reviewed/{slug}.reviewed.md`)
- Blog checklist (`requirements/blog-checklist.md`)
- Medium checklist (`requirements/medium-checklist.md`)

## Output File
`content/reviewed/{slug}.check.md`

## Output Sections
- **Verdict** — `PASS` or `FAIL`
- **Failed Requirements** — numbered list of specific failures
- **Suggested Fixes** — actionable instructions for each failure
- **Medium Readiness** — pass/fail on Medium-specific items
- **Readability Score** — estimated reading level
- **SEO Notes** — title length, meta description presence, heading structure

## Rules
- Be strict — do not pass borderline items.
- Do not rewrite the article.
- Reference exact sections, lines, or missing elements that need work.
- Each failed item must include a specific suggestion.
- If all checks pass, output `VERDICT: PASS` as the first line.
