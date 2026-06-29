import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSourceItem, scoreTrend } from "../../sources/index.js";
import { fromManualInput } from "../../sources/manual.js";

describe("sources", () => {
  it("normalizes manual trend input", () => {
    const item = fromManualInput({
      title: "Kenya tax debate",
      url: "https://example.com/post",
      text: "Founders are discussing new tax compliance requirements.",
      metrics: { likes: 10, comments: 3 },
    });

    assert.equal(item.source, "manual");
    assert.equal(item.title, "Kenya tax debate");
    assert.equal(item.metrics.likes, 10);
    assert.equal(item.metrics.comments, 3);
  });

  it("fills source defaults", () => {
    const item = normalizeSourceItem({ title: "Signal" });
    assert.equal(item.source, "manual");
    assert.equal(item.title, "Signal");
    assert.equal(item.metrics.views, 0);
  });

  it("scores business relevance", () => {
    const score = scoreTrend(
      { title: "Kenyan SME bookkeeping trend", text: "Money and business compliance", metrics: {} },
      { industry: "bookkeeping", customers: "SME founders", offers: "compliance cleanup" },
    );

    assert.ok(score.kenya_relevance > 0);
    assert.ok(score.business_relevance > 0);
    assert.ok(score.content_potential > 0);
  });
});
