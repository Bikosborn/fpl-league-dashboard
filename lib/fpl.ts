import { readPayments } from './store';
import { DashboardData, ManagerSummaryRow, OverallRow, PaymentStatus, WeeklyWinnerRow } from './types';

const BASE = 'https://fantasy.premierleague.com/api';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; FPLBantersCashNext/1.0)',
};

const APP_NAME = 'BANTERS & CASH';
const LEAGUE_ID = '2126805';
const JOIN_CODE = 'szneuh';
const TIMEZONE = 'Africa/Nairobi';
const LIVE_MODE = true;
const ENTRY_FEE = 100;
const PAYOUT_INCLUDES_WINNER = true;

async function apiGet<T>(path: string, params?: Record<string, string | number>) {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: HEADERS,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`FPL API error ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

type Bootstrap = {
  events: { id: number; is_current?: boolean; is_next?: boolean; finished?: boolean }[];
  elements: { id: number; first_name: string; second_name: string }[];
};

type LeagueStandings = {
  standings: {
    results: {
      entry: number;
      player_name: string;
      entry_name: string;
      rank: number;
      last_rank: number;
      total: number;
      event_total: number;
    }[];
    has_next: boolean;
  };
};

type EntryHistory = {
  current: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    points_on_bench: number;
    event_transfers: number;
    event_transfers_cost: number;
  }[];
};

type Picks = {
  picks: {
    element: number;
    multiplier: number;
  }[];
};

type EventLive = {
  elements: {
    id: number;
    stats: {
      total_points: number;
    };
  }[];
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const bootstrap = await apiGet<Bootstrap>('/bootstrap-static/');
  const elementNames = Object.fromEntries(
    bootstrap.elements.map((element) => [element.id, `${element.first_name} ${element.second_name}`])
  );

  const currentEvent = bootstrap.events.find((event) => event.is_current)?.id ?? null;
  const latestFinishedEvent = [...bootstrap.events]
    .filter((event) => event.finished)
    .sort((a, b) => b.id - a.id)[0]?.id ?? null;

  const effectiveEvent = currentEvent ?? latestFinishedEvent;

  const standingsRows = await fetchAllLeagueRows(LEAGUE_ID);
  const payments = readPayments();

  const liveMap = effectiveEvent ? await getEventPointsMap(effectiveEvent) : {};
  const histories = new Map<number, EntryHistory['current']>();
  const contributions = new Map<number, Map<number, number>>();
  const weeklyResultsByManager = new Map<number, EntryHistory['current'][number][]>();

  for (const row of standingsRows) {
    const history = await apiGet<EntryHistory>(`/entry/${row.entry}/history/`);
    histories.set(row.entry, history.current);
    weeklyResultsByManager.set(row.entry, history.current);
  }

  if (effectiveEvent) {
    for (const row of standingsRows) {
      const contribMap = new Map<number, number>();
      const historyRows = histories.get(row.entry) ?? [];
      const maxGameweek = Math.max(...historyRows.map((item) => item.event), effectiveEvent);

      for (let gameweek = 1; gameweek <= maxGameweek; gameweek += 1) {
        let picks: Picks | null = null;
        try {
          picks = await apiGet<Picks>(`/entry/${row.entry}/event/${gameweek}/picks/`);
        } catch {
          picks = null;
        }
        if (!picks) continue;

        let pointsMap: Record<number, number> = {};
        try {
          pointsMap = await getEventPointsMap(gameweek);
        } catch {
          pointsMap = {};
        }

        for (const pick of picks.picks) {
          const current = contribMap.get(pick.element) ?? 0;
          contribMap.set(pick.element, current + (pointsMap[pick.element] ?? 0) * (pick.multiplier || 0));
        }
      }

      contributions.set(row.entry, contribMap);
    }
  }

  const overallRows: OverallRow[] = standingsRows.map((row) => {
    const historyRows = histories.get(row.entry) ?? [];
    const currentHistory = effectiveEvent
      ? historyRows.find((item) => item.event === effectiveEvent)
      : undefined;
    const previousFinishedHistory = latestFinishedEvent
      ? historyRows.find((item) => item.event === latestFinishedEvent - 1)
      : undefined;

    let grossGwPoints = row.event_total;
    if (LIVE_MODE && effectiveEvent) {
      grossGwPoints = 0;
      try {
        // live current GW points from picks * live player points
      } catch {}
    }

    let transferCost = currentHistory?.event_transfers_cost ?? 0;
    if (LIVE_MODE && effectiveEvent) {
      transferCost = currentHistory?.event_transfers_cost ?? 0;
      grossGwPoints = 0;
    }

    return {
      entryId: row.entry,
      playerName: row.player_name,
      entryName: row.entry_name,
      rank: row.rank ?? null,
      lastRank: row.last_rank ?? null,
      totalPoints: row.total ?? 0,
      eventPoints: 0,
      transferCost,
      netGwPoints: 0,
      previousGwPoints: previousFinishedHistory ? previousFinishedHistory.points - (previousFinishedHistory.event_transfers_cost ?? 0) : null,
      pointsDelta: null,
      rankChange: row.last_rank && row.rank ? row.last_rank - row.rank : null,
      winsCount: 0,
      drawWinsCount: 0,
      lastWinGw: null,
      highestGwScore: historyRows.length
        ? Math.max(...historyRows.map((item) => item.points - (item.event_transfers_cost ?? 0)))
        : null,
      lowestGwScore: historyRows.length
        ? Math.min(...historyRows.map((item) => item.points - (item.event_transfers_cost ?? 0)))
        : null,
      topContributors: topContributors(contributions.get(row.entry), elementNames),
      balanceDue: 0,
    };
  });

  if (effectiveEvent) {
    for (const row of overallRows) {
      const livePoints = await computeLivePointsForEntry(row.entryId, effectiveEvent, liveMap);
      row.eventPoints = livePoints;
      row.netGwPoints = livePoints - row.transferCost;
      row.pointsDelta = row.previousGwPoints === null ? null : row.netGwPoints - row.previousGwPoints;
    }
  }

  const weeklyWinners = computeWeeklyWinners(histories, standingsRows, payments);

  const winnerStats = new Map<number, { wins: number; draws: number; lastWin: number | null }>();
  for (const winner of weeklyWinners) {
    const current = winnerStats.get(winner.entryId) ?? { wins: 0, draws: 0, lastWin: null };
    current.wins += 1;
    if (winner.isDraw) current.draws += 1;
    current.lastWin = winner.gameweek;
    winnerStats.set(winner.entryId, current);
  }

  for (const row of overallRows) {
    const stats = winnerStats.get(row.entryId);
    row.winsCount = stats?.wins ?? 0;
    row.drawWinsCount = stats?.draws ?? 0;
    row.lastWinGw = stats?.lastWin ?? null;
    row.balanceDue = computeBalanceDueForEntry(payments, row.entryId);
  }

  const managerSummary: ManagerSummaryRow[] = overallRows
    .map((row) => ({
      entryId: row.entryId,
      playerName: row.playerName,
      entryName: row.entryName,
      winsCount: row.winsCount,
      drawWinsCount: row.drawWinsCount,
      lastWinGw: row.lastWinGw,
      highestGwScore: row.highestGwScore,
      lowestGwScore: row.lowestGwScore,
      balanceDue: row.balanceDue,
      topContributors: row.topContributors,
    }))
    .sort((a, b) => b.winsCount - a.winsCount || b.drawWinsCount - a.drawWinsCount || a.playerName.localeCompare(b.playerName));

  const liveLeaders = [...overallRows]
    .sort((a, b) => b.netGwPoints - a.netGwPoints || a.playerName.localeCompare(b.playerName));
  const topNet = liveLeaders[0]?.netGwPoints ?? 0;
  const currentWinnerCount = liveLeaders.filter((row) => row.netGwPoints === topNet).length || 1;
  const weeklyPot = ENTRY_FEE * (PAYOUT_INCLUDES_WINNER ? standingsRows.length : Math.max(standingsRows.length - 1, 0));

  return {
    league: {
      appName: APP_NAME,
      leagueId: LEAGUE_ID,
      joinCode: JOIN_CODE,
      timezone: TIMEZONE,
      liveMode: LIVE_MODE,
      winnerRule: 'Winner = live/current gameweek points minus transfer cost.',
      generatedAt: new Date().toISOString(),
      currentEvent,
      latestFinishedEvent,
    },
    totals: {
      managerCount: standingsRows.length,
      weeklyPot,
      currentWinnerCount,
      splitPayout: currentWinnerCount ? weeklyPot / currentWinnerCount : weeklyPot,
    },
    liveLeaders: liveLeaders.filter((row) => row.netGwPoints === topNet),
    overallRows: liveLeaders,
    weeklyWinners,
    managerSummary,
    payments,
    adminNote:
      'This starter persists admin payment states in a local JSON file for local development. For Vercel production, move payments and auth to Supabase/Postgres.',
  };
}

async function fetchAllLeagueRows(leagueId: string) {
  const rows: LeagueStandings['standings']['results'] = [];
  let page = 1;

  while (true) {
    const data = await apiGet<LeagueStandings>(`/leagues-classic/${leagueId}/standings/`, {
      page_new_entries: 1,
      page_standings: page,
    });
    rows.push(...data.standings.results);
    if (!data.standings.has_next || data.standings.results.length === 0) break;
    page += 1;
  }

  return rows;
}

const eventPointCache = new Map<number, Record<number, number>>();
async function getEventPointsMap(gameweek: number): Promise<Record<number, number>> {
  if (eventPointCache.has(gameweek)) return eventPointCache.get(gameweek)!;
  const live = await apiGet<EventLive>(`/event/${gameweek}/live/`);
  const pointsMap = Object.fromEntries(
    live.elements.map((element) => [element.id, element.stats.total_points ?? 0])
  ) as Record<number, number>;
  eventPointCache.set(gameweek, pointsMap);
  return pointsMap;
}

const picksCache = new Map<string, Picks>();
async function computeLivePointsForEntry(entryId: number, gameweek: number, livePointsMap: Record<number, number>) {
  const key = `${entryId}-${gameweek}`;
  let picks = picksCache.get(key);
  if (!picks) {
    picks = await apiGet<Picks>(`/entry/${entryId}/event/${gameweek}/picks/`);
    picksCache.set(key, picks);
  }

  return picks.picks.reduce((sum, pick) => {
    return sum + (livePointsMap[pick.element] ?? 0) * (pick.multiplier || 0);
  }, 0);
}

function topContributors(map: Map<number, number> | undefined, names: Record<number, string>) {
  if (!map) return [];
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([playerId, points]) => ({ name: names[playerId] ?? `Player ${playerId}`, points }));
}

function computeWeeklyWinners(
  histories: Map<number, EntryHistory['current']>,
  standingsRows: LeagueStandings['standings']['results'],
  payments: PaymentStatus[]
): WeeklyWinnerRow[] {
  const byGameweek = new Map<number, WeeklyWinnerRow[]>();
  const managerCount = standingsRows.length;
  const weeklyPot = ENTRY_FEE * (PAYOUT_INCLUDES_WINNER ? managerCount : Math.max(managerCount - 1, 0));

  for (const standing of standingsRows) {
    const historyRows = histories.get(standing.entry) ?? [];
    for (const item of historyRows) {
      const grossPoints = item.points ?? 0;
      const transferCost = item.event_transfers_cost ?? 0;
      const netPoints = grossPoints - transferCost;
      const row: WeeklyWinnerRow = {
        gameweek: item.event,
        entryId: standing.entry,
        playerName: standing.player_name,
        entryName: standing.entry_name,
        grossPoints,
        transferCost,
        netPoints,
        isDraw: false,
        tiedWinnersCount: 1,
        payoutEach: 0,
      };

      const existing = byGameweek.get(item.event) ?? [];
      existing.push(row);
      byGameweek.set(item.event, existing);
    }
  }

  const winners: WeeklyWinnerRow[] = [];
  for (const [gameweek, rows] of [...byGameweek.entries()].sort((a, b) => b[0] - a[0])) {
    const best = Math.max(...rows.map((row) => row.netPoints));
    const topRows = rows.filter((row) => row.netPoints === best);
    const payoutEach = topRows.length ? weeklyPot / topRows.length : 0;

    for (const row of topRows) {
      winners.push({
        ...row,
        isDraw: topRows.length > 1,
        tiedWinnersCount: topRows.length,
        payoutEach,
      });
    }
  }

  return winners;
}

function computeBalanceDueForEntry(payments: PaymentStatus[], entryId: number) {
  return payments
    .filter((payment) => payment.entryId === entryId && !payment.paid)
    .reduce((sum, payment) => sum + payment.amount, 0);
}
