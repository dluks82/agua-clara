import "server-only";

import crypto from "node:crypto";
import { env } from "@/lib/env";

export function generatePublicToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPublicToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function encryptPublicToken(token: string): string {
  const key = crypto.createHash("sha256").update(env.AUTH_SECRET).digest(); // 32 bytes
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptPublicToken(tokenEnc: string): string | null {
  try {
    const [ivB64, ctB64, tagB64] = tokenEnc.split(".");
    if (!ivB64 || !ctB64 || !tagB64) return null;
    const iv = Buffer.from(ivB64, "base64url");
    const ciphertext = Buffer.from(ctB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const key = crypto.createHash("sha256").update(env.AUTH_SECRET).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}
