import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getBusinessSignals } from "../data/business-signals.js";
import { parseFrontMatter, stringifyFrontMatter } from "../scripts/frontmatter.js";
import { searchApifyMaps } from "../sources/apify.js";
import { searchSerpApiMaps } from "../sources/serpapi.js";

const CONTENT_DIR = join(import.meta.dirname, "..", "content");

const DIRS = {
  searches: join(CONTENT_DIR, "lead-searches"),
  leads: join(CONTENT_DIR, "leads"),
  outreach: join(CONTENT_DIR, "outreach"),
};

function slugify(value, fallback = "lead") {
  return String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function envValue(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return "";
}

// Trigger the n8n "Hidden Champions" pipeline (Verify -> Judge -> Humanize).
// Fire-and-forget: n8n failures never block lead generation.
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL
  || "http://localhost:5678/webhook/hidden-champions";

async function sendToN8n(payload) {
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`n8n responded ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[n8n] trigger failed: ${err.message}`);
    return null;
  }
}

async function ensureDirs() {
  await Promise.all(Object.values(DIRS).map((dir) => mkdir(dir, { recursive: true })));
}

async function listMarkdown(dir, type) {
  try {
    await stat(dir);
  } catch {
    return [];
  }

  const files = await readdir(dir, { withFileTypes: true });
  const items = [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".md")) continue;
    const path = join(dir, file.name);
    const content = await readFile(path, "utf-8");
    const { data, body } = parseFrontMatter(content);
    const slug = file.name.replace(/\.md$/, "");
    items.push({
      type,
      slug,
      title: data.title || data.name || slug,
      ...data,
      body,
      path,
      web_path: `/content/${type}/${file.name}`,
    });
  }
  return items.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

export function inferProblems(businessType, offer) {
  const signals = getBusinessSignals(businessType);
  if (signals.pains?.length) return signals.pains;

  const text = `${businessType} ${offer}`.toLowerCase();
  if (text.includes("real estate") || text.includes("property")) {
    return [
      "Property photos do not show the real size or condition clearly.",
      "Listings stay online too long before serious buyers inquire.",
      "Customers ask the same location, pricing, and viewing questions repeatedly.",
    ];
  }
  if (text.includes("restaurant") || text.includes("food")) {
    return [
      "Customers complain about slow responses to orders and reservations.",
      "Menus and opening hours are not clear across Google and social profiles.",
      "Good reviews mention food quality, but bad reviews mention service consistency.",
    ];
  }
  if (text.includes("clinic") || text.includes("health")) {
    return [
      "Patients struggle to understand pricing, appointment times, and available services.",
      "Reviews suggest waiting time and communication gaps are hurting trust.",
      "The website and social pages do not answer common patient questions fast enough.",
    ];
  }
  if (text.includes("school") || text.includes("training")) {
    return [
      "Parents or learners ask repeated questions about fees, schedules, and outcomes.",
      "Reviews show trust depends on proof of student results and clear communication.",
      "Lead follow-up is likely manual and inconsistent.",
    ];
  }
  return [
    "Customers need faster answers before they choose a competitor.",
    "The business has visible public signals but weak conversion assets.",
    "Reviews and online presence suggest repeated questions that can become sales content.",
  ];
}

function demoBusinesses(businessType, city) {
  const type = businessType || "SME";
  const place = city || "Nairobi";
  const areas = ["CBD", "Westlands", "Kilimani", "Karen", "Industrial Area", "Lavington", "Parklands", "Upper Hill", "Ngong Road", "Ruiru"];
  return areas.map((area, index) => ({
    name: index % 3 === 0
      ? `${place} ${type} Hub ${area}`
      : index % 3 === 1
        ? `Prime ${type} Services ${area}`
        : `Family ${type} Centre ${area}`,
    rating: String((4.1 + ((index % 6) * 0.1)).toFixed(1)),
    reviews: String(28 + (index * 11)),
    address: `${place} ${area}`,
    phone: "",
    email: "",
    website: "",
    socials: index % 2 === 0 ? "Google Maps profile likely; website/socials need enrichment" : "LinkedIn/Instagram search recommended",
    discovery_signal: index % 2 === 0
      ? "Good review count but weak public contact data"
      : "High customer signal, lower ecosystem visibility",
  }));
  /*
  return [
    {
      name: `${place} ${type} Hub`,
      rating: "4.6",
      reviews: "87",
      address: `${place} CBD`,
      phone: "",
      email: "",
      website: "",
      socials: "Google Maps profile likely; website/socials need enrichment",
      discovery_signal: "Good review count but weak public contact data",
    },
    {
      name: `Prime ${type} Services ${place}`,
      rating: "4.3",
      reviews: "52",
      address: `${place} Westlands`,
      phone: "",
      email: "",
      website: "",
      socials: "LinkedIn/Instagram search recommended",
      discovery_signal: "Enough customer feedback to personalize outreach",
    },
    {
      name: `Family ${type} Centre`,
      rating: "4.8",
      reviews: "34",
      address: `${place} outskirts`,
      phone: "",
      email: "",
      website: "",
      socials: "Possibly under-marketed outside Maps",
      discovery_signal: "High rating, lower ecosystem visibility",
    },
  ];*/
}

function leadScore(lead) {
  const reviewCount = Number(lead.reviews || 0);
  const hasWeakContactData = !lead.email || !lead.website;
  const visibility = hasWeakContactData ? 2 : 0;
  const reviews = reviewCount >= 30 ? 3 : reviewCount >= 10 ? 2 : 1;
  return Math.min(5, visibility + reviews);
}

function cleanValue(value, fallback = "") {
  return String(value || "").trim() || fallback;
}

function sentenceCase(value) {
  const text = cleanValue(value);
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function leadEvidence(lead) {
  const evidence = [];
  if (lead.rating) evidence.push(`${lead.rating} rating`);
  if (lead.reviews) evidence.push(`${lead.reviews} public reviews`);
  if (lead.address) evidence.push(`located at ${lead.address}`);
  if (lead.website) evidence.push(`website found: ${lead.website}`);
  if (lead.phone) evidence.push("phone number visible");
  if (lead.email) evidence.push("email visible");
  if (lead.socials) evidence.push(cleanValue(lead.socials));
  if (lead.gps) evidence.push(`GPS captured: ${lead.gps}`);
  return evidence;
}

function inferLeadOpportunity({ lead, businessType, offer, problems, signals }) {
  const reviewCount = Number(lead.reviews || 0);
  const hasWebsite = Boolean(lead.website);
  const hasContactGap = !lead.email || !lead.phone;
  const hasStrongDemand = reviewCount >= 40 || Number(lead.rating || 0) >= 4.5;
  const primaryTrend = signals.trends[0] || "customer trust";
  const primaryProblem = problems[0] || "customers need clearer answers before they inquire";

  if (hasStrongDemand && hasContactGap) {
    return {
      angle: "capture existing demand before it leaks to competitors",
      insight: `${lead.name} already has public demand signals, but the visible contact data is incomplete. That makes the first campaign about turning search/profile visitors into qualified conversations.`,
      leadMagnet: `A one-page "${cleanValue(businessType, "service")} buyer checklist" tied to ${primaryTrend}`,
    };
  }

  if (hasWebsite && hasContactGap) {
    return {
      angle: "turn the website into a clearer inquiry path",
      insight: `${lead.name} has a website, so outreach should reference a specific conversion improvement instead of a generic marketing pitch.`,
      leadMagnet: `A short landing-page audit showing how ${primaryProblem.toLowerCase()}`,
    };
  }

  if (!hasWebsite) {
    return {
      angle: "build a simple proof-and-inquiry asset around public trust signals",
      insight: `${lead.name} appears in discovery results without a clear website signal. The offer should start with a lightweight page or campaign asset, not a large rebuild.`,
      leadMagnet: `A quick profile-to-lead page using reviews, location, and ${primaryTrend}`,
    };
  }

  return {
    angle: "convert public interest into qualified follow-up",
    insight: `${lead.name} has enough public context to make a specific content idea credible. Lead with the observed business category, location, and likely buyer friction.`,
    leadMagnet: `A practical content idea connecting ${cleanValue(offer, "your offer")} to ${primaryTrend}`,
  };
}

export function buildLeadBrief({ lead, businessType, city, offer, problems, signals }) {
  const score = leadScore(lead);
  const evidence = leadEvidence(lead);
  const problemList = problems.map((problem) => `- ${problem}`).join("\n");
  const trendList = signals.trends.map((trend) => `- ${trend}`).join("\n") || "- No saved market signals yet.";
  const angleList = signals.angles.map((angle) => `- ${angle}`).join("\n") || "- Turn visible customer questions into content and follow-up.";
  const primaryTrend = signals.trends[0] || "customer trust";
  const primaryAngle = signals.angles[0] || "turn repeated customer questions into lead-generating content";
  const opportunity = inferLeadOpportunity({ lead, businessType, offer, problems, signals });
  const evidenceList = evidence.map((item) => `- ${item}`).join("\n") || "- Only basic name, city, and category were found.";
  const opener = evidence.length
    ? `I noticed ${evidence.slice(0, 2).join(" and ")} for ${lead.name}.`
    : `I found ${lead.name} while researching ${businessType} in ${city}.`;
  const contactGap = [
    lead.website ? "" : "website",
    lead.email ? "" : "email",
    lead.phone ? "" : "phone",
  ].filter(Boolean).join(", ") || "no obvious contact gap";
  const offerSentence = offer
    ? sentenceCase(offer)
    : "My work turns public customer signals into more leads and better follow-up.";
  return `# ${lead.name}

## Lead Snapshot
- Business type: ${businessType}
- City: ${city}
- Rating: ${lead.rating || "Unknown"}
- Review count: ${lead.reviews || "Unknown"}
- Address: ${lead.address || "Unknown"}
- Phone: ${lead.phone || "Not found yet"}
- Email: ${lead.email || "Not found yet"}
- Website: ${lead.website || "Not found yet"}
- Socials: ${lead.socials || "Not found yet"}
- GPS: ${lead.gps || "Not found yet"}
- Undiscovered score: ${score}/5

## Evidence Found
${evidenceList}

## Why This Lead Is Interesting
${lead.discovery_signal || opportunity.insight}

The practical opening is: ${opportunity.angle}.

## Relevant Market Signals
${trendList}

## Review-Inferred Pain Points
${problemList}

## Content And Outreach Angles
${angleList}

## Lead-Specific Campaign Idea
- Hook: ${opener}
- Contact gap: ${contactGap}
- Lead magnet: ${opportunity.leadMagnet}
- First asset: a short ${businessType} buyer guide, audit, or WhatsApp follow-up script for ${city} prospects.
- CTA: ask permission to send one specific idea, not a broad sales deck.

## Offer Match
Your offer: ${offer}

Best angle: connect ${offer || "your service"} to "${primaryTrend}", then lead with "${primaryAngle}" using the evidence found above.

## Cold Email Draft
Subject: Quick idea for ${lead.name}

Hi ${lead.name} team,

${opener} I was researching ${businessType} around ${city}, and one trend that matters right now is ${primaryTrend}.

The opportunity I see is ${opportunity.angle}. A related customer pain for businesses like yours is: ${problems[0]}

${offerSentence}

I put together a short idea around ${opportunity.leadMagnet}. It could help ${lead.name} turn existing attention into more qualified inquiries without changing your whole operation. Should I send it over?

Best,

## Call/DM Version
Hi, ${opener} There is a useful angle around ${primaryTrend}, especially "${problems[0]}". ${offerSentence} Who is the best person to send a short idea to?

## Qualification Questions
1. What channel brings most inquiries today: Google, WhatsApp, referrals, website, or social?
2. Which type of customer is most valuable for ${lead.name} right now?
3. What question do prospects ask before they are ready to buy or book?
4. Is follow-up handled manually after the first call, DM, or form submission?
5. Would a small campaign around "${opportunity.leadMagnet}" be useful this month?

## Next Actions
- Verify phone/email on the website or Google profile.
- Check the newest 10-20 reviews manually before sending.
- Use the market signal "${primaryTrend}" as the opener.
- Offer a lead magnet based on "${primaryAngle}".
- Send one-by-one outreach only.
- Mark status after reply: new, contacted, replied, meeting booked, won, lost.
`;
}

export async function listLeadItems() {
  await ensureDirs();
  const [searches, leads, outreach] = await Promise.all([
    listMarkdown(DIRS.searches, "lead-searches"),
    listMarkdown(DIRS.leads, "leads"),
    listMarkdown(DIRS.outreach, "outreach"),
  ]);
  return { searches, leads, outreach };
}

export function leadProviderStatus() {
  const serpApiKey = envValue("SERPAPI_KEY", "serpapi_key", "SERP_API_KEY");
  const apifyToken = envValue("APIFY_TOKEN", "apify_token");
  const apifyActorId = envValue("APIFY_GOOGLE_MAPS_ACTOR_ID", "APIFY_ACTOR_ID", "apify_actor_id");
  return {
    serpapi: Boolean(serpApiKey),
    apify: Boolean(apifyToken && apifyActorId),
    apify_token: Boolean(apifyToken),
    apify_actor: Boolean(apifyActorId),
    active_provider: serpApiKey ? "serpapi-google-maps" : apifyToken && apifyActorId ? "apify-google-maps" : "demo-fallback",
  };
}

// Shared discovery: SerpAPI -> Apify -> deterministic demo fallback.
// No file writes, no n8n trigger — safe to call from anywhere (incl. n8n).
async function runDiscovery(businessType, city, limit = 10) {
  let provider = "demo-fallback";
  let providerNote = "No live provider key was available, so deterministic demo leads were generated.";
  let baseCandidates = [];

  const serpApiKey = envValue("SERPAPI_KEY", "serpapi_key", "SERP_API_KEY");
  const apifyToken = envValue("APIFY_TOKEN", "apify_token");
  const apifyActorId = envValue("APIFY_GOOGLE_MAPS_ACTOR_ID", "APIFY_ACTOR_ID", "apify_actor_id");

  if (serpApiKey) {
    try {
      baseCandidates = await searchSerpApiMaps({ apiKey: serpApiKey, businessType, city, limit });
      provider = "serpapi-google-maps";
      providerNote = "Live Google Maps-style results from SerpAPI. Website contact enrichment was attempted where websites were available.";
    } catch (err) {
      providerNote = `SerpAPI failed. Error: ${err.message}`;
    }
  }

  if (!baseCandidates.length && apifyToken && apifyActorId) {
    try {
      baseCandidates = await searchApifyMaps({ token: apifyToken, actorId: apifyActorId, businessType, city, limit });
      provider = "apify-google-maps";
      providerNote = "Live Google Maps-style results from Apify using the configured actor.";
    } catch (err) {
      providerNote = `${providerNote} Apify failed. Error: ${err.message}`;
    }
  }

  if (!baseCandidates.length) {
    baseCandidates = demoBusinesses(businessType, city).slice(0, limit);
    provider = "demo-fallback";
    providerNote = `${providerNote} Demo fallback leads were generated.`;
  }

  return { baseCandidates, provider, providerNote };
}

// Discovery-only endpoint for n8n: returns leads (with a profile each) and
// does NOT trigger n8n, so n8n -> discover -> n8n never loops.
export async function discoverLeads(input = {}) {
  const businessType = String(input.business_type || "").trim();
  const city = String(input.city || "").trim();
  const offer = String(input.offer || "").trim();

  if (!businessType) return { success: false, error: "Business type is required" };
  if (!city) return { success: false, error: "City is required" };

  const signals = getBusinessSignals(businessType);
  const problems = inferProblems(businessType, offer);
  const { baseCandidates, provider } = await runDiscovery(businessType, city, Number(input.limit || 10));

  const leads = baseCandidates.map((lead) => {
    const candidate = {
      ...lead,
      business_type: businessType,
      city,
      status: "new",
      undiscovered_score: leadScore(lead),
      inferred_problems: problems,
    };
    const profile = buildLeadBrief({ lead: candidate, businessType, city, offer, problems, signals });
    return { lead: candidate, profile };
  });

  return { success: true, provider, count: leads.length, leads };
}

export async function searchLeads(input = {}) {
  await ensureDirs();
  const businessType = String(input.business_type || "").trim();
  const city = String(input.city || "").trim();
  const offer = String(input.offer || "").trim();

  if (!businessType) return { success: false, error: "Business type is required" };
  if (!city) return { success: false, error: "City is required" };
  if (!offer) return { success: false, error: "Your offer is required" };

  const searchSlug = `${slugify(city)}-${slugify(businessType)}-${Date.now()}`;
  const signals = getBusinessSignals(businessType);
  const problems = inferProblems(businessType, offer);
  const { baseCandidates, provider, providerNote } = await runDiscovery(
    businessType,
    city,
    Number(input.limit || 10),
  );

  const candidates = baseCandidates.map((lead) => ({
    ...lead,
    business_type: businessType,
    city,
    status: "new",
    undiscovered_score: leadScore(lead),
    inferred_problems: problems,
  }));

  const searchData = {
    title: `${businessType} in ${city}`,
    business_type: businessType,
    city,
    offer,
    trends: signals.trends.join(" | "),
    angles: signals.angles.join(" | "),
    provider,
    result_count: candidates.length,
    created_at: today(),
  };
  await writeFile(
    join(DIRS.searches, `${searchSlug}.md`),
    `${stringifyFrontMatter(searchData)}\n\n# Lead Search\n\nProvider: ${provider}\n\n${providerNote}\n`,
    "utf-8",
  );

  const saved = [];
  for (const candidate of candidates) {
    const slug = `${slugify(city)}-${slugify(candidate.name)}`;
    const data = {
      title: candidate.name,
      name: candidate.name,
      business_type: businessType,
      city,
      rating: candidate.rating,
      reviews: candidate.reviews,
      address: candidate.address,
      phone: candidate.phone,
      email: candidate.email,
      website: candidate.website,
      socials: candidate.socials,
      gps: candidate.gps || "",
      place_id: candidate.place_id || "",
      data_id: candidate.data_id || "",
      status: "new",
      undiscovered_score: candidate.undiscovered_score,
      search: searchSlug,
      created_at: today(),
    };
    const body = buildLeadBrief({ lead: candidate, businessType, city, offer, problems, signals });
    const path = join(DIRS.leads, `${slug}.md`);
    await writeFile(path, `${stringifyFrontMatter(data)}\n\n${body}`, "utf-8");

    const outreachPath = join(DIRS.outreach, `${slug}.md`);
    await writeFile(outreachPath, `${stringifyFrontMatter({ ...data, lead: slug })}\n\n${body.split("## Cold Email Draft")[1]?.trim() || body}`, "utf-8");

    saved.push({
      slug,
      ...data,
      web_path: `/content/leads/${slug}.md`,
      outreach_path: `/content/outreach/${slug}.md`,
      inferred_problems: problems,
    });
  }

  // Kick off the n8n agent pipeline once for this search (n8n re-discovers + refines).
  sendToN8n({ business_type: businessType, city, offer }).catch(() => {});

  return {
    success: true,
    search: { slug: searchSlug, ...searchData, web_path: `/content/lead-searches/${searchSlug}.md` },
    leads: saved,
    provider,
  };
}
