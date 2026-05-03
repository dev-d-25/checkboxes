import crypto from "node:crypto";

function randomToken(size = 32) {
  return crypto.randomBytes(size).toString("base64url");
}

export function generateCodeVerifier() {
  return randomToken(32);
}

export function generateCodeChallenge(codeVerifier) {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

export function generateState() {
  return randomToken(24);
}

export function generateNonce() {
  return randomToken(24);
}
