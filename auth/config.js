const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);

function readBoolean(value, fallback) {
  if (value == null) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

const appBaseUrl = process.env.APP_BASE_URL ?? `http://localhost:${PORT}`;

export const authConfig = {
  PORT,
  APP_BASE_URL: appBaseUrl,
  AUTH_SERVER_BASE_URL: process.env.AUTH_SERVER_BASE_URL ?? "http://localhost:8000",
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID ?? "",
  OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI ?? `${appBaseUrl}/callback`,
  OIDC_SCOPE: process.env.OIDC_SCOPE ?? "openid profile email",
  COOKIE_SECRET: process.env.COOKIE_SECRET ?? "replace-this",
  COOKIE_SECURE: readBoolean(process.env.COOKIE_SECURE, false),
  ACCESS_COOKIE_NAME: process.env.ACCESS_COOKIE_NAME ?? "ms_access_token",
  REFRESH_COOKIE_NAME: process.env.REFRESH_COOKIE_NAME ?? "ms_refresh_token",
  TX_COOKIE_NAME: process.env.TX_COOKIE_NAME ?? "ms_oidc_tx",
};
