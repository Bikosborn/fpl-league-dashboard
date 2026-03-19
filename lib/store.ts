import { createClient } from "redis";
import type { DashboardData, PaymentStatus } from "./types";

const REDIS_URL = process.env.REDIS_URL;

let client: ReturnType<typeof createClient> | null = null;
let clientPromise: Promise<ReturnType<typeof createClient>> | null = null;

const DASHBOARD_KEY = "fpl:dashboard-cache";
const PAYMENTS_KEY = "fpl:payments";

async function getRedis() {
  if (!REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  if (client) return client;

  if (!clientPromise) {
    const redis = createClient({
      url: REDIS_URL,
    });

    redis.on("error", (err) => {
      console.error("Redis error:", err);
    });

    clientPromise = redis.connect().then(() => {
      client = redis;
      return redis;
    });
  }

  return clientPromise;
}

export async function readDashboardCache(): Promise<DashboardData | null> {
  const redis = await getRedis();
  const raw = await redis.get(DASHBOARD_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as DashboardData;
}

export async function writeDashboardCache(data: DashboardData): Promise<void> {
  const redis = await getRedis();
  await redis.set(DASHBOARD_KEY, JSON.stringify(data));
}

export async function readPayments(): Promise<PaymentStatus[]> {
  const redis = await getRedis();
  const raw = await redis.get(PAYMENTS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as PaymentStatus[];
}

export async function writePayments(payments: PaymentStatus[]): Promise<void> {
  const redis = await getRedis();
  await redis.set(PAYMENTS_KEY, JSON.stringify(payments));
}