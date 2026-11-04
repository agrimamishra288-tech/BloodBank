import { useEffect, useState } from 'react'
import api from '../api/client'
import BloodGroupBadge from '../components/Badges'
import { StatusBadge } from '../components/Badges'
import ErrorBanner, { getErrorMessage } from '../components/ErrorBanner'

const LOW_STOCK = 3

export default function Inventory() {
  const [summary,  setSummary]  = useState([])
  const [expiring, setExpiring] = useState([])
  const [units,    setUnits]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [tab,      setTab]      = useState('summary') // summary | expiring | all

  useEffect(() => {
    Promise.all([
      api.get('/inventory/summary'),
      api.get('/inventory/expiring?days=7'),
      api.get('/inventory?status=available&limit=100'),
    ]).then(([s, e, u]) => {
      setSummary(s.data.data)
      setExpiring(e.data.data)
      setUnits(u.data.data)
    }).catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading inventory…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Blood Inventory</h1>
        <div className="flex gap-2">
          {['summary', 'expiring', 'all'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}>
              {t === 'summary' ? 'By Blood Group' : t === 'expiring' ? `Expiring (${expiring.length})` : 'All Units'}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner error={error} />

      {/* SUMMARY TAB */}
      {tab === 'summary' && (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">Blood Group</th>
                <th className="text-right px-6 py-3 text-gray-600 font-semibold">Available Units</th>
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">Earliest Expiry</th>
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summary.map((s) => (
                <tr key={s.blood_group}
                  className={s.low_stock ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4">
                    <BloodGroupBadge group={s.blood_group} size="lg" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-2xl font-bold ${s.low_stock ? 'text-red-600' : 'text-gray-800'}`}>
                      {s.total_units}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {s.earliest_expiry
                      ? new Date(s.earliest_expiry).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {s.total_units === 0 ? (
                      <span className="badge bg-red-100 text-red-800 font-semibold">🚨 OUT OF STOCK</span>
                    ) : s.low_stock ? (
                      <span className="badge bg-orange-100 text-orange-800 font-semibold">⚠ LOW STOCK (&lt;{LOW_STOCK})</span>
                    ) : (
                      <span className="badge bg-green-100 text-green-800">✓ OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EXPIRING TAB */}
      {tab === 'expiring' && (
        expiring.length === 0 ? (
          <div className="card text-center text-gray-400 py-10">No units expiring within 7 days. 🎉</div>
        ) : (
          <div className="card overflow-hidden !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">Unit ID</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">Blood Group</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">Bank</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">Expiry Date</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expiring.map((u) => (
                  <tr key={u.unit_id} className={u.days_until_expiry <= 2 ? 'bg-red-50' : 'bg-amber-50/40'}>
                    <td className="px-5 py-3 text-gray-500">#{u.unit_id}</td>
                    <td className="px-5 py-3"><BloodGroupBadge group={u.blood_group} /></td>
                    <td className="px-5 py-3 text-gray-700">{u.bank_name} · {u.bank_city}</td>
                    <td className="px-5 py-3 text-gray-700">{new Date(u.expiry_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${u.days_until_expiry <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                        {u.days_until_expiry} day{u.days_until_expiry !== 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ALL UNITS TAB */}
      {tab === 'all' && (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Unit ID</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Blood Group</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Bank</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Collected</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Expires</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {units.map((u) => (
                <tr key={u.unit_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500">#{u.unit_id}</td>
                  <td className="px-5 py-3"><BloodGroupBadge group={u.blood_group} /></td>
                  <td className="px-5 py-3 text-gray-700">{u.bank_name}</td>
                  <td className="px-5 py-3 text-gray-600">{new Date(u.collection_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3 text-gray-600">{new Date(u.expiry_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
