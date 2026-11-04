import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import BloodGroupBadge, { EligibleBadge } from '../components/Badges'
import ErrorBanner, { getErrorMessage } from '../components/ErrorBanner'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

function DonorModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', email:'', password:'Test@1234', phone:'',
    blood_group:'O+', age:'', gender:'M', city:'', state:'', address:'',
  })
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      await api.post('/auth/register', { ...form, role: 'donor', age: Number(form.age) })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Register Donor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
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
              <input required type="email" className="input"
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
              <input required type="number" min="18" max="65" className="input"
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
              <input required className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">State *</label>
              <input required className="input" value={form.state} onChange={(e) => set('state', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Registering…' : 'Register Donor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Donors() {
  const { user } = useAuth()
  const [donors,   setDonors]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error,    setError]    = useState(null)
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
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDonors() }, [filters]) // eslint-disable-line

  async function handleDelete(id) {
    if (!confirm('Deactivate this donor?')) return
    try {
      await api.delete(`/donors/${id}`)
      fetchDonors()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      {showForm && <DonorModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchDonors() }} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Donors</h1>
        {(user?.role === 'admin' || user?.role === 'hospital') && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Register Donor</button>
        )}
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 !p-4">
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
          <input className="input" placeholder="Delhi…"
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} />
        </div>
        <div className="flex-1 min-w-36">
          <label className="label">Eligibility</label>
          <select className="select" value={filters.eligible}
            onChange={(e) => setFilters((f) => ({ ...f, eligible: e.target.value }))}>
            <option value="">All</option>
            <option value="true">Eligible only</option>
            <option value="false">Not eligible</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-secondary" onClick={() => setFilters({ blood_group: '', city: '', eligible: '' })}>
            Clear
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">{donors.length} donor{donors.length !== 1 ? 's' : ''} found</p>

      {/* Donor grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : donors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No donors found with these filters.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {donors.map((d) => (
            <div key={d.donor_id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{d.email}</p>
                </div>
                <BloodGroupBadge group={d.blood_group} size="lg" />
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>📍 {d.city}, {d.state}</p>
                <p>📞 {d.phone || '—'}</p>
                <p>🎂 Age {d.age} · {d.gender === 'M' ? 'Male' : d.gender === 'F' ? 'Female' : 'Other'}</p>
                <p>💉 {d.total_donations} donation{d.total_donations !== 1 ? 's' : ''}</p>
                {d.last_donation_date && (
                  <p className="text-xs text-gray-400">Last: {new Date(d.last_donation_date).toLocaleDateString('en-IN')}</p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <EligibleBadge eligible={d.eligible} />
                {user?.role === 'admin' && (
                  <button onClick={() => handleDelete(d.donor_id)} className="text-xs text-red-500 hover:text-red-700">
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
