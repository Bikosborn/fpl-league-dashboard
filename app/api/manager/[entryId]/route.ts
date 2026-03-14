import { NextRequest, NextResponse } from 'next/server';
import { readDashboardCache } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await context.params;
  const numericId = Number(entryId);
  const data = readDashboardCache();

  if (!data) {
    return NextResponse.json({ ok: false, error: 'No cached dashboard data found. Run Fetch Data first.' }, { status: 404 });
  }

  const manager = data.overallRows.find((row) => row.entryId === numericId);
  const summary = data.managerSummary.find((row) => row.entryId === numericId);
  const wins = data.weeklyWinners.filter((row) => row.entryId === numericId);

  if (!manager) {
    return NextResponse.json({ ok: false, error: 'Manager not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    manager,
    summary,
    wins,
    teamUrl: `https://fantasy.premierleague.com/entry/${numericId}/event/${data.league.currentEvent ?? 1}`,
  });
}
