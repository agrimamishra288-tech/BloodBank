import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Droplet, Heart, MapPin, Clock3, Activity, AlertCircle } from 'lucide-react'
import api from '../api/client'
import BloodGroupBadge, { UrgencyBadge } from '../components/Badges'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

const GROUPS = ['O−','O+','A−','A+','B−','B+','AB−','AB+']
const KEYS = ['O-','O+','A-','A+','B-','B+','AB-','AB+']
const COLORS = ['#9f7180','#a33a50','#b87987','#ce596b','#d09a69','#d5b16f','#8a7797','#ac8bba']

function Ring({ value, max = 100 }) {
  const pct = Math.min(100, max ? Math.round(value / max * 100) : 0)
  return <div className="stock-ring" style={{ '--ring-value': `${pct * 3.6}deg` }}><div className="ring-inner"><strong>{pct}%</strong><span>of target</span></div></div>
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [stock, setStock] = useState([])
  const [expiring, setExpiring] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/stock'), api.get('/inventory/expiring'), api.get('/requests?status=pending&limit=5')])
      .then(([s, st, ex, rq]) => { setStats(s.data.data); setStock(st.data.data || []); setExpiring(ex.data.data || []); setPending(rq.data.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => {
    const map = Object.fromEntries(stock.map(row => [row.blood_group, Number(row.total_units)]))
    return KEYS.map((key, i) => ({ group: GROUPS[i], units: map[key] || 0, color: COLORS[i] }))
  }, [stock])

  const totalUnits = Number(stats?.total_units_available || 0)
  const target = Math.max(160, Math.ceil(totalUnits / 100) * 100)
  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return <div className="page dashboard-page">
    <header className="dashboard-heading">
      <div><p className="dashboard-date">{today} <span>·</span> COMMUNITY OVERVIEW</p><h1>Care in circulation.</h1><p className="dashboard-intro">A clear view of the people and blood units ready to help.</p></div>
      <span className="sync-label"><i/> DATA CONNECTED</span>
    </header>

    <section className="dashboard-hero">
      <div className="hero-copy"><span className="hero-eyebrow"><Activity size={14}/> THE NETWORK AT A GLANCE</span><h2>Every donation<br/>moves hope forward.</h2><p>Small acts of care add up to a community ready for the moment someone needs it.</p><Link to="/donors" className="hero-link">Explore our donors <ArrowUpRight size={16}/></Link></div>
      <div className="hero-visual"><div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/><div className="hero-drop"><Droplet size={70} strokeWidth={1.1}/><span>+</span></div><div className="hero-caption"><span>AVAILABLE STOCK</span><strong>{loading ? '—' : totalUnits.toLocaleString('en-IN')} <small>units</small></strong></div></div>
      <div className="hero-aside"><p>STOCK AGAINST A MODEST NETWORK TARGET</p><Ring value={totalUnits} max={target}/><span className="hero-aside-foot"><i/> Inventory updates from your database</span></div>
    </section>

    <section className="stat-grid" aria-label="Network statistics">
      <article className="metric-card metric-rose"><div className="metric-card-top"><span>REGISTERED DONORS</span><span className="metric-icon-small"><Heart size={17}/></span></div><strong>{loading ? '—' : Number(stats?.total_donors || 0).toLocaleString('en-IN')}</strong><p><b>{Number(stats?.eligible_donors || 0).toLocaleString('en-IN')}</b> currently eligible</p><div className="metric-rule"><i style={{ width: `${stats?.total_donors ? Math.min(100, stats.eligible_donors / stats.total_donors * 100) : 0}%` }}/></div></article>
      <article className="metric-card metric-sand"><div className="metric-card-top"><span>BLOOD UNITS READY</span><span className="metric-icon-small"><Droplet size={17}/></span></div><strong>{loading ? '—' : totalUnits.toLocaleString('en-IN')}</strong><p>Across all active inventory</p><div className="metric-pips">{chartData.map((g, i) => <i key={g.group} style={{ backgroundColor: COLORS[i], opacity: g.units ? 1 : .22 }}/>)}</div></article>
      <article className="metric-card metric-lavender"><div className="metric-card-top"><span>OPEN REQUESTS</span><span className="metric-icon-small"><AlertCircle size={17}/></span></div><strong>{loading ? '—' : Number(stats?.pending_requests || 0).toLocaleString('en-IN')}</strong><p><b>{Number(stats?.critical_requests || 0).toLocaleString('en-IN')}</b> need urgent attention</p><Link to="/requests" className="metric-text-link">Review requests <ArrowUpRight size={14}/></Link></article>
    </section>

    <section className="dashboard-grid-main">
      <article className="panel stock-panel"><div className="panel-heading"><div><span className="panel-kicker">INVENTORY</span><h3>A little of each type.</h3><p>Available units by blood group</p></div><Link to="/inventory" className="panel-link">Full inventory <ArrowUpRight size={15}/></Link></div>
        <div className="stock-chart"><ResponsiveContainer width="100%" height={232}><BarChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="group" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 12, fontWeight: 600 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)', fontSize: 11 }}/><Tooltip cursor={{ fill: 'var(--chart-hover)' }} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' }}/><Bar dataKey="units" radius={[6,6,0,0]} maxBarSize={40}>{chartData.map((entry, i) => <Cell key={entry.group} fill={COLORS[i]}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="chart-footnote"><span><i/> WELL STOCKED</span><span><i/> NEEDS ATTENTION</span><span className="chart-foot-muted">Live counts from the inventory table</span></div>
      </article>
      <article className="panel requests-panel"><div className="panel-heading"><div><span className="panel-kicker">NEEDS, RIGHT NOW</span><h3>Requests in motion.</h3><p>Open requests, highest urgency first</p></div><Link to="/requests" className="round-link" aria-label="View all requests"><ArrowUpRight size={17}/></Link></div>
        {pending.length === 0 ? <div className="empty-state"><span className="empty-icon"><Heart size={21}/></span><strong>All caught up.</strong><p>No open requests are waiting right now.</p></div> : <div className="request-list">{pending.slice(0,4).map(r => <div className="request-row" key={r.request_id}><div className="request-blood"><BloodGroupBadge group={r.blood_group}/></div><div className="request-detail"><strong>{r.patient_name}</strong><span><MapPin size={12}/>{r.hospital_city || r.hospital_name}</span></div><div className="request-meta"><span>{r.units_needed} units</span><UrgencyBadge urgency={r.urgency}/></div></div>)}</div>}
        <Link to="/requests" className="request-bottom-link">See all requests <ArrowUpRight size={14}/></Link>
      </article>
    </section>

    <section className="bottom-strip"><div className="bottom-title"><Clock3 size={17}/><div><strong>Keep an eye on expiry.</strong><span>Units nearing the end of their storage window</span></div></div><div className="expiry-preview">{expiring.length === 0 ? <span className="expiry-none">No units expiring in the next seven days</span> : expiring.slice(0,3).map(unit => <div className="expiry-chip" key={unit.unit_id}><BloodGroupBadge group={unit.blood_group}/><span>{unit.bank_city || unit.bank_name}</span><b>{unit.days_until_expiry}d</b></div>)}</div><Link to="/inventory" className="expiry-link">Inventory <ArrowUpRight size={14}/></Link></section>
  </div>
}
