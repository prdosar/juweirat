import { SignJWT } from "jose";
import { config } from "../config.js";

const secretKey = new TextEncoder().encode(config.jwt.secret);

/**
 * Génère un JWT de service pour se connecter au Hub SignalR côté .NET.
 * Claims minimum requis par juweirat-api :
 *  - iss / aud : cf. config.jwt.issuer / audience
 *  - sub       : identifiant du service (pas de user PMS derrière)
 *  - role      : "service" (le Hub exige juste [Authorize], pas de rôle spécifique)
 *
 * TTL 24h — le SignalR accessTokenFactory sera rappelé automatiquement à chaque
 * (re)connexion, on renouvelle tant que le process vit.
 */
export async function generateServiceJwt(): Promise<string> {
  return new SignJWT({
    email: `${config.signalr.serviceSubject}@juweirat.internal`,
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "service",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(config.signalr.serviceSubject)
    .setIssuer(config.jwt.issuer)
    .setAudience(config.jwt.audience)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
}
