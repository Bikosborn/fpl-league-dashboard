import { NextResponse } from 'next/server';
import { fetchDashboardData } from '@/lib/fpl';
import { readDashboardCache, writeDashboardCache } from '@/lib/store';

export async function GET() {
  try {
    const cached = readDashboardCache();
    if (cached) {
      return NextResponse.json({ ok: true, data: cached, source: 'cache' });
    }

    const fresh = await fetchDashboardData();
    writeDashboardCache(fresh);
    return NextResponse.json({ ok: true, data: fresh, source: 'fresh' });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
