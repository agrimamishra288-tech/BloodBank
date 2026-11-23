import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api/client'

const PAGE_SIZE = 25

const SOURCE_LABELS = {
  public_blood_bank_directory: 'data.gov.in Blood Bank Directory',
  licensed_blood_banks: 'Tamil Nadu licence lists',
}

const FILTER_FACETS = [
  { key: 'ownership', label: 'Ownership' },
  { key: 'facility_type', label: 'Facility' },
  { key: 'blood_products', label: 'Blood products' },
]

const EMPTY_FILTERS = { search: '', source: '', state: '', ownership: '', facility_type: '', blood_products: '' }

function getErr(e) {
  return e?.response?.data?.message || e?.message || 'Something went wrong'
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatValue(value) {
  if (value == null) return '—'
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)} bn`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)} m`
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function FacetPills({ label, options = [], value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted uppercase tracking-wider w-28">{label}</span>
      <button type="button" className={`pill ${value === '' ? 'active' : ''}`} onClick={() => onChange('')}>All</button>
      {options.map((o) => (
        <button key={o.value} type="button" className={`pill ${value === o.value ? 'active' : ''}`} onClick={() => onChange(o.value)}>
          {o.value} <span className="opacity-60">({o.count.toLocaleString('en-IN')})</span>
        </button>
      ))}
    </div>
  )
}

function BloodBankTable({ summary }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ data: [], total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => ({ ...f, search })); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    api.get('/reference/blood-banks', { params: { ...params, page, limit: PAGE_SIZE } })
      .then((r) => setResult(r.data))
      .catch((err) => toast.error(getErr(err)))
      .finally(() => setLoading(false))
  }, [filters, page])

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div className="card mb-8">
      <div className="flex flex-col gap-3 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder="Search name, city, district, pincode…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" value={filters.source} onChange={(e) => setFilter('source', e.target.value)}>
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="select" value={filters.state} onChange={(e) => setFilter('state', e.target.value)}>
            <option value="">All states</option>
            {summary?.states.map((s) => <option key={s.state} value={s.state}>{s.state} ({s.count})</option>)}
          </select>
        </div>
        {FILTER_FACETS.map(({ key, label }) => (
          <FacetPills key={key} label={label} options={summary?.facets[key]} value={filters[key]} onChange={(v) => setFilter(key, v)} />
        ))}
      </div>

      <p className="text-xs text-muted mb-3">{result.total.toLocaleString('en-IN')} blood banks match</p>

      <div className="overflow-x-auto">
        <table className="table-dark">
          <thead><tr>
            <th className="th">Blood bank</th>
            <th className="th">Location</th>
            <th className="th">Ownership</th>
            <th className="th">Facility</th>
            <th className="th">Blood products</th>
            <th className="th">Contact / licence</th>
            <th className="th">Source</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td className="td text-muted" colSpan={7}>Loading…</td></tr>
            ) : result.data.length === 0 ? (
              <tr><td className="td text-muted" colSpan={7}>No blood banks match these filters.</td></tr>
            ) : result.data.map((b) => (
              <tr key={`${b.source_table}-${b.external_id}`} className="tr align-top">
                <td className="td">
                  <p className="font-semibold text-white">{b.name}</p>
                  {b.address && <p className="text-xs text-muted mt-0.5 max-w-xs">{b.address}</p>}
                </td>
                <td className="td text-xs">
                  {[b.city, b.district].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || '—'}
                  <p className="text-muted">{b.state}{b.pincode ? ` · ${b.pincode}` : ''}</p>
                </td>
                <td className="td text-xs">{b.ownership}</td>
                <td className="td text-xs">{b.facility_type}</td>
                <td className="td text-xs">
                  {b.blood_products}
                  {b.has_apheresis && <p className="text-muted">Apheresis</p>}
                </td>
                <td className="td text-xs">
                  {b.contact_phone && <a href={`tel:${b.contact_phone}`} className="text-blood-400 hover:underline">{b.contact_phone}</a>}
                  {b.licence_number && <p>Licence {b.licence_number}</p>}
                  {b.licence_valid_until && <p className="text-muted">{b.licence_status} · until {formatDate(b.licence_valid_until)}</p>}
                  {!b.contact_phone && !b.licence_number && '—'}
                </td>
                <td className="td text-xs">
                  <a href={b.source_url} target="_blank" rel="noreferrer" className="text-blood-400 hover:underline">{SOURCE_LABELS[b.source_table] || b.source_table}</a>
                  {b.source_updated_at && <p className="text-muted">Updated {formatDate(b.source_updated_at)}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-muted">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <button type="button" className="btn-secondary text-xs" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}

function IndicatorCard({ indicator }) {
  const latest = indicator.series[indicator.series.length - 1]
  return (
    <div className="card-glass p-4">
      <p className="text-xs text-muted leading-snug min-h-[2.5rem]">{indicator.indicator_name}</p>
      <p className="text-2xl font-bold text-white mt-1">{formatValue(latest?.value)}</p>
      <p className="text-xs text-muted">{indicator.country_name} · {latest?.year}</p>
      <div className="h-16 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={indicator.series}>
            <XAxis dataKey="year" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip formatter={(v) => formatValue(v)} labelStyle={{ color: '#111' }} />
            <Line type="monotone" dataKey="value" stroke="var(--rose)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function PublicData() {
  const [summary, setSummary] = useState(null)
  const [indicators, setIndicators] = useState([])

  useEffect(() => {
    api.get('/reference/summary').then((r) => setSummary(r.data.data)).catch((err) => toast.error(getErr(err)))
    api.get('/reference/world-bank').then((r) => setIndicators(r.data.data)).catch((err) => toast.error(getErr(err)))
  }, [])

  const worldBankSource = indicators[0]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="text-xs text-blood-400 font-semibold uppercase tracking-widest mb-1">Reference · Official sources</p>
          <h1 className="page-title">Public data</h1>
          <p className="text-muted text-sm mt-1">Blood bank directories and health statistics imported from government and World Bank sources.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {summary?.sources.map((s) => (
          <a key={s.source_name} href={s.source_url} target="_blank" rel="noreferrer" className="card-glass p-4 hover:border-blood-700 border border-transparent transition-colors">
            <p className="text-2xl font-bold text-white">{s.count.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted mt-1">{s.source_name}</p>
            <p className="text-xs text-muted mt-1">Imported {formatDate(s.imported_at)}{s.source_updated_at ? ` · source updated ${formatDate(s.source_updated_at)}` : ''}</p>
          </a>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-white mb-3">Blood banks</h2>
      <BloodBankTable summary={summary} />

      {indicators.length > 0 && <>
        <h2 className="text-lg font-semibold text-white mb-3">India health indicators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {indicators.map((i) => <IndicatorCard key={i.indicator_code} indicator={i} />)}
        </div>
      </>}

      <div className="card-glass border border-dark-500 p-4 text-xs text-muted">
        <p className="font-semibold text-white mb-1">About this data</p>
        <p>These are official public directories and statistics, not live blood stock. "Facility" is inferred from each bank's name (hospital, medical college and similar). The Tamil Nadu licence lists are historical; every licence in them expired by February 2023.{' '}
          {worldBankSource && <>Indicators: <a href={worldBankSource.source_url} target="_blank" rel="noreferrer" className="text-blood-400 hover:underline">{worldBankSource.source_name}</a>.</>}
        </p>
      </div>
    </div>
  )
}
