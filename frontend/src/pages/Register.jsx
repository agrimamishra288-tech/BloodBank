import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ErrorBanner from '../components/ErrorBanner'
import AuthShowcase from '../components/AuthShowcase'
import ThemeToggle from '../components/ThemeToggle'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    role: 'donor',
    blood_group: 'O+', age: '', gender: 'M', city: '', state: '', address: '',
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = { ...form, age: form.age ? Number(form.age) : undefined }
      await register(payload)
      navigate('/')
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page auth-page-register">
      <AuthShowcase mode="register" />
      <main className="auth-main auth-main-register">
      <section className="auth-card auth-card-register">
        <div className="auth-card-topline"><span className="auth-mini-mark">✚</span><span className="auth-card-note">MAKE ROOM FOR MORE GOOD</span><ThemeToggle compact /></div>
        <div className="mb-5 mt-5">
          <p className="eyebrow">Join the network</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#30212a] sm:text-3xl">Give good a place to start.</h1>
          <p className="mt-1 text-sm text-[#8d7d7d]">Create an account as a donor or hospital staff.</p>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Role</label>
              <select className="select" value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="donor">Donor</option>
                <option value="hospital">Hospital Staff</option>
              </select>
            </div>

            <div>
              <label className="label">Full Name *</label>
              <input required minLength={2} maxLength={100} className="input" placeholder="Rohan Mehta"
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
              <input required minLength={6} type="password" className="input" placeholder="At least 6 characters"
                value={form.password} onChange={(e) => set('password', e.target.value)} />
            </div>
          </div>

          {/* Donor-specific fields */}
          {form.role === 'donor' && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <p className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Donor Details</p>
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
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div>
                <label className="label">City *</label>
                <input required className="input" placeholder="Delhi"
                  value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">State *</label>
                <input required className="input" placeholder="Delhi"
                  value={form.state} onChange={(e) => set('state', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <input className="input" placeholder="123, Sector 4"
                  value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#8d7d7d]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#a33243] hover:underline">Sign in ↗</Link>
        </p>
      </section>
      <p className="auth-footnote">Your details help connect care to the people who need it.</p>
      </main>
    </div>
  )
}
