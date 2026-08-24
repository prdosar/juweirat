// Smoke test manuel : lance le serveur MCP en stdio et invoque initialize + tools/list.
// N'exécute aucune requête DB (donc pas besoin d'un Postgres joignable).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(__dirname, "..", "dist", "index.js");

const child = spawn(process.execPath, [serverEntry], {
  stdio: ["pipe", "pipe", "inherit"],
  env: {
    ...process.env,
    MCP_PG_USER: process.env.MCP_PG_USER ?? "dummy",
    MCP_PG_PASSWORD: process.env.MCP_PG_PASSWORD ?? "dummy",
  },
});

let buffer = "";
const pending = new Map();

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString("utf-8");
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch {
      // ignore non-JSON output
    }
  }
});

function send(id, method, params) {
  return new Promise((resolveP) => {
    pending.set(id, resolveP);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

try {
  const init = await send(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke-test", version: "0.0.1" },
  });
  console.log("initialize →", JSON.stringify(init.result?.serverInfo ?? init.result, null, 2));

  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const tools = await send(2, "tools/list", {});
  const list = tools.result?.tools ?? [];
  console.log(`\ntools/list → ${list.length} tools :`);
  for (const t of list) {
    console.log(` - ${t.name}: ${t.description.slice(0, 100)}${t.description.length > 100 ? "…" : ""}`);
  }

  process.exit(list.length === 3 ? 0 : 1);
} catch (err) {
  console.error("Smoke test failed:", err);
  process.exit(1);
} finally {
  child.kill();
}
