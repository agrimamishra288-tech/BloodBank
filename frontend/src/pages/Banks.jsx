import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'

const PAGE_SIZE = 24

function getErr(e) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong'
}

function formatDate(value) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card-glass text-center py-5 px-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest mt-1">{label}</p>
      {sub && <p className="text-xs text-dark-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function MapLink({ latitude, longitude }) {
  if (!latitude || !longitude) return null
  return (
    <a
      href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
      target="_blank" rel="noreferrer"
      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
    >
      View on map
    </a>
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
      <div className="h-1 w-[calc(100%+2.5rem)] -mx-5 -mt-5 mb-4 bg-gradient-to-r from-blood-700 via-blood-500 to-gold-500 rounded-t-xl" />

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-dark-800 text-dark-300 border border-dark-700 px-2 py-0.5 rounded-full font-semibold">
              Project centre
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

      <p className="text-xs text-dark-400 mb-1 leading-relaxed">{bank.address}</p>
      <div className="flex flex-wrap items-center gap-1 text-xs text-dark-500 mb-3">
        <span>{bank.city}, {bank.state}</span>
        {bank.pincode && <span>· {bank.pincode}</span>}
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        {bank.contact_phone && (
          <a href={`tel:${bank.contact_phone}`} className="text-xs text-blood-400 hover:text-blood-300 transition-colors">
            {bank.contact_phone}
          </a>
        )}
        {bank.contact_email && (
          <a href={`mailto:${bank.contact_email}`} className="text-xs text-dark-400 hover:text-dark-200 transition-colors">
            {bank.contact_email}
          </a>
        )}
      </div>

      {bank.latitude && bank.longitude && (
        <div className="mb-3">
          <MapLink latitude={bank.latitude} longitude={bank.longitude} />
        </div>
      )}

      <button
        onClick={loadStock}
        className="w-full text-xs text-dark-400 hover:text-blood-300 border border-dark-700 hover:border-blood-700 rounded-lg py-2 transition-all"
      >
        {expanded ? 'Hide stock' : 'View blood stock'}
      </button>

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

function DirectoryCard({ bank }) {
  return (
    <div className="card hover:shadow-blood transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-white leading-tight text-sm">{bank.name}</h3>
        {bank.category && (
          <span className="text-xs bg-dark-800 text-dark-300 border border-dark-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
            {bank.category}
          </span>
        )}
      </div>

      <p className="text-xs text-dark-400 mb-2 leading-relaxed">{bank.address}</p>
      <p className="text-xs text-dark-500 mb-3">
        {[bank.city, bank.district, bank.state].filter(Boolean).join(', ')}
        {bank.pincode ? ` · ${bank.pincode}` : ''}
      </p>

      <div className="flex flex-wrap gap-3 mb-3">
        {bank.contact_phone && (
          <a href={`tel:${bank.contact_phone}`} className="text-xs text-blood-400 hover:text-blood-300 transition-colors">
            {bank.contact_phone}
          </a>
        )}
        {bank.helpline && bank.helpline !== bank.contact_phone && (
          <span className="text-xs text-dark-400">Helpline {bank.helpline}</span>
        )}
        {bank.website && (
          <a href={bank.website} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Website
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs text-dark-500">
          {bank.service_hours && <span>{bank.service_hours}</span>}
          {bank.has_components && <span className="text-dark-400">Components</span>}
          {bank.has_apheresis && <span className="text-dark-400">Apheresis</span>}
        </div>
        <MapLink latitude={bank.latitude} longitude={bank.longitude} />
      </div>
    </div>
  )
}

function DirectoryPanel() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get('/banks/directory', { params: { page, limit: PAGE_SIZE, search: search || undefined } })
      .then(({ data }) => {
        if (cancelled) return
        setRows(data.data)
        setTotal(data.total)
        setMeta(data.source)
      })
      .catch((err) => { if (!cancelled) toast.error(getErr(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page, search])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            className="input"
            placeholder="Search by name, city, district, state or pincode"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="text-xs text-dark-500 mt-2">
          Showing {rows.length} of {total.toLocaleString('en-IN')} licensed facilities
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-dark-500">
          <p className="text-lg font-semibold text-dark-300">No facilities match your search</p>
          <p className="text-sm mt-1">Try a different name, city, or state.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((bank) => <DirectoryCard key={bank.external_id} bank={bank} />)}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="btn-secondary text-xs disabled:opacity-40"
        >
          Previous
        </button>
        <p className="text-xs text-dark-400">Page {page} of {pages}</p>
        <button
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page >= pages || loading}
          className="btn-secondary text-xs disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <div className="mt-8 card-glass border border-dark-700 p-4 text-xs text-dark-400">
        <p className="font-semibold text-dark-300 mb-1">Directory source</p>
        <p>
          {meta?.name || 'Blood Bank Directory, National Health Portal / MoHFW, Government of India.'}
          {meta?.url && (
            <>
              {' '}
              <a href={meta.url} target="_blank" rel="noreferrer" className="text-blood-400 hover:underline">
                Original dataset
              </a>
            </>
          )}
        </p>
        <p className="mt-2">
          {meta?.note} This page shows facility records only; it does not show live stock.
        </p>
        <p className="mt-2 text-dark-500">
          Government source last updated {formatDate(meta?.source_updated_at)}
          {meta?.imported_at ? ` · imported into Hemora ${formatDate(meta.imported_at)}` : ''}
        </p>
      </div>
    </div>
  )
}

export default function Banks() {
  const [tab, setTab] = useState('centres')
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const totalUnits = banks.reduce((s, b) => s + Number(b.total_units_available || 0), 0)
  const activeBanks = banks.filter((b) => b.is_active).length
  const cities = new Set(banks.map((b) => b.city).filter(Boolean)).size

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest mb-1">Network · Collection Centres</p>
          <h1 className="page-title">Blood Banks</h1>
          <p className="text-dark-400 text-sm mt-1">
            Operational centres hold this project's inventory. The public directory lists licensed facilities
            published by the Government of India.
          </p>
        </div>
        <a
          href="https://eraktkosh.mohfw.gov.in"
          target="_blank" rel="noreferrer"
          className="btn-secondary text-xs"
        >
          e-RaktKosh portal
        </a>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setTab('centres')}
          className={`text-xs font-semibold px-4 py-2 rounded-lg border transition ${
            tab === 'centres'
              ? 'bg-blood-600 border-blood-600 text-white'
              : 'border-dark-700 text-dark-300 hover:border-blood-700'
          }`}
        >
          Project centres
        </button>
        <button
          onClick={() => setTab('directory')}
          className={`text-xs font-semibold px-4 py-2 rounded-lg border transition ${
            tab === 'directory'
              ? 'bg-blood-600 border-blood-600 text-white'
              : 'border-dark-700 text-dark-300 hover:border-blood-700'
          }`}
        >
          Public directory
        </button>
      </div>

      {tab === 'directory' ? (
        <DirectoryPanel />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Project centres" value={banks.length} sub="Operational records" />
            <StatCard label="Active" value={activeBanks} sub="Operational" />
            <StatCard label="Units" value={totalUnits} sub="Demo inventory" />
            <StatCard label="Cities covered" value={cities} sub="Across India" />
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <input
                className="input"
                placeholder="Search by name, city, state or pincode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-dark-500 mt-2">
              Showing {visible.length} of {banks.length} project centres
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-20 text-dark-500">
              <p className="text-lg font-semibold text-dark-300">No centres match your search</p>
              <p className="text-sm mt-1">Try a different name, city, or state.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((bank) => <BankCard key={bank.bank_id} bank={bank} />)}
            </div>
          )}

          <div className="mt-8 card-glass border border-dark-700 p-4 text-xs text-dark-400">
            <p className="font-semibold text-dark-300 mb-1">Data source and disclaimer</p>
            <p>
              Centre names, addresses and phone numbers follow the public e-Raktkosh / NHM hospital registry
              maintained by the Ministry of Health and Family Welfare, Government of India.
              Stock counts and donation history in this system are simulated for DBMS project purposes.
              For current availability, check the e-RaktKosh portal.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
