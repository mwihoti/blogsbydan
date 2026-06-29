import { normalizeSourceItem } from "./index.js";

async function readJsonResponse(res, sourceName) {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${sourceName} returned ${res.status}: ${text.slice(0, 120)}`);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${sourceName} returned non-JSON data.`);
  }
}

export async function fetchYouTubeSignals({ apiKey, query = "Kenya business", maxResults = 10 } = {}) {
  if (!apiKey) {
    throw new Error("YouTube search needs YOUTUBE_API_KEY in .env. Use GDELT, RSS, Reddit, or manual paste without a key.");
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("regionCode", "KE");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  const data = await readJsonResponse(res, "YouTube");

  return (data.items || []).map((item) => normalizeSourceItem({
    source: "youtube",
    id: item.id?.videoId,
    title: item.snippet?.title,
    url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : "",
    text: item.snippet?.description,
    author: item.snippet?.channelTitle,
    publishedAt: item.snippet?.publishedAt,
    raw: item,
  }));
}
