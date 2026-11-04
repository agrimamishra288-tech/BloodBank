import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { to: '/', label: 'Overview', icon: '◫' },
  { to: '/donors', label: 'Donors', icon: '♡' },
  { to: '/inventory', label: 'Inventory', icon: '◉' },
  { to: '/requests', label: 'Requests', icon: '⌁' },
  { to: '/donations', label: 'Donations', icon: '✳' },
  { to: '/banks', label: 'Blood banks', icon: '⌂' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  function handleLogout() { logout(); navigate('/login') }

  return (
    <header className="site-header sticky top-0 z-40 border-b border-[#eee8e3] bg-[#fffdfa]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#9d2935] text-lg text-white shadow-[0_5px_12px_rgba(157,41,53,.2)]">✚</span>
          <span className="leading-tight"><span className="block font-[Manrope] text-[15px] font-extrabold tracking-tight text-[#302927]">HEMORA</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[.18em] text-[#a69b95]">Blood network</span></span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-2xl bg-[#f7f3ef] p-1.5 lg:flex">
          {navLinks.map(({ to, label, icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all ${isActive ? 'bg-white text-[#902733] shadow-sm' : 'text-[#817772] hover:bg-white/70 hover:text-[#403835]'}`}><span className="text-[15px]">{icon}</span>{label}</NavLink>)}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f1e7e1] text-xs font-bold uppercase text-[#8c4246]">{user?.name?.slice(0, 1) || 'U'}</span>
            <span className="leading-tight"><span className="block text-xs font-bold capitalize text-[#39312e]">{user?.name}</span><span className="mt-1 block text-[10px] font-medium capitalize text-[#a39a94]">{user?.role}</span></span>
          </div>
          <button onClick={handleLogout} className="rounded-xl border border-[#ece5df] bg-white px-3.5 py-2 text-xs font-semibold text-[#746a65] transition hover:border-[#d8c6c2] hover:text-[#902733]">Log out</button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
        {navLinks.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${isActive ? 'bg-[#9d2935] text-white' : 'text-[#746a65] hover:bg-[#f3ece7]'}`}>{label}</NavLink>)}
      </nav>
    </header>
  )
}
