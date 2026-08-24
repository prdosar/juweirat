// Appelle tous les tools MCP contre la BDD réelle.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(__dirname, "..", "dist", "index.js");

const child = spawn(process.execPath, [serverEntry], {
  stdio: ["pipe", "pipe", "inherit"],
  env: process.env,
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
    } catch {}
  }
});

let nextId = 1;
function send(method, params) {
  const id = nextId++;
  return new Promise((resolveP) => {
    pending.set(id, resolveP);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

async function callTool(name, args) {
  const res = await send("tools/call", { name, arguments: args });
  const text = res.result?.content?.[0]?.text ?? JSON.stringify(res);
  const isError = res.result?.isError === true;
  const preview = text.length > 800 ? text.slice(0, 800) + `\n… [tronqué, ${text.length} chars total]` : text;
  console.log(`\n━━━ ${name} ${JSON.stringify(args)} ${isError ? "❌" : "✅"}`);
  console.log(preview);
  return { text, isError };
}

try {
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-tools", version: "0.0.1" },
  });
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const tests = [
    // Occupation & revenus
    ["get_occupancy", { from: "2026-08-01", to: "2026-08-31" }],
    ["get_occupancy", { from: "2026-08-01", to: "2026-08-31", category: "T3" }],
    ["get_revenue",   { from: "2026-08-01", to: "2026-08-31" }],
    ["compare_periods", { metric: "occupancy", a: { from: "2026-07-01", to: "2026-07-31" }, b: { from: "2026-08-01", to: "2026-08-31" } }],

    // Réservations
    ["search_reservations", { limit: 5 }],
    ["search_reservations", { status: "NoShow", limit: 5 }],
    ["get_no_show_stats",   { from: "2026-01-01", to: "2026-12-31" }],

    // Folios & compta
    ["list_unpaid_folios", { limit: 5 }],
    ["get_cash_report",    { date: "2026-08-24" }],
    ["get_tva_report",     { from: "2026-08-01", to: "2026-08-31" }],

    // Housekeeping
    ["list_rooms_by_status", {}],
    ["list_maintenance_incidents", {}],
  ];

  let failures = 0;
  for (const [name, args] of tests) {
    const { isError } = await callTool(name, args);
    if (isError) failures += 1;
  }

  // Fetch un ID pour tester get_reservation / get_client_history / get_folio
  const firstResa = await callTool("search_reservations", { limit: 1 });
  const parsed = JSON.parse(firstResa.text);
  if (parsed.reservations?.length) {
    const r = parsed.reservations[0];
    const detailed = await callTool("get_reservation", { identifier: String(r.id) });
    await callTool("get_reservation", { identifier: r.reference });
    const detail = JSON.parse(detailed.text);
    const clientId = detail.reservation?.clientId;
    if (clientId) await callTool("get_client_history", { clientId });
    await callTool("get_folio", { identifier: `res:${r.id}` });
  }

  console.log(`\n━━━ Résumé : ${tests.length} tests, ${failures} échecs`);
  process.exit(failures);
} catch (err) {
  console.error("Test failed:", err);
  process.exit(1);
} finally {
  child.kill();
}
