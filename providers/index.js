import { callGemini, callGeminiWithStream } from "./gemini.js";
import { callGroq } from "./groq.js";
import { callQwen } from "./qwen.js";
import { callOllama } from "./ollama.js";

export const providers = {
  gemini: { call: callGemini, stream: callGeminiWithStream },
  groq: { call: callGroq },
  qwen: { call: callQwen },
  ollama: { call: callOllama },
};

export const AGENT_PROVIDER_MAP = {
  router: { provider: "groq", model: "fast" },
  research: { provider: "gemini", model: "flash" },
  outline: { provider: "qwen", model: "hosted" },
  draft: { provider: "qwen", model: "coder" },
  editor: { provider: "gemini", model: "pro" },
  checker: { provider: "groq", model: "fast" },
  "final-reviewer": { provider: "gemini", model: "pro" },
  metadata: { provider: "groq", model: "fast" },
  publisher: { provider: "qwen", model: "hosted" },
};

export async function callProvider(agentName, prompt, systemInstruction = "") {
  const config = AGENT_PROVIDER_MAP[agentName];
  if (!config) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const provider = providers[config.provider];
  if (!provider) {
    throw new Error(`Unknown provider: ${config.provider}`);
  }

  const opts = { model: config.model, prompt, systemInstruction };
  if (config.provider === "groq") {
    opts.messages = [{ role: "user", content: prompt }];
    opts.systemMessage = systemInstruction;
  }
  if (config.provider === "qwen") {
    opts.messages = [{ role: "user", content: prompt }];
    opts.systemMessage = systemInstruction;
  }

  return provider.call(opts);
}
