import { normalizeSourceItem } from "./index.js";

export async function fetchRssSignals({ feeds = [] } = {}) {
  if (!feeds.length) return [];

  const results = [];
  for (const feed of feeds) {
    const res = await fetch(feed);
    const xml = await res.text();
    if (!res.ok) {
      throw new Error(`RSS feed returned ${res.status}: ${xml.slice(0, 120)}`);
    }
    const items = xml.split(/<item\b/i).slice(1, 11);
    if (!items.length) {
      throw new Error("No RSS items found. This looks like a normal website page, not an RSS feed. Choose Website page instead.");
    }
    for (const item of items) {
      const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i);
      const link = item.match(/<link>([\s\S]*?)<\/link>/i);
      const description = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i);
      results.push(normalizeSourceItem({
        source: "rss",
        title: title?.[1] || title?.[2] || "RSS item",
        url: link?.[1] || feed,
        text: description?.[1] || description?.[2] || "",
        raw: { feed },
      }));
    }
  }

  return results;
}
