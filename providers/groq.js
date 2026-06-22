const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

const MODEL_MAP = {
  fast: "llama-3.3-70b-versatile",
  mixtral: "mixtral-8x7b-32768",
};

export async function callGroq({ model = "fast", messages = [], systemMessage = "" }) {
  const modelName = MODEL_MAP[model] || MODEL_MAP.fast;

  const body = {
    model: modelName,
    messages: [
      ...(systemMessage ? [{ role: "system", content: systemMessage }] : []),
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 4096,
  };

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
