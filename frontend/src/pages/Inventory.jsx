import { useEffect, useState } from 'react'
import api from '../api/client'
import BloodGroupBadge, { StatusBadge } from '../components/Badges'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
const LOW = 3

function dateLabel(v) {
  if (!v) return '—'
  return new Date(`${String(v).slice(0,10)}T00:00:00`).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}

export default function Inventory() {
  const [summary,  setSummary]  = useState([])
  const [expiring, setExpiring] = useState([])
  const [units,    setUnits]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('summary')
  const [gFilter,  setGFilter]  = useState('')
  const [sFilter,  setSFilter]  = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/inventory/summary'),
      api.get('/inventory/expiring'),
      api.get('/inventory?limit=200'),
    ]).then(([s, e, u]) => {
      setSummary(s.data.data || [])
      setExpiring(e.data.data || [])
      setUnits(u.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  const stockMap = Object.fromEntries(summary.map(s => [s.blood_group, Number(s.total_units)]))
  const visible  = units.filter(u => (!gFilter || u.blood_group === gFilter) && (!sFilter || u.status === sFilter))

  const TABS = [
    { id:'summary',  label:'By Blood Group' },
    { id:'expiring', label:`Expiring (${expiring.length})` },
    { id:'units',    label:'All Units' },
  ]

  if (loading) return <div className="page"><div className="skeleton h-96 rounded-xl" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Blood unit stock across 25 real hospitals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-dark-800 rounded-xl border border-dark-500 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${tab === t.id ? 'bg-blood-gradient text-white shadow-blood' : 'text-muted hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* BY BLOOD GROUP */}
      {tab === 'summary' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BLOOD_GROUPS.map(g => {
            const count = stockMap[g] || 0
            const isOut = count === 0
            const isLow = count > 0 && count < LOW
            return (
              <div key={g} className={`card text-center ${isOut ? 'border-blood-700/70 shadow-blood' : isLow ? 'border-gold-600/50' : ''}`}>
                <BloodGroupBadge group={g} size="lg" />
                <p className={`text-4xl font-black mt-3 ${isOut ? 'text-blood-500' : isLow ? 'text-gold-400' : 'text-white'}`}>{count}</p>
                <p className="text-xs text-muted mt-1">units</p>
                {isOut && <span className="badge bg-blood-900/60 text-blood-300 border border-blood-700/40 mt-2">OUT OF STOCK</span>}
                {isLow && <span className="badge bg-gold-600/20 text-gold-400 border border-gold-600/30 mt-2">LOW STOCK</span>}
                {/* mini bar */}
                <div className="score-bar mt-3">
                  <div className="score-fill" style={{ width: `${Math.min(count / 10 * 100, 100)}%`, background: isOut ? '#7B0D1E' : isLow ? '#D4870A' : '#2ECC71' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* EXPIRING */}
      {tab === 'expiring' && (
        expiring.length === 0 ? (
          <div className="card text-center py-16 text-muted">
            <div className="text-4xl mb-3">✓</div>
            <p className="font-semibold text-white">Nothing expiring this week</p>
            <p className="text-sm mt-1">Your stock is healthy.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expiring.map(u => (
              <div key={u.unit_id} className={`card flex items-center gap-4 !py-3 ${u.days_until_expiry <= 2 ? 'border-blood-700/70' : 'border-gold-600/40'}`}>
                <BloodGroupBadge group={u.blood_group} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{u.bank_name}</p>
                  <p className="text-xs text-muted">{u.bank_city} · Unit #{u.unit_id}</p>
                </div>
                <div className="text-right">
                  <span className={`badge font-mono ${u.days_until_expiry <= 2 ? 'bg-blood-900/60 text-blood-300 border border-blood-700/40' : 'bg-gold-600/20 text-gold-400 border border-gold-600/30'}`}>
                    {u.days_until_expiry} day{u.days_until_expiry !== 1 ? 's' : ''} left
                  </span>
                  <p className="text-xs text-muted mt-1">Expires {dateLabel(u.expiry_date)}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ALL UNITS */}
      {tab === 'units' && (
        <div className="card !p-0 overflow-hidden">
          <div className="flex flex-wrap gap-3 p-4 border-b border-dark-500">
            <select className="select w-auto" value={gFilter} onChange={e => setGFilter(e.target.value)}>
              <option value="">All groups</option>
              {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
            <select className="select w-auto" value={sFilter} onChange={e => setSFilter(e.target.value)}>
              <option value="">All statuses</option>
              {['available','issued','expired','discarded'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(gFilter || sFilter) && (
              <button className="btn-ghost text-xs" onClick={() => { setGFilter(''); setSFilter('') }}>✕ Clear</button>
            )}
            <span className="ml-auto text-xs text-muted self-center">{visible.length} units shown</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr>
                <th className="th">Unit #</th>
                <th className="th">Blood Group</th>
                <th className="th">Blood Bank</th>
                <th className="th">Collected</th>
                <th className="th">Expires</th>
                <th className="th">Status</th>
              </tr></thead>
              <tbody>
                {visible.map(u => (
                  <tr key={u.unit_id} className="tr">
                    <td className="td font-mono text-muted">#{u.unit_id}</td>
                    <td className="td"><BloodGroupBadge group={u.blood_group} /></td>
                    <td className="td">
                      <p className="text-white font-medium text-xs">{u.bank_name}</p>
                      <p className="text-muted text-xs">{u.bank_city}</p>
                    </td>
                    <td className="td text-muted text-xs">{dateLabel(u.collection_date)}</td>
                    <td className="td text-muted text-xs">{dateLabel(u.expiry_date)}</td>
                    <td className="td"><StatusBadge status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
