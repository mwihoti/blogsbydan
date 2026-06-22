import { spawn } from "node:child_process";
import { join } from "node:path";

const SCRIPTS_DIR = join(import.meta.dirname, "..", "scripts");

export function runWorkflowStep(postPath, step) {
  return new Promise((resolve, reject) => {
    const args = ["--post", postPath];
    if (step) args.push("--step", step);

    const proc = spawn("node", [join(SCRIPTS_DIR, "run-workflow.js"), ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => { stdout += chunk; });
    proc.stderr.on("data", (chunk) => { stderr += chunk; });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout, error: stderr });
      } else {
        resolve({
          success: false,
          output: stdout,
          error: stderr || `Workflow exited with code ${code}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: stdout, error: err.message });
    });

    setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        output: stdout,
        error: "Workflow timed out after 120s",
      });
    }, 120000);
  });
}
