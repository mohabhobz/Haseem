import { useRef } from 'react'

/* ============================================================
   AuthLayout — عمودين: الصورة يمين، الفورم شمال.
   تحت 980px الصورة بتختفي والفورم بياخد الشاشة كلها.
   ============================================================ */
/* ============================================================
   خلفية الموجات.

   ★ الموجة **مرسومة**، مش ناتج تشويه.

   جرّبنا قبل كده تشويه بفلتر SVG — طلع حرير حلو بس مش موجات:
   الطيّات بتيجي عشوائية، وإنت مش متحكّم في مسارها. الموجة
   المرسومة (منحنى جيبي بمعادلة) ليها **اتجاه وإيقاع**، وده
   اللي بيخلّيها تقرا موجة.

   إزاي بتتحرّك من غير ما تهنّج:
   كل موجة مرسومة **بأربع دورات** بينما الظاهر منها دورتين، وبنزحف
   المسار دورتين بالظبط في حلقة. لأن الشكل دوري، النهاية بتطابق
   البداية — فالحركة بتبان مستمرة وهي في الحقيقة `translateX`
   واحدة بتتكرر. ترجمة بس، على كارت الشاشة، ٦٠ إطار في الثانية.

   (المحاولات اللي قِسناها وطلعت بطيئة: تحريك الفلتر نفسه ٩ إطار/ث،
   `filter: blur()` على طبقات كبيرة بتتحرّك ٦، و`mix-blend-mode`
   على عناصر بتتحرّك ١٠. كلهم بيخلّوا المتصفح يعيد الرسم كل إطار.)
   ============================================================ */

const VBW = 1200         /* الجزء الظاهر */
const VBH = 900
const PERIOD = 1500      /* أطول من الإطار: يعني الظاهر أقل من دورة
                            كاملة — منحنى واحد كسول، مش سلسلة تلال */
const VW = PERIOD * 3    /* المسار مرسوم تلات دورات عشان الزحف يقفل */

/* منحنى جيبي بمقاطع بيزييه — نقاط التحكّم بتتحسب من **مشتقة**
   الجيب، فالمنحنى بيطابق الموجة الحقيقية مش تقريب بالعين. */
const K = (Math.PI * 2) / PERIOD
const at = (x, y, amp, ph) => y + amp * Math.sin(K * x + ph)
const dy = (x, amp, ph) => amp * K * Math.cos(K * x + ph)

function edge(y, amp, ph, rev = false, step = PERIOD / 6) {
  const pts = []
  for (let x = 0; x <= VW; x += step) pts.push(x)
  if (rev) pts.reverse()
  let d = ''
  for (let i = 0; i < pts.length - 1; i++) {
    const x0 = pts[i], x1 = pts[i + 1], c = (x1 - x0) / 3
    if (!d) d += `M ${x0.toFixed(1)} ${at(x0, y, amp, ph).toFixed(1)} `
    d += `C ${(x0 + c).toFixed(1)} ${(at(x0, y, amp, ph) + dy(x0, amp, ph) * c).toFixed(1)} ` +
         `${(x1 - c).toFixed(1)} ${(at(x1, y, amp, ph) - dy(x1, amp, ph) * c).toFixed(1)} ` +
         `${x1.toFixed(1)} ${at(x1, y, amp, ph).toFixed(1)} `
  }
  return d
}

/* ★ شريط: مساحة بين حافتين موجيتين.

   الحافتين مش متطابقتين — السعة والطور مختلفين شوية، فسُمك
   الشريط بيرفع وينزل على طوله. ده اللي بيخلّيه شريط طايح مش
   أنبوبة بسُمك ثابت. */
const ribbon = (y, thick, amp, ph) =>
  `${edge(y, amp, ph)} L ${VW} ${at(VW, y + thick, amp * 0.9, ph + 0.14)} ` +
  `${edge(y + thick, amp * 0.9, ph + 0.14, true).replace(/^M [\d.]+ [\d.]+ /, '')} Z`

/* مساحة مقفولة لتحت — دي القاعدة اللي الشرايط بتطفو فوقها */
const base = (y, amp, ph) =>
  `${edge(y, amp, ph)} L ${VW} ${VBH + 200} L 0 ${VBH + 200} Z`

/* ★ التكوين: مساحة كبيرة تحت، وفوقها شرايط بسُمك مختلف.
   السرعات مختلفة عن قصد — لو كلهم بنفس السرعة بيبقوا صورة
   واحدة بتتزحلق مش موج بيتداخل. */
const BASES = [
  { y: 690, amp: 86,  ph: 0.4, o: 0.13, g: 'g2', s: 46 },
  { y: 806, amp: 104, ph: 2.1, o: 0.30, g: 'g1', s: 33 },
]
const RIBBONS = [
  { y: 248, t: 104, amp: 112, ph: 0.0, o: 0.13, g: 'g3', s: 41 },
  { y: 356, t: 168, amp: 96,  ph: 0.6, o: 0.22, g: 'g1', s: 29 },
  { y: 462, t: 66,  amp: 124, ph: 1.2, o: 0.44, g: 'g2', s: 52 },
  { y: 548, t: 194, amp: 88,  ph: 1.9, o: 0.15, g: 'g3', s: 36 },
  { y: 634, t: 52,  amp: 116, ph: 2.6, o: 0.52, g: 'g1', s: 24 },
]
const LINES = [
  { y: 242, amp: 112, ph: 0.0, o: 0.26, g: 'g3', s: 41 },
  { y: 456, amp: 124, ph: 1.2, o: 0.34, g: 'g2', s: 52 },
  { y: 628, amp: 116, ph: 2.6, o: 0.40, g: 'g1', s: 24 },
  { y: 800, amp: 104, ph: 2.1, o: 0.26, g: 'g3', s: 33 },
]

export function SilkBackdrop() {
  return (
    <svg className="wv" viewBox={`0 0 ${VBW} ${VBH}`}
      preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        {/* التدرّجات بتقرا من متغيّرات لون المنشأة — `stopColor`
            بياخد `var()` عادي، فاللون بيتغيّر مع الهوية لوحده. */}
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%"   stopColor="var(--wv-4)" />
          <stop offset="38%"  stopColor="var(--wv-5)" />
          <stop offset="100%" stopColor="var(--wv-1)" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0.2" x2="1" y2="0.9">
          <stop offset="0%"   stopColor="var(--wv-1)" />
          <stop offset="48%"  stopColor="var(--wv-2)" />
          <stop offset="100%" stopColor="var(--wv-3)" />
        </linearGradient>
        <linearGradient id="g3" x1="0.1" y1="1" x2="0.9" y2="0">
          <stop offset="0%"   stopColor="var(--wv-3)" />
          <stop offset="46%"  stopColor="var(--wv-1)" />
          <stop offset="100%" stopColor="var(--wv-5)" />
        </linearGradient>
      </defs>

      {BASES.map((w, i) => (
        <g key={`b${i}`} className="wv__g" style={{ animationDuration: `${w.s}s` }}>
          <path d={base(w.y, w.amp, w.ph)} fill={`url(#${w.g})`} opacity={w.o} />
        </g>
      ))}
      {RIBBONS.map((w, i) => (
        <g key={`r${i}`} className="wv__g" style={{ animationDuration: `${w.s}s` }}>
          <path d={ribbon(w.y, w.t, w.amp, w.ph)} fill={`url(#${w.g})`} opacity={w.o} />
        </g>
      ))}
      {LINES.map((w, i) => (
        <g key={`l${i}`} className="wv__g" style={{ animationDuration: `${w.s}s` }}>
          <path d={edge(w.y, w.amp, w.ph)} fill="none" stroke={`url(#${w.g})`}
            strokeWidth="1.6" opacity={w.o} />
        </g>
      ))}
    </svg>
  )
}

export function AuthLayout({ children, center = false }) {
  return (
    <div data-component="AuthLayout" className="auth">
      {/* ---------- يمين: الخلفية ----------

         ★ مفيش صورة افتراضية هنا خالص.

         الخلفية **بتتولّد من لون المنشأة** نفسه: موجات مرسومة
         بدرجات لونه بتجري ببطء فوق خلفية فاتحة. يعني أي عميل
         يغيّر لونه، صفحة الدخول بتتغيّر معاه من غير ما حد يصمّم
         صورة جديدة.

         ولو المنشأة رفعت خلفية من «الهوية البصرية»، بتتحط فوق
         الطبقات دي — ولو شالتها بترجع للمولّدة تلقائيًا. */}
      <aside className="auth__visual">
        <SilkBackdrop />
        <div className="auth__photo" aria-hidden="true" />
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
