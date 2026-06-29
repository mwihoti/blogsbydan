function mapApifyLead(item = {}, businessType, city) {
  const socials = [
    item.facebook,
    item.instagram,
    item.linkedin,
    item.twitter,
    item.tiktok,
  ].filter(Boolean).join(", ");

  return {
    name: item.title || item.name || item.placeName || "Unknown business",
    business_type: businessType,
    city,
    rating: item.totalScore ? String(item.totalScore) : item.rating ? String(item.rating) : "",
    reviews: item.reviewsCount ? String(item.reviewsCount) : item.reviews ? String(item.reviews) : "",
    address: item.address || item.street || "",
    phone: item.phone || item.phoneUnformatted || "",
    email: item.email || "",
    website: item.website || item.url || "",
    socials,
    place_id: item.placeId || "",
    data_id: item.dataId || "",
    gps: item.location?.lat && item.location?.lng
      ? `${item.location.lat},${item.location.lng}`
      : item.lat && item.lng ? `${item.lat},${item.lng}` : "",
    discovery_signal: item.reviewsCount
      ? `Found live via Apify with ${item.reviewsCount} review(s).`
      : "Found live via Apify.",
    raw: item,
  };
}

export async function searchApifyMaps({ token, actorId, businessType, city, limit = 10 } = {}) {
  if (!token) throw new Error("APIFY_TOKEN is required for Apify lead search.");
  if (!actorId) throw new Error("APIFY_ACTOR_ID or APIFY_GOOGLE_MAPS_ACTOR_ID is required for Apify lead search.");

  const url = new URL(`https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`);
  url.searchParams.set("token", token);
  url.searchParams.set("clean", "true");

  const input = {
    searchStringsArray: [`${businessType} in ${city}`],
    locationQuery: city,
    maxCrawledPlacesPerSearch: limit,
    maxCrawledPlaces: limit,
    language: "en",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    throw new Error(`Apify returned non-JSON data: ${text.slice(0, 120)}`);
  }

  if (!res.ok) {
    throw new Error(`Apify returned ${res.status}: ${text.slice(0, 160)}`);
  }

  return (Array.isArray(data) ? data : []).slice(0, limit).map((item) => mapApifyLead(item, businessType, city));
}
