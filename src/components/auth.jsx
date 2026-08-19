import { useRef } from 'react'

/* ============================================================
   AuthLayout — عمودين: الصورة يمين، الفورم شمال.
   تحت 900px الصورة بتختفي والفورم بياخد الشاشة كلها.
   ============================================================ */
export function AuthLayout({ children, center = false }) {
  return (
    <div data-component="AuthLayout" className="auth">
      {/* ---------- يمين: الصورة ---------- */}
      <aside className="auth__visual">
        {/* فيديو لو موجود، وإلا صورة (poster)، وإلا التدرّج الأخضر */}
        <video className="auth__media" autoPlay muted loop playsInline
          onError={(e) => { e.currentTarget.style.display = 'none' }}>
          <source src="/login-hero.mp4" type="video/mp4" />
        </video>
        <div className="auth__veil" />

      </aside>

      {/* ---------- شمال: الفورم ---------- */}
      <main className="auth__main">
        <div className={`auth__form${center ? ' auth__form--center' : ''}`}>
          <img className="auth__logo nav__logo--light" src="/haseem-logo-ar.svg" alt="حسيم" />
          <img className="auth__logo nav__logo--dark" src="/haseem-logo-ar-dark.svg" alt="" aria-hidden="true" />
          {children}
        </div>

        <div className="auth__legal">
          باستخدامك حسيم فأنت توافق على <a className="link" href="#">شروط الاستخدام</a>
          {' '}و<a className="link" href="#">سياسة الخصوصية</a>
        </div>
      </main>
    </div>
  )
}

/* ---------- زر جوجل ---------- */
export function GoogleButton({ label = 'المتابعة بحساب Google', onClick }) {
  return (
    <button data-component="GoogleButton" className="gbtn" onClick={onClick} type="button">
      <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
      </svg>
      <span>{label}</span>
    </button>
  )
}

export function AuthDivider({ label = 'أو' }) {
  return <div className="authdiv"><span>{label}</span></div>
}

export function OtpInput({ length = 6 }) {
  const refs = useRef([])
  const onChange = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1)
    e.target.value = v
    e.target.classList.toggle('filled', !!v)
    if (v && refs.current[i + 1]) refs.current[i + 1].focus()
  }
  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !e.target.value && refs.current[i - 1]) refs.current[i - 1].focus()
  }
  return (
    <div data-component="OtpInput" className="otp">
      {Array.from({ length }).map((_, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} maxLength={1} inputMode="numeric"
          autoFocus={i === 0} onChange={(e) => onChange(i, e)} onKeyDown={(e) => onKeyDown(i, e)} />
      ))}
    </div>
  )
}
