import "server-only";
import crypto from "crypto";

const HASH_VERSION = "scrypt";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${HASH_VERSION}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [version, salt, hash] = stored.split("$");
  if (version !== HASH_VERSION || !salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(derived, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signShareToken(token: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export function shareCookieName(token: string) {
  return `share_board_${token}`;
}
