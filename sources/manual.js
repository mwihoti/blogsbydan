import { normalizeSourceItem } from "./index.js";

export function fromManualInput(input = {}) {
  return normalizeSourceItem({
    source: input.source || "manual",
    title: input.title,
    url: input.url,
    text: input.text,
    author: input.author,
    publishedAt: input.publishedAt,
    metrics: input.metrics,
    raw: input,
  });
}
