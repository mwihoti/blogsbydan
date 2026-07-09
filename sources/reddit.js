import { normalizeSourceItem } from "./index.js";

async function readJsonResponse(res, sourceName) {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `${sourceName} returned ${res.status}: ${text.slice(0, 120)}`,
    );
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `${sourceName} returned non-JSON data. Reddit may be blocking anonymous requests; paste the trend manually.`,
    );
  }
}

export async function fetchRedditSignals({
  subreddit = "Kenya",
  query = "business",
  limit = 10,
} = {}) {
  const url = new URL(
    `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/search.json`,
  );
  url.searchParams.set("q", query);
  url.searchParams.set("restrict_sr", "1");
  url.searchParams.set("sort", "new");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    headers: { "User-Agent": "gemflow-growth-mvp/0.1" },
  });
  const data = await readJsonResponse(res, "Reddit");

  return (data.data?.children || []).map(({ data: post }) =>
    normalizeSourceItem({
      source: "reddit",
      id: post.id,
      title: post.title,
      url: post.permalink
        ? `https://www.reddit.com${post.permalink}`
        : post.url,
      text: post.selftext || post.title,
      author: post.author,
      publishedAt: post.created_utc
        ? new Date(post.created_utc * 1000).toISOString()
        : "",
      metrics: {
        likes: post.ups,
        comments: post.num_comments,
      },
      raw: post,
    }),
  );
}
