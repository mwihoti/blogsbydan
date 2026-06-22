import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

let tmpDir;
let origDir;

before(async () => {
  origDir = process.cwd();
  tmpDir = await mkdtemp(join(tmpdir(), "bbd-workflow-int-"));

  await mkdir(join(tmpDir, "content", "ideas"), { recursive: true });
  await mkdir(join(tmpDir, "agents"), { recursive: true });

  await writeFile(
    join(tmpDir, "content", "ideas", "test-idea.md"),
    `---
title: Workflow Test
date: 2026-06-15
status: idea
tags:
  - Test
summary: Testing workflow.
---
Body.
`,
  );

  await writeFile(
    join(tmpDir, "agents", "research-agent.md"),
    "# Research Agent\nDo research.",
  );
});

after(async () => {
  process.chdir(origDir);
  await rm(tmpDir, { recursive: true, force: true });
});

function runWorkflow(args) {
  const script = join(origDir, "scripts", "run-workflow.js");
  try {
    const output = execSync(`node ${script} ${args}`, {
      cwd: tmpDir,
      encoding: "utf-8",
      timeout: 10000,
    });
    return { code: 0, output };
  } catch (err) {
    return { code: err.status, output: err.stdout, error: err.stderr };
  }
}

describe("CLI Workflow Integration", () => {
  it("--help shows usage", () => {
    const { code, output } = runWorkflow("--help");
    assert.equal(code, 0);
    assert.match(output, /Usage/);
    assert.match(output, /--post/);
  });

  it("--check shows next step for idea", () => {
    const result = runWorkflow(
      `--check --post "${tmpDir}/content/ideas/test-idea.md"`,
    );
    assert.equal(result.code, 0);
    assert.match(result.output, /Next step: research/);
  });

  it("--dry-run does not call API", () => {
    const result = runWorkflow(
      `--dry-run --post "${tmpDir}/content/ideas/test-idea.md"`,
    );
    assert.equal(result.code, 0);
    assert.match(result.output, /\[Dry Run\]/);
  });

  it("errors on missing file", () => {
    const result = runWorkflow(
      `--post "${tmpDir}/content/ideas/nonexistent.md"`,
    );
    assert.equal(result.code, 1);
    assert.match(result.output || result.error || "", /not found/);
  });

  it("errors on no post argument", () => {
    const result = runWorkflow("");
    assert.equal(result.code, 1);
    assert.match(result.output || result.error || "", /Usage/);
  });

  it("dry-run creates no output files", async () => {
    const outDir = join(tmpDir, "content", "research");
    try {
      await readFile(join(outDir, "test-idea.research.md"));
      assert.fail("Should not have created output file");
    } catch (e) {
      assert.ok(e.code === "ENOENT" || e.code === "ENOTDIR");
    }
  });
});
