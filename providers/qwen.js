const QWEN_API = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const MODEL_MAP = {
  hosted: "qwen-plus",
  coder: "qwen-coder-plus",
  turbo: "qwen-turbo",
};

export async function callQwen({ model = "hosted", messages = [], systemMessage = "" }) {
  const modelName = MODEL_MAP[model] || MODEL_MAP.hosted;

  const body = {
    model: modelName,
    messages: [
      ...(systemMessage ? [{ role: "system", content: systemMessage }] : []),
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 8192,
  };

  const res = await fetch(QWEN_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Qwen API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
