// Blood group → Tailwind color classes
const BG_COLORS = {
  'O-':  'bg-blue-100 text-blue-800 ring-blue-200',
  'O+':  'bg-blue-50  text-blue-700 ring-blue-100',
  'A-':  'bg-green-100 text-green-800 ring-green-200',
  'A+':  'bg-green-50  text-green-700 ring-green-100',
  'B-':  'bg-purple-100 text-purple-800 ring-purple-200',
  'B+':  'bg-purple-50  text-purple-700 ring-purple-100',
  'AB-': 'bg-orange-100 text-orange-800 ring-orange-200',
  'AB+': 'bg-orange-50  text-orange-700 ring-orange-100',
}

export default function BloodGroupBadge({ group, size = 'sm' }) {
  const cls = BG_COLORS[group] || 'bg-gray-100 text-gray-700 ring-gray-200'
  const sz  = size === 'lg' ? 'text-sm px-3 py-1 font-bold' : 'text-xs px-2 py-0.5 font-semibold'
  return (
    <span className={`inline-flex items-center rounded-full ring-1 ${cls} ${sz}`}>
      {group}
    </span>
  )
}

export function UrgencyBadge({ urgency }) {
  const map = {
    critical: 'bg-red-100 text-red-800',
    urgent:   'bg-amber-100 text-amber-800',
    normal:   'bg-green-100 text-green-800',
  }
  return (
    <span className={`badge ${map[urgency] || 'bg-gray-100 text-gray-700'} capitalize`}>
      {urgency === 'critical' && '🚨 '}{urgency}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending:              'bg-yellow-100 text-yellow-800',
    matched:              'bg-blue-100 text-blue-800',
    partially_fulfilled:  'bg-indigo-100 text-indigo-800',
    fulfilled:            'bg-green-100 text-green-800',
    cancelled:            'bg-gray-100 text-gray-500',
    available:            'bg-green-100 text-green-800',
    issued:               'bg-blue-100 text-blue-800',
    expired:              'bg-red-100 text-red-700',
    discarded:            'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`badge ${map[status] || 'bg-gray-100 text-gray-700'} capitalize`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

export function EligibleBadge({ eligible }) {
  return eligible
    ? <span className="badge bg-green-100 text-green-700">✓ Eligible</span>
    : <span className="badge bg-red-100 text-red-600">✗ Not eligible</span>
}
