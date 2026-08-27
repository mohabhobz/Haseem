import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtMoney, fmtDate, TODAY } from '../lib/format.js'
import { PrintPreview } from '../components/printpreview.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   مستند بيع جديد — فاتورة ضريبية · فاتورة مبدئية · عرض سعر.
   نفس الفورم، والنوع بيغيّر الترقيم والأمر النهائي بس.

   قاعدتين من بورد الكلاينت اتطبّقوا هنا حرفيًا:
   ١) «زرار الحفظ ميتقفلش أبدًا» — الزرار شغّال دايمًا، والضغط
      عليه وهي ناقصة بيوَرّي الأخطاء جوّه الحقول مش بيمنعك.
   ٢) رقم المستند مقترح وقابل للتعديل.
   ============================================================ */

const KINDS = [
  { id: 'inv',   label: 'فاتورة ضريبية', px: 'INV', go: 'إصدار وإرسال للهيئة', due: 'تاريخ الاستحقاق' },
  { id: 'prf',   label: 'فاتورة مبدئية', px: 'PRF', go: 'حفظ وإرسال للعميل',   due: 'صالحة حتى' },
  { id: 'quote', label: 'عرض سعر',       px: 'QUO', go: 'إرسال للعميل',        due: 'صالح حتى' },
]

/* شروط السداد بتعيش في ملف العميل — هنا بنقراها ونحوّلها أيام.
   المستخدم بيشوف تاريخ استحقاق حقيقي يقدر يعدّله، مش قايمة تانية يملاها. */
const termDays = (c) => {
  if (!c) return 30
  const m = String(c.terms).match(/\d+/)
  return m ? +m[0] : 0
}

const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const num = (x) => Number(x) || 0
/* العربي مش بيعدّ زي الإنجليزي — مفرد ومثنى وجمع */
const countAr = (n) => (n === 1 ? 'حقل واحد' : n === 2 ? 'حقلان' : `${n} حقول`)

const emptyLine = () => ({
  key: Math.random().toString(36).slice(2),
  code: '', ar: '', unit: 'وحدة', desc: '', qty: 1, price: 0,
  dpc: 0, tax: 'S', acct: '', cc: '',
})

/* ---------- أعمدة البنود: اللي ظاهر منها قرار المستخدم ----------
   الأربعة الأساسية (الصنف · الكمية · السعر · المبلغ) مش بتتقفل — من غيرهم
   مفيش بند أصلاً. الباقي بيتفتح على حسب طبيعة الشغل. */
const COLS = [
  { id: 'img',  label: 'الصورة',        w: '44px'          },
  { id: 'desc', label: 'الوصف',         w: 'minmax(0,.9fr)' },
  { id: 'unit', label: 'اسم الوحدة',    w: '96px'          },
  { id: 'dpc',  label: 'نسبة الخصم ٪',  w: '92px'          },
  { id: 'acct', label: 'الحساب',        w: 'minmax(0,.8fr)' },
  { id: 'cc',   label: 'مركز التكلفة',  w: 'minmax(0,.8fr)' },
]
const COLS_DEFAULT = { img: false, desc: true, unit: false, dpc: false, acct: false, cc: false }

const RET_PC = [5, 10]

export default function InvoiceNew() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  /* الشاشة دي بتخدم تلات أنواع — النوع بييجي من اللينك اللي فتحها */
  const k0 = KINDS.some((k) => k.id === sp.get('kind')) ? sp.get('kind') : 'inv'

  const [kind, setKind]   = useState(k0)
  const [no, setNo]       = useState(`${KINDS.find((k) => k.id === k0).px}-${27123}`)
  const [editNo, setEditNo] = useState(false)
  const [noDraft, setNoDraft] = useState('')
  const [date, setDate]   = useState(iso(new Date(TODAY)))
  const [dueOv, setDueOv] = useState('')   /* تاريخ استحقاق معدّل يدويًا */
  const [cust, setCust]   = useState('')
  const [branch, setBranch] = useState(DATA.branches[0].id)
  const [wh, setWh]       = useState(DATA.warehouses[0].id)
  const [rep, setRep]     = useState(DATA.reps[0].id)
  const [bank, setBank]   = useState(DATA.banks[0].id)
  const [extra, setExtra] = useState(false)   /* حقول إضافية */
  const [cols, setCols]   = useState(COLS_DEFAULT)
  const [colsOpen, setColsOpen] = useState(false)
  const colsRef = useRef(null)
  const [logo, setLogo]   = useState(false)
  const [stamp, setStamp] = useState(false)
  const [preview, setPreview] = useState(false)

  /* حسن التنفيذ — مبلغ بيتحجز لحد ما فترة الضمان تخلص */
  const [ret, setRet]       = useState(false)
  const [retMode, setRetMode] = useState('pc')   /* نسبة | مبلغ ثابت */
  const [retVal, setRetVal]   = useState(5)
  const [retBase, setRetBase] = useState('net')  /* قبل الضريبة | شامل الضريبة */
  const [retDate, setRetDate] = useState('')
  const [retCond, setRetCond] = useState('')

  /* الدفعة الأولى — بتتسجّل مع الإصدار */
  const [payState, setPayState] = useState('none')
  const [payAmt, setPayAmt]     = useState('')
  const [incl, setIncl]   = useState(false)   /* السعر شامل الضريبة؟ */
  const [disc, setDisc]   = useState('')
  const [discPc, setDiscPc] = useState(false)
  const [note, setNote]   = useState('')
  const [files, setFiles] = useState([])
  const [lines, setLines] = useState([emptyLine()])
  const [tried, setTried] = useState(false)   /* اتضغط على الأمر النهائي قبل كده؟ */

  useEffect(() => {
    if (!colsOpen) return
    const away = (e) => { if (colsRef.current && !colsRef.current.contains(e.target)) setColsOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setColsOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [colsOpen])

  const startEditNo = () => { setNoDraft(no); setEditNo(true) }
  const saveNo   = () => { setNo(noDraft.trim() || no); setEditNo(false) }
  const cancelNo = () => setEditNo(false)   /* الرقم القديم بيرجع زي ما هو */

  const K = KINDS.find((k) => k.id === kind)
  const c = DATA.customers.find((x) => x.id === cust)
  const autoDue = iso(addDays(date, termDays(c)))
  const due = dueOv || autoDue
  const bankObj = DATA.banks.find((b) => b.id === bank)

  /* ---------- الحساب: كل سطر بفئته الضريبية، والسعر ممكن يكون شامل ---------- */
  const calc = useMemo(() => {
    let net = 0, tax = 0, lineDisc = 0
    const per = lines.map((l) => {
      const gross = num(l.qty) * num(l.price)
      const rate  = DATA.rateOf(l.tax) / 100
      const base  = incl ? gross / (1 + rate) : gross
      const dAmt  = base * (num(l.dpc) / 100)     /* خصم على مستوى البند */
      const n     = Math.max(0, base - dAmt)
      const t     = n * rate
      net += n; tax += t; lineDisc += dAmt
      /* مهم: منسميهاش tax عشان ما تدهسش نسبة الضريبة اللي المستخدم مختارها */
      return { ...l, discAmt: +dAmt.toFixed(2), net: +n.toFixed(2),
               taxAmt: +t.toFixed(2), total: +(n + t).toFixed(2) }
    })
    const d = discPc ? net * (num(disc) / 100) : num(disc)
    const dNet  = Math.max(0, net - d)
    const ratio = net ? dNet / net : 0
    const dTax  = tax * ratio
    const total = dNet + dTax

    /* حسن التنفيذ بيتحسب على الأساس اللي المستخدم اختاره، وبيتخصم من المستحق */
    const rBase = retBase === 'net' ? dNet : total
    const rAmt  = !ret ? 0
      : retMode === 'pc' ? rBase * (num(retVal) / 100)
      : Math.min(num(retVal), total)

    const paid = payState === 'full' ? total - rAmt
               : payState === 'part' ? Math.min(num(payAmt), total - rAmt)
               : 0

    return {
      per,
      lineDisc: +lineDisc.toFixed(2),
      net:   +net.toFixed(2),
      disc:  +Math.min(d, net).toFixed(2),
      tax:   +dTax.toFixed(2),
      total: +total.toFixed(2),
      ret:   +rAmt.toFixed(2),
      netDue: +(total - rAmt).toFixed(2),
      paid:  +paid.toFixed(2),
      rest:  +(total - rAmt - paid).toFixed(2),
    }
  }, [lines, incl, disc, discPc, ret, retMode, retVal, retBase, payState, payAmt])

  /* ---------- الأخطاء: بتتحسب دايمًا، بتتعرض بعد أول محاولة بس ---------- */
  const errs = {}
  if (!cust) errs.cust = 'لازم تختار عميل'
  if (!no.trim()) errs.no = 'رقم المستند مطلوب'
  if (!lines.some((l) => l.ar || l.desc)) errs.lines = 'ضيف بند واحد على الأقل'
  else if (calc.total <= 0) errs.lines = 'المبلغ لازم يكون أكبر من صفر'
  const show = (k) => (tried ? errs[k] : null)
  const nErr = Object.keys(errs).length

  const setLine = (key, patch) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const addLine = () => setLines((ls) => [...ls, emptyLine()])
  const delLine = (key) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : [emptyLine()]))

  const pick = (key, code) => {
    const it = DATA.catalog.find((x) => x.code === code)
    if (!it) { setLine(key, { code: '', ar: '', unit: 'وحدة', price: 0 }); return }
    setLine(key, { code: it.code, ar: it.ar, unit: it.unit, price: it.price })
  }

  const switchKind = (id) => {
    setKind(id)
    const k = KINDS.find((x) => x.id === id)
    if (!editNo) setNo(`${k.px}-${27123}`)
  }

  /* عرض أعمدة الجدول بيتبني من اللي ظاهر بس */
  const lcols = [
    '22px',
    cols.img  && '44px',
    'minmax(112px,1.1fr)',
    cols.desc && 'minmax(96px,.9fr)',
    '86px',
    cols.unit && '76px',
    '100px',
    cols.dpc  && '84px',
    'minmax(152px,.95fr)',   /* الضريبة — أسماء الفئات طويلة، والسهم عايز مساحته */
    cols.acct && 'minmax(0,.85fr)',
    cols.cc   && 'minmax(0,.85fr)',
    '96px',
    '34px',   /* نفس عرض زرار الشيل بالظبط — أي فرق بيعمل سكرول أفقي */
  ].filter(Boolean).join(' ')

  /* ★ الزرار شغّال دايمًا — بيوَرّي الناقص، مش بيمنعك */
  const submit = () => { setTried(true) }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/sales/invoices')}>
          <Ico.back size={16} />فواتير المبيعات
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no dochead__no--ar">مستند جديد</h1>
            <div className="segs" role="group" aria-label="نوع المستند">
              {KINDS.map((k) => (
                <button key={k.id} className={kind === k.id ? 'on' : ''}
                  aria-pressed={kind === k.id} onClick={() => switchKind(k.id)}>{k.label}</button>
              ))}
            </div>
          </div>
          <div className="dochead__act">
            <button className="btn btn--soft" onClick={() => setPreview(true)}>
              <Ico.search size={15} />معاينة
            </button>
          </div>
        </div>
      </div>

      <div className="docgrid">
        <div className="form">
          {/* ---------- ١) بيانات المستند ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">بيانات المستند</h2>
            <div className="doccols">
             <div className="doccols__main">
              <div className="frow frow--3">
              <div className="fld">
                <span className="fld__l">رقم المستند</span>
                {editNo ? (
                  /* وهو بيعدّل: حفظ أو إلغاء — عشان الغلطة في الكتابة يكون ليها رجعة */
                  <div className="fedit">
                    <input className={`fld__i${show('no') ? ' is-bad' : ''}`} value={noDraft} autoFocus
                      onChange={(e) => setNoDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveNo() }
                        if (e.key === 'Escape') cancelNo()
                      }} />
                    <span className="fedit__a">
                      <button type="button" className="lnk" onClick={saveNo}>حفظ</button>
                      <button type="button" className="lnk lnk--mute" onClick={cancelNo}>إلغاء</button>
                    </span>
                  </div>
                ) : (
                  <div className="fld__ro fedit__ro">
                    <span className="fedit__v">{no}</span>
                    <button type="button" className="lnk" onClick={startEditNo}>تعديل</button>
                  </div>
                )}
                {show('no') && <em className="fld__e">{errs.no}</em>}
              </div>
              <label className="fld">
                <span className="fld__l">تاريخ الإصدار</span>
                <input className="fld__i" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="fld">
                <span className="fld__l">{K.due}</span>
                <input className="fld__i" type="date" value={due} min={date}
                  onChange={(e) => setDueOv(e.target.value)} />
                {dueOv
                  ? <em className="fld__h">
                      معدّل يدويًا ·{' '}
                      <button type="button" className="lnk" onClick={() => setDueOv('')}>
                        رجّع شروط العميل
                      </button>
                    </em>
                  : c && <em className="fld__h">شروط العميل: {c.terms}</em>}
              </label>

              </div>

            <button className="fmore" aria-expanded={extra} onClick={() => setExtra((v) => !v)}>
              <Ico.chevron size={14} className={extra ? 'is-up' : ''} />حقول إضافية
              <em>الفرع · المستودع · المندوب</em>
            </button>
            {extra && (
              <div className="frow frow--3 fmore__b">
                <label className="fld">
                  <span className="fld__l">الفرع</span>
                  <select className="fld__i" value={branch} onChange={(e) => setBranch(e.target.value)}>
                    {DATA.branches.map((b) => <option key={b.id} value={b.id}>{b.ar}</option>)}
                  </select>
                </label>
                <label className="fld">
                  <span className="fld__l">المستودع</span>
                  <select className="fld__i" value={wh} onChange={(e) => setWh(e.target.value)}>
                    {DATA.warehouses.map((w) => <option key={w.id} value={w.id}>{w.ar}</option>)}
                  </select>
                </label>
                <label className="fld">
                  <span className="fld__l">المندوب</span>
                  <select className="fld__i" value={rep} onChange={(e) => setRep(e.target.value)}>
                    {DATA.reps.map((r) => <option key={r.id} value={r.id}>{r.ar}</option>)}
                  </select>
                </label>
              </div>
            )}
             </div>

             {/* الكولومن التاني: الشعار */}
             <div className="fld fld--logo">
               <span className="fld__l">الشعار</span>
               <button className={`updrop${logo ? ' is-set' : ''}`} onClick={() => setLogo((v) => !v)}>
                 {logo
                   ? <img src={DATA.org.logo} alt="" />
                   : <><Ico.plus size={18} /><em>رفع الشعار</em></>}
               </button>
             </div>
            </div>
          </section>

          {/* ---------- ٣) البنود ---------- */}
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">البنود</h2>
              <div className="fcard__ctrl">
                <div className="segs segs--sm" role="group" aria-label="طريقة إدخال السعر">
                  <button className={!incl ? 'on' : ''} onClick={() => setIncl(false)}>خالي من الضريبة</button>
                  <button className={incl ? 'on' : ''} onClick={() => setIncl(true)}>شامل الضريبة</button>
                </div>
                <div className="colmenu" ref={colsRef}>
                  <button className={`gbtn2${colsOpen ? ' on' : ''}`}
                    aria-expanded={colsOpen} onClick={() => setColsOpen((v) => !v)}>
                    <Ico.settings size={14} />تعديل الحقول
                  </button>
                  {colsOpen && (
                    <div className="colmenu__p">
                      <span className="colmenu__t">إظهار في الجدول</span>
                      {COLS.map((c) => (
                        <label key={c.id} className="colmenu__i">
                          <span>{c.label}</span>
                          <input type="checkbox" checked={!!cols[c.id]}
                            onChange={() => setCols((v) => ({ ...v, [c.id]: !v[c.id] }))} />
                          <i className="sw" />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lines" style={{ '--lcols': lcols }}>
              <div className="lines__h">
                <span>#</span>
                {cols.img && <span />}
                <span>الصنف</span>
                {cols.desc && <span>الوصف</span>}
                <span>الكمية</span>
                {cols.unit && <span>الوحدة</span>}
                <span>سعر الوحدة</span>
                {cols.dpc && <span>خصم ٪</span>}
                <span>الضريبة</span>
                {cols.acct && <span>الحساب</span>}
                {cols.cc && <span>مركز التكلفة</span>}
                <span>المبلغ</span>
                <span />
              </div>
              {calc.per.map((l, i) => (
                <div className="lines__r" key={l.key}>
                  <span className="lines__i">{i + 1}</span>
                  {cols.img && <span className="lines__img" aria-hidden="true"><Ico.items size={15} /></span>}
                  <select className="fld__i" value={l.code} onChange={(e) => pick(l.key, e.target.value)}>
                    <option value="">اختر صنف…</option>
                    {DATA.catalog.map((x) => <option key={x.code} value={x.code}>{x.ar}</option>)}
                  </select>
                  {cols.desc && (
                    <input className="fld__i" placeholder="وصف اختياري" value={l.desc}
                      onChange={(e) => setLine(l.key, { desc: e.target.value })} />
                  )}
                  <input className="fld__i n" type="number" min="0" step="1" value={l.qty}
                    onChange={(e) => setLine(l.key, { qty: e.target.value })} />
                  {cols.unit && <span className="lines__u">{l.unit}</span>}
                  <input className="fld__i n" type="number" min="0" step="0.01" value={l.price}
                    onChange={(e) => setLine(l.key, { price: e.target.value })} />
                  {cols.dpc && (
                    <input className="fld__i n" type="number" min="0" max="100" step="1" value={l.dpc}
                      onChange={(e) => setLine(l.key, { dpc: e.target.value })} />
                  )}
                  <select className="fld__i" value={l.tax}
                    onChange={(e) => setLine(l.key, { tax: e.target.value })}>
                    {DATA.taxRates.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
                  </select>
                  {cols.acct && (
                    <select className="fld__i" value={l.acct}
                      onChange={(e) => setLine(l.key, { acct: e.target.value })}>
                      <option value="">—</option>
                      {DATA.accounts.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
                    </select>
                  )}
                  {cols.cc && (
                    <select className="fld__i" value={l.cc}
                      onChange={(e) => setLine(l.key, { cc: e.target.value })}>
                      <option value="">—</option>
                      {DATA.costCenters.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
                    </select>
                  )}
                  <span className="lines__t">{fmtMoney(l.total)}</span>
                  <button className="lines__x" aria-label="شيل السطر" onClick={() => delLine(l.key)}>
                    <Ico.close size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button className="lines__add" onClick={addLine}><Ico.plus size={15} />إضافة بند</button>
            {show('lines') && <em className="fld__e fld__e--blk">{errs.lines}</em>}
          </section>

          {/* ---------- العميل وبيانات الدفع ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">العميل وبيانات الدفع</h2>
            <div className="frow frow--pay">
              <div className="fld">
                <span className="fld__l">اسم العميل</span>
                <select className={`fld__i${show('cust') ? ' is-bad' : ''}`} value={cust}
                  onChange={(e) => setCust(e.target.value)}>
                  <option value="">اختر عميل…</option>
                  {DATA.customers.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
                </select>
                {show('cust') && <em className="fld__e">{errs.cust}</em>}
              </div>
              <label className="fld">
                <span className="fld__l">الحساب البنكي على المستند</span>
                <select className="fld__i" value={bank} onChange={(e) => setBank(e.target.value)}>
                  {DATA.banks.map((b) => <option key={b.id} value={b.id}>{b.ar}</option>)}
                </select>
              </label>
              <div className="fld">
                <span className="fld__l">الآيبان</span>
                <div className="fld__ro">{bankObj?.iban}</div>
              </div>
            </div>
            {c && (
              <p className="fnote">
                <Ico.check size={14} />
                رصيده الحالي <SAR v={c.balance} /> · {c.city} · شروطه المعتادة {c.terms}
              </p>
            )}
          </section>

          {/* ---------- ٤) الملاحظات والختم ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">الملاحظات والختم</h2>
            <div className="notesrow">
              <label className="fld">
                <span className="fld__l">ملاحظة للعميل <em className="fld__opt">اختياري</em></span>
                <textarea className="fld__i fld__i--area" value={note}
                  placeholder="مثلًا: التحويل على حساب المنشأة، والرجاء ذكر رقم الفاتورة في التحويل."
                  onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className="fld fld--logo">
                <span className="fld__l">الختم</span>
                <button className={`updrop${stamp ? ' is-set' : ''}`} onClick={() => setStamp((v) => !v)}>
                  {stamp
                    ? <span className="stampmark">مُعتمد</span>
                    : <><Ico.plus size={18} /><em>رفع الختم</em></>}
                </button>
              </div>
            </div>
          </section>

          {/* ---------- ٥) المرفقات ---------- */}
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">المرفقات <em>أمر شراء · عقد · تسليم</em></h2>
              <button className="gbtn2" onClick={() => setFiles((f) => [...f, { n: `مرفق-${f.length + 1}.pdf`, s: '٢٤٠ ك.ب' }])}>
                <Ico.plus size={14} />إرفاق ملف
              </button>
            </div>
            {files.length === 0
              ? <p className="fempty">مفيش مرفقات — المرفقات بتتبعت مع المستند للعميل.</p>
              : (
                <ul className="flist">
                  {files.map((f, i) => (
                    <li key={i}>
                      <Ico.invoice size={16} /><b>{f.n}</b><span>{f.s}</span>
                      <button aria-label="شيل المرفق" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>
                        <Ico.close size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </div>

        {/* ---------- الملخّص ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">{kind === 'inv' ? 'الإجمالي المستحق' : 'إجمالي المستند'}</span>
            <span className="rail__v"><SAR v={calc.total} /></span>
            <dl className="rail__sum">
              <div><dt>قبل الضريبة</dt><dd><SAR v={calc.net} dec /></dd></div>
              {calc.lineDisc > 0 && (
                <div><dt>خصم البنود</dt><dd className="is-minus">− <SAR v={calc.lineDisc} dec /></dd></div>
              )}
              {calc.disc > 0 && (
                <div><dt>الخصم</dt><dd className="is-minus">− <SAR v={calc.disc} dec /></dd></div>
              )}
              <div><dt>ضريبة القيمة المضافة</dt><dd><SAR v={calc.tax} dec /></dd></div>
            </dl>

            <div className="rdisc">
              <span className="fld__l">خصم على المستند</span>
              <div className="rdisc__r">
                <input className="fld__i n" type="number" min="0" step="0.01" value={disc}
                  placeholder="0" onChange={(e) => setDisc(e.target.value)} />
                <div className="segs segs--sm" role="group" aria-label="نوع الخصم">
                  <button className={!discPc ? 'on' : ''} onClick={() => setDiscPc(false)}>﷼</button>
                  <button className={discPc ? 'on' : ''} onClick={() => setDiscPc(true)}>٪</button>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- الدفعة الأولى ---------- */}
          <section className="rail__c">
            <span className="rail__lbl">الدفعة الأولى</span>
            <p className="rcard__s">سجّل الدفعة اللي اتحصّلت وقت إصدار الفاتورة.</p>
            <span className="fld__l">حالة الدفع</span>
            <select className="fld__i" value={payState} onChange={(e) => setPayState(e.target.value)}>
              <option value="none">غير مدفوعة</option>
              <option value="part">مدفوعة جزئيًا</option>
              <option value="full">مدفوعة بالكامل</option>
            </select>
            {payState === 'part' && (
              <label className="fld" style={{ marginTop: 12 }}>
                <span className="fld__l">المبلغ المحصّل</span>
                <input className="fld__i n" type="number" min="0" step="0.01" placeholder="0"
                  value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
              </label>
            )}
            {payState !== 'none' && (
              <dl className="rail__sum">
                <div><dt>المحصّل</dt><dd className="is-minus">− <SAR v={calc.paid} dec /></dd></div>
                <div><dt>الباقي على العميل</dt><dd><SAR v={calc.rest} dec /></dd></div>
              </dl>
            )}
          </section>

          {/* ---------- حسن التنفيذ ---------- */}
          {!ret ? (
            <button className="rcard__add" onClick={() => setRet(true)}>
              <Ico.plus size={15} />ضيف حسن التنفيذ
              <em>مبلغ بيتحجز لحد ما فترة الضمان تخلص</em>
            </button>
          ) : (
            <section className="rail__c rcard">
              <div className="rcard__h">
                <b><Ico.check size={15} />حسن التنفيذ</b>
                <button className="rcard__x" onClick={() => setRet(false)}>
                  <Ico.close size={13} />إزالة
                </button>
              </div>
              <p className="rcard__s">المبلغ المحتجز حتى انتهاء فترة الضمان</p>

              <span className="fld__l">طريقة الاحتجاز</span>
              <div className="segs segs--sm segs--full" role="group">
                <button className={retMode === 'pc' ? 'on' : ''} onClick={() => setRetMode('pc')}>نسبة</button>
                <button className={retMode === 'amt' ? 'on' : ''} onClick={() => setRetMode('amt')}>مبلغ ثابت</button>
              </div>

              <span className="fld__l">{retMode === 'pc' ? 'نسبة الاحتجاز' : 'المبلغ المحتجز'}</span>
              {retMode === 'pc' ? (
                <div className="rcard__pc">
                  {RET_PC.map((p) => (
                    <button key={p} className={num(retVal) === p ? 'on' : ''}
                      onClick={() => setRetVal(p)}>{p}٪</button>
                  ))}
                  <input className="fld__i n" type="number" min="0" max="100" placeholder="٪"
                    value={RET_PC.includes(num(retVal)) ? '' : retVal}
                    onChange={(e) => setRetVal(e.target.value)} />
                </div>
              ) : (
                <input className="fld__i n" type="number" min="0" step="0.01" placeholder="0"
                  value={retVal} onChange={(e) => setRetVal(e.target.value)} />
              )}

              <span className="fld__l">أساس الاحتجاز</span>
              <div className="segs segs--sm segs--full" role="group">
                <button className={retBase === 'net' ? 'on' : ''} onClick={() => setRetBase('net')}>قبل الضريبة</button>
                <button className={retBase === 'gross' ? 'on' : ''} onClick={() => setRetBase('gross')}>شامل الضريبة</button>
              </div>

              <label className="fld"><span className="fld__l">تاريخ الإفراج المتوقع</span>
                <input className="fld__i" type="date" value={retDate}
                  onChange={(e) => setRetDate(e.target.value)} /></label>
              <label className="fld"><span className="fld__l">شرط الإفراج</span>
                <input className="fld__i" placeholder="مثال: بعد انتهاء فترة الضمان"
                  value={retCond} onChange={(e) => setRetCond(e.target.value)} /></label>
            </section>
          )}

          {ret && (
            <section className="rail__c rail__c--tot">
              <dl className="rail__sum rail__sum--flat">
                <div><dt>الإجمالي شامل الضريبة</dt><dd><SAR v={calc.total} dec /></dd></div>
                <div><dt>حسن التنفيذ</dt><dd className="is-minus">− <SAR v={calc.ret} dec /></dd></div>
                <div className="is-tot"><dt>الصافي المستحق</dt><dd><SAR v={calc.netDue} dec /></dd></div>
              </dl>
            </section>
          )}

          <section className="rail__c">
            <span className="rail__lbl">قبل ما تصدر</span>
            <ul className="check">
              <li className={cust ? 'on' : ''}><Ico.check size={14} />العميل ورقمه الضريبي</li>
              <li className={lines.some((l) => l.ar || l.desc) ? 'on' : ''}><Ico.check size={14} />بند واحد على الأقل</li>
              <li className={calc.total > 0 ? 'on' : ''}><Ico.check size={14} />مبلغ أكبر من صفر</li>
              <li className={no.trim() ? 'on' : ''}><Ico.check size={14} />رقم المستند</li>
            </ul>
            <p className="fnote fnote--quiet">
              {kind === 'inv'
                ? 'أول ما تدوس «إصدار» الفاتورة بتروح لمنصة فاتورة وبتستنى ردّها، والرقم بيتحجز للأبد. المسودة مبتروحش للهيئة.'
                : 'المستند ده مش فاتورة ضريبية — مبيروحش للهيئة ومبيأثرش على حساباتك. لما العميل يوافق تقدر تحوّله لفاتورة.'}
            </p>
          </section>
        </aside>
      </div>

      {/* شريط القرار — الزرار شغّال دايمًا */}
      <div className="savebar" data-component="SaveBar">
        <span className={`savebar__s${tried && nErr ? ' is-bad' : ''}`}>
          {tried && nErr
            ? <><Ico.close size={15} />ناقص {countAr(nErr)} — موضّحة أعلاه باللون الأحمر</>
            : nErr === 0
              ? <><Ico.check size={15} />جاهزة</>
              : 'أكمل الحقول ثم أصدر — سننبّهك إن كان هناك نقص'}
        </span>
        <div className="savebar__b">
          <button className="btn btn--ghost" onClick={() => nav('/sales/invoices')}>إلغاء</button>
          <button className="btn btn--soft">حفظ كمسودة</button>
          <button className="btn btn--primary" onClick={submit}>
            <Ico.send size={16} />{K.go}
          </button>
        </div>
      </div>
      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no, date, due,
          party: c,
          lines: calc.per,
          net: calc.net, disc: calc.disc, tax: calc.tax, total: calc.total,
          retention: calc.ret, netDue: calc.netDue,
          bank: bankObj, note, zatcaOk: false,
        }} />
      )}
    </AppShell>
  )
}
