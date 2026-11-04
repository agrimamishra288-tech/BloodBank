import { useEffect, useState } from 'react'
import api from '../api/client'

export default function Banks() {
  const [banks,   setBanks]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/banks').then((r) => setBanks(r.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Blood Banks</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks.map((b) => (
          <div key={b.bank_id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-gray-900">{b.name}</h2>
              <span className={`badge ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {b.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p>📍 {b.address}</p>
              <p>🏙 {b.city}, {b.state}{b.pincode ? ` — ${b.pincode}` : ''}</p>
              <p>📞 {b.contact_phone}</p>
              {b.contact_email && <p>✉ {b.contact_email}</p>}
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-sm text-gray-500">Total units available</span>
              <span className="text-2xl font-bold text-gray-900">{b.total_units_available}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
