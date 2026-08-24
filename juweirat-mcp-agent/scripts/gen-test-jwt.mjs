// Génère un JWT admin de test signé avec le même secret que juweirat-api en dev.
// Usage : node scripts/gen-test-jwt.mjs
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Charge .env local
const envPath = resolve(process.cwd(), ".env");
for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq).trim()] ??= trimmed.slice(eq + 1).trim();
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const token = await new SignJWT({
  email: "admin@juweirat.com",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "admin",
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("1")
  .setIssuer(process.env.JWT_ISSUER)
  .setAudience(process.env.JWT_AUDIENCE)
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

console.log(token);
