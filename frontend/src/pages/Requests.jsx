import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import BloodGroupBadge from '../components/Badges'
import { UrgencyBadge, StatusBadge } from '../components/Badges'
import ErrorBanner, { getErrorMessage } from '../components/ErrorBanner'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

/* ── New Request Modal ─────────────────────────────────────── */
function NewRequestModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    patient_name:'', patient_age:'', patient_gender:'M',
    patient_blood_group:'O+', hospital_name:'', hospital_city:'',
    hospital_state:'', contact_phone:'', blood_group:'O+',
    units_needed:'1', urgency:'normal', notes:'',
  })
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      await api.post('/requests', {
        ...form,
        patient_age:  form.patient_age ? Number(form.patient_age) : null,
        units_needed: Number(form.units_needed),
      })
      onSaved()
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">New Blood Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient Information</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Patient Name *</label>
              <input required className="input" value={form.patient_name}
                onChange={(e) => set('patient_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Age</label>
              <input type="number" min="0" className="input" value={form.patient_age}
                onChange={(e) => set('patient_age', e.target.value)} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="select" value={form.patient_gender} onChange={(e) => set('patient_gender', e.target.value)}>
                <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Patient Blood Group *</label>
              <select required className="select" value={form.patient_blood_group} onChange={(e) => set('patient_blood_group', e.target.value)}>
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input className="input" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2 border-t">Hospital & Request</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Hospital Name *</label>
              <input required className="input" value={form.hospital_name} onChange={(e) => set('hospital_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Hospital City *</label>
              <input required className="input" value={form.hospital_city} onChange={(e) => set('hospital_city', e.target.value)} />
            </div>
            <div>
              <label className="label">Hospital State *</label>
              <input required className="input" value={form.hospital_state} onChange={(e) => set('hospital_state', e.target.value)} />
            </div>
            <div>
              <label className="label">Blood Group Needed *</label>
              <select required className="select" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Units Needed *</label>
              <input required type="number" min="1" className="input" value={form.units_needed}
                onChange={(e) => set('units_needed', e.target.value)} />
            </div>
            <div>
              <label className="label">Urgency *</label>
              <select className="select" value={form.urgency} onChange={(e) => set('urgency', e.target.value)}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical 🚨</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea rows="2" className="input resize-none" value={form.notes}
                onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Matching Results Panel ─────────────────────────────────── */
function MatchPanel({ requestId, onClose }) {
  const { user } = useAuth()
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [notified, setNotified] = useState(new Set())
  const [selected, setSelected] = useState([])
  const [fulfilling, setFulfilling] = useState(false)
  const [tab,      setTab]      = useState('donors')

  useEffect(() => {
    api.get(`/requests/${requestId}/match`)
      .then((r) => setData(r.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [requestId])

  async function notify(donorId) {
    try {
      await api.post(`/requests/${requestId}/notify/${donorId}`)
      setNotified((s) => new Set([...s, donorId]))
    } catch (err) { alert(getErrorMessage(err)) }
  }

  async function fulfill() {
    if (!selected.length) return alert('Select at least one unit.')
    setFulfilling(true)
    try {
      await api.post(`/requests/${requestId}/fulfill`, { unit_ids: selected })
      alert('Request fulfilled successfully!')
      onClose()
    } catch (err) { alert(getErrorMessage(err)) }
    finally { setFulfilling(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold">Matching Results</h2>
            {data && <p className="text-xs text-gray-400 mt-0.5">{data.compatibility_note}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <div className="p-6">
          {loading && <p className="text-center text-gray-400 py-8">Running matching algorithm…</p>}
          <ErrorBanner error={error} />

          {data && (
            <>
              <div className="flex gap-2 mb-5">
                <button onClick={() => setTab('donors')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === 'donors' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  Compatible Donors ({data.matching_donors.length})
                </button>
                <button onClick={() => setTab('units')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === 'units' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  Available Units ({data.available_units.length})
                </button>
              </div>

              {/* Donors tab */}
              {tab === 'donors' && (
                data.matching_donors.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No eligible compatible donors found in {data.request.city}.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.matching_donors.map((d, i) => (
                      <li key={d.donor_id} className={`rounded-xl border p-4 flex items-center justify-between gap-4
                        ${d.is_exact_match ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg text-gray-400 font-mono w-5">#{i + 1}</span>
                          <BloodGroupBadge group={d.blood_group} />
                          <div>
                            <p className="font-semibold text-gray-900">{d.name}</p>
                            <p className="text-xs text-gray-500">{d.city} · {d.phone || 'No phone'}</p>
                            <p className="text-xs text-gray-400">
                              {d.last_donation_date
                                ? `Last donated: ${new Date(d.last_donation_date).toLocaleDateString('en-IN')}`
                                : 'Never donated'}
                              {' · '}{d.total_donations} donations
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {d.is_exact_match && <span className="badge bg-green-100 text-green-700">Exact</span>}
                          {(user?.role === 'admin' || user?.role === 'hospital') && (
                            notified.has(d.donor_id) ? (
                              <span className="badge bg-blue-100 text-blue-700">Match recorded</span>
                            ) : (
                              <button onClick={() => notify(d.donor_id)} className="btn-secondary text-sm !py-1">
                                Record match
                              </button>
                            )
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {/* Units tab */}
              {tab === 'units' && (
                <>
                  {data.available_units.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No compatible units available.</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.available_units.map((u) => (
                        <li key={u.unit_id} className={`rounded-xl border p-4 flex items-center justify-between gap-4
                          ${u.is_exact_match ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            {user?.role === 'admin' && (
                              <input type="checkbox" checked={selected.includes(u.unit_id)}
                                onChange={(e) => setSelected((s) =>
                                  e.target.checked ? [...s, u.unit_id] : s.filter((id) => id !== u.unit_id)
                                )}
                                className="w-4 h-4 accent-red-600"
                              />
                            )}
                            <BloodGroupBadge group={u.blood_group} />
                            <div>
                              <p className="font-semibold text-gray-800">{u.bank_name} · {u.bank_city}</p>
                              <p className="text-xs text-gray-500">
                                Expires: {new Date(u.expiry_date).toLocaleDateString('en-IN')} · #{u.unit_id}
                              </p>
                            </div>
                          </div>
                          {u.is_exact_match && <span className="badge bg-green-100 text-green-700">Exact match</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {user?.role === 'admin' && selected.length > 0 && (
                    <div className="mt-4 flex justify-end gap-3">
                      <p className="text-sm text-gray-500 self-center">{selected.length} unit(s) selected</p>
                      <button onClick={fulfill} disabled={fulfilling} className="btn-primary">
                        {fulfilling ? 'Fulfilling…' : 'Fulfill Request'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main Requests Page ─────────────────────────────────────── */
export default function Requests() {
  const { user }   = useAuth()
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [showNew,  setShowNew]  = useState(false)
  const [matching, setMatching] = useState(null) // request_id being matched
  const [filters,  setFilters]  = useState({ status: '', urgency: '', blood_group: '' })

  async function fetchRequests() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status)      params.set('status',      filters.status)
      if (filters.urgency)     params.set('urgency',     filters.urgency)
      if (filters.blood_group) params.set('blood_group', filters.blood_group)
      const { data } = await api.get(`/requests?${params}&limit=50`)
      setRequests(data.data)
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRequests() }, [filters]) // eslint-disable-line

  const urgencyBorder = { critical: 'border-l-red-500', urgent: 'border-l-amber-400', normal: 'border-l-gray-200' }

  return (
    <div className="space-y-6">
      {showNew && <NewRequestModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); fetchRequests() }} />}
      {matching && <MatchPanel requestId={matching} onClose={() => { setMatching(null); fetchRequests() }} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Blood Requests</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Request</button>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 !p-4">
        <div className="flex-1 min-w-32">
          <label className="label">Status</label>
          <select className="select" value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="matched">Matched</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex-1 min-w-32">
          <label className="label">Urgency</label>
          <select className="select" value={filters.urgency}
            onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}>
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
        </div>
        <div className="flex-1 min-w-32">
          <label className="label">Blood Group</label>
          <select className="select" value={filters.blood_group}
            onChange={(e) => setFilters((f) => ({ ...f, blood_group: e.target.value }))}>
            <option value="">All</option>
            {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-secondary"
            onClick={() => setFilters({ status: '', urgency: '', blood_group: '' })}>Clear</button>
        </div>
      </div>

      {/* Request cards */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No requests found.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.request_id}
              className={`card border-l-4 ${urgencyBorder[r.urgency] || 'border-l-gray-200'} !py-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <BloodGroupBadge group={r.blood_group} size="lg" />
                  <div>
                    <p className="font-semibold text-gray-900">{r.patient_name}</p>
                    <p className="text-sm text-gray-500">{r.hospital_name} · {r.hospital_city}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.units_needed} unit{r.units_needed !== 1 ? 's' : ''} needed
                      {r.units_fulfilled > 0 && ` · ${r.units_fulfilled} fulfilled`}
                      {' · '}#{r.request_id}
                      {' · '}{new Date(r.request_date).toLocaleDateString('en-IN')}
                    </p>
                    {r.notes && <p className="text-xs text-gray-400 mt-1 italic">"{r.notes}"</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <UrgencyBadge urgency={r.urgency} />
                  <StatusBadge status={r.status} />
                  {['admin', 'hospital'].includes(user?.role) && (r.status === 'pending' || r.status === 'matched') && (
                    <button onClick={() => setMatching(r.request_id)} className="btn-primary text-sm !py-1">
                      Find compatible donors
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
