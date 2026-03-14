'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardData, PaymentStatus } from '@/lib/types';

type TabKey = 'overview' | 'overall' | 'weekly' | 'managers' | 'league' | 'admin';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'overall', label: 'Overall Rankings' },
  { key: 'weekly', label: 'Weekly Winners' },
  { key: 'managers', label: 'Managers' },
  { key: 'league', label: 'League Info' },
  { key: 'admin', label: 'Admin' },
];

export function DashboardClient() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedPaymentGw, setSelectedPaymentGw] = useState<number | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to load dashboard');
      setData(json.data);
      const firstGw = json.data.weeklyWinners[0]?.gameweek ?? json.data.league.currentEvent ?? null;
      setSelectedPaymentGw(firstGw);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleFetchData() {
    setFetching(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/fetch-data', { method: 'POST' });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error ?? 'Fetch failed');
      setMessage('Fresh FPL data loaded successfully.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setFetching(false);
    }
  }

  async function updatePayment(entryId: number, paid: boolean) {
    if (!selectedPaymentGw) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameweek: selectedPaymentGw,
          entryId,
          paid,
          amount: 100,
        }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to update payment status');
      setMessage('Payment status updated.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const paymentLookup = useMemo(() => {
    const map = new Map<string, PaymentStatus>();
    for (const payment of data?.payments ?? []) {
      map.set(`${payment.gameweek}-${payment.entryId}`, payment);
    }
    return map;
  }, [data]);

  if (loading) {
    return <div className="shell"><div className="card">Loading dashboard…</div></div>;
  }

  if (!data) {
    return <div className="shell"><div className="error">Unable to load dashboard.</div></div>;
  }

  const currentTab = {
    overview: <OverviewTab data={data} />,
    overall: <OverallTab data={data} />,
    weekly: <WeeklyWinnersTab data={data} />,
    managers: <ManagersTab data={data} />,
    league: <LeagueInfoTab data={data} />,
    admin: (
      <AdminTab
        data={data}
        selectedPaymentGw={selectedPaymentGw}
        setSelectedPaymentGw={setSelectedPaymentGw}
        paymentLookup={paymentLookup}
        updatePayment={updatePayment}
      />
    ),
  }[activeTab];

  return (
    <div className="shell">
      <div className="hero">
        <div className="hero-card">
          <h1 className="title">{data.league.appName}</h1>
          <p className="subtitle">
            Live FPL tracker with one fetch flow, clean tabs, payment balances, manager profiles,
            and winner logic based on gameweek points minus transfer hits.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn" onClick={handleFetchData} disabled={fetching}>
            {fetching ? 'Fetching data…' : 'Fetch data'}
          </button>
        </div>
      </div>

      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <div className="kpis">
        <div className="card kpi">
          <div className="kpi-label">Managers</div>
          <div className="kpi-value">{data.totals.managerCount}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Current GW</div>
          <div className="kpi-value">{data.league.currentEvent ?? '-'}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Weekly pot</div>
          <div className="kpi-value">KES {data.totals.weeklyPot.toFixed(0)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Split payout now</div>
          <div className="kpi-value">KES {data.totals.splitPayout.toFixed(0)}</div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentTab}

      <p className="footer-note">{data.adminNote}</p>
    </div>
  );
}

function OverviewTab({ data }: { data: DashboardData }) {
  return (
    <div className="grid-2">
      <div className="card">
        <div className="section-title">
          <h2>Live leaders</h2>
          <span className="badge gold">Shared winners enabled</span>
        </div>
        <div className="list">
          {data.liveLeaders.map((leader) => (
            <div key={leader.entryId} className="list-item">
              <div className="section-title">
                <strong>{leader.playerName}</strong>
                <span className="badge">KES {data.totals.splitPayout.toFixed(0)}</span>
              </div>
              <div className="meta">
                <span>{leader.entryName}</span>
                <span>Net GW: {leader.netGwPoints}</span>
                <span>Transfer cost: -{leader.transferCost}</span>
                <Link className="profile-link" href={`/managers/${leader.entryId}`}>Open profile</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h2>Fast notes</h2>
        </div>
        <div className="list">
          <div className="list-item">
            <strong>Winner formula</strong>
            <div className="muted">Weekly winner = gameweek points minus transfer cost.</div>
          </div>
          <div className="list-item">
            <strong>Arrows</strong>
            <div className="muted">Green means improvement from the previous finished gameweek. Red means a drop.</div>
          </div>
          <div className="list-item">
            <strong>Payments</strong>
            <div className="muted">Admin tracks who has paid the weekly KES 100 and outstanding balances stay attached to the manager.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverallTab({ data }: { data: DashboardData }) {
  return (
    <div className="card table-wrap">
      <div className="section-title">
        <h2>Overall rankings</h2>
        <span className="panel-note">Green and red arrows show change from the previous rank and previous finished gameweek points.</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Manager</th>
            <th>Team</th>
            <th>Total</th>
            <th>Net GW</th>
            <th>Points trend</th>
            <th>Rank trend</th>
            <th>Wins</th>
            <th>Balance</th>
            <th>Profile</th>
          </tr>
        </thead>
        <tbody>
          {data.overallRows.map((row) => (
            <tr key={row.entryId}>
              <td>{row.rank ?? '-'}</td>
              <td>{row.playerName}</td>
              <td>{row.entryName}</td>
              <td>{row.totalPoints}</td>
              <td>{row.netGwPoints}</td>
              <td>{renderTrend(row.pointsDelta)}</td>
              <td>{renderTrend(row.rankChange)}</td>
              <td>{row.winsCount}</td>
              <td>KES {row.balanceDue.toFixed(0)}</td>
              <td><Link className="profile-link" href={`/managers/${row.entryId}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyWinnersTab({ data }: { data: DashboardData }) {
  return (
    <div className="card table-wrap">
      <div className="section-title">
        <h2>Weekly winners</h2>
        <span className="panel-note">Each row uses net points: gross points minus transfer cost.</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>GW</th>
            <th>Manager</th>
            <th>Team</th>
            <th>Gross</th>
            <th>Transfers</th>
            <th>Net</th>
            <th>Status</th>
            <th>Payout each</th>
          </tr>
        </thead>
        <tbody>
          {data.weeklyWinners.map((row) => (
            <tr key={`${row.gameweek}-${row.entryId}`}>
              <td>{row.gameweek}</td>
              <td>{row.playerName}</td>
              <td>{row.entryName}</td>
              <td>{row.grossPoints}</td>
              <td>-{row.transferCost}</td>
              <td>{row.netPoints}</td>
              <td>
                <span className={`badge ${row.isDraw ? 'gold' : 'green'}`}>
                  {row.isDraw ? `Draw (${row.tiedWinnersCount})` : 'Solo win'}
                </span>
              </td>
              <td>KES {row.payoutEach.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManagersTab({ data }: { data: DashboardData }) {
  return (
    <div className="card table-wrap">
      <div className="section-title">
        <h2>Manager win summary</h2>
        <span className="panel-note">This lives on its own tab as requested.</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Manager</th>
            <th>Team</th>
            <th>Wins</th>
            <th>Draw wins</th>
            <th>Last win</th>
            <th>High</th>
            <th>Low</th>
            <th>Top 3 contributors</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.managerSummary.map((row) => (
            <tr key={row.entryId}>
              <td><Link className="profile-link" href={`/managers/${row.entryId}`}>{row.playerName}</Link></td>
              <td>{row.entryName}</td>
              <td>{row.winsCount}</td>
              <td>{row.drawWinsCount}</td>
              <td>{row.lastWinGw ?? '-'}</td>
              <td>{row.highestGwScore ?? '-'}</td>
              <td>{row.lowestGwScore ?? '-'}</td>
              <td>{row.topContributors.map((item) => `${item.name} (${item.points})`).join(', ') || 'No data yet'}</td>
              <td>KES {row.balanceDue.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeagueInfoTab({ data }: { data: DashboardData }) {
  return (
    <div className="grid-3">
      <div className="card">
        <div className="section-title"><h3>League setup</h3></div>
        <div className="list">
          <div className="list-item"><strong>League ID</strong><div className="muted">{data.league.leagueId}</div></div>
          <div className="list-item"><strong>Join code</strong><div className="muted">{data.league.joinCode}</div></div>
          <div className="list-item"><strong>Timezone</strong><div className="muted">{data.league.timezone}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="section-title"><h3>Gameweek status</h3></div>
        <div className="list">
          <div className="list-item"><strong>Current GW</strong><div className="muted">{data.league.currentEvent ?? '-'}</div></div>
          <div className="list-item"><strong>Latest finished GW</strong><div className="muted">{data.league.latestFinishedEvent ?? '-'}</div></div>
          <div className="list-item"><strong>Generated</strong><div className="muted">{data.league.generatedAt ?? 'Never'}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="section-title"><h3>Rules</h3></div>
        <div className="list">
          <div className="list-item"><strong>Winner rule</strong><div className="muted">{data.league.winnerRule}</div></div>
          <div className="list-item"><strong>Mode</strong><div className="muted">{data.league.liveMode ? 'Live current GW leader' : 'Completed GW only'}</div></div>
        </div>
      </div>
    </div>
  );
}

function AdminTab({
  data,
  selectedPaymentGw,
  setSelectedPaymentGw,
  paymentLookup,
  updatePayment,
}: {
  data: DashboardData;
  selectedPaymentGw: number | null;
  setSelectedPaymentGw: (gw: number) => void;
  paymentLookup: Map<string, PaymentStatus>;
  updatePayment: (entryId: number, paid: boolean) => void;
}) {
  const gameweeks = [...new Set(data.weeklyWinners.map((row) => row.gameweek))].sort((a, b) => b - a);

  return (
    <div className="grid-2">
      <div className="card table-wrap">
        <div className="section-title">
          <h2>Admin payment tracker</h2>
          <select value={selectedPaymentGw ?? ''} onChange={(e) => setSelectedPaymentGw(Number(e.target.value))}>
            {gameweeks.map((gw) => (
              <option key={gw} value={gw}>GW {gw}</option>
            ))}
          </select>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Manager</th>
              <th>Team</th>
              <th>Status</th>
              <th>Balance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.overallRows.map((row) => {
              const status = paymentLookup.get(`${selectedPaymentGw}-${row.entryId}`);
              return (
                <tr key={row.entryId}>
                  <td>{row.playerName}</td>
                  <td>{row.entryName}</td>
                  <td>
                    <span className={`badge ${status?.paid ? 'green' : 'red'}`}>
                      {status?.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td>KES {row.balanceDue.toFixed(0)}</td>
                  <td>
                    <button className="btn secondary" onClick={() => updatePayment(row.entryId, !(status?.paid ?? false))}>
                      Mark as {status?.paid ? 'unpaid' : 'paid'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="section-title"><h2>Admin notes</h2></div>
        <div className="list">
          <div className="list-item">
            <strong>Only one top action button</strong>
            <div className="muted">The old sync buttons are gone. The app now uses one Fetch data button.</div>
          </div>
          <div className="list-item">
            <strong>Payment balances</strong>
            <div className="muted">When a manager stays unpaid, the balance remains attached to their name in rankings and manager views.</div>
          </div>
          <div className="list-item">
            <strong>Profiles</strong>
            <div className="muted">Each manager has a profile page. Official FPL team edits still happen on the official FPL site.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderTrend(value: number | null) {
  if (value === null || value === 0) return <span className="muted">-</span>;
  if (value > 0) return <span className="arrow-up">▲ {value}</span>;
  return <span className="arrow-down">▼ {Math.abs(value)}</span>;
}
