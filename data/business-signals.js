export const BUSINESS_SIGNAL_LIBRARY = [
  {
    match: ["real estate", "property", "realtor", "letting", "agency"],
    trends: [
      "high rent pressure",
      "affordable housing demand",
      "diaspora buyers looking remotely",
      "Airbnb and short-stay regulation",
      "mortgage rate uncertainty",
    ],
    pains: [
      "buyers do not trust listing photos or stated property size",
      "qualified viewing requests are hard to separate from casual inquiries",
      "listings stay online too long without serious offers",
      "diaspora clients need better remote walkthroughs before committing",
    ],
    angles: [
      "turn property listings into short video tours that answer buyer objections",
      "create a diaspora buyer guide for one neighborhood",
      "use transparent pricing and location explainers to filter serious leads",
    ],
  },
  {
    match: ["clinic", "hospital", "dental", "health", "wellness", "maternal"],
    trends: [
      "NHIF/SHIF confusion",
      "maternal care access",
      "dental pricing transparency",
      "preventive wellness checks",
      "patient wait time complaints",
    ],
    pains: [
      "patients do not understand pricing, insurance coverage, or appointment steps",
      "reviews often mention waiting time and communication gaps",
      "clinics lose trust when services are unclear online",
      "patients want quick WhatsApp answers before booking",
    ],
    angles: [
      "publish a simple SHIF/NHIF explainer for patients",
      "create fixed-price service explainers for common procedures",
      "use reviews to build a patient FAQ and booking follow-up flow",
    ],
  },
  {
    match: ["restaurant", "food", "cafe", "bar", "eatery", "hotel"],
    trends: [
      "lunch deals",
      "food delivery complaints",
      "TikTok food spots",
      "Google review reputation",
      "weekend brunch discovery",
    ],
    pains: [
      "customers complain when menus, prices, and opening hours are inconsistent",
      "delivery experience can damage reputation even when food is good",
      "restaurants miss demand from TikTok and Google Maps searches",
      "good reviews are not converted into repeat bookings",
    ],
    angles: [
      "turn best-reviewed dishes into short-form content",
      "create a lunch deal campaign for nearby offices",
      "use review replies and menu updates to improve Google conversion",
    ],
  },
  {
    match: ["school", "training", "academy", "college", "education", "bootcamp"],
    trends: [
      "skills-based hiring",
      "AI upskilling",
      "blockchain and fintech careers",
      "parent demand for proof of outcomes",
      "short course discovery",
    ],
    pains: [
      "learners do not understand the outcome of a course before enrolling",
      "training providers struggle to follow up after events and inquiries",
      "course pages often lack proof, alumni stories, and next steps",
      "interested learners need clearer career or business use cases",
    ],
    angles: [
      "turn course outcomes into lead magnets and cohort campaigns",
      "create alumni proof content for trust",
      "build a follow-up sequence for event attendees and inquiries",
    ],
  },
  {
    match: ["blockchain", "crypto", "web3", "fintech", "payments"],
    trends: [
      "stablecoin payments",
      "diaspora remittances",
      "tokenization of real-world assets",
      "blockchain education for SMEs",
      "crypto regulation and compliance",
    ],
    pains: [
      "businesses are curious but do not know practical use cases",
      "founders struggle to separate hype from useful payment or compliance workflows",
      "events create attention but follow-up is often manual",
      "education content does not always convert into qualified leads",
    ],
    angles: [
      "create a founder-friendly stablecoin payments explainer",
      "turn events into follow-up campaigns and qualified lead lists",
      "publish practical blockchain use cases for Kenyan SMEs",
    ],
  },
];

export function getBusinessSignals(businessType = "") {
  const text = String(businessType).toLowerCase();
  return BUSINESS_SIGNAL_LIBRARY.find((entry) => entry.match.some((term) => text.includes(term))) || {
    match: [],
    trends: [
      "customer trust",
      "pricing clarity",
      "faster response expectations",
      "Google review reputation",
      "short-form content discovery",
    ],
    pains: [
      "customers need faster answers before they choose a competitor",
      "the business has visible public signals but weak conversion assets",
      "reviews and online presence suggest repeated questions that can become sales content",
    ],
    angles: [
      "turn repeated questions into content and lead magnets",
      "use public reviews to write more relevant outreach",
      "build a simple follow-up flow for interested customers",
    ],
  };
}
