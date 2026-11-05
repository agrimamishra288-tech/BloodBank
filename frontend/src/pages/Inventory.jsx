import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import BloodGroupBadge, { StatusBadge } from '../components/Badges'
import ErrorBanner, { getErrorMessage } from '../components/ErrorBanner'

const LOW_STOCK = 3
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

function dateLabel(value) {
  if (!value) return '—'
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function EmptyState({ title, detail }) {
  return <div className="inventory-empty"><span aria-hidden="true">—</span><strong>{title}</strong><p>{detail}</p></div>
}

function Metric({ label, value, detail, tone = '' }) {
  return <article className={`inventory-metric ${tone}`}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>
}

export default function Inventory() {
  const [summary, setSummary] = useState([])
  const [expiring, setExpiring] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('summary')
  const [groupFilter, setGroupFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/inventory/summary'),
      api.get('/inventory/expiring?days=7'),
      api.get('/inventory?limit=100'),
    ]).then(([s, e, u]) => {
      if (!active) return
      setSummary(s.data.data)
      setExpiring(e.data.data)
      setUnits(u.data.data)
    }).catch((err) => { if (active) setError(getErrorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visibleUnits = useMemo(() => units.filter((unit) =>
    (!groupFilter || unit.blood_group === groupFilter) &&
    (!statusFilter || unit.status === statusFilter)), [units, groupFilter, statusFilter])
  const availableCount = units.filter((unit) => unit.status === 'available' && new Date(`${String(unit.expiry_date).slice(0, 10)}T00:00:00`) >= new Date(new Date().toDateString())).length
  const totalStock = summary.reduce((sum, item) => sum + Number(item.total_units || 0), 0)
  const lowGroups = summary.filter((item) => item.low_stock).length

  const tabs = [
    { id: 'summary', label: 'Stock by group' },
    { id: 'expiring', label: 'Expiring soon', count: expiring.length },
    { id: 'all', label: 'All units', count: units.length },
  ]

  return (
    <div className="inventory-page">
      <header className="inventory-page-header">
        <div>
          <p className="eyebrow">OPERATIONS · STOCK CONTROL</p>
          <h1 className="page-title mt-2">Blood inventory</h1>
          <p className="inventory-intro">A clear view of available units, blood groups, and expiry dates.</p>
        </div>
        <div className="inventory-header-note"><span className="inventory-live-dot" />Inventory overview</div>
      </header>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {loading ? <div className="inventory-loading" role="status"><span className="inventory-loading-line" /><p>Loading inventory</p></div> : <>
        <section className="inventory-metrics" aria-label="Inventory summary">
          <Metric label="Available units" value={availableCount} detail="Usable units across the listed stock" />
          <Metric label="Blood groups" value={summary.length} detail="Groups tracked in the inventory" />
          <Metric label="Low stock groups" value={lowGroups} detail={`Below the ${LOW_STOCK}-unit threshold`} tone={lowGroups ? 'inventory-metric-attention' : ''} />
          <Metric label="Expiring this week" value={expiring.length} detail="Units with expiry in the next 7 days" tone={expiring.length ? 'inventory-metric-expiry' : ''} />
        </section>

        <nav className="inventory-tabs" aria-label="Inventory views" role="tablist">
          {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id}
            className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            {item.label}{item.count !== undefined && <span>{item.count}</span>}
          </button>)}
        </nav>

        {tab === 'summary' && <section className="inventory-stock-section">
          <div className="inventory-section-heading"><div><h2>Available by blood group</h2><p>{totalStock} usable units across all blood banks</p></div><span className="inventory-section-tag">LIVE STOCK</span></div>
          {summary.length ? <div className="inventory-group-grid">
            {summary.map((item) => {
              const count = Number(item.total_units || 0)
              const max = Math.max(1, ...summary.map((group) => Number(group.total_units || 0)))
              return <article className={`inventory-group-card ${item.low_stock ? 'is-low' : ''}`} key={item.blood_group}>
                <div className="inventory-group-top"><BloodGroupBadge group={item.blood_group} size="lg" /><span className={`inventory-stock-state ${count === 0 ? 'is-empty' : item.low_stock ? 'is-low' : ''}`}>{count === 0 ? 'Out of stock' : item.low_stock ? 'Low stock' : 'In range'}</span></div>
                <div className="inventory-group-count"><strong>{count}</strong><span>units available</span></div>
                <div className="inventory-meter" role="meter" aria-label={`${item.blood_group}: ${count} available units`} aria-valuemin="0" aria-valuemax={max} aria-valuenow={count}><span style={{ width: `${count / max * 100}%` }} /></div>
                <p className="inventory-earliest">Earliest expiry <strong>{dateLabel(item.earliest_expiry)}</strong></p>
              </article>
            })}
          </div> : <EmptyState title="No stock summary available" detail="Blood group totals will appear here when inventory records are available." />}
        </section>}

        {tab === 'expiring' && <section className="inventory-table-panel">
          <div className="inventory-section-heading"><div><h2>Units expiring soon</h2><p>Available units that need attention within the next seven days.</p></div><span className="inventory-section-tag inventory-section-tag-warm">NEXT 7 DAYS</span></div>
          {expiring.length ? <div className="inventory-table-scroll"><table className="inventory-table"><thead><tr><th>Unit</th><th>Group</th><th>Blood bank</th><th>Expiry date</th><th>Time remaining</th></tr></thead><tbody>
            {expiring.map((unit) => <tr key={unit.unit_id} className={unit.days_until_expiry <= 2 ? 'urgent-row' : ''}>
              <td><span className="inventory-unit-id">#{unit.unit_id}</span></td><td><BloodGroupBadge group={unit.blood_group} /></td>
              <td><strong>{unit.bank_name}</strong><span className="inventory-cell-subtitle">{unit.bank_city}</span></td>
              <td>{dateLabel(unit.expiry_date)}</td><td><span className={`inventory-days-left ${unit.days_until_expiry <= 2 ? 'is-urgent' : ''}`}>{unit.days_until_expiry} {unit.days_until_expiry === 1 ? 'day' : 'days'}</span></td>
            </tr>)}
          </tbody></table></div> : <EmptyState title="No units expiring this week" detail="The current inventory has no units within the seven-day expiry window." />}
        </section>}

        {tab === 'all' && <section className="inventory-table-panel">
          <div className="inventory-section-heading"><div><h2>Inventory units</h2><p>Review each recorded unit and its current status.</p></div><span className="inventory-section-tag">{visibleUnits.length} SHOWN</span></div>
          <div className="inventory-filters">
            <label>Blood group<select className="select" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></label>
            <label>Status<select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{['available','issued','expired','discarded'].map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label>
            {(groupFilter || statusFilter) && <button type="button" className="btn-secondary" onClick={() => { setGroupFilter(''); setStatusFilter('') }}>Clear filters</button>}
          </div>
          {visibleUnits.length ? <div className="inventory-table-scroll"><table className="inventory-table"><thead><tr><th>Unit</th><th>Blood group</th><th>Blood bank</th><th>Collected</th><th>Expires</th><th>Status</th></tr></thead><tbody>
            {visibleUnits.map((unit) => <tr key={unit.unit_id}><td><span className="inventory-unit-id">#{unit.unit_id}</span></td><td><BloodGroupBadge group={unit.blood_group} /></td><td><strong>{unit.bank_name}</strong><span className="inventory-cell-subtitle">{unit.bank_city}</span></td><td>{dateLabel(unit.collection_date)}</td><td>{dateLabel(unit.expiry_date)}</td><td><StatusBadge status={unit.status} /></td></tr>)}
          </tbody></table></div> : <EmptyState title="No units match these filters" detail="Adjust your blood group or status selection to see more units." />}
        </section>}
      </>}
    </div>
  )
}
