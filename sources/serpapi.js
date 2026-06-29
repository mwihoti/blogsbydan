import { enrichWebsiteContacts } from "./contact.js";

function mapSerpLead(item = {}, businessType, city) {
  return {
    name: item.title || item.name || "Unknown business",
    business_type: businessType,
    city,
    rating: item.rating ? String(item.rating) : "",
    reviews: item.reviews ? String(item.reviews) : "",
    address: item.address || "",
    phone: item.phone || "",
    email: "",
    website: item.website || "",
    socials: "",
    place_id: item.place_id || "",
    data_id: item.data_id || "",
    gps: item.gps_coordinates
      ? `${item.gps_coordinates.latitude || ""},${item.gps_coordinates.longitude || ""}`
      : "",
    discovery_signal: item.reviews
      ? `Found live via SerpAPI Google Maps with ${item.reviews} review(s).`
      : "Found live via SerpAPI Google Maps.",
    raw: item,
  };
}

export async function searchSerpApiMaps({ apiKey, businessType, city, limit = 10, enrich = true } = {}) {
  if (!apiKey) throw new Error("SERPAPI_KEY is required for live Google Maps lead search.");

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_maps");
  url.searchParams.set("q", `${businessType} in ${city}`);
  url.searchParams.set("type", "search");
  url.searchParams.set("hl", "en");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`SerpAPI returned non-JSON data: ${text.slice(0, 120)}`);
  }

  if (!res.ok || data.error) {
    throw new Error(data.error || `SerpAPI returned ${res.status}: ${text.slice(0, 120)}`);
  }

  const results = (data.local_results || []).slice(0, limit).map((item) => mapSerpLead(item, businessType, city));

  if (!enrich) return results;

  const enriched = [];
  for (const lead of results) {
    if (!lead.website) {
      enriched.push(lead);
      continue;
    }

    try {
      const contacts = await enrichWebsiteContacts(lead.website);
      enriched.push({
        ...lead,
        email: contacts.email || lead.email,
        phone: contacts.phone || lead.phone,
        socials: contacts.socials.length ? contacts.socials.join(", ") : lead.socials,
        website_text: contacts.text,
      });
    } catch {
      enriched.push(lead);
    }
  }

  return enriched;
}
