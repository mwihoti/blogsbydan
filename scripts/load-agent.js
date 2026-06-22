import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = join(__dirname, "..", "agents");

export async function loadAgentInstruction(agentName) {
  const filePath = join(AGENTS_DIR, `${agentName}-agent.md`);
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return `You are the ${agentName} agent. Follow the workflow.`;
  }
}
