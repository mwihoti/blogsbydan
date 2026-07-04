function mapOutscraperLead(item = {}, businessType, city) {
  const socials = [
    item.social_media?.facebook,
    item.social_media?.instagram,
    item.social_media?.linkedin,
    item.social_media?.twitter,
    item.social_media?.tiktok,
  ].filter(Boolean).join(", ");

  return {
    name: item.name || item.title || "Unknown business",
    business_type: businessType,
    city,
    rating: item.rating ? String(item.rating) : "",
    reviews: item.reviews_count ? String(item.reviews_count) : item.reviews ? String(item.reviews) : "",
    address: item.address || item.street || "",
    phone: item.phone || item.phone_number || "",
    email: item.email || "",
    website: item.website || item.url || "",
    socials,
    place_id: item.place_id || item.id || "",
    data_id: item.data_id || "",
    gps: item.latitude && item.longitude
      ? `${item.latitude},${item.longitude}`
      : item.location?.lat && item.location?.lng
        ? `${item.location.lat},${item.location.lng}`
        : "",
    discovery_signal: item.reviews_count
      ? `Found live via Outscraper with ${item.reviews_count} review(s).`
      : "Found live via Outscraper.",
    raw: item,
  };
}

export async function searchOutscraperMaps({ apiKey, businessType, city, limit = 10 } = {}) {
  if (!apiKey) throw new Error("OUTSCRAPER_API_KEY is required for Outscraper lead search.");

  const url = new URL("https://api.outscraper.com/v1/google-maps/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", `${businessType} in ${city}`);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Outscraper returned non-JSON data: ${text.slice(0, 120)}`);
  }

  if (!res.ok || data.error) {
    throw new Error(data.error || `Outscraper returned ${res.status}: ${text.slice(0, 120)}`);
  }

  const results = data.data || [];
  return results.slice(0, limit).map((item) => mapOutscraperLead(item, businessType, city));
}
