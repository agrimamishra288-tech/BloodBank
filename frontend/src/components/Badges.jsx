const BG = {
  'O+': 'badge-Opos', 'O-': 'badge-Oneg',
  'A+': 'badge-Apos', 'A-': 'badge-Aneg',
  'B+': 'badge-Bpos', 'B-': 'badge-Bneg',
  'AB+':'badge-ABpos','AB-':'badge-ABneg',
}

export default function BloodGroupBadge({ group, size = 'sm' }) {
  const cls = BG[group] || 'bg-dark-600 text-muted border border-dark-400'
  const sz  = size === 'lg' ? 'text-sm px-3 py-1' : ''
  return <span className={`badge ${cls} ${sz} font-mono`}>{group || '—'}</span>
}

export function UrgencyBadge({ urgency }) {
  const map = {
    critical: { cls: 'bg-blood-900/60 text-blood-300 border border-blood-700/40', label: '🔴 Critical', pulse: true },
    urgent:   { cls: 'bg-gold-600/20   text-gold-400  border border-gold-600/30',  label: '🟠 Urgent',   pulse: false },
    normal:   { cls: 'bg-dark-600      text-muted     border border-dark-400',      label: '⚪ Normal',   pulse: false },
  }
  const { cls, label, pulse } = map[urgency] || map.normal
  return (
    <span className={`badge ${cls} ${pulse ? 'animate-pulse-slow' : ''}`}>
      {label}
    </span>
  )
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status?.replace(/_/g, ' ')}</span>
}

export function EligibleBadge({ eligible }) {
  return eligible
    ? <span className="badge bg-emerald-900/40 text-emerald-400 border border-emerald-700/30">✓ Eligible</span>
    : <span className="badge bg-red-900/40 text-red-400 border border-red-700/30">✗ Not eligible</span>
}

export function ScoreBadge({ score }) {
  const color = score >= 100 ? 'text-emerald-400' : score >= 80 ? 'text-gold-400' : 'text-blue-400'
  const label = score >= 100 ? 'Exact Match' : score >= 80 ? 'Universal Donor' : 'Compatible'
  return (
    <span className={`badge bg-dark-600 border border-dark-400 ${color} font-mono`}>
      {score}% · {label}
    </span>
  )
}
