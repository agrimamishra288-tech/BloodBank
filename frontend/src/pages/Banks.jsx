import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import ErrorBanner, { getErrorMessage } from '../components/ErrorBanner'

const ERKOSH_URL = 'https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/stockAvailability.cnt'

function BankMark() {
  return <span className="bank-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3.5 20.5h17M5.5 20.5v-10L12 4.5l6.5 6v10M9 20.5v-5h6v5M8.5 11.5h.01M15.5 11.5h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
}

function BankStatus({ active }) {
  return <span className={`bank-status ${active ? 'is-active' : 'is-inactive'}`}><i />{active ? 'Active' : 'Inactive'}</span>
}

function ContactLink({ href, label, value }) {
  if (!value) return null
  return <a href={href}><span className="bank-contact-label">{label}</span><strong>{value}</strong></a>
}

export default function Banks() {
  const [banks, setBanks] = useState([])
  const [localLoading, setLocalLoading] = useState(true)
  const [directory, setDirectory] = useState([])
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryTotal, setDirectoryTotal] = useState(0)
  const [directorySource, setDirectorySource] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('directory')
  const [page, setPage] = useState(1)
  const [directoryQuery, setDirectoryQuery] = useState('')
  const pageSize = 24

  useEffect(() => {
    let active = true
    api.get('/banks').then((response) => { if (active) setBanks(response.data.data) })
      .catch((err) => { if (active) setError(getErrorMessage(err)) })
      .finally(() => { if (active) setLocalLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDirectoryQuery(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    setDirectoryLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (directoryQuery) params.set('search', directoryQuery)
    api.get(`/banks/directory?${params}`)
      .then((response) => {
        if (!active) return
        setDirectory(response.data.data)
        setDirectoryTotal(response.data.total)
        setDirectorySource(response.data.source)
      })
      .catch((err) => { if (active) setError(getErrorMessage(err)) })
      .finally(() => { if (active) setDirectoryLoading(false) })
    return () => { active = false }
  }, [page, directoryQuery])

  const visibleBanks = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return banks
    return banks.filter((bank) => [bank.name, bank.address, bank.city, bank.state, bank.pincode]
      .some((value) => String(value || '').toLowerCase().includes(query)))
  }, [banks, search])

  useEffect(() => { setPage(1) }, [directoryQuery])

  const totalUnits = banks.reduce((total, bank) => total + Number(bank.total_units_available || 0), 0)
  const activeBanks = banks.filter((bank) => bank.is_active).length
  const cities = new Set(banks.map((bank) => bank.city).filter(Boolean)).size
  const pageCount = Math.max(1, Math.ceil(directoryTotal / pageSize))

  return (
    <div className="banks-page">
      <header className="banks-page-header">
        <div>
          <p className="eyebrow">NETWORK · COLLECTION CENTRES</p>
          <h1 className="page-title mt-2">Blood banks</h1>
          <p className="banks-intro">Search a public national directory or review stock managed in this project.</p>
        </div>
        <a className="banks-header-mark" href={ERKOSH_URL} target="_blank" rel="noreferrer"><BankMark /><span>Check live stock on e-RaktKosh <b aria-hidden="true">↗</b></span></a>
      </header>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <section className="banks-metrics" aria-label="Blood bank directory summary">
        <article><span>Public directory</span><strong>{directoryTotal.toLocaleString('en-IN')}</strong><p>Centres in the sourced snapshot</p></article>
        <article><span>Project centres</span><strong>{banks.length}</strong><p>Centres in Hemora's operational database</p></article>
        <article><span>Project stock</span><strong>{totalUnits}</strong><p>Available units in project inventory</p></article>
        <article><span>Project coverage</span><strong>{cities}</strong><p>{cities === 1 ? 'City represented' : 'Cities represented'}</p></article>
      </section>

      <nav className="banks-view-tabs" role="tablist" aria-label="Choose blood bank data">
        <button type="button" role="tab" aria-selected={view === 'directory'} className={view === 'directory' ? 'active' : ''} onClick={() => setView('directory')}>India public directory <span>{directoryTotal.toLocaleString('en-IN')}</span></button>
        <button type="button" role="tab" aria-selected={view === 'project'} className={view === 'project' ? 'active' : ''} onClick={() => setView('project')}>Hemora project stock <span>{banks.length}</span></button>
      </nav>

      {view === 'directory' ? <section className="banks-directory-panel">
        <div className="banks-directory-heading">
          <div><h2>National blood bank directory</h2><p>Search by centre, city, district, or state.</p></div>
          <label className="banks-search"><span className="sr-only">Search public blood bank directory</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search banks or cities" /></label>
        </div>
        <div className="banks-result-line" aria-live="polite">Showing <strong>{directory.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, directoryTotal)}</strong> of {directoryTotal.toLocaleString('en-IN')} centres</div>
        {directoryLoading ? <div className="banks-loading" role="status"><span className="inventory-loading-line" /><p>Searching the national directory</p></div> : directory.length ? <div className="banks-card-grid">
          {directory.map((bank) => <article className="bank-card public-bank-card" key={bank.external_id}>
            <div className="bank-card-header"><BankMark /><span className="public-bank-category">{bank.category || 'Blood bank'}</span></div>
            <h3>{bank.name}</h3>
            <p className="bank-address">{bank.address || 'Address not listed'}</p>
            <div className="bank-location-line"><span>{bank.city || bank.district || 'Location not listed'}</span><i /><span>{bank.state}</span>{bank.pincode && <><i /><span>{bank.pincode}</span></>}</div>
            <div className="bank-public-facilities">{bank.service_hours && <span>{bank.service_hours}</span>}{bank.has_components && <span>Components</span>}{bank.has_apheresis && <span>Apheresis</span>}</div>
            <div className="bank-contact-list">
              <ContactLink href={`tel:${bank.contact_phone}`} label="Phone" value={bank.contact_phone} />
              <ContactLink href={`tel:${bank.helpline}`} label="Helpline" value={bank.helpline} />
            </div>
            {bank.latitude != null && bank.longitude != null && <a className="bank-map-link" href={`https://www.openstreetmap.org/?mlat=${bank.latitude}&mlon=${bank.longitude}#map=16/${bank.latitude}/${bank.longitude}`} target="_blank" rel="noreferrer">View on map <span aria-hidden="true">↗</span></a>}
            {bank.website && <a className="bank-website" href={bank.website.startsWith('http') ? bank.website : `https://${bank.website}`} target="_blank" rel="noreferrer">Visit website <span aria-hidden="true">↗</span></a>}
          </article>)}
        </div> : <div className="banks-empty"><BankMark /><strong>{directoryQuery ? 'No centres match your search' : 'Directory unavailable'}</strong><p>{directoryQuery ? 'Try another centre name, district, or state.' : 'Try again when the API connection is available.'}</p></div>}

        {!directoryLoading && pageCount > 1 && <div className="banks-pagination"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page <strong>{page}</strong> of {pageCount}</span><button className="btn-secondary" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div>}

        {directorySource && <aside className="banks-source-note"><strong>Source and freshness</strong><p>{directorySource.name}. Publisher snapshot {directorySource.snapshot_version} (loaded {directorySource.imported_at ? new Date(directorySource.imported_at).toLocaleDateString() : 'date unavailable'}); the underlying official directory was last updated {directorySource.source_updated_at}. Listings may be outdated, so call the centre before visiting. This directory does not contain live blood stock.</p><a href={directorySource.url} target="_blank" rel="noreferrer">View source record ↗</a></aside>}
      </section> : <section className="banks-directory-panel">
        <div className="banks-directory-heading">
          <div><h2>Hemora operational centres</h2><p>These project records are linked to the local inventory database.</p></div>
          <label className="banks-search"><span className="sr-only">Search project blood banks</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search banks or cities" /></label>
        </div>
        <div className="banks-result-line" aria-live="polite">Showing <strong>{visibleBanks.length}</strong> of {banks.length} project centres</div>
        {localLoading ? <div className="banks-loading" role="status"><span className="inventory-loading-line" /><p>Loading project centres</p></div> : visibleBanks.length ? <div className="banks-card-grid">
          {visibleBanks.map((bank) => <article className="bank-card" key={bank.bank_id}>
            <div className="bank-card-header"><BankMark /><BankStatus active={bank.is_active} /></div>
            <h3>{bank.name}</h3>
            <p className="bank-address">{bank.address}</p>
            <div className="bank-location-line"><span>{bank.city}</span><i /><span>{bank.state}</span>{bank.pincode && <><i /><span>{bank.pincode}</span></>}</div>
            <div className="bank-contact-list"><ContactLink href={`tel:${bank.contact_phone}`} label="Phone" value={bank.contact_phone} /><ContactLink href={`mailto:${bank.contact_email}`} label="Email" value={bank.contact_email} /></div>
            <footer className="bank-stock-footer"><div><span>Available inventory</span><p>Across all blood groups</p></div><strong>{Number(bank.total_units_available || 0)}<small> units</small></strong></footer>
          </article>)}
        </div> : <div className="banks-empty"><BankMark /><strong>{search ? 'No project centres match your search' : 'No project centres available'}</strong><p>{search ? 'Try a different name, city, or area.' : 'Project blood banks will appear here when added.'}</p></div>}
      </section>}
    </div>
  )
}
