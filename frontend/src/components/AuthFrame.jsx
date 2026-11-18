import { Link } from 'react-router-dom'
import { Activity, Droplet, HeartPulse } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

export default function AuthFrame({ children, mode = 'login' }) {
  const isRegister = mode === 'register'
  return <main className="auth-frame">
    <section className="auth-art" aria-label="Hemora community">
      <div className="auth-topline"><Link to="/login" className="auth-brand"><span className="auth-brand-icon"><Droplet size={20} fill="currentColor"/></span><span>HEMORA<small>THE COMMUNITY BLOOD NETWORK</small></span></Link><span className="auth-edition">A NETWORK BUILT ON CARE <b>✳</b></span></div>
      <div className="auth-art-body">
        <p className="auth-kicker"><i/> DONORS. HOSPITALS. ONE SHARED PURPOSE.</p>
        <h1>{isRegister ? <>Make room<br/>for <em>good.</em></> : <>When it matters,<br/>we show up<br/><em>for each other.</em></>}</h1>
        <p className="auth-intro">A thoughtful place to connect people who can give with the teams who need to find them.</p>
        <div className="network-illustration" aria-label="Donors, hospitals, and blood banks connected">
          <div className="network-glow"/><svg className="network-lines" viewBox="0 0 520 260" fill="none" aria-hidden="true"><path d="M70 150C145 150 145 68 242 68s90 126 204 126"/><path d="M70 150c65 0 79 83 172 83s111-38 204-39"/><path d="M242 68c0 89-10 118 0 165"/><path d="M70 150c145-12 265 10 376-79"/></svg>
          <div className="network-node node-donor"><span><HeartPulse size={17}/></span><b>DONORS</b><small>People who care</small></div><div className="network-node node-hospital"><span><Activity size={18}/></span><b>HOSPITALS</b><small>Care in motion</small></div><div className="network-node node-bank"><span><Droplet size={18}/></span><b>BLOOD BANKS</b><small>Ready when needed</small></div>
          <div className="network-center"><span>HEMORA</span><i>+</i></div>
          <div className="network-caption"><span className="caption-line"/><span>BETTER, WHEN WE'RE CONNECTED</span><span className="caption-line"/></div>
        </div>
      </div>
      <div className="auth-footer"><span>CARE, WITH A HUMAN CONNECTION.</span><span>INDIA <b>·</b> COMMUNITY FIRST</span></div>
      <span className="auth-orb orb-one"/><span className="auth-orb orb-two"/><span className="auth-grain"/>
    </section>
    <section className="auth-panel">
      <div className="auth-panel-top"><span className="auth-secure"><i/> A PRIVATE SPACE FOR YOUR COMMUNITY</span><ThemeToggle compact/></div>
      <div className="auth-content">{children}</div>
      <div className="auth-panel-foot"><span>HEMORA</span><span>Every little good, passed along.</span></div>
    </section>
  </main>
}
