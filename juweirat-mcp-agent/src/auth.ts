import { jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

const secretKey = new TextEncoder().encode(config.jwt.secret);

export interface AuthedUser {
  id: number;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token JWT manquant." });
    return;
  }
  const token = header.slice("Bearer ".length).trim();

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: ["HS256"],
    });

    // Claims .NET :
    //  - sub  : userId (string dans le JWT)
    //  - email
    //  - http://schemas.microsoft.com/ws/2008/06/identity/claims/role : rôle
    const sub = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : "";
    const roleClaim =
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      payload.role;
    const role = typeof roleClaim === "string" ? roleClaim : "staff";

    if (!sub) {
      res.status(401).json({ error: "Token invalide : sub manquant." });
      return;
    }

    req.user = { id: Number(sub), email, role };
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(401).json({ error: `Token invalide : ${message}` });
  }
}
