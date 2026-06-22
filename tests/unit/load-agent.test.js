import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir;
let origDir;

before(async () => {
  origDir = process.cwd();
  tmpDir = await mkdtemp(join(tmpdir(), "bbd-load-agent-"));
  process.chdir(tmpDir);
});

after(async () => {
  process.chdir(origDir);
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

describe("loadAgentInstruction", () => {
  it("loads agent instruction for known agent", async () => {
    const loadAgent = await import("../../scripts/load-agent.js");
    const result = await loadAgent.loadAgentInstruction("research");
    assert.match(result, /Research Agent/);
    assert.match(result, /source material/);
  });

  it("returns fallback for missing agent", async () => {
    const loadAgent = await import("../../scripts/load-agent.js");
    const result = await loadAgent.loadAgentInstruction("nonexistent");
    assert.match(result, /You are the nonexistent agent/);
  });
});
