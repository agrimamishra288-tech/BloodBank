import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'

function getErr(e) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong'
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card-glass text-center py-5 px-4">
      <p className="text-3xl mb-1">{icon}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest mt-1">{label}</p>
      {sub && <p className="text-xs text-dark-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function BankCard({ bank }) {
  const [stock, setStock] = useState(null)
  const [expanded, setExpanded] = useState(false)

  async function loadStock() {
    if (stock !== null) { setExpanded((v) => !v); return }
    try {
      const { data } = await api.get(`/banks/${bank.bank_id}/stock`)
      setStock(data.data)
      setExpanded(true)
    } catch (err) {
      toast.error(getErr(err))
    }
  }

  const BLOOD_COLORS = {
    'O+':'text-red-400','O-':'text-red-300',
    'A+':'text-orange-400','A-':'text-orange-300',
    'B+':'text-blue-400','B-':'text-blue-300',
    'AB+':'text-purple-400','AB-':'text-purple-300',
  }

  return (
    <div className="card hover:shadow-blood transition-all duration-300 hover:-translate-y-1 group">
      {/* Top bar */}
      <div className="h-1 w-[calc(100%+2.5rem)] -mx-5 -mt-5 mb-4 bg-gradient-to-r from-blood-700 via-blood-500 to-gold-500 rounded-t-xl" />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-blood-900/50 text-blood-300 border border-blood-700/40 px-2 py-0.5 rounded-full font-semibold">
              eRaktkosh ✓
            </span>
            {bank.is_active
              ? <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />Active</span>
              : <span className="text-xs text-dark-500">Inactive</span>
            }
          </div>
          <h3 className="font-bold text-white leading-tight text-sm">{bank.name}</h3>
        </div>
        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-black text-blood-300">{Number(bank.total_units_available || 0)}</p>
          <p className="text-xs text-dark-500">units</p>
        </div>
      </div>

      {/* Address */}
      <p className="text-xs text-dark-400 mb-1 leading-relaxed">{bank.address}</p>
      <div className="flex items-center gap-1 text-xs text-dark-500 mb-3">
        <span>📍</span>
        <span>{bank.city}, {bank.state}</span>
        {bank.pincode && <span>· {bank.pincode}</span>}
      </div>

      {/* Contact */}
      <div className="flex flex-wrap gap-3 mb-3">
        {bank.contact_phone && (
          <a href={`tel:${bank.contact_phone}`} className="text-xs text-blood-400 hover:text-blood-300 transition-colors flex items-center gap-1">
            📞 {bank.contact_phone}
          </a>
        )}
        {bank.contact_email && (
          <a href={`mailto:${bank.contact_email}`} className="text-xs text-dark-400 hover:text-dark-200 transition-colors flex items-center gap-1">
            ✉️ {bank.contact_email}
          </a>
        )}
      </div>

      {/* Coordinates */}
      {bank.latitude && bank.longitude && (
        <a
          href={`https://www.openstreetmap.org/?mlat=${bank.latitude}&mlon=${bank.longitude}#map=16/${bank.latitude}/${bank.longitude}`}
          target="_blank" rel="noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 mb-3"
        >
          🗺️ {parseFloat(bank.latitude).toFixed(4)}°N, {parseFloat(bank.longitude).toFixed(4)}°E · View Map ↗
        </a>
      )}

      {/* View stock toggle */}
      <button
        onClick={loadStock}
        className="w-full text-xs text-dark-400 hover:text-blood-300 border border-dark-700 hover:border-blood-700 rounded-lg py-2 transition-all"
      >
        {expanded ? '▲ Hide Stock' : '▼ View Blood Stock'}
      </button>

      {/* Stock breakdown */}
      {expanded && stock && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {stock.map((s) => (
            <div key={s.blood_group} className="text-center bg-dark-800 rounded-lg py-2">
              <p className={`text-sm font-bold font-mono ${BLOOD_COLORS[s.blood_group] || 'text-white'}`}>{s.blood_group}</p>
              <p className="text-xs text-dark-400">{s.available_units}</p>
            </div>
          ))}
          {stock.length === 0 && (
            <p className="col-span-4 text-center text-xs text-dark-500 py-2">No stock data available.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Banks() {
  const [banks,   setBanks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    api.get('/banks')
      .then((r) => setBanks(r.data.data))
      .catch((err) => toast.error(getErr(err)))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return banks
    return banks.filter((b) =>
      [b.name, b.city, b.state, b.address, b.pincode]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [banks, search])

  const totalUnits   = banks.reduce((s, b) => s + Number(b.total_units_available || 0), 0)
  const activeBanks  = banks.filter((b) => b.is_active).length
  const cities       = new Set(banks.map((b) => b.city).filter(Boolean)).size

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest mb-1">Network · Collection Centres</p>
          <h1 className="page-title">Blood Banks</h1>
          <p className="text-dark-400 text-sm mt-1">
            Real Indian hospital blood banks sourced from the eRaktkosh / NHM public registry.
          </p>
        </div>
        <a
          href="https://eraktkosh.mohfw.gov.in"
          target="_blank" rel="noreferrer"
          className="btn-secondary text-xs"
        >
          🌐 eRaktkosh Portal ↗
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🏥" label="Total Banks"    value={banks.length}    sub="eRaktkosh-verified" />
        <StatCard icon="✅" label="Active"          value={activeBanks}     sub="Operational" />
        <StatCard icon="🩸" label="Total Units"    value={totalUnits}      sub="In inventory" />
        <StatCard icon="🏙️" label="Cities Covered" value={cities}          sub="Across India" />
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">🔍</span>
          <input
            className="input pl-9"
            placeholder="Search by name, city, state…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="text-xs text-dark-500 mt-2">
          Showing {visible.length} of {banks.length} blood banks
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-dark-500">
          <p className="text-5xl mb-4">🏥</p>
          <p className="text-lg font-semibold text-dark-300">No banks match your search</p>
          <p className="text-sm mt-1">Try a different name, city, or state.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((bank) => <BankCard key={bank.bank_id} bank={bank} />)}
        </div>
      )}

      {/* Source Note */}
      <div className="mt-8 card-glass border border-dark-700 p-4 text-xs text-dark-400">
        <p className="font-semibold text-dark-300 mb-1">📋 Data Source & Disclaimer</p>
        <p>
          Blood bank data was sourced from the{' '}
          <a href="https://eraktkosh.mohfw.gov.in" target="_blank" rel="noreferrer" className="text-blood-400 hover:underline">eRaktkosh / NHM public registry</a>
          {' '}maintained by the Ministry of Health & Family Welfare, Government of India.
          Real names, addresses, phone numbers, and GPS coordinates are used for educational demonstration.
          Stock counts in this system are simulated for DBMS project purposes.
        </p>
      </div>
    </div>
  )
}
