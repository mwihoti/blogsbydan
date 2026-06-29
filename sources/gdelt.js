import { normalizeSourceItem } from "./index.js";

async function readJsonResponse(res, sourceName) {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${sourceName} returned ${res.status}: ${text.slice(0, 120)}`);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${sourceName} returned non-JSON data. Try a search query instead of a website URL.`);
  }
}

export async function fetchGdeltSignals({ query = "Kenya business", maxRecords = 10 } = {}) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(maxRecords));

  const res = await fetch(url);
  const data = await readJsonResponse(res, "GDELT");

  return (data.articles || []).map((article) => normalizeSourceItem({
    source: "gdelt",
    title: article.title,
    url: article.url,
    text: article.seendate ? `Seen ${article.seendate}. ${article.domain || ""}` : article.domain,
    publishedAt: article.seendate,
    raw: article,
  }));
}
