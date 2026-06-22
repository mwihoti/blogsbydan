import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFrontMatter, stringifyFrontMatter } from "../scripts/frontmatter.js";

const CONTENT_DIR = join(import.meta.dirname, "..", "content");

const STATUS_DIRS = [
  "ideas", "research", "outlines", "drafts",
  "reviewed", "ready", "published",
];

const STATUS_MAP = {
  ideas: "idea",
  research: "researched",
  outlines: "outlined",
  drafts: "drafted",
  reviewed: "reviewed",
  ready: "ready",
  published: "published",
};

const FILE_PATTERNS = {
  ideas: (name) => name.endsWith(".md"),
  research: (name) => name.endsWith(".research.md"),
  outlines: (name) => name.endsWith(".outline.md"),
  drafts: (name) => name.endsWith(".draft.md"),
  reviewed: (name) => name.endsWith(".reviewed.md"),
  ready: (name) => name.endsWith(".md"),
  published: (name) => name.endsWith(".md"),
};

function baseSlug(fileName) {
  return fileName
    .replace(/\.research\.md$/, "")
    .replace(/\.outline\.md$/, "")
    .replace(/\.draft\.md$/, "")
    .replace(/\.reviewed\.md$/, "")
    .replace(/\.md$/, "");
}

export async function listPosts() {
  const posts = [];

  for (const dir of STATUS_DIRS) {
    const dirPath = join(CONTENT_DIR, dir);
    try {
      await stat(dirPath);
    } catch {
      continue;
    }

    const files = await readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      if (!file.name.endsWith(".md") || file.isDirectory()) continue;
      if (!FILE_PATTERNS[dir]?.(file.name)) continue;

      const filePath = join(dirPath, file.name);
      try {
        const content = await readFile(filePath, "utf-8");
        const { data } = parseFrontMatter(content);
        const slug = baseSlug(file.name);
        const researchPath = join(CONTENT_DIR, "research", `${slug}.research.md`);
        const questionsPath = join(CONTENT_DIR, "research", `${slug}.questions.md`);
        const outputLinks = [];

        try {
          await stat(researchPath);
          outputLinks.push({
            label: "Research",
            web_path: `/content/research/${slug}.research.md`,
          });
        } catch {
          // no research output yet
        }

        try {
          await stat(questionsPath);
          outputLinks.push({
            label: "Questions",
            web_path: `/content/research/${slug}.questions.md`,
          });
        } catch {
          // no questions output yet
        }

        posts.push({
          slug,
          title: data.title || file.name.replace(/\.md$/, ""),
          date: data.date || "",
          status: data.status || STATUS_MAP[dir] || dir,
          tags: data.tags || [],
          summary: data.summary || "",
          target_reader: data.target_reader || "",
          writing_style: data.writing_style || "",
          medium_url: data.medium_url || "",
          canonical_url: data.canonical_url || "",
          path: filePath,
          web_path: `/content/${dir}/${file.name}`,
          output_links: outputLinks,
          dir,
        });
      } catch {
        continue;
      }
    }
  }

  const STATUS_ORDER = [
    "idea", "researched", "outlined", "drafted",
    "reviewed", "checked", "approved", "metadata",
    "ready", "published",
  ];

  posts.sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    return (b.date || "").localeCompare(a.date || "");
  });

  return posts;
}

export async function getPost(slug) {
  const posts = await listPosts();
  return posts.find((p) => p.slug === slug) || null;
}

function slugify(value) {
  return String(value || "untitled-post")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled-post";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function createPost(input = {}) {
  const title = String(input.title || "").trim();
  if (!title) {
    return { success: false, error: "Title is required" };
  }

  const slug = slugify(input.slug || title);
  const dirPath = join(CONTENT_DIR, "ideas");
  const filePath = join(dirPath, `${slug}.md`);

  try {
    await stat(filePath);
    return { success: false, error: "A post with this slug already exists" };
  } catch {
    // File does not exist, continue.
  }

  const tags = Array.isArray(input.tags)
    ? input.tags
    : String(input.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

  const data = {
    title,
    subtitle: String(input.subtitle || "").trim(),
    date: input.date || today(),
    status: "idea",
    tags,
    summary: String(input.summary || "").trim(),
    target_reader: String(input.target_reader || "").trim(),
    writing_style: String(input.writing_style || "").trim(),
    medium_url: "",
    canonical_url: "",
  };

  const body = String(input.body || `# ${title}\n\n`).trimEnd();
  const content = `${stringifyFrontMatter(data)}\n\n${body}\n`;

  await mkdir(dirPath, { recursive: true });
  await writeFile(filePath, content, "utf-8");

  return {
    success: true,
    post: {
      slug,
      title,
      date: data.date,
      status: "idea",
      tags,
      summary: data.summary,
      target_reader: data.target_reader,
      writing_style: data.writing_style,
      path: filePath,
      web_path: `/content/ideas/${slug}.md`,
      dir: "ideas",
    },
  };
}
