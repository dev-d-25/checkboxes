import crypto from "node:crypto";

import { authConfig } from "./config.js";

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "Lax",
  secure: authConfig.COOKIE_SECURE,
  path: "/",
};

function appendCookie(res, serializedCookie) {
  res.append("Set-Cookie", serializedCookie);
}

function sign(value) {
  return crypto
    .createHmac("sha256", authConfig.COOKIE_SECRET)
    .update(value)
    .digest("base64url");
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge != null) {
    parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  return parts.join("; ");
}

export function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex);
      const rawValue = part.slice(separatorIndex + 1);

      try {
        cookies[key] = decodeURIComponent(rawValue);
      } catch {
        cookies[key] = rawValue;
      }

      return cookies;
    }, {});
}

export function setTransactionCookie(res, transaction) {
  const payload = encodeJson(transaction);
  const signedValue = `${payload}.${sign(payload)}`;

  appendCookie(
    res,
    serializeCookie(authConfig.TX_COOKIE_NAME, signedValue, {
      ...baseCookieOptions,
      maxAge: 10 * 60 * 1000,
    }),
  );
}

export function readTransactionCookie(cookieHeader) {
  const cookies = typeof cookieHeader === "string" ? parseCookies(cookieHeader) : cookieHeader;
  const rawValue = cookies?.[authConfig.TX_COOKIE_NAME];

  if (!rawValue) {
    return null;
  }

  const [payload, signature] = rawValue.split(".");

  if (!payload || !signature) {
    return null;
  }

  if (sign(payload) !== signature) {
    return null;
  }

  try {
    return decodeJson(payload);
  } catch {
    return null;
  }
}

export function clearTransactionCookie(res) {
  appendCookie(
    res,
    serializeCookie(authConfig.TX_COOKIE_NAME, "", {
      ...baseCookieOptions,
      maxAge: 0,
    }),
  );
}

export function setAuthCookies(res, tokens) {
  appendCookie(
    res,
    serializeCookie(authConfig.ACCESS_COOKIE_NAME, tokens.access_token, {
      ...baseCookieOptions,
      maxAge: Number(tokens.expires_in ?? 300) * 1000,
    }),
  );

  if (tokens.refresh_token) {
    appendCookie(
      res,
      serializeCookie(authConfig.REFRESH_COOKIE_NAME, tokens.refresh_token, baseCookieOptions),
    );
  }
}

export function clearAuthCookies(res) {
  appendCookie(
    res,
    serializeCookie(authConfig.ACCESS_COOKIE_NAME, "", {
      ...baseCookieOptions,
      maxAge: 0,
    }),
  );
  appendCookie(
    res,
    serializeCookie(authConfig.REFRESH_COOKIE_NAME, "", {
      ...baseCookieOptions,
      maxAge: 0,
    }),
  );
}

export function getAuthCookies(cookieHeader) {
  const cookies = typeof cookieHeader === "string" ? parseCookies(cookieHeader) : cookieHeader;

  return {
    accessToken: cookies?.[authConfig.ACCESS_COOKIE_NAME] ?? null,
    refreshToken: cookies?.[authConfig.REFRESH_COOKIE_NAME] ?? null,
  };
}
