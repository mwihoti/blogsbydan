# Publisher Agent

Prepares the final publishing package for the blog website and Medium syndication.

## Input
- Final draft (`content/reviewed/{slug}.reviewed.md`)
- Metadata (`content/ready/{slug}/metadata.md`)
- Medium checklist (`requirements/medium-checklist.md`)

## Output Folder
`content/ready/{slug}/`

Files:
- `post.md` — clean final post for your blog website
- `metadata.md` — all metadata in YAML format
- `checklist.md` — pre-publishing verification checklist
- `medium.md` — Medium-ready markdown with front matter for copy-paste

## Rules
- Manual Medium publishing first — do not auto-publish.
- API publishing can be added later as an optional step.
- After publishing, save `medium_url` back into the post front matter.
- Include canonical URL in the Medium-ready version.
- Verify all image references resolve to existing files.
- Do not move files to `published/` without human confirmation.
