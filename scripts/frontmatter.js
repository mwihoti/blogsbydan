import { readFile, writeFile } from "node:fs/promises";

const FM_RE = /^---\n([\s\S]*?)\n---(?:\n|$)/;

export function parseFrontMatter(content) {
  const match = content.match(FM_RE);
  if (!match) return { data: {}, body: content };

  const data = {};
  const lines = match[1].split("\n");
  let currentKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      if (currentKey) {
        const val = trimmed.slice(2).trim();
        if (!Array.isArray(data[currentKey])) {
          data[currentKey] = [];
        }
        data[currentKey].push(val);
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    currentKey = trimmed.slice(0, colonIdx).trim();
    let val = trimmed.slice(colonIdx + 1).trim();

    if (val === "") continue;

    if (val.startsWith("[")) {
      try { data[currentKey] = JSON.parse(val.replace(/'/g, '"')); } catch { data[currentKey] = val; }
    } else {
      data[currentKey] = val;
    }
  }

  return { data, body: content.slice(match[0].length) };
}

export function stringifyFrontMatter(data) {
  const lines = ["---"];
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      lines.push(`${key}: ${JSON.stringify(val)}`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

export async function readPost(filePath) {
  const content = await readFile(filePath, "utf-8");
  return { content, ...parseFrontMatter(content), filePath };
}

export async function writePost(filePath, data, body) {
  const fm = stringifyFrontMatter(data);
  await writeFile(filePath, `${fm}\n\n${body}`);
}

export function slugFromPath(filePath) {
  return filePath.replace(/\.md$/, "").split("/").pop();
}
