import { discoverLeads, searchLeads } from "../../api/leads.js";
import { test, describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual, ok, deepStrictEqual } from "node:assert";

describe("discoverLeads and searchLeads", () => {
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

  describe("discoverLeads", () => {
    it("returns error when no provider is configured", async () => {
      const result = await discoverLeads({
        business_type: "restaurants",
        city: "Nairobi",
      });
      strictEqual(result.success, false);
      ok(result.error);
      strictEqual(result.error.includes("No lead provider configured"), true);
      ok(result.provider === null);
    });

    it("returns error when business_type is missing", async () => {
      const result = await discoverLeads({ city: "Nairobi" });
      strictEqual(result.success, false);
      strictEqual(result.error, "Business type is required");
    });

    it("returns error when city is missing", async () => {
      const result = await discoverLeads({ business_type: "restaurants" });
      strictEqual(result.success, false);
      strictEqual(result.error, "City is required");
    });
  });

  describe("searchLeads", () => {
    it("returns error when no provider is configured", async () => {
      const result = await searchLeads({
        business_type: "restaurants",
        city: "Nairobi",
        offer: "test offer",
      });
      strictEqual(result.success, false);
      ok(result.error);
      strictEqual(result.error.includes("No lead provider configured"), true);
      ok(result.provider === null);
    });

    it("returns error when business_type is missing", async () => {
      const result = await searchLeads({ city: "Nairobi", offer: "test" });
      strictEqual(result.success, false);
      strictEqual(result.error, "Business type is required");
    });

    it("returns error when city is missing", async () => {
      const result = await searchLeads({
        business_type: "restaurants",
        offer: "test",
      });
      strictEqual(result.success, false);
      strictEqual(result.error, "City is required");
    });

    it("returns error when offer is missing", async () => {
      const result = await searchLeads({
        business_type: "restaurants",
        city: "Nairobi",
      });
      strictEqual(result.success, false);
      strictEqual(result.error, "Your offer is required");
    });
  });
});
