import crypto from "crypto";

export function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSecret(prefix: string) {
  return `${prefix}_${crypto.randomBytes(24).toString("base64url")}`;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, encodedHash: string) {
  const [scheme, salt, hash] = encodedHash.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = crypto.scryptSync(password, salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
