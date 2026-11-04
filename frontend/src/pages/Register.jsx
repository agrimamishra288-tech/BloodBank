import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ErrorBanner from '../components/ErrorBanner'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f3ef] p-4 py-10">
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#76242d]"/><div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#e9d7d0]"/>
      <div className="relative w-full max-w-lg rounded-3xl border border-[#eee7e0] bg-white p-7 shadow-[0_16px_55px_rgba(54,40,34,.09)] sm:p-9">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#f8e9e8] text-lg text-[#9d2935]">✚</div>
          <p className="eyebrow">Join the network</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#302927]">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Register as a donor or hospital staff</p>
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
              <input required type="password" className="input" placeholder="Min 6 chars"
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

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-red-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
