import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import BloodGroupBadge, { EligibleBadge } from '../components/Badges'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

function getErr(e) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong'
}

/* ── Register Donor Modal ──────────────────────────────────── */
function DonorModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', email:'', password:'Test@1234', phone:'',
    blood_group:'O+', age:'', gender:'M', city:'', state:'', address:'',
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', { ...form, role: 'donor', age: Number(form.age) })
      toast.success('Donor registered successfully! 🎉')
      onSaved()
    } catch (err) {
      toast.error(getErr(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest">New Entry</p>
            <h2 className="text-xl font-bold text-white">Register Donor</h2>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input required className="input" placeholder="Rohan Mehta"
                value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+919810000001"
                value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input required type="email" className="input" placeholder="rohan@example.com"
                value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Password *</label>
              <input required type="password" className="input"
                value={form.password} onChange={(e) => set('password', e.target.value)} />
            </div>
            <div>
              <label className="label">Blood Group *</label>
              <select required className="select" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Age * (18–65)</label>
              <input required type="number" min="18" max="65" className="input" placeholder="25"
                value={form.age} onChange={(e) => set('age', e.target.value)} />
            </div>
            <div>
              <label className="label">Gender *</label>
              <select required className="select" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
              </select>
            </div>
            <div>
              <label className="label">City *</label>
              <input required className="input" placeholder="Delhi" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">State *</label>
              <input required className="input" placeholder="Delhi" value={form.state} onChange={(e) => set('state', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Registering…' : '🩸 Register Donor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Donors Page ──────────────────────────────────────── */
export default function Donors() {
  const { user } = useAuth()
  const [donors,   setDonors]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filters,  setFilters]  = useState({ blood_group: '', city: '', eligible: '' })

  async function fetchDonors() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.blood_group) params.set('blood_group', filters.blood_group)
      if (filters.city)        params.set('city',        filters.city)
      if (filters.eligible)    params.set('eligible',    filters.eligible)
      const { data } = await api.get(`/donors?${params}&limit=50`)
      setDonors(data.data)
    } catch (err) {
      toast.error(getErr(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDonors() }, [filters]) // eslint-disable-line

  async function handleDelete(id) {
    if (!confirm('Deactivate this donor?')) return
    try {
      await api.delete(`/donors/${id}`)
      toast.success('Donor deactivated.')
      fetchDonors()
    } catch (err) {
      toast.error(getErr(err))
    }
  }

  return (
    <div className="page">
      {showForm && (
        <DonorModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchDonors() }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest mb-1">People · Donor Directory</p>
          <h1 className="page-title">Donor Network</h1>
          <p className="text-dark-400 text-sm mt-1">
            {['admin','hospital'].includes(user?.role)
              ? 'Find eligible donors by blood group and location.'
              : 'Browse the donor network.'}
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'hospital') && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Register Donor
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card-glass flex flex-wrap gap-4 p-4 mb-6">
        <div className="flex-1 min-w-36">
          <label className="label">Blood Group</label>
          <select className="select" value={filters.blood_group}
            onChange={(e) => setFilters((f) => ({ ...f, blood_group: e.target.value }))}>
            <option value="">All groups</option>
            {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="label">City</label>
          <input className="input" placeholder="Search by city…"
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} />
        </div>
        <div className="flex-1 min-w-36">
          <label className="label">Eligibility</label>
          <select className="select" value={filters.eligible}
            onChange={(e) => setFilters((f) => ({ ...f, eligible: e.target.value }))}>
            <option value="">Any status</option>
            <option value="true">Eligible now ✅</option>
            <option value="false">Not yet eligible</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-ghost" onClick={() => setFilters({ blood_group: '', city: '', eligible: '' })}>
            Clear
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-dark-400 text-sm">{donors.length} donor{donors.length !== 1 ? 's' : ''} found</p>
        <span className="text-xs text-dark-500 bg-dark-800 border border-dark-700 px-3 py-1 rounded-full">
          🔴 Live · eRaktkosh Network
        </span>
      </div>

      {/* Donor Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : donors.length === 0 ? (
        <div className="text-center py-20 text-dark-500">
          <p className="text-5xl mb-4">🩸</p>
          <p className="text-lg font-semibold text-dark-300">No donors found</p>
          <p className="text-sm mt-1">Try different filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {donors.map((d) => (
            <div key={d.donor_id} className="card group hover:shadow-blood transition-all duration-300 hover:-translate-y-1">
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-blood-700 to-blood-500 rounded-t-xl -mt-5 -mx-5 mb-4 w-[calc(100%+2.5rem)]" />

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blood-900 border border-blood-700 flex items-center justify-center text-blood-300 font-bold text-lg">
                    {d.name?.trim()?.charAt(0)?.toUpperCase() || 'D'}
                  </div>
                  <div>
                    <p className="font-semibold text-white leading-tight">{d.name}</p>
                    <p className="text-xs text-dark-400">{d.city}, {d.state}</p>
                  </div>
                </div>
                <BloodGroupBadge group={d.blood_group} size="lg" />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 py-3 border-t border-b border-dark-700">
                {d.age != null && (
                  <div className="text-center">
                    <p className="text-xs text-dark-500">Age</p>
                    <p className="font-bold text-white">{d.age}</p>
                  </div>
                )}
                {d.gender != null && (
                  <div className="text-center">
                    <p className="text-xs text-dark-500">Gender</p>
                    <p className="font-bold text-white">{d.gender === 'M' ? '♂ M' : d.gender === 'F' ? '♀ F' : '⚧ O'}</p>
                  </div>
                )}
                {d.total_donations != null && (
                  <div className="text-center">
                    <p className="text-xs text-dark-500">Donations</p>
                    <p className="font-bold text-blood-300">{d.total_donations}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {d.last_donation_date !== null && d.last_donation_date !== undefined && (
                    <p className="text-xs text-dark-500">
                      Last: <span className="text-dark-300">
                        {d.last_donation_date
                          ? new Date(d.last_donation_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Never'}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {d.eligible !== null && d.eligible !== undefined
                    ? <EligibleBadge eligible={d.eligible} />
                    : <span className="text-xs text-dark-500">Staff only</span>
                  }
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(d.donor_id)}
                      className="btn-danger text-xs !py-0.5 !px-2"
                    >
                      Deactivate
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
