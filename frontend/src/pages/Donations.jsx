import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ErrorBanner, { getErrorMessage } from '../components/ErrorBanner'

export default function Donations() {
  const { user }   = useAuth()
  const [donations, setDonations] = useState([])
  const [donors,    setDonors]    = useState([])
  const [banks,     setBanks]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState({ donor_id: '', bank_id: '', volume_ml: '450', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error,     setError]     = useState(null)
  const [success,   setSuccess]   = useState(null)

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
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true); setError(null); setSuccess(null)
    try {
      await api.post('/donations', {
        donor_id:  Number(form.donor_id),
        bank_id:   Number(form.bank_id),
        volume_ml: Number(form.volume_ml),
        notes:     form.notes || null,
      })
      setSuccess('Donation recorded! Donor stats updated and inventory unit added automatically.')
      setForm({ donor_id: '', bank_id: '', volume_ml: '450', notes: '' })
      setShowForm(false)
      fetchData()
    } catch (err) {
      // Surface the 90-day eligibility error from the stored procedure
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Donations</h1>
        {(user?.role === 'admin' || user?.role === 'hospital') && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Record Donation'}
          </button>
        )}
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          ✅ {success}
        </div>
      )}

      {/* Record donation form */}
      {showForm && (
        <div className="card border-l-4 border-l-red-500">
          <h2 className="text-lg font-semibold mb-4">Record a Donation</h2>
          <p className="text-xs text-gray-500 mb-4">
            This calls <code className="bg-gray-100 px-1 rounded">sp_register_donation</code> which atomically:
            inserts a donation record → adds one inventory unit → updates the donor's stats via trigger.
          </p>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
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
            <div className="col-span-2 sm:col-span-1">
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
              <label className="label">Volume (ml)</label>
              <input type="number" min="300" max="550" className="input" value={form.volume_ml}
                onChange={(e) => setForm((f) => ({ ...f, volume_ml: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="Optional…" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Recording…' : 'Record Donation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Donations list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : donations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No donations recorded yet.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Donor</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Blood Group</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Bank</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Date</th>
                <th className="text-left px-5 py-3 text-gray-600 font-semibold">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {donations.map((d) => (
                <tr key={d.donation_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{d.donor_name}</td>
                  <td className="px-5 py-3">
                    <span className="badge bg-red-100 text-red-800">{d.blood_group}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{d.bank_name}</td>
                  <td className="px-5 py-3 text-gray-600">{new Date(d.donation_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3 text-gray-600">{d.volume_ml} ml</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
