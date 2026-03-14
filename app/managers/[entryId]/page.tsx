import Link from 'next/link';
import { readDashboardCache } from '@/lib/store';

type Props = {
  params: Promise<{ entryId: string }>;
};

export default async function ManagerProfilePage({ params }: Props) {
  const { entryId } = await params;
  const numericId = Number(entryId);
  const data = readDashboardCache();

  if (!data) {
    return (
      <div className="shell">
        <div className="card">No cached data found. Go back and click Fetch data first.</div>
      </div>
    );
  }

  const manager = data.overallRows.find((row) => row.entryId === numericId);
  const summary = data.managerSummary.find((row) => row.entryId === numericId);
  const wins = data.weeklyWinners.filter((row) => row.entryId === numericId);
  const teamUrl = `https://fantasy.premierleague.com/entry/${numericId}/event/${data.league.currentEvent ?? 1}`;

  if (!manager) {
    return (
      <div className="shell">
        <div className="card">Manager not found.</div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="hero">
        <div className="hero-card">
          <h1 className="title">{manager.playerName}</h1>
          <p className="subtitle">{manager.entryName}</p>
          <div className="meta">
            <span>Total points: {manager.totalPoints}</span>
            <span>Net GW: {manager.netGwPoints}</span>
            <span>Balance due: KES {manager.balanceDue.toFixed(0)}</span>
          </div>
        </div>
        <div className="hero-actions">
          <Link className="btn" href="/">Back to dashboard</Link>
          <a className="btn secondary" href={teamUrl} target="_blank" rel="noreferrer">
            Open official FPL team
          </a>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title"><h2>Profile summary</h2></div>
          <div className="list">
            <div className="list-item"><strong>Wins</strong><div className="muted">{summary?.winsCount ?? 0}</div></div>
            <div className="list-item"><strong>Draw wins</strong><div className="muted">{summary?.drawWinsCount ?? 0}</div></div>
            <div className="list-item"><strong>Last win</strong><div className="muted">{summary?.lastWinGw ?? '-'}</div></div>
            <div className="list-item"><strong>Highest score</strong><div className="muted">{summary?.highestGwScore ?? '-'}</div></div>
            <div className="list-item"><strong>Lowest score</strong><div className="muted">{summary?.lowestGwScore ?? '-'}</div></div>
          </div>
        </div>

        <div className="card">
          <div className="section-title"><h2>Top contributors</h2></div>
          <div className="list">
            {(summary?.topContributors ?? []).length ? (summary?.topContributors ?? []).map((player) => (
              <div className="list-item" key={player.name}>
                <strong>{player.name}</strong>
                <div className="muted">{player.points} contributed points</div>
              </div>
            )) : <div className="list-item muted">No contributor data yet. Run a full fetch.</div>}
          </div>
        </div>
      </div>

      <div className="card table-wrap">
        <div className="section-title"><h2>Weekly wins</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>GW</th>
              <th>Gross</th>
              <th>Transfer cost</th>
              <th>Net</th>
              <th>Status</th>
              <th>Payout</th>
            </tr>
          </thead>
          <tbody>
            {wins.length ? wins.map((row) => (
              <tr key={`${row.gameweek}-${row.entryId}`}>
                <td>{row.gameweek}</td>
                <td>{row.grossPoints}</td>
                <td>-{row.transferCost}</td>
                <td>{row.netPoints}</td>
                <td><span className={`badge ${row.isDraw ? 'gold' : 'green'}`}>{row.isDraw ? 'Draw' : 'Solo win'}</span></td>
                <td>KES {row.payoutEach.toFixed(0)}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="muted">No wins recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
