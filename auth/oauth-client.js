import axios from "axios";

import { authConfig } from "./config.js";

const oauthHttp = axios.create({
  baseURL: authConfig.AUTH_SERVER_BASE_URL,
  timeout: 10000,
});

export function buildAuthorizeUrl({ state, nonce, codeChallenge }) {
  const url = new URL("/o/authorize", authConfig.AUTH_SERVER_BASE_URL);

  url.searchParams.set("client_id", authConfig.OIDC_CLIENT_ID);
  url.searchParams.set("redirect_uri", authConfig.OIDC_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", authConfig.OIDC_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function exchangeAuthorizationCode({ code, codeVerifier }) {
  const { data } = await oauthHttp.post("/o/token", {
    grant_type: "authorization_code",
    client_id: authConfig.OIDC_CLIENT_ID,
    code,
    code_verifier: codeVerifier,
    redirect_uri: authConfig.OIDC_REDIRECT_URI,
  });

  return data;
}

export async function refreshTokens(refreshToken) {
  const { data } = await oauthHttp.post("/o/token", {
    grant_type: "refresh_token",
    client_id: authConfig.OIDC_CLIENT_ID,
    refresh_token: refreshToken,
  });

  return data;
}

export async function revokeRefreshToken(refreshToken) {
  const { data } = await oauthHttp.post("/o/logout", {
    client_id: authConfig.OIDC_CLIENT_ID,
    refresh_token: refreshToken,
  });

  return data;
}

export async function fetchUserInfo(accessToken) {
  const { data } = await oauthHttp.get("/o/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data;
}

export function isUnauthorizedError(error) {
  return axios.isAxiosError(error) && [400, 401].includes(error.response?.status ?? 0);
}

export function isUpstreamHttpError(error) {
  return axios.isAxiosError(error);
}
