export type LeagueInfo = {
  appName: string;
  leagueId: string;
  joinCode: string;
  timezone: string;
  liveMode: boolean;
  winnerRule: string;
  generatedAt: string | null;
  currentEvent: number | null;
  latestFinishedEvent: number | null;
};

export type OverallRow = {
  entryId: number;
  playerName: string;
  entryName: string;
  rank: number | null;
  lastRank: number | null;
  totalPoints: number;
  eventPoints: number;
  transferCost: number;
  netGwPoints: number;
  previousGwPoints: number | null;
  pointsDelta: number | null;
  rankChange: number | null;
  winsCount: number;
  drawWinsCount: number;
  lastWinGw: number | null;
  highestGwScore: number | null;
  lowestGwScore: number | null;
  topContributors: { name: string; points: number }[];
  balanceDue: number;
};

export type WeeklyWinnerRow = {
  gameweek: number;
  entryId: number;
  playerName: string;
  entryName: string;
  grossPoints: number;
  transferCost: number;
  netPoints: number;
  isDraw: boolean;
  tiedWinnersCount: number;
  payoutEach: number;
};

export type ManagerSummaryRow = {
  entryId: number;
  playerName: string;
  entryName: string;
  winsCount: number;
  drawWinsCount: number;
  lastWinGw: number | null;
  highestGwScore: number | null;
  lowestGwScore: number | null;
  balanceDue: number;
  topContributors: { name: string; points: number }[];
};

export type PaymentStatus = {
  gameweek: number;
  entryId: number;
  paid: boolean;
  amount: number;
  updatedAt: string;
};

export type DashboardData = {
  league: LeagueInfo;
  totals: {
    managerCount: number;
    weeklyPot: number;
    currentWinnerCount: number;
    splitPayout: number;
  };
  liveLeaders: OverallRow[];
  overallRows: OverallRow[];
  weeklyWinners: WeeklyWinnerRow[];
  managerSummary: ManagerSummaryRow[];
  payments: PaymentStatus[];
  adminNote: string;
};
