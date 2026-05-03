import { fetchUserInfo } from "./oauth-client.js";

export async function resolveUserInfo(accessToken) {
  const claims = await fetchUserInfo(accessToken);

  return normalizeUserClaims(claims);
}

export function normalizeUserClaims(claims = {}) {
  return {
    sub: claims.sub ?? null,
    email: claims.email ?? null,
    email_verified: claims.email_verified ?? false,
    given_name: claims.given_name ?? null,
    family_name: claims.family_name ?? null,
    name: claims.name ?? null,
    picture: claims.picture ?? null,
  };
}

export function readIdTokenClaims(idToken) {
  if (!idToken || typeof idToken !== "string") {
    return null;
  }

  const parts = idToken.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
