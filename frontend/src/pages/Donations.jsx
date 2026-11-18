import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import BloodGroupBadge from '../components/Badges'

function getErr(e) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong'
}

export default function Donations() {
  const { user }   = useAuth()
  const [donations,  setDonations]  = useState([])
  const [donors,     setDonors]     = useState([])
  const [banks,      setBanks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState({ donor_id: '', bank_id: '', volume_ml: '450', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const [d, dr, b] = await Promise.all([
        api.get('/donations?limit=50'),
        api.get('/donors?eligible=true&limit=100'),
        api.get('/banks'),
      ])
      setDonations(d.data.data)
      setDonors(dr.data.data)
      setBanks(b.data.data)
    } catch (err) {
      toast.error(getErr(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/donations', {
        donor_id:  Number(form.donor_id),
        bank_id:   Number(form.bank_id),
        volume_ml: Number(form.volume_ml),
        notes:     form.notes || null,
      })
      toast.success('Donation recorded! Donor stats updated & inventory unit added via trigger. 🩸')
      setForm({ donor_id: '', bank_id: '', volume_ml: '450', notes: '' })
      setShowForm(false)
      fetchData()
    } catch (err) {
      toast.error(getErr(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest mb-1">Records · Donation History</p>
          <h1 className="page-title">Donations</h1>
        </div>
        {(user?.role === 'admin' || user?.role === 'hospital') && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '× Cancel' : '+ Record Donation'}
          </button>
        )}
      </div>

      {/* Record Donation Form */}
      {showForm && (
        <div className="card border-l-4 border-l-blood-500 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Record a Donation</h2>
            <p className="text-xs text-dark-400 mt-1">
              Calls <code className="bg-dark-700 text-blood-300 px-1.5 py-0.5 rounded text-xs">sp_register_donation</code> → inserts donation → adds inventory unit → updates donor stats via trigger.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Eligible Donor *</label>
              <select required className="select" value={form.donor_id}
                onChange={(e) => setForm((f) => ({ ...f, donor_id: e.target.value }))}>
                <option value="">Select donor…</option>
                {donors.map((d) => (
                  <option key={d.donor_id} value={d.donor_id}>
                    {d.name} ({d.blood_group}) — {d.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Blood Bank *</label>
              <select required className="select" value={form.bank_id}
                onChange={(e) => setForm((f) => ({ ...f, bank_id: e.target.value }))}>
                <option value="">Select bank…</option>
                {banks.map((b) => (
                  <option key={b.bank_id} value={b.bank_id}>{b.name} — {b.city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Volume (ml): {form.volume_ml} ml</label>
              <input type="range" min="300" max="550" step="10"
                className="w-full accent-red-600 cursor-pointer"
                value={form.volume_ml}
                onChange={(e) => setForm((f) => ({ ...f, volume_ml: e.target.value }))} />
              <div className="flex justify-between text-xs text-dark-500 mt-1">
                <span>300ml</span><span>450ml</span><span>550ml</span>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="Optional notes…" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Recording…' : '🩸 Record Donation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-glass text-center py-4">
          <p className="text-3xl font-bold text-blood-300">{donations.length}</p>
          <p className="text-xs text-dark-500 mt-1">Total Donations</p>
        </div>
        <div className="card-glass text-center py-4">
          <p className="text-3xl font-bold text-gold-400">
            {donations.reduce((s, d) => s + Number(d.volume_ml || 0), 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-dark-500 mt-1">Total ml Collected</p>
        </div>
        <div className="card-glass text-center py-4">
          <p className="text-3xl font-bold text-green-400">
            {new Set(donations.map((d) => d.donor_name)).size}
          </p>
          <p className="text-xs text-dark-500 mt-1">Unique Donors</p>
        </div>
      </div>

      {/* Donations Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      ) : donations.length === 0 ? (
        <div className="text-center py-20 text-dark-500">
          <p className="text-5xl mb-4">🩺</p>
          <p className="text-lg font-semibold text-dark-300">No donations recorded yet.</p>
          {(user?.role === 'admin' || user?.role === 'hospital') && (
            <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>Record First Donation</button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <table className="table-dark w-full text-sm">
            <thead>
              <tr>
                <th className="th">Donor</th>
                <th className="th">Blood Group</th>
                <th className="th">Bank</th>
                <th className="th">Date</th>
                <th className="th">Volume</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.donation_id} className="tr">
                  <td className="td font-medium text-white">{d.donor_name}</td>
                  <td className="td"><BloodGroupBadge group={d.blood_group} /></td>
                  <td className="td text-dark-300">{d.bank_name}</td>
                  <td className="td text-dark-400">{new Date(d.donation_date).toLocaleDateString('en-IN')}</td>
                  <td className="td text-dark-300">{d.volume_ml} ml</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
