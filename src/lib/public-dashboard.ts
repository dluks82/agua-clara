import "server-only";

import crypto from "node:crypto";

export function generatePublicToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPublicToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

