const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || process.env.OLLAMA_API || "";

const MODEL_MAP = {
  qwen: "qwen2.5:7b",
  "qwen-coder": "qwen2.5-coder:7b",
  llama: "llama3.2:3b",
};

export async function callOllama({ model = "qwen", prompt, systemMessage = "" }) {
  const modelName = MODEL_MAP[model] || MODEL_MAP.qwen;

  const body = {
    model: modelName,
    prompt,
    system: systemMessage,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 4096,
    },
  };

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(OLLAMA_API_KEY ? { Authorization: `Bearer ${OLLAMA_API_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.response;
}
