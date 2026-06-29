import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getBusinessSignals } from "../data/business-signals.js";
import { parseFrontMatter, stringifyFrontMatter } from "../scripts/frontmatter.js";

const CONTENT_DIR = join(import.meta.dirname, "..", "content");

const DIRS = {
  businesses: join(CONTENT_DIR, "businesses"),
  knowledge: join(CONTENT_DIR, "knowledge"),
  leads: join(CONTENT_DIR, "leads"),
  trends: join(CONTENT_DIR, "trends"),
  briefs: join(CONTENT_DIR, "briefs"),
  campaigns: join(CONTENT_DIR, "campaigns"),
  storyboards: join(CONTENT_DIR, "storyboards"),
  videoSpecs: join(CONTENT_DIR, "video-specs"),
};

function slugify(value, fallback = "item") {
  return String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10);
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

function splitKeywords(...values) {
  const stop = new Set(["the", "and", "for", "with", "that", "this", "from", "are", "you", "your", "about"]);
  return values
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !stop.has(word));
}

function estimateLifespan(trend) {
  const text = `${trend.title || ""} ${trend.body || ""} ${trend.text || ""}`.toLowerCase();
  if (text.includes("meme") || text.includes("tiktok") || text.includes("viral")) return "24-72 hours";
  if (text.includes("policy") || text.includes("tax") || text.includes("regulation")) return "1-3 weeks";
  if (text.includes("funding") || text.includes("jobs") || text.includes("market")) return "3-10 days";
  return "2-7 days";
}

function trendScores(business, trend, knowledge) {
  const text = `${trend.title || ""} ${trend.body || ""} ${trend.text || ""}`.toLowerCase();
  const terms = splitKeywords(business.industry, business.customers, business.offers, business.activities);
  const hits = terms.filter((term) => text.includes(term)).length;
  const knowledgeBoost = Math.min(2, knowledge.length);

  return {
    kenya_relevance: text.includes("kenya") || text.includes("kenyan") || business.location?.toLowerCase().includes("kenya") ? 5 : 2,
    business_relevance: Math.min(5, 2 + hits + knowledgeBoost),
    content_potential: Math.min(5, 3 + Math.ceil(hits / 2) + knowledgeBoost),
    urgency: estimateLifespan(trend).includes("24") ? 5 : 3,
    evidence_quality: trend.url ? 4 : 2,
  };
}

function selectKnowledgeSnippets(business, trend, knowledgeItems) {
  const keywords = splitKeywords(
    business.name,
    business.industry,
    business.customers,
    business.offers,
    trend.title,
    trend.text,
    trend.keywords,
  );

  return knowledgeItems
    .map((item) => {
      const haystack = `${item.title} ${item.body}`.toLowerCase();
      const score = keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0);
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => ({
      title: item.title,
      source: item.web_path,
      excerpt: item.body.replace(/\s+/g, " ").trim().slice(0, 320),
    }));
}

function leadSummary(lead) {
  if (!lead) return null;
  const details = [];
  if (lead.business_type) details.push(lead.business_type);
  if (lead.city) details.push(lead.city);
  if (lead.rating) details.push(`${lead.rating} rating`);
  if (lead.reviews) details.push(`${lead.reviews} reviews`);
  if (lead.website) details.push(`website: ${lead.website}`);
  if (lead.undiscovered_score) details.push(`undiscovered score ${lead.undiscovered_score}/5`);
  return {
    name: lead.name || lead.title,
    details,
    body: String(lead.body || "").replace(/\s+/g, " ").trim().slice(0, 700),
  };
}

function inferCampaignPositioning({ business, trend, lead, knowledge }) {
  const leadInfo = leadSummary(lead);
  const trendText = `${trend.title || ""} ${trend.body || ""} ${trend.text || ""}`.toLowerCase();
  const eventCampaign = trendText.includes("event") || trendText.includes("registration") || trendText.includes("join");
  const proofCampaign = knowledge.some((item) => /accelerator|hack|builder|cohort|programme|program/i.test(item.excerpt || ""));

  if (leadInfo && eventCampaign) {
    return {
      promise: `turn ${trend.title} interest into qualified event, cohort, or community leads for ${leadInfo.name}`,
      asset: "event-to-lead campaign page plus WhatsApp/LinkedIn follow-up copy",
      audience: `${business.customers || "prospects"} connected to ${leadInfo.name}`,
      reason: `${leadInfo.name} has a clear topical fit with this event trend, so the campaign should speak to actual event outcomes, not broad awareness.`,
    };
  }

  if (leadInfo) {
    return {
      promise: `use the lead context from ${leadInfo.name} to make the campaign specific to their visible gaps and buyer questions`,
      asset: "lead-specific audit, message sequence, and CTA asset",
      audience: `${leadInfo.name}'s likely customers and decision makers`,
      reason: `The campaign can reference the lead's public signals instead of sounding like a generic business post.`,
    };
  }

  if (eventCampaign || proofCampaign) {
    return {
      promise: "convert timely attention into registrations, inquiries, and follow-up conversations",
      asset: "event proof post, registration CTA, and follow-up checklist",
      audience: business.customers || "target customers",
      reason: "The trend contains event or programme signals, so the useful business outcome is lead capture and follow-up.",
    };
  }

  return {
    promise: `connect ${trend.title} to ${business.offers || "the offer"} in a way customers can act on`,
    asset: "short campaign post, lead magnet, and manual follow-up sequence",
    audience: business.customers || "target customers",
    reason: "The campaign should translate the trend into a concrete action for the business audience.",
  };
}

function buildBrief({ business, trend, knowledge, lead, channel = "LinkedIn", goal = "leads", payment = {} }) {
  const offer = business.offers || "the main offer";
  const audience = business.customers || "target customers";
  const activity = business.activities || "daily business operations";
  const tone = business.tone || "clear, practical, founder-led";
  const trendText = trend.text || trend.summary || trend.title;
  const businessSignals = getBusinessSignals(`${business.industry || ""} ${business.offers || ""} ${business.activities || ""}`);
  const signalLines = businessSignals.trends.map((item) => `- ${item}`).join("\n");
  const painLines = businessSignals.pains.map((item) => `- ${item}`).join("\n");
  const angleLines = businessSignals.angles.map((item) => `- ${item}`).join("\n");
  const scores = trendScores(business, trend, knowledge);
  const leadInfo = leadSummary(lead);
  const positioning = inferCampaignPositioning({ business, trend, lead, knowledge });
  const paymentLine = payment.price
    ? `${payment.price} ${payment.currency || "KES"} via ${payment.method || "manual payment"}`
    : "No paid offer attached yet";
  const paymentAddress = payment.address ? `\nPayment address: ${payment.address}` : "";
  const knowledgeLines = knowledge.length
    ? knowledge.map((item) => `- ${item.title}: ${item.excerpt}`).join("\n")
    : "- No matching business knowledge yet. Use the business profile and trend details only.";
  const leadLines = leadInfo
    ? `- Lead: ${leadInfo.name}\n${leadInfo.details.map((item) => `- ${item}`).join("\n")}\n- Lead notes: ${leadInfo.body || "No extra lead notes captured yet."}`
    : "- No specific lead attached. Campaign is based on the selected business and trend only.";

  return `# ${business.name}: ${trend.title}

## Trend Summary
${trendText}

## Campaign Positioning
- Promise: ${positioning.promise}
- Primary asset: ${positioning.asset}
- Target audience: ${positioning.audience}
- Why this is specific: ${positioning.reason}

## Lead Context Used
${leadLines}

## Why It Is Spreading
- It connects to money, operations, trust, regulation, customer behavior, or founder anxiety.
- It is easy for people to explain with a concrete business example.
- It creates an immediate question: "What should I do about this now?"

## Business-Type Signals To Watch
${signalLines}

## Market Pains This Business Can Speak To
${painLines}

## Estimated Lifespan
${estimateLifespan(trend)}

## Relevance Scores
| Signal | Score |
|---|---:|
| Kenya relevance | ${scores.kenya_relevance}/5 |
| Business relevance | ${scores.business_relevance}/5 |
| Content potential | ${scores.content_potential}/5 |
| Urgency | ${scores.urgency}/5 |
| Evidence quality | ${scores.evidence_quality}/5 |

## Why This Matters To The Business
${business.name} deals with ${activity}. This trend is useful because it gives the business a timely reason to talk to ${audience} about ${offer}. The campaign should focus on ${positioning.promise}.

## Content Angles
${angleLines}

## Hooks
1. ${trend.title} is not just an update. It is a lead capture moment for ${audience}.
2. If you are interested in ${offer}, here is the practical next step from this trend.
3. ${leadInfo ? `${leadInfo.name} can use this moment to answer the question prospects already have.` : `The real lesson from this trend is about ${offer}.`}

## ${channel} Script
Opening: "${trend.title} is getting attention. Here is what it means for ${positioning.audience}."

Body: "The issue is not just the trend itself. The opportunity is ${positioning.promise}. For ${business.name}, the practical move is to package this into ${positioning.asset}, then follow up with people who show intent."

Close: "${business.name} helps with ${offer}. If you want help turning this into action, reach out today."

## Storyboard
Scene 1, 0-5s: Show the trend headline or visual reference. Caption: "This is not just a trend."
Scene 2, 5-18s: Founder speaks to camera. Caption: "What it means for ${audience}"
Scene 3, 18-40s: Show 3 simple action points. Caption: "What to check today"
Scene 4, 40-55s: Show business offer. Caption: "${offer}"
Scene 5, 55-60s: CTA screen. Caption: "DM ${business.name} for help"

## Image Prompts
- A Kenyan SME founder reviewing daily operations in a clean, realistic office setting.
- A social media trend dashboard with business and money signals highlighted.
- A simple campaign CTA card for ${business.name}, professional and trustworthy.

## Caption
Trends are only useful when they help you make a better business decision. Here is what ${audience} should pay attention to now.

## CTA
${business.cta || `Talk to ${business.name} about ${offer}.`}

## Lead Generator
### Ideal Leads
- ${positioning.audience} who are already reacting to this trend.
- People asking for recommendations, pricing, compliance help, implementation help, or trusted providers.
- Businesses that mention the pain in comments, WhatsApp groups, LinkedIn posts, events, or founder communities.

### Where To Find Them
- LinkedIn posts and comments around the trend.
- WhatsApp founder groups and customer communities.
- Reddit, X, YouTube comments, and local business forums.
- Existing customers who can refer another founder with the same problem.

### Lead Magnet
Offer ${positioning.asset}. Use it to start a conversation, then offer ${offer}.

### Qualification Questions
1. What kind of business do you run?
2. Where is this trend showing up in your work right now?
3. Have you already tried to solve it?
4. What happens if this is not fixed in the next 7-14 days?
5. Would a paid ${offer} help you move faster?

### Outreach Message
Hi, I saw your interest around ${trend.title}. ${business.name} put together a practical ${positioning.asset} for ${positioning.audience}. If useful, we can also help with ${offer}. Want me to send it?

### Follow-Up Sequence
Day 0: Send the checklist and ask one qualification question.
Day 1: Share one practical fix related to ${activity}.
Day 3: Offer ${business.cta || offer}.
Day 7: Ask if they want a quick review or referral to someone who can help.

## Payment Request
Offer: ${offer}
Payment: ${paymentLine}${paymentAddress}

## Grounding Notes
Tone: ${tone}
Goal: ${goal}

## Business Knowledge Used
${knowledgeLines}
`;
}

export async function listGrowthItems() {
  await ensureDirs();
  const [businesses, knowledge, leads, trends, briefs, campaigns, storyboards, videoSpecs] = await Promise.all([
    listMarkdown(DIRS.businesses, "businesses"),
    listMarkdown(DIRS.knowledge, "knowledge"),
    listMarkdown(DIRS.leads, "leads"),
    listMarkdown(DIRS.trends, "trends"),
    listMarkdown(DIRS.briefs, "briefs"),
    listMarkdown(DIRS.campaigns, "campaigns"),
    listMarkdown(DIRS.storyboards, "storyboards"),
    listMarkdown(DIRS.videoSpecs, "video-specs"),
  ]);

  return { businesses, knowledge, leads, trends, briefs, campaigns, storyboards, videoSpecs };
}

export async function createBusiness(input = {}) {
  await ensureDirs();
  const name = String(input.name || "").trim();
  if (!name) return { success: false, error: "Business name is required" };

  const slug = slugify(input.slug || name, "business");
  const path = join(DIRS.businesses, `${slug}.md`);

  try {
    await stat(path);
    return { success: false, error: "A business with this slug already exists" };
  } catch {
    // available
  }

  const data = {
    name,
    title: name,
    industry: String(input.industry || "").trim(),
    location: String(input.location || "").trim(),
    customers: String(input.customers || "").trim(),
    offers: String(input.offers || "").trim(),
    activities: String(input.activities || "").trim(),
    tone: String(input.tone || "clear, practical, founder-led").trim(),
    channels: String(input.channels || "LinkedIn, TikTok/Reels, WhatsApp").trim(),
    content_goals: String(input.content_goals || "leads, trust, awareness").trim(),
    cta: String(input.cta || "").trim(),
    created_at: today(),
  };

  const body = `# ${name}

## Daily Activities
${data.activities}

## What They Deal With
${String(input.deals_with || "").trim()}

## Content They Want
${String(input.content_wants || "").trim()}
`;

  await writeFile(path, `${stringifyFrontMatter(data)}\n\n${body}`, "utf-8");
  return { success: true, business: { slug, ...data, path, web_path: `/content/businesses/${slug}.md` } };
}

export async function addKnowledge(input = {}) {
  await ensureDirs();
  const business = slugify(input.business || "", "");
  const title = String(input.title || "").trim();
  const text = String(input.text || "").trim();
  if (!business) return { success: false, error: "Business is required" };
  if (!title) return { success: false, error: "Knowledge title is required" };
  if (!text) return { success: false, error: "Knowledge text is required" };

  const slug = `${business}-${slugify(title, "knowledge")}`;
  const path = join(DIRS.knowledge, `${slug}.md`);
  const data = {
    title,
    business,
    source_type: String(input.source_type || "manual").trim(),
    created_at: today(),
  };

  await writeFile(path, `${stringifyFrontMatter(data)}\n\n${text}\n`, "utf-8");
  return { success: true, item: { slug, ...data, path, web_path: `/content/knowledge/${slug}.md` } };
}

export async function captureTrend(input = {}) {
  await ensureDirs();
  const title = String(input.title || "").trim();
  const text = String(input.text || "").trim();
  if (!title) return { success: false, error: "Trend title is required" };
  if (!text) return { success: false, error: "Trend text is required" };

  const slug = slugify(input.slug || title, "trend");
  const path = join(DIRS.trends, `${slug}.md`);
  const data = {
    title,
    source: String(input.source || "manual").trim(),
    url: String(input.url || "").trim(),
    keywords: String(input.keywords || "").trim(),
    created_at: today(),
  };

  await writeFile(path, `${stringifyFrontMatter(data)}\n\n${text}\n`, "utf-8");
  return { success: true, trend: { slug, ...data, body: text, path, web_path: `/content/trends/${slug}.md` } };
}

export async function generateCampaign(input = {}) {
  await ensureDirs();
  const growthItems = await listGrowthItems();
  const businesses = growthItems.businesses;
  const knowledge = growthItems.knowledge;
  const trends = growthItems.trends;
  const leads = growthItems.leads;
  const business = businesses.find((item) => item.slug === input.business);
  const trend = trends.find((item) => item.slug === input.trend);
  const lead = input.lead ? leads.find((item) => item.slug === input.lead) : null;

  if (!business) return { success: false, error: "Business not found" };
  if (!trend) return { success: false, error: "Trend not found" };
  if (input.lead && !lead) return { success: false, error: "Lead not found" };

  const businessKnowledge = knowledge.filter((item) => item.business === business.slug);
  const snippets = selectKnowledgeSnippets(business, trend, businessKnowledge);
  const channel = String(input.channel || "LinkedIn").trim();
  const goal = String(input.goal || "leads").trim();
  const payment = {
    price: String(input.price || "").trim(),
    currency: String(input.currency || "KES").trim(),
    method: String(input.payment_method || "Avalanche USDC or manual").trim(),
    address: String(input.payment_address || "").trim(),
    token: String(input.payment_token || "").trim(),
  };
  const brief = buildBrief({ business, trend, knowledge: snippets, lead, channel, goal, payment });
  const slug = `${business.slug}-${trend.slug}`;
  const positioning = inferCampaignPositioning({ business, trend, lead, knowledge: snippets });

  const frontMatter = {
    title: `${business.name}: ${trend.title}`,
    business: business.slug,
    trend: trend.slug,
    lead: lead?.slug || "",
    target_lead: lead?.title || lead?.name || "",
    channel,
    goal,
    audience: positioning.audience,
    primary_asset: positioning.asset,
    campaign_promise: positioning.promise,
    price: payment.price,
    currency: payment.currency,
    payment_method: payment.method,
    payment_address: payment.address,
    payment_token: payment.token,
    status: "draft",
    created_at: today(),
  };

  const briefPath = join(DIRS.briefs, `${slug}.md`);
  const campaignPath = join(DIRS.campaigns, `${slug}.md`);
  const storyboardPath = join(DIRS.storyboards, `${slug}.md`);
  const videoSpecPath = join(DIRS.videoSpecs, `${slug}.md`);

  await writeFile(briefPath, `${stringifyFrontMatter(frontMatter)}\n\n${brief}`, "utf-8");
  const needsToken = /usdc|erc-20|token/i.test(`${payment.method} ${payment.currency}`);
  const tokenLine = payment.token
    ? payment.token
    : needsToken
      ? "Add Fuji USDC token address before sending ERC-20 payment."
      : "Native AVAX or manual payment";
  await writeFile(campaignPath, `${stringifyFrontMatter(frontMatter)}\n\n# Campaign\n\nBrief: /content/briefs/${slug}.md\n\nStoryboard: /content/storyboards/${slug}.md\n\nVideo spec: /content/video-specs/${slug}.md\n\nTarget lead: ${frontMatter.target_lead || "No specific lead attached"}\n\nPromise: ${positioning.promise}\n\nPrimary asset: ${positioning.asset}\n\nCTA: ${business.cta || "Manual follow-up"}\n\n## Avalanche Payment\n\nAmount: ${payment.price ? `${payment.price} ${payment.currency}` : "Not set"}\n\nMethod: ${payment.method}\n\nRecipient: ${payment.address || "Not set"}\n\nToken contract: ${tokenLine}\n\nStatus: pending\n\n## Lead Capture\n\nLead magnet: ${positioning.asset}\n\nTarget leads:\n\n- ${positioning.audience}\n- Event hosts, founders, communities, or teams that need ${business.offers || "this offer"}\n- People already engaging with ${trend.title} or related website/community topics\n\nQualification questions:\n\n1. What kind of business, community, or team do you run?\n2. What event, campaign, or outcome are you trying to create?\n3. What has made this hard so far?\n4. What happens if this is not solved in the next 7-14 days?\n5. Would a paid ${business.offers || "service"} help you move faster?\n\nOutreach message:\n\nHi, I saw your interest around ${trend.title}. ${business.name} put together ${positioning.asset} for ${positioning.audience}. If useful, we can also help with ${business.offers || "the next step"}. Want me to send it?\n\n## Video Generation\n\nUse the video spec at /content/video-specs/${slug}.md as the Remotion input. It contains scenes, captions, narration, image prompts, CTA, and payment overlay details.\n\n## Manual Metrics\n\n- Views:\n- Comments:\n- Shares:\n- Inquiries:\n- Qualified leads:\n- Calls booked:\n- Payments:\n- Revenue:\n`, "utf-8");
  await writeFile(storyboardPath, `${stringifyFrontMatter(frontMatter)}\n\n${brief.split("## Storyboard")[1]?.trim() || brief}`, "utf-8");
  const videoSpec = {
    composition: "TrendCampaignVideo",
    durationSeconds: 60,
    business: business.name,
    targetLead: frontMatter.target_lead,
    title: trend.title,
    channel,
    goal,
    cta: business.cta || `Talk to ${business.name}`,
    payment: {
      price: payment.price,
      currency: payment.currency,
      method: payment.method,
      address: payment.address,
      token: payment.token,
    },
    scenes: [
      {
        id: "hook",
        start: 0,
        duration: 5,
        caption: "This is not just a trend.",
        narration: `${trend.title} is getting attention. Here is what it means for ${positioning.audience}.`,
        imagePrompt: `Realistic Kenyan business event or workspace scene for ${business.name}, showing ${trend.title}.`,
      },
      {
        id: "problem",
        start: 5,
        duration: 15,
        caption: `What it means for ${business.customers || "customers"}`,
        narration: `${business.name} can use this to ${positioning.promise}.`,
        imagePrompt: `People discussing business opportunities in Nairobi, professional event setting, natural lighting.`,
      },
      {
        id: "solution",
        start: 20,
        duration: 20,
        caption: `Use ${business.offers || "the offer"} to act faster`,
        narration: `The practical move is ${positioning.asset}.`,
        imagePrompt: `Clean campaign dashboard with leads, event signups, and outreach messages.`,
      },
      {
        id: "cta",
        start: 40,
        duration: 20,
        caption: business.cta || `Contact ${business.name}`,
        narration: business.cta || `Reach out to ${business.name} for the next step.`,
        imagePrompt: `Professional CTA card for ${business.name}, readable text, modern business style.`,
      },
    ],
  };
  await writeFile(videoSpecPath, `${stringifyFrontMatter(frontMatter)}\n\n\`\`\`json\n${JSON.stringify(videoSpec, null, 2)}\n\`\`\`\n`, "utf-8");

  return {
    success: true,
    campaign: {
      slug,
      title: frontMatter.title,
      brief: `/content/briefs/${slug}.md`,
      campaign: `/content/campaigns/${slug}.md`,
      storyboard: `/content/storyboards/${slug}.md`,
      video_spec: `/content/video-specs/${slug}.md`,
      knowledge_used: snippets,
    },
  };
}
