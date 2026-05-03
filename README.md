# 10K Checkboxes

A real-time collaborative checkbox application with 10,000 checkboxes, WebSocket synchronization, Redis-backed rate limiting, and OAuth authentication.

## Features

- **10,000 Checkboxes**: Rendered efficiently using `requestAnimationFrame` batching and `DocumentFragment` for smooth performance
- **Real-Time Sync**: Socket.IO-powered checkbox state synchronization across all connected clients
- **Rate Limiting**: Redis-based rate limiting (5-second cooldown per socket) to prevent spam
- **OAuth Authentication**: Secure login with OAuth 2.0, including proper token revocation on logout
- **Toast Notifications**: User-friendly error messages for rate limits and invalid actions
- **Responsive UI**: Grid-based layout with scrollable container and intuitive controls

## Prerequisites

- Node.js (v18+ recommended)
- Redis server (or use included Docker Compose setup)
- OAuth 2.0 provider credentials (e.g., Google, GitHub)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/dev-d-25/checkboxes.git
   cd checkboxes
   ```

2. Install dependencies:
   ```bash
   pnpm install  # or npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   # OAuth Configuration
   OAUTH_CLIENT_ID=your_client_id
   OAUTH_CLIENT_SECRET=your_client_secret
   OAUTH_AUTHORIZE_URL=your_oauth_authorize_url
   OAUTH_TOKEN_URL=your_oauth_token_url
   OAUTH_USERINFO_URL=your_oauth_userinfo_url
   OAUTH_REDIRECT_URI=your_redirect_uri

   # App Configuration
   APP_BASE_URL=http://localhost:3000
   PORT=3000

   # Redis Configuration (optional, defaults to localhost:6379)
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

4. Start Redis (if not using Docker):
   ```bash
   redis-server
   ```
   Or use the included Docker Compose setup:
   ```bash
   docker-compose up -d redis
   ```

5. Start the application:
   ```bash
   node index.js
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OAUTH_CLIENT_ID` | OAuth client ID from your provider | Required |
| `OAUTH_CLIENT_SECRET` | OAuth client secret from your provider | Required |
| `OAUTH_AUTHORIZE_URL` | OAuth authorization endpoint URL | Required |
| `OAUTH_TOKEN_URL` | OAuth token exchange endpoint URL | Required |
| `OAUTH_USERINFO_URL` | OAuth user info endpoint URL | Required |
| `OAUTH_REDIRECT_URI` | OAuth redirect URI (must match provider config) | Required |
| `APP_BASE_URL` | Base URL of the application | `http://localhost:3000` |
| `PORT` | Port the server listens on | `3000` |
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO, ioredis
- **Frontend**: Vanilla JavaScript, Socket.IO client
- **Database**: Redis (state persistence, rate limiting)
- **Auth**: OAuth 2.0 with PKCE
