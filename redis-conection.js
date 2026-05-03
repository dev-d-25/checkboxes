import Redis from "ioredis";

function createRedisConnection() {
  const client = new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number.parseInt(process.env.REDIS_PORT ?? "6379", 10),
  });

  client.on("error", (error) => {
    console.error("Redis connection error", error.message);
  });

  return client;
}

export const publisher = createRedisConnection();

export const subscriber = createRedisConnection();

export const redis = createRedisConnection();
