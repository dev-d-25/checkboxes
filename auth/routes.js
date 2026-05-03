import express from "express";

import {
  clearAuthCookies,
  clearTransactionCookie,
  getAuthCookies,
  readTransactionCookie,
  setAuthCookies,
  setTransactionCookie,
} from "./cookies.js";
import { attachUserIfAuthenticated } from "./middleware.js";
import { buildAuthorizeUrl, exchangeAuthorizationCode, revokeRefreshToken } from "./oauth-client.js";
import { generateCodeChallenge, generateCodeVerifier, generateNonce, generateState } from "./pkce.js";
import { readIdTokenClaims } from "./userinfo.js";

const router = express.Router();

router.use((req, res, next) => {
  res.locals.setAuthCookies = (tokens) => setAuthCookies(res, tokens);
  res.locals.clearAuthCookies = () => clearAuthCookies(res);
  next();
});

router.get("/login", (req, res) => {
  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  setTransactionCookie(res, { state, nonce, codeVerifier });

  return res.redirect(buildAuthorizeUrl({ state, nonce, codeChallenge }));
});

router.get("/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const transaction = readTransactionCookie(req.headers.cookie ?? "");

  clearTransactionCookie(res);

  if (!code || !state || !transaction || transaction.state !== state) {
    clearAuthCookies(res);
    return res.status(400).send("Invalid authorization callback");
  }

  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: transaction.codeVerifier,
    });
    const idTokenClaims = readIdTokenClaims(tokens.id_token);

    if (!idTokenClaims || idTokenClaims.nonce !== transaction.nonce) {
      clearAuthCookies(res);
      return res.status(400).send("Invalid token nonce");
    }

    setAuthCookies(res, tokens);
    return res.redirect("/");
  } catch (error) {
    console.error("OIDC callback failed", error.response?.data ?? error.message);
    clearAuthCookies(res);
    return res.status(500).send("Authentication failed");
  }
});

router.get("/auth/me", attachUserIfAuthenticated, (req, res) => {
  if (!req.authSession?.authenticated || !req.user) {
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: req.user,
  });
});

async function handleLogout(req, res) {
  const { refreshToken } = getAuthCookies(req.headers.cookie ?? "");

  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
    } catch (error) {
      console.error("Refresh token revocation failed", error.response?.data ?? error.message);
    }
  }

  clearTransactionCookie(res);
  clearAuthCookies(res);

  const wantsJson =
    req.method === "POST" &&
    req.get("sec-fetch-mode") !== "navigate";

  if (wantsJson) {
    return res.json({ authenticated: false });
  }

  return res.redirect("/");
}

router.post("/logout", async (req, res) => handleLogout(req, res));
router.get("/logout", async (req, res) => handleLogout(req, res));

export default router;
