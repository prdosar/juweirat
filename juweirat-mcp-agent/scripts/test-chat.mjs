// Envoie un message à une session existante et parse le stream SSE.
// Usage : node scripts/test-chat.mjs <sessionId> "<question>"
import { readFileSync } from "node:fs";

const sessionId = process.argv[2] ?? "1";
const question = process.argv[3] ?? "Quelle est l'occupation en août 2026 ?";
const jwt = readFileSync(".test-jwt.txt", "utf-8").trim();

const res = await fetch(`http://127.0.0.1:3010/api/chat/sessions/${sessionId}/message`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
    Accept: "text/event-stream",
  },
  body: JSON.stringify({ message: question }),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
let currentEvent = "";
let assistantText = "";

process.stdout.write(`\n═══ Q: ${question}\n═══ A: `);

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl);
    buffer = buffer.slice(nl + 1);

    if (line.startsWith("event: ")) currentEvent = line.slice(7).trim();
    else if (line.startsWith("data: ")) {
      try {
        const data = JSON.parse(line.slice(6));
        switch (currentEvent) {
          case "text":
            process.stdout.write(data.delta);
            assistantText += data.delta;
            break;
          case "tool_use":
            process.stdout.write(`\n  → 🔧 ${data.tool}(${JSON.stringify(data.args)})`);
            break;
          case "tool_result":
            process.stdout.write(` ← ${data.sizeChars} chars${data.isError ? " ❌" : " ✅"}\n`);
            break;
          case "done":
            console.log(`\n═══ Tokens : in=${data.tokensIn} out=${data.tokensOut} cacheRead=${data.cacheReadTokens}`);
            break;
          case "error":
            console.error(`\n❌ ERROR: ${data.message}`);
            process.exit(1);
        }
      } catch { /* ignore malformed */ }
    }
  }
}
