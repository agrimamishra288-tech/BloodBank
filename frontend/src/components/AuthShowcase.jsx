export default function AuthShowcase({ mode = 'login' }) {
  const isRegister = mode === 'register'

  return (
    <aside className="auth-showcase relative hidden min-h-screen overflow-hidden md:flex">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <div className="auth-spark auth-spark-one">✦</div>
      <div className="auth-spark auth-spark-two">✦</div>
      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
        <a href="/login" className="flex w-fit items-center gap-3 text-white no-underline">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/10 text-xl shadow-lg shadow-[#58182d]/20">✚</span>
          <span className="leading-tight"><span className="block font-[Manrope] text-sm font-extrabold tracking-[.12em]">HEMORA</span><span className="mt-1 block text-[9px] font-semibold uppercase tracking-[.22em] text-white/55">A little good, flowing</span></span>
        </a>

        <div className="mx-auto w-full max-w-lg py-8">
          <div className="relative mx-auto mb-7 h-60 w-60 xl:h-72 xl:w-72">
            <div className="absolute inset-0 rounded-full border border-white/15" />
            <div className="absolute inset-5 rounded-full border border-dashed border-white/20" />
            <div className="absolute inset-11 rounded-full bg-[#f7a08e]/15 blur-2xl" />
            <svg className="auth-drop relative h-full w-full drop-shadow-[0_20px_30px_rgba(64,7,30,.3)]" viewBox="0 0 240 240" fill="none" aria-hidden="true">
              <circle cx="120" cy="120" r="73" fill="#F9B2A1" fillOpacity=".14" />
              <path d="M120 49C120 49 77 103 77 135a43 43 0 0 0 86 0c0-32-43-86-43-86Z" fill="url(#dropFill)" />
              <path d="M120 70c-11 16-23 36-27 51" stroke="white" strokeOpacity=".46" strokeWidth="6" strokeLinecap="round" />
              <path d="M108 132h24m-12-12v24" stroke="white" strokeWidth="7" strokeLinecap="round" />
              <circle cx="179" cy="76" r="14" fill="#FFD18B" />
              <path d="M179 68v16m-8-8h16" stroke="#843047" strokeWidth="3" strokeLinecap="round" />
              <circle cx="60" cy="161" r="8" fill="#F9B2A1" />
              <defs><linearGradient id="dropFill" x1="77" y1="49" x2="163" y2="178" gradientUnits="userSpaceOnUse"><stop stopColor="#FFB09C"/><stop offset="1" stopColor="#E95767"/></linearGradient></defs>
            </svg>
            <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#5f1a32]/80 px-3 py-1.5 text-[10px] font-bold tracking-wide text-white shadow-lg backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-[#ffc57a]" />CARE IN MOTION</div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-[#ffc4aa]">{isRegister ? 'Join the good that keeps going' : 'One community. Countless acts of care.'}</p>
            <h2 className="mt-4 font-[Manrope] text-4xl font-extrabold leading-[1.08] tracking-[-.05em] text-white xl:text-5xl">{isRegister ? <>Your kindness<br />has a pulse.</> : <>Give a little.<br />Keep life flowing.</>}</h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/70">{isRegister ? 'Join donors, hospitals, and blood banks making it easier to show up when it matters.' : 'A thoughtful space for the people who give, match, and deliver blood when it matters.'}</p>
          </div>
          <div className="mx-auto mt-7 flex max-w-xs items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/[.08] px-4 py-3 backdrop-blur-sm">
            <svg className="h-8 w-24 shrink-0" viewBox="0 0 96 32" fill="none" aria-hidden="true"><path d="M2 17h18l6-9 9 18 8-14 6 5h45" stroke="#FFC9A9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-[10px] font-semibold leading-4 text-white/75">Every small act<br /><span className="text-white">moves hope forward.</span></span>
          </div>
        </div>

        <p className="text-center text-[10px] font-medium tracking-wide text-white/40">A brighter way to give the gift of life.</p>
      </div>
    </aside>
  )
}
