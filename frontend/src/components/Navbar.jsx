import { NavLink, useNavigate } from 'react-router-dom'
import { Activity, UsersRound, Droplet, ClipboardList, HeartHandshake, Landmark, LogOut, ArrowUpRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { to: '/', label: 'Overview', icon: Activity },
  { to: '/donors', label: 'Donors', icon: UsersRound },
  { to: '/inventory', label: 'Inventory', icon: Droplet },
  { to: '/requests', label: 'Requests', icon: ClipboardList },
  { to: '/donations', label: 'Donations', icon: HeartHandshake },
  { to: '/banks', label: 'Blood banks', icon: Landmark },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  function handleLogout() { logout(); navigate('/login') }
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'H'

  return <aside className="app-sidebar">
    <NavLink to="/" className="sidebar-brand"><span className="brand-emblem"><Droplet size={22} fill="currentColor"/></span><span><b>HEMORA</b><small>COMMUNITY BLOOD NETWORK</small></span></NavLink>
    <div className="sidebar-section-label">YOUR WORKSPACE <span>●</span></div>
    <nav className="sidebar-nav">{NAV.map(({ to, label, icon: Icon }, index) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><span className="sidebar-index">0{index + 1}</span><Icon size={17}/><span>{label}</span><ArrowUpRight className="sidebar-arrow" size={14}/></NavLink>)}</nav>
    <div className="sidebar-note"><span className="note-mark">+</span><p>Somewhere today,<br/><strong>a small kindness<br/>will mean everything.</strong></p><span className="note-caption">THANK YOU FOR BEING HERE</span></div>
    <div className="sidebar-bottom"><div className="sidebar-user"><span className="user-avatar">{initial}</span><span className="user-data"><b>{user?.name || 'Community member'}</b><small>{user?.role || 'Member'} <i/> Hemora network</small></span><button type="button" title="Sign out" onClick={handleLogout} className="sidebar-logout"><LogOut size={16}/></button></div><div className="sidebar-bottom-row"><span>MAKE YOURSELF AT HOME</span><ThemeToggle compact/></div></div>
  </aside>
}
