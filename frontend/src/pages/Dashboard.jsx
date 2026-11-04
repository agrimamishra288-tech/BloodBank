import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import BloodGroupBadge, { UrgencyBadge } from '../components/Badges'

const number = (value) => Number(value) || 0

function formatDate(value) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function StatCard({ label, value, caption, icon, accent }) {
  return (
    <article className="dashboard-stat" style={{ '--stat-accent': accent }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="dashboard-muted text-xs font-semibold">{label}</p><p className="dashboard-number mt-2">{value ?? '—'}</p><p className="dashboard-muted mt-1 text-[11px]">{caption}</p></div>
        <span className="stat-glyph" aria-hidden="true">{icon}</span>
      </div>
      <span className="stat-accent-line" />
    </article>
  )
}

function DonationChart({ rows }) {
  const width = 660
  const height = 220
  const padding = { top: 18, right: 14, bottom: 36, left: 30 }
  const values = rows.map((row) => number(row.donations))
  const maxValue = Math.max(4, ...values)
  const points = values.map((value, index) => {
    const x = padding.left + index * (width - padding.left - padding.right) / Math.max(values.length - 1, 1)
    const y = padding.top + (maxValue - value) * (height - padding.top - padding.bottom) / maxValue
    return [x, y]
  })
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const area = points.length ? `${line} L ${points.at(-1)[0]} ${height - padding.bottom} L ${points[0][0]} ${height - padding.bottom} Z` : ''
  const total = values.reduce((sum, value) => sum + value, 0)
  const peak = Math.max(0, ...values)
  const tickIndexes = [0, Math.floor((rows.length - 1) / 3), Math.floor((rows.length - 1) * 2 / 3), rows.length - 1]
  const ticks = [...new Set(tickIndexes)].filter((index) => index >= 0 && rows[index])

  return (
    <section className="dashboard-panel chart-panel">
      <div className="panel-heading"><div><p className="eyebrow">The last 30 days</p><h2 className="panel-title">Donation rhythm</h2></div><div className="chart-summary"><span className="chart-summary-dot" />{total} donations <span className="dashboard-muted">· peak {peak}/day</span></div></div>
      {rows.length && total > 0 ? <div className="chart-wrap">
        <svg className="donation-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Donation activity over ${rows.length} days. ${total} donations in total, with a peak of ${peak} in one day.`}>
          <defs><linearGradient id="donation-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#d74d5e" stopOpacity=".23"/><stop offset="100%" stopColor="#d74d5e" stopOpacity="0"/></linearGradient></defs>
          {[0, .5, 1].map((fraction) => { const y = padding.top + fraction * (height - padding.top - padding.bottom); return <g key={fraction}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="chart-gridline"/><text x={padding.left - 9} y={y + 4} textAnchor="end" className="chart-axis-label">{Math.round(maxValue * (1 - fraction))}</text></g> })}
          <path d={area} fill="url(#donation-area)" />
          <path d={line} className="chart-line" />
          {points.map(([x, y], index) => <circle key={`${rows[index].date}-${index}`} cx={x} cy={y} r={index === points.length - 1 ? 4 : 2.5} className="chart-point"><title>{formatDate(rows[index].date)}: {values[index]} donations</title></circle>)}
          {ticks.map((index) => <text key={index} x={points[index][0]} y={height - 8} textAnchor={index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'} className="chart-axis-label">{formatDate(rows[index].date)}</text>)}
        </svg>
      </div> : <div className="chart-empty"><span className="chart-empty-icon">⌁</span><p>No donation activity to chart yet.</p><span>When donations are recorded, the trend will appear here.</span></div>}
      <div className="chart-footnote"><span className="pulse-dash" />A steady rhythm starts with one person showing up.</div>
    </section>
  )
}

function RequestRing({ rows }) {
  const counts = useMemo(() => rows.reduce((result, row) => { result[row.status] = (result[row.status] || 0) + number(row.count); return result }, {}), [rows])
  const items = [
    { key: 'pending', label: 'Waiting', color: '#d34c5c' },
    { key: 'matched', label: 'Matched', color: '#e5a34b' },
    { key: 'partially_fulfilled', label: 'In progress', color: '#65849a' },
    { key: 'fulfilled', label: 'Fulfilled', color: '#668875' },
    { key: 'cancelled', label: 'Cancelled', color: '#a99da0' },
  ]
  const total = items.reduce((sum, item) => sum + number(counts[item.key]), 0)
  const radius = 48
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <section className="dashboard-panel request-panel">
      <div className="panel-heading"><div><p className="eyebrow">Where things stand</p><h2 className="panel-title">Request flow</h2></div><Link to="/requests" className="panel-link">Open queue ↗</Link></div>
      <div className="request-ring-layout">
        <div className="request-ring" role="img" aria-label={`${total} total blood requests`}>
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r={radius} className="ring-track" />{items.map((item) => { const value = number(counts[item.key]); const length = total ? value / total * circumference : 0; const currentOffset = offset; offset += length; return length ? <circle key={item.key} cx="60" cy="60" r={radius} fill="none" stroke={item.color} strokeWidth="12" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-currentOffset} transform="rotate(-90 60 60)" className="ring-segment"><title>{item.label}: {value}</title></circle> : null })}</svg>
          <div className="ring-center"><strong>{total}</strong><span>requests</span></div>
        </div>
        <ul className="request-legend">{items.map((item) => <li key={item.key}><span className="legend-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{number(counts[item.key])}</strong></li>)}</ul>
      </div>
      <p className="panel-note">Every request moves through a clear, trackable path.</p>
    </section>
  )
}

function StockMeters({ stock }) {
  const max = Math.max(1, ...stock.map((group) => number(group.total_units)))
  return (
    <section className="dashboard-panel">
      <div className="panel-heading"><div><p className="eyebrow">Across all connected banks</p><h2 className="panel-title">Stock by blood group</h2></div><Link to="/inventory" className="panel-link">Full inventory ↗</Link></div>
      {stock.length ? <div className="stock-meter-grid">{stock.map((group) => <div className="stock-meter" key={group.blood_group}>
        <div className="flex items-center justify-between gap-2"><BloodGroupBadge group={group.blood_group} /><span className={`stock-count ${group.low_stock ? 'stock-count-low' : ''}`}>{number(group.total_units)} <small>units</small></span></div>
        <div className={`meter-track ${group.low_stock ? 'meter-track-low' : ''}`} role="meter" aria-label={`${group.blood_group} units available`} aria-valuemin="0" aria-valuemax={max} aria-valuenow={number(group.total_units)}><span style={{ width: `${number(group.total_units) / max * 100}%` }} /></div>
        <p className={`meter-caption ${group.low_stock ? 'meter-caption-low' : ''}`}>{group.low_stock ? 'Needs attention' : 'Available now'}</p>
      </div>)}</div> : <p className="panel-note">No inventory data is available yet.</p>}
      <div className="stock-legend"><span><i className="stock-legend-dot" />Units on hand</span><span><i className="stock-legend-dot stock-legend-dot-low" />Below replenishment threshold</span></div>
    </section>
  )
}

function NetworkReadiness({ donors, eligible }) {
  const percent = donors ? Math.round(eligible / donors * 100) : 0
  const circumference = 2 * Math.PI * 34
  return (
    <div className="readiness-card">
      <div className="readiness-kicker"><span className="readiness-live-dot" />NETWORK READINESS</div>
      <div className="readiness-content">
        <div><p className="readiness-value">{eligible.toLocaleString()}</p><p className="readiness-label">donors ready today</p><p className="readiness-caption">of {donors.toLocaleString()} registered donors</p></div>
        <div className="readiness-ring" role="img" aria-label={`${percent}% of registered donors are eligible today`}><svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="34" className="readiness-ring-track"/><circle cx="42" cy="42" r="34" className="readiness-ring-value" strokeDasharray={`${percent / 100 * circumference} ${circumference}`} transform="rotate(-90 42 42)"/></svg><strong>{percent}%</strong></div>
      </div>
      <p className="readiness-bottom">A living picture of who can help right now.</p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const loadDashboard = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/stock'),
      api.get('/inventory/expiring?days=7'),
      api.get('/requests?status=pending&limit=5'),
      api.get('/dashboard/reports/donation-trends?days=30'),
      api.get('/dashboard/reports/request-summary'),
    ]).then(([stats, stock, expiring, pending, trends, requests]) => {
      setDashboard({ stats: stats.data.data, stock: stock.data.data, expiring: expiring.data.data, pending: pending.data.data, trends: trends.data.data, requests: requests.data.data })
    }).catch((err) => setError(err.response?.data?.message || 'Could not load the dashboard. Check the API connection and try again.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadDashboard() }, [])

  if (loading) return <div className="dashboard-loading"><span className="loading-pulse"/><p>Gathering the latest from your network…</p></div>
  if (error) return <div className="dashboard-error"><span className="error-spark">✦</span><h1>We lost the thread.</h1><p>{error}</p><button className="btn-primary mt-4" onClick={loadDashboard}>Try again ↻</button></div>

  const stats = dashboard.stats || {}
  const donorCount = number(stats.total_donors)
  const eligibleCount = number(stats.eligible_donors)
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'

  return <div className="dashboard-page">
    <section className="dashboard-hero">
      <div className="dashboard-hero-copy">
        <p className="dashboard-date">{today} <span>·</span> Your network, in motion</p>
        <h1>Good to see you, {firstName}<span className="hero-wave">✳</span></h1>
        <p className="dashboard-intro">Every match, donation, and delivery brings help a little closer.</p>
        <div className="dashboard-actions"><Link to="/requests" className="hero-action-primary">＋ Raise a request</Link><Link to="/donations" className="hero-action-secondary">Record a donation <span>↗</span></Link></div>
      </div>
      <NetworkReadiness donors={donorCount} eligible={eligibleCount} />
      <div className="hero-pulse-art" aria-hidden="true"><svg viewBox="0 0 500 90" preserveAspectRatio="none"><path d="M0 52h114l21-1 16-28 25 54 25-37 17 12 15-1h86l18-1 14-14 22 31 20-27 16 12h91" /></svg></div>
      <span className="hero-watermark" aria-hidden="true">✚</span>
    </section>

    <section className="dashboard-stats" aria-label="Network snapshot">
      <StatCard label="Available units" value={number(stats.total_units_available).toLocaleString()} caption={`${number(stats.units_expiring_7days)} nearing expiry`} icon="◉" accent="#d34c5c"/>
      <StatCard label="Open requests" value={number(stats.pending_requests).toLocaleString()} caption={`${number(stats.critical_requests)} marked critical`} icon="⌁" accent="#e3a049"/>
      <StatCard label="Fulfilled today" value={number(stats.fulfilled_today).toLocaleString()} caption={`${number(stats.donations_today)} donations recorded`} icon="✓" accent="#628a75"/>
      <StatCard label="Connected banks" value={number(stats.total_banks).toLocaleString()} caption="In the Hemora network" icon="⌂" accent="#70879a"/>
    </section>

    <section className="dashboard-charts">
      <DonationChart rows={dashboard.trends || []} />
      <RequestRing rows={dashboard.requests || []} />
    </section>

    <section className="dashboard-lower-grid">
      <StockMeters stock={dashboard.stock || []} />
      <section className="dashboard-panel expiring-panel">
        <div className="panel-heading"><div><p className="eyebrow">Use what’s freshest</p><h2 className="panel-title">Expiry watch</h2></div><span className="expiry-window">NEXT 7 DAYS</span></div>
        {dashboard.expiring?.length ? <ul className="expiry-list">{dashboard.expiring.slice(0, 5).map((unit) => <li key={unit.unit_id}><span className="expiry-blood"><BloodGroupBadge group={unit.blood_group}/><span className="expiry-bank">{unit.bank_name}</span></span><span className={number(unit.days_until_expiry) <= 2 ? 'expiry-critical' : 'expiry-days'}><strong>{unit.days_until_expiry}</strong> days</span></li>)}</ul> : <div className="empty-note"><span>✓</span><p>Nothing is nearing expiry this week.</p><small>Your stock is looking after itself.</small></div>}
        <Link to="/inventory" className="panel-link mt-4 inline-flex">Review inventory ↗</Link>
      </section>
    </section>

    <section className="dashboard-panel pending-panel">
      <div className="panel-heading"><div><p className="eyebrow">People waiting for a match</p><h2 className="panel-title">Requests to keep an eye on</h2></div><Link to="/requests" className="panel-link">See all requests ↗</Link></div>
      {dashboard.pending?.length ? <div className="request-list">{dashboard.pending.slice(0, 5).map((request) => <article className="request-row" key={request.request_id}><div className="request-blood"><BloodGroupBadge group={request.blood_group}/></div><div className="request-person"><strong>{request.patient_name}</strong><span>{request.hospital_name} · {request.hospital_city || 'Location not listed'}</span></div><div className="request-units"><strong>{request.units_needed}</strong><span>units</span></div><UrgencyBadge urgency={request.urgency}/><Link to="/requests" className="request-open" aria-label={`Open request for ${request.patient_name}`}>↗</Link></article>)}</div> : <div className="empty-note"><span>♡</span><p>No requests are waiting for action.</p><small>When a new need arrives, it will find a place here.</small></div>}
    </section>

    <div className="dashboard-signoff"><span className="signoff-mark">✚</span><span>Good things flow when we do it together.</span><span className="signoff-line"/></div>
  </div>
}
