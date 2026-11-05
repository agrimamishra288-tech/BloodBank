import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import ErrorBanner, { getErrorMessage } from '../components/ErrorBanner'

function BankMark() {
  return <span className="bank-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3.5 20.5h17M5.5 20.5v-10L12 4.5l6.5 6v10M9 20.5v-5h6v5M8.5 11.5h.01M15.5 11.5h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
}

export default function Banks() {
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    api.get('/banks')
      .then((response) => { if (active) setBanks(response.data.data) })
      .catch((err) => { if (active) setError(getErrorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visibleBanks = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return banks
    return banks.filter((bank) => [bank.name, bank.address, bank.city, bank.state, bank.pincode]
      .some((value) => String(value || '').toLowerCase().includes(query)))
  }, [banks, search])

  const totalUnits = banks.reduce((total, bank) => total + Number(bank.total_units_available || 0), 0)
  const activeBanks = banks.filter((bank) => bank.is_active).length
  const cities = new Set(banks.map((bank) => bank.city).filter(Boolean)).size

  return (
    <div className="banks-page">
      <header className="banks-page-header">
        <div>
          <p className="eyebrow">NETWORK · COLLECTION CENTRES</p>
          <h1 className="page-title mt-2">Blood banks</h1>
          <p className="banks-intro">Explore connected centres and their current available stock.</p>
        </div>
        <div className="banks-header-mark"><BankMark /><span>Verified network directory</span></div>
      </header>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {loading ? <div className="banks-loading" role="status"><span className="inventory-loading-line" /><p>Loading blood bank directory</p></div> : <>
        <section className="banks-metrics" aria-label="Blood bank network summary">
          <article><span>Connected centres</span><strong>{banks.length}</strong><p>Blood banks in this directory</p></article>
          <article><span>Active centres</span><strong>{activeBanks}</strong><p>Currently marked active</p></article>
          <article><span>Available stock</span><strong>{totalUnits}</strong><p>Units available across the network</p></article>
          <article><span>Coverage</span><strong>{cities}</strong><p>{cities === 1 ? 'City represented' : 'Cities represented'}</p></article>
        </section>

        <section className="banks-directory-panel">
          <div className="banks-directory-heading">
            <div><h2>Network directory</h2><p>Find a centre by name, city, or area.</p></div>
            <label className="banks-search"><span className="sr-only">Search blood banks</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search banks or cities" /></label>
          </div>

          <div className="banks-result-line" aria-live="polite">Showing <strong>{visibleBanks.length}</strong> of {banks.length} centres</div>

          {visibleBanks.length ? <div className="banks-card-grid">
            {visibleBanks.map((bank) => <article className="bank-card" key={bank.bank_id}>
              <div className="bank-card-header"><BankMark /><span className={`bank-status ${bank.is_active ? 'is-active' : 'is-inactive'}`}><i />{bank.is_active ? 'Active' : 'Inactive'}</span></div>
              <h3>{bank.name}</h3>
              <p className="bank-address">{bank.address}</p>
              <div className="bank-location-line"><span>{bank.city}</span><i /> <span>{bank.state}</span>{bank.pincode && <><i /> <span>{bank.pincode}</span></>}</div>
              <div className="bank-contact-list">
                {bank.contact_phone && <a href={`tel:${bank.contact_phone}`}><span className="bank-contact-label">Phone</span><strong>{bank.contact_phone}</strong></a>}
                {bank.contact_email && <a href={`mailto:${bank.contact_email}`}><span className="bank-contact-label">Email</span><strong>{bank.contact_email}</strong></a>}
              </div>
              <footer className="bank-stock-footer"><div><span>Available inventory</span><p>Across all blood groups</p></div><strong>{Number(bank.total_units_available || 0)}<small> units</small></strong></footer>
            </article>)}
          </div> : <div className="banks-empty"><BankMark /><strong>{search ? 'No centres match your search' : 'No blood banks available'}</strong><p>{search ? 'Try a different name, city, or area.' : 'Connected centres will appear here when they are added.'}</p></div>}
        </section>
      </>}
    </div>
  )
}
