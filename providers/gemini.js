const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const MODEL_MAP = {
  pro: "gemini-2.5-pro",
  flash: "gemini-3.5-flash",
};

function buildUrl(model, apiKey) {
  const modelName = MODEL_MAP[model] || MODEL_MAP.flash;
  return `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;
}

export async function callGemini({ model = "flash", prompt, systemInstruction }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(buildUrl(model, apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function callGeminiWithStream({ model = "flash", prompt, systemInstruction, onChunk }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const streamUrl = buildUrl(model, apiKey).replace("generateContent", "streamGenerateContent");
  const res = await fetch(streamUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini stream error (${res.status}): ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line.replace(/^data:\s*/, ""));
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        full += text;
        if (onChunk) onChunk(text);
      } catch {
        // skip non-JSON lines
      }
    }
  }

  return full;
}
