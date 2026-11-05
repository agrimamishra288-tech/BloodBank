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
    <div className="donor-directory">
      {showForm && <DonorModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchDonors() }} />}

      <header className="donor-page-header">
        <div>
          <p className="eyebrow">PEOPLE · DONOR DIRECTORY</p>
          <h1 className="page-title mt-2">Donor network</h1>
          <p className="donor-page-intro">Find eligible donors by blood group and location.</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'hospital') && (
          <button className="btn-primary" onClick={() => setShowForm(true)}><span aria-hidden="true">+</span> Register donor</button>
        )}
      </header>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <section className="donor-filter-panel" aria-label="Filter donors">
        <div className="donor-filter-heading">
          <div><h2>Find a donor</h2><p>Refine the directory using the options below.</p></div>
          <span className="donor-filter-mark" aria-hidden="true">FILTERS</span>
        </div>
        <div className="donor-filter-grid">
          <div>
            <label className="label" htmlFor="donor-blood-group">Blood group</label>
            <select id="donor-blood-group" className="select" value={filters.blood_group}
              onChange={(e) => setFilters((f) => ({ ...f, blood_group: e.target.value }))}>
              <option value="">All blood groups</option>
              {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="donor-city">City</label>
            <input id="donor-city" className="input" placeholder="Search by city"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="donor-eligibility">Eligibility</label>
            <select id="donor-eligibility" className="select" value={filters.eligible}
              onChange={(e) => setFilters((f) => ({ ...f, eligible: e.target.value }))}>
              <option value="">Any status</option>
              <option value="true">Eligible now</option>
              <option value="false">Not yet eligible</option>
            </select>
          </div>
          <button className="btn-secondary donor-clear-button" onClick={() => setFilters({ blood_group: '', city: '', eligible: '' })}>
            Clear filters
          </button>
        </div>
      </section>

      <div className="donor-results-heading" aria-live="polite">
        <div><h2>Available donors</h2><p>Directory results based on your selected filters.</p></div>
        <span className="donor-result-count">{donors.length} <span>{donors.length === 1 ? 'donor' : 'donors'}</span></span>
      </div>

      {/* Donor grid */}
      {loading ? (
        <div className="donor-empty-state" role="status"><span className="donor-loading-line" /><p>Loading donor directory</p><span>Retrieving the latest matching profiles.</span></div>
      ) : donors.length === 0 ? (
        <div className="donor-empty-state"><span className="donor-empty-mark">—</span><p>No matching donors</p><span>Try changing the blood group, city, or eligibility filters.</span></div>
      ) : (
        <div className="donor-card-grid">
          {donors.map((d) => (
            <article key={d.donor_id} className="donor-card">
              <div className="donor-card-topline" />
              <div className="donor-card-header">
                <div className="donor-identity">
                  <span className="donor-avatar" aria-hidden="true">{d.name?.trim()?.charAt(0)?.toUpperCase() || 'D'}</span>
                  <div className="min-w-0">
                    <h3>{d.name}</h3>
                    <p>{d.city}, {d.state}</p>
                  </div>
                </div>
                <BloodGroupBadge group={d.blood_group} size="lg" />
              </div>
              <div className="donor-profile-meta">
                <div><span>Age</span><strong>{d.age}</strong></div>
                <div><span>Gender</span><strong>{d.gender === 'M' ? 'Male' : d.gender === 'F' ? 'Female' : 'Other'}</strong></div>
                <div><span>Donations</span><strong>{d.total_donations}</strong></div>
              </div>
              <div className="donor-card-footer">
                <div className="donor-last-donation">
                  <span>Last donation</span>
                  <strong>{d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No previous donation'}</strong>
                </div>
                <EligibleBadge eligible={d.eligible} />
                {user?.role === 'admin' && (
                  <button onClick={() => handleDelete(d.donor_id)} className="donor-deactivate-button">
                    Deactivate
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
