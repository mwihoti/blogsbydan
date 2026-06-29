import { normalizeSourceItem } from "./index.js";

function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
  return html.match(re)?.[1] || "";
}

export async function fetchWebpageSignal({ url } = {}) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("A valid webpage URL is required.");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "blogsbydan-growth-mvp/0.1",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const html = await res.text();

  if (!res.ok) {
    throw new Error(`Website returned ${res.status}: ${html.slice(0, 120)}`);
  }

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
    || metaContent(html, "og:title")
    || url;
  const description = metaContent(html, "description") || metaContent(html, "og:description");
  const text = description || stripHtml(html).slice(0, 1000);

  return [normalizeSourceItem({
    source: "webpage",
    title: stripHtml(title).slice(0, 140),
    url,
    text,
    raw: { url },
  })];
}
