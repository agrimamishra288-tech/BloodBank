import { useEffect, useState } from 'react'
import { Check, Droplet, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import BloodGroupBadge, { EligibleBadge } from '../components/Badges'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
const COMPAT = {
  'A+':  { give: ['A+','AB+'],                         receive: ['A+','A-','O+','O-'] },
  'A-':  { give: ['A+','A-','AB+','AB-'],              receive: ['A-','O-'] },
  'B+':  { give: ['B+','AB+'],                         receive: ['B+','B-','O+','O-'] },
  'B-':  { give: ['B+','B-','AB+','AB-'],              receive: ['B-','O-'] },
  'AB+': { give: ['AB+'],                              receive: BLOOD_GROUPS },
  'AB-': { give: ['AB+','AB-'],                        receive: ['A-','B-','AB-','O-'] },
  'O+':  { give: ['O+','A+','B+','AB+'],               receive: ['O+','O-'] },
  'O-':  { give: BLOOD_GROUPS,                         receive: ['O-'] },
}
const allGroups = (list) => list.length === BLOOD_GROUPS.length ? 'All groups' : list.join(', ')
const fmtDate = (v) => v ? new Date(`${String(v).slice(0,10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const genderLabel = (g) => g === 'M' ? 'Male' : g === 'F' ? 'Female' : g === 'O' ? 'Other' : '—'

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
      toast.success('Donor registered successfully.')
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
              {loading ? 'Registering…' : 'Register donor'}
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
      const rows = Array.isArray(data.data) ? [...data.data] : []
      const ownIndex = rows.findIndex((d) => user?.user_id != null && d.user_id === user.user_id)
      if (ownIndex > 0) rows.unshift(rows.splice(ownIndex, 1)[0])
      setDonors(rows)
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
              : 'See who is part of the network. Contact details stay private.'}
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
            <option value="true">Eligible now</option>
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
          Demo dataset · seeded records
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
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-blood-400">
            <Droplet size={20} />
          </div>
          <p className="text-lg font-semibold text-dark-300">No donors found</p>
          <p className="text-sm mt-1">Try different filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {donors.map((d) => {
            const identityVisible = d.identity_visible !== false
            const isSelf = user?.user_id != null && d.user_id === user.user_id
            const compat = COMPAT[d.blood_group] || { give: [], receive: [] }
            const displayName = d.name || 'Donor'
            const avatar = displayName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part.charAt(0))
              .join('')
              .toUpperCase()

            return (
              <article key={d.donor_id} className={`card donor-card${isSelf ? ' is-self' : ''}`}>
                <header className="donor-card-head">
                  <span className="donor-avatar is-initial" aria-hidden="true">{avatar}</span>
                  <div className="donor-identity">
                    <h3 className="donor-name">
                      {displayName}
                      {isSelf && <span className="donor-you">You</span>}
                    </h3>
                    <p className="donor-place">
                      <span>{[d.city, d.state].filter(Boolean).join(', ') || 'Location private'}</span>
                      <span className={`donor-status ${d.is_available ? 'is-open' : 'is-paused'}`}>
                        <i aria-hidden="true" />{d.is_available ? 'Open to donate' : 'Paused'}
                      </span>
                    </p>
                  </div>
                  <BloodGroupBadge group={d.blood_group} size="lg" />
                </header>

                <dl className="donor-facts">
                  <div><dt>Age</dt><dd>{d.age ?? '—'}</dd></div>
                  <div><dt>Gender</dt><dd>{genderLabel(d.gender)}</dd></div>
                  <div><dt>Donations</dt><dd>{d.total_donations ?? '—'}</dd></div>
                </dl>

                <div className="donor-compat">
                  <div><span>Can give to</span><p>{allGroups(compat.give)}</p></div>
                  <div><span>Can receive from</span><p>{allGroups(compat.receive)}</p></div>
                </div>

                <footer className="donor-foot">
                  <div>
                    <span className="donor-foot-label">Last donation</span>
                    <p>{d.last_donation_date ? fmtDate(d.last_donation_date) : 'None yet'}</p>
                  </div>
                  <div className="donor-actions">
                    {typeof d.eligible === 'boolean' && <EligibleBadge eligible={d.eligible} />}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(d.donor_id)}
                        className="btn-danger text-xs !py-0.5 !px-2"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </footer>

                <p className={`donor-contact ${identityVisible ? 'is-open' : 'is-private'}`}>
                  {identityVisible
                    ? <Check size={11} aria-hidden="true" />
                    : <Lock size={11} aria-hidden="true" />}
                  <span>
                    {identityVisible
                      ? 'Contact details visible to hospital staff.'
                      : 'Contact details stay private until a hospital arranges a match.'}
                  </span>
                </p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
