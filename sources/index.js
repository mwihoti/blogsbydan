export function normalizeSourceItem(input = {}) {
  return {
    id: String(input.id || input.url || input.title || Date.now()),
    source: String(input.source || "manual"),
    title: String(input.title || "Untitled signal"),
    url: String(input.url || ""),
    text: String(input.text || input.summary || ""),
    author: String(input.author || ""),
    publishedAt: String(input.publishedAt || ""),
    metrics: {
      views: Number(input.metrics?.views || 0),
      likes: Number(input.metrics?.likes || 0),
      comments: Number(input.metrics?.comments || 0),
      shares: Number(input.metrics?.shares || 0),
    },
    raw: input.raw || input,
  };
}

export function scoreTrend(item = {}, business = {}) {
  const text = `${item.title || ""} ${item.text || ""}`.toLowerCase();
  const businessTerms = [
    business.industry,
    business.customers,
    business.offers,
    business.content_goals,
    "kenya",
    "founder",
    "business",
    "money",
    "sme",
  ].filter(Boolean);

  const relevance = businessTerms.reduce((sum, term) => {
    return sum + String(term).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && text.includes(word)).length;
  }, 0);

  const engagement = Object.values(item.metrics || {}).reduce((sum, value) => sum + Number(value || 0), 0);

  return {
    kenya_relevance: text.includes("kenya") || text.includes("kenyan") ? 2 : 0,
    business_relevance: Math.min(5, relevance),
    urgency: item.publishedAt ? 3 : 1,
    content_potential: Math.min(5, relevance + (engagement > 0 ? 1 : 0)),
    evidence_quality: item.url ? 3 : 1,
  };
}
