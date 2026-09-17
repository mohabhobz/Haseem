import { useState, useRef, useEffect, useId } from 'react'
import { fmtMoney } from '../lib/format.js'

/* ============================================================
   الرسوم البيانية — بالِت سيكوينشال خضراء
   chart-1 غامق · chart-2 وسط · chart-3 فاتح
   فصل الدرجات متحقق منه برمجيًا: ΔE من 20 إلى 40 (الحد 15).
   الدرجة الفاتحة دايمًا معاها لِيبل مباشر.
   ============================================================ */

/* ---------- رسم مساحي متحرك — بديل الأعمدة ----------
   • خط ناعم + تدرّج تحته
   • يترسم متحرّك أول ما الصفحة تفتح (كشف من اليمين للشمال)
   • نفس أرقام المحور الرأسي زي ما هي
   • بالهوفر على أي شهر: نقطة + رقم الشهر فوقها مباشرة   */
/* ★★ المنحنى كان **بيتخطّى** النقط.
   ده Catmull-Rom عادي: نقاط التحكّم بتتحسب من ميل الجيران،
   فلما تيجي من سلسلة أصفار لقمة عالية، الميل بيدفع المنحنى
   **تحت خط الصفر** قبل ما يطلع. النتيجة إن خط المبيعات كان
   بينزل لتحت القاع ويتقصّ عند حافة الرسم — وده اللي كان باين
   كأن الجراف مقطوع.

   الحل: نحبس ‏y‏ بتاعة نقطتَي التحكّم جوّه المدى بين النقطتين
   اللي بيوصل بينهم. المنحنى بيفضل ناعم، بس عمره ما يعدّي
   أعلى نقطة ولا أقل نقطة في المقطع — يعني صفر بيفضل صفر. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const t = 0.2
    const lo = Math.min(p1.y, p2.y)
    const hi = Math.max(p1.y, p2.y)
    const c1x = p1.x + (p2.x - p0.x) * t
    const c1y = clamp(p1.y + (p2.y - p0.y) * t, lo, hi)
    const c2x = p2.x - (p3.x - p1.x) * t
    const c2y = clamp(p2.y - (p3.y - p1.y) * t, lo, hi)
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export function AreaChart({ data, height, highlightIndex, yInset = 34 }) {
  const uid = useId().replace(/:/g, '')
  const wrapRef = useRef(null)
  const lineRef = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [len, setLen] = useState(0)
  const [hover, setHover] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const set = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (lineRef.current) setLen(Math.ceil(lineRef.current.getTotalLength()))
  }, [box.w, box.h, data])

  /* النقطة والرقم يظهروا بعد ما الرسم يخلص */
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 700)
    return () => clearTimeout(t)
  }, [])

  const max = Math.max(...data.map((d) => d.v))
  const ticks = [1, 0.75, 0.5, 0.25, 0]
  const padT = 18
  /* ★ مساحة تحت خط الصفر بقدر نص سُمك الخط + شوية.
     من غيرها الخط بيتركن على حافة الرسم بالظبط، ونص سُمكه
     بيقع بره صندوق الـSVG فيتقصّ — وشهر الصفر بيبان نص خط. */
  const padB = 4
  const n = data.length
  const w = box.w
  const H = height ?? box.h

  /* عربي: يناير على اليمين — فالمحور مقلوب */
  const pts = data.map((d, i) => ({
    ...d,
    i,
    x: w - (i / (n - 1)) * w,
    y: padT + (1 - d.v / max) * (H - padT - padB),
  }))

  const line = smoothPath(pts)
  const area = w ? `${line} L ${pts[n - 1].x} ${H} L ${pts[0].x} ${H} Z` : ''
  const act = hover ?? highlightIndex
  const A = ready ? pts[act] : null

  return (
    <div data-component="AreaChart" className="chart">
      <div className="chart__plot area" style={height ? { height } : undefined}>
        <div className="chart__grid" style={{ top: padT, insetInlineStart: 0 }}>
          {ticks.map((t) => (
            <div key={t} className="chart__gridline">
              <span className="chart__ytick num">{Math.round((max * t) / 1000)}k</span>
            </div>
          ))}
        </div>

        <div className="area__box" ref={wrapRef} style={{ marginRight: yInset }}>
          {w > 0 && H > 0 && (
            <svg className="area__svg" width={w} height={H} aria-label="المبيعات الشهرية">
              <defs>
                {/* ★ التعبئة بتتدرّج من الليموني فوق للأخضر تحت — سلّم
                    الهوية نفسه. الليموني بيفضل في المساحة المفرودة بس،
                    عمره ما بيلمس النص ولا الخط. */}
                <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="var(--lime)"    stopOpacity=".55" />
                  <stop offset="38%" stopColor="var(--chart-3)" stopOpacity=".34" />
                  <stop offset="72%" stopColor="var(--chart-2)" stopOpacity=".16" />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
                </linearGradient>
                {/* الخط نفسه بيمشي من الأخضر الغامق للتركوازي — الليموني
                    برّه الخط لأن تباينه على الأبيض ١٫٢:١ ومش هيتقرا. */}
                <linearGradient id={`s${uid}`} x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%"   stopColor="var(--chart-1)" />
                  <stop offset="100%" stopColor="var(--chart-2)" />
                </linearGradient>
                <clipPath id={`c${uid}`}>
                  <rect className="area__reveal" x="0" y="0" width={w} height={H} />
                </clipPath>
              </defs>

              <g clipPath={`url(#c${uid})`}>
                <path className="area__fill" d={area} fill={`url(#g${uid})`} />
                <path ref={lineRef} className="area__line" d={line} fill="none"
                  stroke={`url(#s${uid})`} strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {A && (
                <g className="area__act" key={act}>
                  <line x1={A.x} y1={A.y} x2={A.x} y2={H} stroke="var(--border-strong)" strokeWidth="1" />
                  <circle cx={A.x} cy={A.y} r="9" fill="var(--chart-1)" opacity=".12" />
                  <circle cx={A.x} cy={A.y} r="4.5" fill="var(--surface-raised)"
                    stroke="var(--chart-1)" strokeWidth="2.5" />
                </g>
              )}
            </svg>
          )}

          {A && (
            <div className="area__tip" key={act} style={{ left: A.x, top: A.y }}>
              <b>{A.l}</b><span className="num">{fmtMoney(A.v).split('.')[0]}</span>
            </div>
          )}

          <div className="area__hit">
            {data.map((d, i) => (
              <span key={d.l} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            ))}
          </div>
        </div>
      </div>

      <div className="chart__xaxis" style={{ paddingRight: yInset }}>
        {data.map((d, i) => (
          <span key={d.l} className={i === act ? 'on' : ''}>{d.l}</span>
        ))}
      </div>
    </div>
  )
}

/* ---------- سبارك‌لاين ---------- */
export function Sparkline({ points, w = 62, h = 26, color = 'var(--chart-2)' }) {
  const max = Math.max(...points), min = Math.min(...points)
  const span = max - min || 1
  const d = points.map((p, i) =>
    `${(i / (points.length - 1)) * w},${h - ((p - min) / span) * (h - 5) - 2.5}`
  ).join(' ')
  return (
    <svg data-component="Sparkline" width={w} height={h} aria-hidden="true" style={{ flex: 'none' }}>
      <polyline points={d} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- دونات — نسبتان عائمتان زي الريفرنس ---------- */
export function DonutChart({ slices, size = 168, thickness = 30 }) {
  const [hover, setHover] = useState(null)
  const sum = slices.reduce((a, s) => a + s.v, 0)
  const r = size / 2 - thickness / 2 - 4
  const circ = 2 * Math.PI * r
  let acc = 0

  /* موضع فقاعة النسبة على محيط الدائرة */
  const bubbles = slices.map((s) => {
    const mid = acc + s.v / sum / 2
    acc += s.v / sum
    const ang = mid * 2 * Math.PI - Math.PI / 2
    return {
      pct: Math.round((s.v / sum) * 100),
      x: size / 2 + Math.cos(ang) * (r + thickness / 2 + 6),
      y: size / 2 + Math.sin(ang) * (r + thickness / 2 + 6),
    }
  })

  acc = 0
  return (
    <div data-component="DonutChart" className="donut">
      <div className="donut__ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label="توزيع الحالة">
          {slices.map((s, i) => {
            const len = (s.v / sum) * circ
            const dash = `${Math.max(len - 3, 0)} ${circ - Math.max(len - 3, 0)}`
            const el = (
              <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={s.color} strokeWidth={thickness}
                strokeDasharray={dash} strokeDashoffset={-acc}
                opacity={hover === null || hover === i ? 1 : 0.45}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{ transition: 'opacity .15s' }}
                transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            )
            acc += len
            return el
          })}
        </svg>
        {bubbles.map((b, i) => (
          <span key={i} className="donut__bubble num"
            style={{ left: b.x, top: b.y }}>{b.pct}٪</span>
        ))}
      </div>
      <div className="donut__legend">
        {slices.map((s, i) => (
          <span key={s.label} className={`donut__key${hover === i ? ' on' : ''}`}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <i style={{ background: s.color }} />{s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------- خريطة نقطية للسعودية — بديل «Map Distribution» ----------
   شكل مبسّط بشبكة نقاط، وفقاعات على المدن الرئيسية. */
const KSA = [
  '......XXXXXXXXX.........',
  '....XXXXXXXXXXXXX.......',
  '...XXXXXXXXXXXXXXXX.....',
  '..XXXXXXXXXXXXXXXXXX....',
  '..XXXXXXXXXXXXXXXXXXX...',
  '.XXXXXXXXXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXXXXXXXXXX...',
  '..XXXXXXXXXXXXXXXXXXX...',
  '..XXXXXXXXXXXXXXXXXX....',
  '...XXXXXXXXXXXXXXXXX....',
  '...XXXXXXXXXXXXXXXX.....',
  '....XXXXXXXXXXXXXXX.....',
  '....XXXXXXXXXXXXXX......',
  '.....XXXXXXXXXXXX.......',
  '......XXXXXXXXXX........',
  '.......XXXXXXXX.........',
  '........XXXXXX..........',
  '.........XXXX...........',
  '..........XX............',
]

export function DotMap({ cities }) {
  const [active, setActive] = useState(0)
  const cols = KSA[0].length, rows = KSA.length
  const gapX = 100 / cols, gapY = 100 / rows

  return (
    <div data-component="DotMap" className="dotmap">
      <div className="dotmap__inner">
        {KSA.map((row, y) =>
          row.split('').map((c, x) =>
            c === 'X' ? (
              <span key={`${x}-${y}`} className="dotmap__dot"
                style={{ left: `${x * gapX + gapX / 2}%`, top: `${y * gapY + gapY / 2}%` }} />
            ) : null
          )
        )}
        {cities.map((c, i) => (
          <button key={c.name} className={`dotmap__pin${active === i ? ' on' : ''}`}
            style={{ left: `${c.x * gapX + gapX / 2}%`, top: `${c.y * gapY + gapY / 2}%` }}
            onMouseEnter={() => setActive(i)} aria-label={c.name}>
            <span className="dotmap__pindot" />
          </button>
        ))}
        {cities[active] && (
          <div className="dotmap__tip"
            style={{
              left: `${cities[active].x * gapX + gapX / 2}%`,
              top: `${cities[active].y * gapY + gapY / 2}%`,
            }}>
            <span className="num">{fmtMoney(cities[active].v).split('.')[0]}</span>
            <em>{cities[active].name}</em>
          </div>
        )}
      </div>
    </div>
  )
}


/* ============================================================
   رسوم التقارير — أعمدة شهرية

   في سيستم العميل الرسم موجود في المكان الصح و**فاضي**: مكتوب
   فيه «لا توجد بيانات كافية» وهو عنده فواتير فعلًا. فالمشكلة
   مش إن الرسم ناقص — المشكلة إنه بيدّي انطباع إن مفيش شغل.

   القواعد اللي ماشيين عليها هنا:

   ١) **طول العمود = الرقم اللي مكتوب عليه.** مفيش تكبير عشان
      يبان، ومفيش حد أدنى بيكدب. العمود الصغير بيفضل صغير.
   ٢) **الصفر بيتعرض.** الشهر اللي مفيهوش مبيعات عمود فاضي مش
      شهر متشال — حذفه بيخلّي الخط يبان طالع وهو مش طالع.
      وشهور المستقبل **مبتتعرضش** — «لسه ما حصلتش» مش «صفر».
   ٣) **اللون بيتبع النوع مش الترتيب.** أعلى شهر مش بياخد لون
      مختلف عشان هو الأعلى.
   ٤) **المحور بيبدأ من صفر.** قص المحور بيضخّم الفروق.
   ٥) اتجاه الزمن **من اليمين للشمال** زي باقي المنتج.
   ============================================================ */

/* شكل مختصر للمبالغ فوق الأعمدة — الرقم الكامل بيفضل في الـtitle */
export function short(v) {
  const n = Math.abs(v)
  if (n >= 1000000) return `${(v / 1000000).toFixed(n >= 10000000 ? 0 : 1)}م`
  if (n >= 1000) return `${Math.round(v / 1000)} ألف`
  return fmtMoney(v).split('.')[0]
}

/* ------------------------------------------------------------
   ١) أعمدة سلسلة واحدة — اتجاه المبيعات
   ------------------------------------------------------------ */
export function TrendBars({ rows, title, hint, unit = 'ر.س', empty }) {
  const vals = rows.map((r) => r.value)
  const max = Math.max(0, ...vals)
  const has = rows.some((r) => r.value !== 0)

  return (
    <section className="tchart" data-component="TrendBars">
      <header className="tchart__h">
        <h3 className="tchart__t">{title}</h3>
        {hint && <span className="tchart__hint">{hint}</span>}
      </header>

      {!has ? (
        <p className="fempty">{empty || 'مفيش حركة في الفترة دي.'}</p>
      ) : (
        <div className="tchart__plot" role="img"
          aria-label={`${title} — ${rows.map((r) => `${r.label}: ${fmtMoney(r.value)}`).join('، ')}`}>
          {rows.map((r) => (
            <div className="tchart__col" key={r.key} title={`${r.label} — ${fmtMoney(r.value)} ${unit}`}>
              <span className="tchart__v num">{r.value ? short(r.value) : ''}</span>
              <span className="tchart__track">
                {r.value > 0 && <i style={{ height: `${max ? (r.value / max) * 100 : 0}%` }} />}
              </span>
              <span className="tchart__x">{r.label}</span>
              {r.sub && <span className="tchart__x2">{r.sub}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------
   ٢) داخل · خارج · الرصيد — اتجاه النقد

   الاتجاه هنا بيتحمّل على **مكان العمود** مش على لونه: الداخل
   فوق خط الصفر والخارج تحته. اللون تفرقة تانية مش الأساس، عشان
   اللي عنده عمى ألوان يقرا الرسم من الشكل.

   وخط الرصيد الختامي فوقهم، لأن السؤال الحقيقي مش «دخل كام»
   — السؤال «الفلوس اللي في إيدنا بتروح فين».
   ------------------------------------------------------------ */
export function CashBars({ rows, title, hint }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.in, r.out)))
  const closes = rows.map((r) => r.close)
  const cMax = Math.max(0, ...closes)
  const cMin = Math.min(0, ...closes)
  const cSpan = cMax - cMin || 1

  /* الخط: نقطة في نص كل عمود، والأقدم على اليمين — عشان كده
     الـx معكوس (١٠٠ ناقص)، الأعمدة نفسها متصفّة RTL.
     والمقياس بيبدأ من صفر زي الأعمدة، مع هامش ٦٪ فوق وتحت عشان
     الخط ما يتقصّش على حافة الرسم. */
  const n = rows.length
  const px = (i) => 100 - ((i + 0.5) / n) * 100
  const py = (v) => 94 - ((v - cMin) / cSpan) * 88
  const pts = rows.map((r, i) => `${px(i)},${py(r.close)}`).join(' ')

  return (
    <section className="tchart tchart--cash" data-component="CashBars">
      <header className="tchart__h">
        <h3 className="tchart__t">{title}</h3>
        {hint && <span className="tchart__hint">{hint}</span>}
        <span className="tchart__leg">
          <b><i data-k="in" />داخل</b>
          <b><i data-k="out" />خارج</b>
          <b><i data-k="line" />الرصيد الختامي</b>
        </span>
      </header>

      <div className="tchart__plot tchart__plot--split" role="img"
        aria-label={`${title} — ${rows.map((r) =>
          `${r.label}: داخل ${fmtMoney(r.in)}، خارج ${fmtMoney(r.out)}، الرصيد ${fmtMoney(r.close)}`
        ).join('، ')}`}>

        <svg className="tchart__line" viewBox="0 0 100 100" preserveAspectRatio="none"
          aria-hidden="true">
          <polyline points={pts} vectorEffect="non-scaling-stroke" />
        </svg>

        {rows.map((r) => (
          <div className="tchart__col" key={r.key}
            title={`${r.label} — داخل ${fmtMoney(r.in)} · خارج ${fmtMoney(r.out)} · الرصيد ${fmtMoney(r.close)}`}>
            <span className="tchart__half chart__half--up">
              {r.in > 0 && <i data-k="in" style={{ height: `${(r.in / max) * 100}%` }} />}
            </span>
            <span className="tchart__zero" aria-hidden="true" />
            <span className="tchart__half chart__half--dn">
              {r.out > 0 && <i data-k="out" style={{ height: `${(r.out / max) * 100}%` }} />}
            </span>
            <span className="tchart__x">{r.label}</span>
            <span className="tchart__x2 num">{short(r.close)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
