function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractContactsFromHtml(html = "") {
  const emails = Array.from(new Set(
    (html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
      .map((email) => email.toLowerCase())
      .filter((email) => !email.endsWith(".png") && !email.endsWith(".jpg")),
  ));

  const phones = Array.from(new Set(
    (html.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [])
      .map((phone) => phone.replace(/\s+/g, " ").trim())
      .filter((phone) => phone.replace(/\D/g, "").length >= 9),
  )).slice(0, 5);

  const links = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((match) => match[1]);
  const socials = Array.from(new Set(links.filter((link) => {
    return /instagram\.com|facebook\.com|linkedin\.com|tiktok\.com|twitter\.com|x\.com|wa\.me|whatsapp/i.test(link);
  }))).slice(0, 8);

  return {
    email: emails[0] || "",
    phone: phones[0] || "",
    emails,
    phones,
    socials,
    text: stripHtml(html).slice(0, 1200),
  };
}

export async function enrichWebsiteContacts(website) {
  if (!website || !/^https?:\/\//i.test(website)) {
    return { email: "", phone: "", emails: [], phones: [], socials: [], text: "" };
  }

  const res = await fetch(website, {
    headers: {
      "User-Agent": "blogsbydan-lead-enricher/0.1",
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
    },
  });
  const html = await res.text();
  if (!res.ok) {
    return { email: "", phone: "", emails: [], phones: [], socials: [], text: "" };
  }

  return extractContactsFromHtml(html);
}
