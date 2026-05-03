import { clearAuthCookies, getAuthCookies } from "./cookies.js";
import { isUnauthorizedError, isUpstreamHttpError, refreshTokens } from "./oauth-client.js";
import { resolveUserInfo } from "./userinfo.js";

function createCookieHandlers(res) {
  return {
    setTokens(tokens) {
      res.locals.setAuthCookies?.(tokens);
    },
    clearTokens() {
      res.locals.clearAuthCookies?.();
    },
  };
}

export async function getAuthSession({
  cookieHeader,
  allowRefresh = true,
  onTokens,
  onClear,
}) {
  const { accessToken, refreshToken } = getAuthCookies(cookieHeader);

  if (!accessToken && !refreshToken) {
    return { authenticated: false, user: null, accessToken: null, refreshToken: null };
  }

  if (accessToken) {
    try {
      const user = await resolveUserInfo(accessToken);
      return { authenticated: true, user, accessToken, refreshToken };
    } catch (error) {
      if (!isUnauthorizedError(error) || !allowRefresh || !refreshToken) {
        if (isUnauthorizedError(error)) {
          onClear?.();
          return { authenticated: false, user: null, accessToken: null, refreshToken: null };
        }

        throw error;
      }
    }
  }

  if (!allowRefresh || !refreshToken) {
    return { authenticated: false, user: null, accessToken: null, refreshToken: null };
  }

  try {
    const refreshedTokens = await refreshTokens(refreshToken);
    onTokens?.(refreshedTokens);
    const user = await resolveUserInfo(refreshedTokens.access_token);

    return {
      authenticated: true,
      user,
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? refreshToken,
    };
  } catch (error) {
    if (isUpstreamHttpError(error)) {
      onClear?.();
      return { authenticated: false, user: null, accessToken: null, refreshToken: null };
    }

    throw error;
  }
}

export async function tryRefreshAuth(req, res) {
  const handlers = createCookieHandlers(res);

  return getAuthSession({
    cookieHeader: req.headers.cookie ?? "",
    allowRefresh: true,
    onTokens: handlers.setTokens,
    onClear: handlers.clearTokens,
  });
}

export async function attachUserIfAuthenticated(req, res, next) {
  try {
    const session = await tryRefreshAuth(req, res);
    req.authSession = session;
    req.user = session.user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth({ onFailure = "redirect" } = {}) {
  return async function requireAuthMiddleware(req, res, next) {
    try {
      if (!req.authSession) {
        const session = await tryRefreshAuth(req, res);
        req.authSession = session;
        req.user = session.user;
      }

      if (req.authSession?.authenticated) {
        return next();
      }

      if (onFailure === "json") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      return res.redirect("/login");
    } catch (error) {
      return next(error);
    }
  };
}
