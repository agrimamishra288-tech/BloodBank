import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import BloodGroupBadge, { UrgencyBadge, StatusBadge, ScoreBadge } from '../components/Badges'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

function getErr(e) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong'
}

/* ── New Request Modal ─────────────────────────────────────── */
function NewRequestModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    patient_name:'', patient_age:'', patient_gender:'M',
    patient_blood_group:'O+', hospital_name:'', hospital_city:'',
    hospital_state:'', contact_phone:'', blood_group:'O+',
    units_needed:'1', urgency:'normal', notes:'',
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/requests', {
        ...form,
        patient_age:  form.patient_age ? Number(form.patient_age) : null,
        units_needed: Number(form.units_needed),
      })
      toast.success('Blood request submitted! 🩸')
      onSaved()
    } catch (err) {
      toast.error(getErr(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest">Emergency</p>
            <h2 className="text-xl font-bold text-white">New Blood Request</h2>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs font-semibold text-blood-400 uppercase tracking-widest border-b border-dark-700 pb-2">Patient Information</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Patient Name *</label>
              <input required className="input" placeholder="Patient full name"
                value={form.patient_name} onChange={(e) => set('patient_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Age</label>
              <input type="number" min="0" className="input" placeholder="Age"
                value={form.patient_age} onChange={(e) => set('patient_age', e.target.value)} />
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
              <input className="input" placeholder="+91…" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
            </div>
          </div>

          <p className="text-xs font-semibold text-blood-400 uppercase tracking-widest border-b border-dark-700 pb-2 pt-2">Hospital & Request</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Hospital Name *</label>
              <input required className="input" placeholder="AIIMS New Delhi"
                value={form.hospital_name} onChange={(e) => set('hospital_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Hospital City *</label>
              <input required className="input" placeholder="New Delhi"
                value={form.hospital_city} onChange={(e) => set('hospital_city', e.target.value)} />
            </div>
            <div>
              <label className="label">Hospital State *</label>
              <input required className="input" placeholder="Delhi"
                value={form.hospital_state} onChange={(e) => set('hospital_state', e.target.value)} />
            </div>
            <div>
              <label className="label">Blood Group Needed *</label>
              <select required className="select" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Units Needed *</label>
              <input required type="number" min="1" className="input"
                value={form.units_needed} onChange={(e) => set('units_needed', e.target.value)} />
            </div>
            <div>
              <label className="label">Urgency *</label>
              <select className="select" value={form.urgency} onChange={(e) => set('urgency', e.target.value)}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent ⚠️</option>
                <option value="critical">Critical 🚨</option>
              </select>
            </div>
            <div>
              {/* spacer */}
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea rows="2" className="input resize-none" placeholder="Any additional notes…"
                value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Submitting…' : '🩸 Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Match Panel ───────────────────────────────────────────── */
function MatchPanel({ requestId, onClose }) {
  const { user } = useAuth()
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [notified,   setNotified]   = useState(new Set())
  const [selected,   setSelected]   = useState([])
  const [fulfilling, setFulfilling] = useState(false)
  const [tab,        setTab]        = useState('donors')

  useEffect(() => {
    api.get(`/requests/${requestId}/match`)
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(getErr(err)))
      .finally(() => setLoading(false))
  }, [requestId])

  async function notify(donorId) {
    try {
      await api.post(`/requests/${requestId}/notify/${donorId}`)
      setNotified((s) => new Set([...s, donorId]))
      toast.success('Match recorded!')
    } catch (err) {
      toast.error(getErr(err))
    }
  }

  async function fulfill() {
    if (!selected.length) { toast.error('Select at least one unit.'); return }
    setFulfilling(true)
    try {
      await api.post(`/requests/${requestId}/fulfill`, { unit_ids: selected })
      toast.success('Request fulfilled! Inventory updated via trigger. ✅')
      onClose()
    } catch (err) {
      toast.error(getErr(err))
    } finally {
      setFulfilling(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-3xl !p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest">AI Matching Engine</p>
            <h2 className="text-xl font-bold text-white">Matching Results</h2>
            {data && <p className="text-xs text-dark-400 mt-0.5">{data.compatibility_note}</p>}
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white text-2xl transition-colors">×</button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 animate-pulse">🧬</div>
              <p className="text-dark-400">Running compatibility algorithm…</p>
            </div>
          )}

          {data && (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-5">
                <button onClick={() => setTab('donors')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    tab === 'donors'
                      ? 'bg-blood-600 text-white shadow-blood'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}>
                  🧬 Compatible Donors ({data.matching_donors?.length ?? 0})
                </button>
                <button onClick={() => setTab('units')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    tab === 'units'
                      ? 'bg-blood-600 text-white shadow-blood'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}>
                  🏥 Available Units ({data.available_units?.length ?? 0})
                </button>
              </div>

              {/* Donors Tab */}
              {tab === 'donors' && (
                data.matching_donors?.length === 0 ? (
                  <div className="text-center py-10 text-dark-500">
                    <p className="text-3xl mb-2">😔</p>
                    <p>No eligible compatible donors found in {data.request?.city}.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {data.matching_donors?.map((d, i) => (
                      <li key={d.donor_id}
                        className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-all
                          ${d.is_exact_match
                            ? 'border-green-700/50 bg-green-900/20'
                            : 'border-dark-700 bg-dark-800/50'
                          }`}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-dark-500 font-mono w-5">#{i+1}</span>
                          <BloodGroupBadge group={d.blood_group} />
                          <div>
                            <p className="font-semibold text-white">{d.name}</p>
                            <p className="text-xs text-dark-400">{d.city} · {d.phone || 'No phone'}</p>
                            <p className="text-xs text-dark-500">
                              {d.last_donation_date
                                ? `Last donated: ${new Date(d.last_donation_date).toLocaleDateString('en-IN')}`
                                : 'Never donated'}
                              {' · '}{d.total_donations} donations
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {d.compatibility_score && <ScoreBadge score={d.compatibility_score} />}
                          {d.is_exact_match && (
                            <span className="badge bg-green-900/50 text-green-400 border border-green-700/50">Exact Match</span>
                          )}
                          {(user?.role === 'admin' || user?.role === 'hospital') && (
                            notified.has(d.donor_id) ? (
                              <span className="badge bg-blue-900/50 text-blue-400 border border-blue-700/50">✓ Recorded</span>
                            ) : (
                              <button onClick={() => notify(d.donor_id)} className="btn-secondary text-xs !py-1">
                                Record Match
                              </button>
                            )
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {/* Units Tab */}
              {tab === 'units' && (
                <>
                  {data.available_units?.length === 0 ? (
                    <div className="text-center py-10 text-dark-500">
                      <p className="text-3xl mb-2">📦</p>
                      <p>No compatible units available in inventory.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {data.available_units?.map((u) => (
                        <li key={u.unit_id}
                          className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-all
                            ${u.is_exact_match
                              ? 'border-green-700/50 bg-green-900/20'
                              : 'border-dark-700 bg-dark-800/50'
                            }`}>
                          <div className="flex items-center gap-3">
                            {user?.role === 'admin' && (
                              <input type="checkbox" checked={selected.includes(u.unit_id)}
                                onChange={(e) => setSelected((s) =>
                                  e.target.checked ? [...s, u.unit_id] : s.filter((id) => id !== u.unit_id)
                                )}
                                className="w-4 h-4 accent-red-600 cursor-pointer"
                              />
                            )}
                            <BloodGroupBadge group={u.blood_group} />
                            <div>
                              <p className="font-semibold text-white">{u.bank_name} · {u.bank_city}</p>
                              <p className="text-xs text-dark-400">
                                Expires: {new Date(u.expiry_date).toLocaleDateString('en-IN')} · #{u.unit_id}
                              </p>
                            </div>
                          </div>
                          {u.is_exact_match && (
                            <span className="badge bg-green-900/50 text-green-400 border border-green-700/50">Exact Match</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {user?.role === 'admin' && selected.length > 0 && (
                    <div className="mt-5 flex justify-between items-center border-t border-dark-700 pt-4">
                      <p className="text-sm text-dark-400">{selected.length} unit(s) selected</p>
                      <button onClick={fulfill} disabled={fulfilling} className="btn-primary">
                        {fulfilling ? 'Fulfilling…' : '✅ Fulfill Request'}
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
  const [showNew,  setShowNew]  = useState(false)
  const [matching, setMatching] = useState(null)
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
    } catch (err) {
      toast.error(getErr(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [filters]) // eslint-disable-line

  const urgencyClasses = {
    critical: 'urgency-critical',
    urgent:   'urgency-urgent',
    normal:   'urgency-normal',
  }

  return (
    <div className="page">
      {showNew && <NewRequestModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); fetchRequests() }} />}
      {matching && <MatchPanel requestId={matching} onClose={() => { setMatching(null); fetchRequests() }} />}

      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest mb-1">Emergencies · Blood Requests</p>
          <h1 className="page-title">Blood Requests</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Request</button>
      </div>

      {/* Filters */}
      <div className="card-glass flex flex-wrap gap-4 p-4 mb-6">
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
            <option value="critical">🚨 Critical</option>
            <option value="urgent">⚠️ Urgent</option>
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
          <button className="btn-ghost" onClick={() => setFilters({ status: '', urgency: '', blood_group: '' })}>Clear</button>
        </div>
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-dark-500">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-semibold text-dark-300">No requests found</p>
          <p className="text-sm mt-1">Try different filters or create a new request.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.request_id}
              className={`card border-l-4 !py-4 ${urgencyClasses[r.urgency] || 'urgency-normal'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <BloodGroupBadge group={r.blood_group} size="lg" />
                  <div>
                    <p className="font-semibold text-white">{r.patient_name}</p>
                    <p className="text-sm text-dark-400">{r.hospital_name} · {r.hospital_city}</p>
                    <p className="text-xs text-dark-500 mt-0.5">
                      {r.units_needed} unit{r.units_needed !== 1 ? 's' : ''} needed
                      {r.units_fulfilled > 0 && ` · ${r.units_fulfilled} fulfilled`}
                      {' · '}#{r.request_id}
                      {' · '}{new Date(r.request_date).toLocaleDateString('en-IN')}
                    </p>
                    {r.notes && (
                      <p className="text-xs text-dark-500 mt-1 italic">"{r.notes}"</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <UrgencyBadge urgency={r.urgency} />
                  <StatusBadge status={r.status} />
                  {['admin', 'hospital'].includes(user?.role) && (r.status === 'pending' || r.status === 'matched') && (
                    <button
                      onClick={() => setMatching(r.request_id)}
                      className="btn-primary text-sm !py-1 !px-3"
                    >
                      🔍 Find Match
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
