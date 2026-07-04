import { leadProviderStatus } from "../../api/leads.js";
import { test, describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual, ok, notStrictEqual, deepStrictEqual } from "node:assert";

describe("leadProviderStatus", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all relevant env vars before each test
    delete process.env.SERPAPI_KEY;
    delete process.env.serpapi_key;
    delete process.env.SERP_API_KEY;
    delete process.env.APIFY_TOKEN;
    delete process.env.apify_token;
    delete process.env.APIFY_GOOGLE_MAPS_ACTOR_ID;
    delete process.env.APIFY_ACTOR_ID;
    delete process.env.apify_actor_id;
    delete process.env.OUTSCRAPER_API_KEY;
    delete process.env.outscraper_key;
  });

  afterEach(() => {
    // Restore original env after each test
    Object.assign(process.env, originalEnv);
  });

  it("returns no provider when no keys configured", () => {
    const status = leadProviderStatus();
    strictEqual(status.active_provider, null);
    strictEqual(status.has_provider, false);
    ok(status.error);
    strictEqual(status.error.includes("No lead provider configured"), true);
    strictEqual(status.serpapi, false);
    strictEqual(status.apify, false);
    strictEqual(status.outscraper, false);
  });

  it("returns serpapi as active when SERPAPI_KEY is set", () => {
    process.env.SERPAPI_KEY = "test-key";
    const status = leadProviderStatus();
    strictEqual(status.active_provider, "serpapi-google-maps");
    strictEqual(status.has_provider, true);
    strictEqual(status.error, null);
    strictEqual(status.serpapi, true);
  });

  it("returns apify as active when APIFY_TOKEN and ACTOR_ID are set", () => {
    process.env.APIFY_TOKEN = "test-token";
    process.env.APIFY_GOOGLE_MAPS_ACTOR_ID = "test-actor";
    const status = leadProviderStatus();
    strictEqual(status.active_provider, "apify-google-maps");
    strictEqual(status.has_provider, true);
    strictEqual(status.error, null);
    strictEqual(status.apify, true);
  });

  it("returns outscraper as active when OUTSCRAPER_API_KEY is set", () => {
    process.env.OUTSCRAPER_API_KEY = "test-outscraper-key";
    const status = leadProviderStatus();
    strictEqual(status.active_provider, "outscraper");
    strictEqual(status.has_provider, true);
    strictEqual(status.error, null);
    strictEqual(status.outscraper, true);
  });

  it("prefers serpapi over apify when both are set", () => {
    process.env.SERPAPI_KEY = "test-key";
    process.env.APIFY_TOKEN = "test-token";
    process.env.APIFY_GOOGLE_MAPS_ACTOR_ID = "test-actor";
    const status = leadProviderStatus();
    strictEqual(status.active_provider, "serpapi-google-maps");
  });

  it("prefers serpapi over outscraper when both are set", () => {
    process.env.SERPAPI_KEY = "test-key";
    process.env.OUTSCRAPER_API_KEY = "test-outscraper-key";
    const status = leadProviderStatus();
    strictEqual(status.active_provider, "serpapi-google-maps");
  });

  it("prefers apify over outscraper when both are set (no serpapi)", () => {
    process.env.APIFY_TOKEN = "test-token";
    process.env.APIFY_GOOGLE_MAPS_ACTOR_ID = "test-actor";
    process.env.OUTSCRAPER_API_KEY = "test-outscraper-key";
    const status = leadProviderStatus();
    strictEqual(status.active_provider, "apify-google-maps");
  });
});
