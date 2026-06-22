import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

describe("AGENT_PROVIDER_MAP", () => {
  let AGENT_PROVIDER_MAP;

  before(async () => {
    const mod = await import("../../providers/index.js");
    AGENT_PROVIDER_MAP = mod.AGENT_PROVIDER_MAP;
  });

  it("maps all expected agents", () => {
    const expected = [
      "router", "research", "outline", "draft", "editor",
      "checker", "final-reviewer", "metadata", "publisher",
    ];
    for (const agent of expected) {
      assert.ok(AGENT_PROVIDER_MAP[agent], `Missing mapping for ${agent}`);
    }
  });

  it("each mapping has provider and model", () => {
    for (const [agent, config] of Object.entries(AGENT_PROVIDER_MAP)) {
      assert.ok(config.provider, `${agent} missing provider`);
      assert.ok(config.model, `${agent} missing model`);
    }
  });

  it("references only known providers", () => {
    const known = ["gemini", "groq", "qwen", "ollama"];
    for (const config of Object.values(AGENT_PROVIDER_MAP)) {
      assert.ok(known.includes(config.provider), `Unknown provider: ${config.provider}`);
    }
  });

  it("router uses groq for speed", () => {
    assert.equal(AGENT_PROVIDER_MAP.router.provider, "groq");
  });

  it("research uses gemini for quality", () => {
    assert.equal(AGENT_PROVIDER_MAP.research.provider, "gemini");
    assert.equal(AGENT_PROVIDER_MAP.research.model, "pro");
  });

  it("checker uses groq for fast checks", () => {
    assert.equal(AGENT_PROVIDER_MAP.checker.provider, "groq");
  });
});

describe("callProvider", () => {
  let callProvider;

  before(async () => {
    const mod = await import("../../providers/index.js");
    callProvider = mod.callProvider;
  });

  it("throws for unknown agent", async () => {
    await assert.rejects(
      () => callProvider("nonexistent-agent", "prompt"),
      /Unknown agent/,
    );
  });

  it("throws for agent with missing API key", async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await assert.rejects(
      () => callProvider("research", "test prompt"),
      /GEMINI_API_KEY/,
    );

    if (origKey) process.env.GEMINI_API_KEY = origKey;
  });
});

describe("providers object", () => {
  let providers;

  before(async () => {
    const mod = await import("../../providers/index.js");
    providers = mod.providers;
  });

  it("exports all four providers", () => {
    assert.ok(providers.gemini);
    assert.ok(providers.groq);
    assert.ok(providers.qwen);
    assert.ok(providers.ollama);
  });

  it("each provider has a call function", () => {
    for (const [name, provider] of Object.entries(providers)) {
      assert.equal(typeof provider.call, "function", `${name}.call is not a function`);
    }
  });
});
