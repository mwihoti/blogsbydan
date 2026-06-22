const IMAGE_PROVIDERS = {
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent",
    async generate(prompt, apiKey) {
      const res = await fetch(`${this.url}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, candidateCount: 1 },
        }),
      });
      if (!res.ok) throw new Error(`Gemini image error: ${await res.text()}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    },
  },
};

export async function generateCoverImage({ prompt, provider = "gemini", apiKey }) {
  const p = IMAGE_PROVIDERS[provider];
  if (!p) throw new Error(`Unknown image provider: ${provider}`);

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error(`No API key for image provider: ${provider}`);

  return p.generate(prompt, key);
}
