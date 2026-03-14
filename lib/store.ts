import fs from 'node:fs';
import path from 'node:path';
import { DashboardData, PaymentStatus } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DASHBOARD_PATH = path.join(DATA_DIR, 'dashboard-cache.json');
const PAYMENTS_PATH = path.join(DATA_DIR, 'payments.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readDashboardCache(): DashboardData | null {
  ensureDataDir();
  if (!fs.existsSync(DASHBOARD_PATH)) return null;
  return JSON.parse(fs.readFileSync(DASHBOARD_PATH, 'utf-8')) as DashboardData;
}

export function writeDashboardCache(data: DashboardData) {
  ensureDataDir();
  fs.writeFileSync(DASHBOARD_PATH, JSON.stringify(data, null, 2));
}

export function readPayments(): PaymentStatus[] {
  ensureDataDir();
  if (!fs.existsSync(PAYMENTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(PAYMENTS_PATH, 'utf-8')) as PaymentStatus[];
}

export function writePayments(payments: PaymentStatus[]) {
  ensureDataDir();
  fs.writeFileSync(PAYMENTS_PATH, JSON.stringify(payments, null, 2));
}
