import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

import express from "express";
import { Server } from "socket.io";

import authRouter from "./auth/routes.js";
import { authConfig } from "./auth/config.js";
import { getAuthSession, requireAuth } from "./auth/middleware.js";
import { publisher, redis, subscriber } from "./redis-conection.js";

const CHECKBOX_SIZE = 10000;
const RATE_LIMIT_MS = 5000; // 5 seconds
const CHECKBOX_STATE_KEY = "checkbox-state";
const PUBSUB_CHANNEL = "internal-server:checkbox:change";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const state = {
  checkboxes: new Array(CHECKBOX_SIZE).fill(false),
};

function normalizeCheckboxes(candidate) {
  if (!Array.isArray(candidate)) {
    return new Array(CHECKBOX_SIZE).fill(false);
  }

  return new Array(CHECKBOX_SIZE)
    .fill(false)
    .map((_, index) => Boolean(candidate[index]));
}

async function loadCheckboxState() {
  const existingState = await redis.get(CHECKBOX_STATE_KEY);

  if (!existingState) {
    await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(state.checkboxes));
    return;
  }

  try {
    state.checkboxes = normalizeCheckboxes(JSON.parse(existingState));
  } catch {
    await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(state.checkboxes));
  }
}

async function main() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  app.use(express.json());
  app.use(authRouter);
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/checkboxes", requireAuth({ onFailure: "json" }), (req, res) => {
    return res.json({ checkboxes: state.checkboxes });
  });

  io.use(async (socket, next) => {
    try {
      const session = await getAuthSession({
        cookieHeader: socket.request.headers.cookie ?? "",
        allowRefresh: false,
      });

      if (!session.authenticated || !session.user) {
        return next(new Error("unauthorized"));
      }

      socket.data.user = session.user;
      return next();
    } catch (error) {
      return next(error);
    }
  });

  await loadCheckboxState();
  await subscriber.subscribe(PUBSUB_CHANNEL);
  subscriber.on("message", (channel, message) => {
    if (channel !== PUBSUB_CHANNEL) {
      return;
    }

    try {
      const { index, checked } = JSON.parse(message);
      if (!Number.isInteger(index) || index < 0 || index >= CHECKBOX_SIZE) {
        return;
      }

      state.checkboxes[index] = Boolean(checked);
      io.emit("server:checkbox:change", { index, checked: Boolean(checked) });
    } catch (error) {
      console.error("Checkbox sync message failed", error);
    }
  });

  io.on("connection", (socket) => {
    console.log(`new socket connected: ${socket.id}`);

    socket.on("client:checkbox:change", async (data) => {
      const index = Number(data?.index);
      const checked = Boolean(data?.checked);

      if (!Number.isInteger(index) || index < 0 || index >= CHECKBOX_SIZE) {
        socket.emit("server:error", {
          message: "Invalid checkbox index",
        });
        return;
      }

      const rateLimitKey = `checkbox:${socket.id}:lastOpTime`;
      const lastOpTime = await redis.get(rateLimitKey);
      const now = Date.now();

      if (lastOpTime && parseInt(lastOpTime) + RATE_LIMIT_MS > now) {
        const remainingTime = Math.ceil(
          (parseInt(lastOpTime) + RATE_LIMIT_MS - now) / 1000,
        );
        socket.emit("server:error", {
          data,
          message: `Hold on! let it breathe. You can only change a checkbox every ${RATE_LIMIT_MS / 1000} seconds. Please wait ${remainingTime} more seconds.`,
        });
        return;
      }

      await redis.set(rateLimitKey, now.toString(), 'EX', 10);

      state.checkboxes[index] = checked;
      await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(state.checkboxes));
      await publisher.publish(PUBSUB_CHANNEL, JSON.stringify({ index, checked }));
    });
  });

  httpServer.listen(authConfig.PORT, () => {
    console.log(`server is running on ${authConfig.APP_BASE_URL}`);
  });
}

main().catch((error) => {
  console.error("Server failed to start", error);
  process.exitCode = 1;
});
