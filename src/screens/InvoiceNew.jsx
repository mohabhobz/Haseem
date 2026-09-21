import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader, UsageLine } from '../components/layout.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import { DateField } from '../components/datefield.jsx'
import { fmtMoney, fmtDate } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { toast } from '../components/feedback.jsx'
import {
  Amt, Chip, QuietSelect, QuietSelectBox, usePop, Switch, Seg, Disc, Alert, LockRow,
  ObModal, PreviewPanel,
} from '../components/ob.jsx'

/* ============================================================
   إنشاء فاتورة مبيعات — Option B · Elevate (handoff v1.0 §3).

   تلات كروت: التفاصيل · الجسم (العميل ← البنود ← المطبوع +
   الإجماليات) · المرفقات. الأوامر فوق: رجوع · معاينة · حفظ
   كمسودة · «إصدار الفاتورة» (الـprimary الوحيد في المنطقة).

   ★ اللي فضل من النسخة القديمة لأنه مش شكل:
     • فئة الضريبة لكل بند + كود الإعفاء VATEX (من غيره الهيئة بترفض)
     • الاستحقاق بيتحسب من شروط العميل ويتعدّل يدويًا
     • طريقة التسعير: خالي / شامل الضريبة
     • النوع (فاتورة · مبدئية · عرض سعر) من ?kind=

   ★ للتجربة: ?plan=billing (باقة الفوترة ٤٧/٥٠ + القفل)،
     ?flag=old (فلاج invoice_primary_issue مقفول — الترتيب القديم).
   ============================================================ */

const KINDS = {
  inv:   { title: 'إنشاء فاتورة مبيعات', px: 'INV', issue: 'إصدار الفاتورة', due: 'تاريخ الاستحقاق', noL: 'رقم الفاتورة' },
  prf:   { title: 'إنشاء فاتورة مبدئية', px: 'PRF', issue: 'حفظ وإرسال',     due: 'صالحة حتى',       noL: 'رقم المستند' },
  quote: { title: 'إنشاء عرض سعر',       px: 'QUO', issue: 'إرسال للعميل',   due: 'صالح حتى',        noL: 'رقم العرض' },
}

const CASH = { id: 'CASH', ar: 'عميل نقدي', cash: true }
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const addDays = (s, n) => { const x = new Date(s); x.setDate(x.getDate() + n); return iso(x) }
const termDays = (c) => { if (!c || c.cash) return 0; const m = String(c.terms).match(/\d+/); return m ? +m[0] : 0 }
const num = (x) => Number(String(x).replace(/,/g, '')) || 0

/* الأصناف: خدمات الكتالوج + منتجات المخزون (برصيدها في المستودعات) */
const ITEMS = [
  ...DATA.items.map((i) => ({ code: i.sku, ar: i.ar, unit: i.unitName, price: i.sell, stock: i.open || null, tax: i.tax || 'S' })),
  ...DATA.catalog.map((i) => ({ code: i.code, ar: i.ar, unit: i.unit, price: i.price, stock: null, tax: 'S' })),
]
const itemOf = (code) => ITEMS.find((x) => x.code === code)

const COLS = [
  { id: 'dpc',  label: 'الخصم %' },
  { id: 'acct', label: 'الحساب' },
  { id: 'unit', label: 'اسم الوحدة' },
  { id: 'amt',  label: 'المبلغ' },
  { id: 'img',  label: 'الصورة' },
]
const COLS_KEY = 'ob:inv-cols:' + DATA.user.initials   /* per user (handoff §10-2) */
const COLS_DEF = { dpc: false, acct: false, unit: false, amt: true, img: false }
const XTRA = [{ id: 'rep', label: 'مندوب المبيعات' }, { id: 'prj', label: 'المشروع' }, { id: 'ref', label: 'المرجع' }]

let seq = 0
const emptyLine = () => ({ key: 'l' + (++seq), code: '', ar: '', desc: '', qty: '1', price: '', dpc: '', tax: 'S', vatex: '', acct: '', unit: '' })

export default function InvoiceNew() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const kind = KINDS[sp.get('kind')] ? sp.get('kind') : 'inv'
  const K = KINDS[kind]
  const plan = sp.get('plan') === 'billing' ? { name: 'الفوترة', used: 47, limit: 50, locked: true } : { name: 'الأساسية', used: 118, limit: 300, locked: false }
  const oldOrder = sp.get('flag') === 'old'

  /* ---------- الحالة ---------- */
  const [no, setNo] = useState(K.px + '-027123')
  const [date, setDate] = useState(DATA.TODAY)
  const [dueOv, setDueOv] = useState('')
  const [xtra, setXtra] = useState({ rep: false, prj: false, ref: false })
  const [rep, setRep] = useState(DATA.reps[0].id)
  const [prj, setPrj] = useState('')
  const [ref, setRef] = useState('')
  const [branch, setBranch] = useState(DATA.branches[0].id)
  const [custId, setCustId] = useState('')
  const [wh, setWh] = useState(DATA.warehouses[0].id)
  const [incl, setIncl] = useState('ex')
  const [cols, setCols] = useState(() => { try { return { ...COLS_DEF, ...JSON.parse(localStorage.getItem(COLS_KEY) || '{}') } } catch { return COLS_DEF } })
  const [lines, setLines] = useState(() => [emptyLine()])
  const [moving, setMoving] = useState(null)
  const [drag, setDrag] = useState(null)
  const [note, setNote] = useState('')
  const [bank, setBank] = useState('none')
  const [stamp, setStamp] = useState(true)
  const [disc, setDisc] = useState(null)          /* null = مفيش خصم */
  const [payOn, setPayOn] = useState(false)
  const [payState, setPayState] = useState('unpaid')
  const [pay, setPay] = useState({ amt: '', acc: '1020', date: DATA.TODAY, way: 'transfer', ref: '' })
  const [retOn, setRetOn] = useState(false)
  const [ret, setRet] = useState({ mode: 'pct', pct: '5', fixed: '', base: 'pre', date: '', cond: '' })
  const [files, setFiles] = useState([])
  const [pv, setPv] = useState(false)
  const [tried, setTried] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [issued, setIssued] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { try { localStorage.setItem(COLS_KEY, JSON.stringify(cols)) } catch {} }, [cols])

  const cust = custId === 'CASH' ? CASH : DATA.customers.find((c) => c.id === custId)
  const due = dueOv || addDays(date, termDays(cust))
  const ro = issued

  /* ---------- الحساب — بيتحدّث مع كل حرف (handoff §7-2) ---------- */
  const calc = useMemo(() => {
    let sub = 0, vat = 0
    const per = lines.map((l) => {
      const rate = DATA.rateOf(l.tax) / 100
      const gross = num(l.qty) * num(l.price)
      const base = incl === 'in' ? gross / (1 + rate) : gross
      const n = base * (1 - Math.min(100, num(l.dpc)) / 100)
      sub += n; vat += n * rate
      return { ...l, net: n, amount: incl === 'in' ? n * (1 + rate) : n }
    })
    const d = disc == null ? 0 : Math.min(num(disc), sub)
    const ratio = sub ? (sub - d) / sub : 0
    const vatT = vat * ratio
    const total = sub - d + vatT
    const retAmt = !retOn ? 0 : ret.mode === 'pct'
      ? (ret.base === 'pre' ? sub - d : total) * num(ret.pct) / 100
      : Math.min(num(ret.fixed), total)
    const netDue = total - retAmt
    const paid = !payOn ? 0 : payState === 'full' ? netDue : payState === 'partial' ? Math.min(num(pay.amt), netDue) : 0
    return { per, sub, disc: d, vat: vatT, total, retAmt, netDue, paid, rem: netDue - paid }
  }, [lines, incl, disc, retOn, ret, payOn, payState, pay.amt])

  /* ---------- التحقق (handoff §7-1,2 · INV-CREATE-03) ---------- */
  const lineErr = (l) => (l.code || l.ar || l.desc) && num(l.price) <= 0
  const vatexErr = (l) => (l.code || l.ar) && DATA.needsVatex(l.tax) && !l.vatex
  const stockWarn = (l) => {
    const it = itemOf(l.code)
    if (!it?.stock) return false
    return num(l.qty) > (it.stock[wh] || 0)
  }
  const filled = lines.filter((l) => l.code || l.ar || l.desc)
  const errs = {
    cust: !cust,
    lines: filled.length === 0 || filled.some((l) => num(l.price) <= 0) || filled.some(vatexErr),
  }
  const hasErr = errs.cust || errs.lines
  const show = tried && !issued

  const setLine = (key, p) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)))
  const addLine = () => setLines((ls) => [...ls, emptyLine()])
  const delLine = (key) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : [emptyLine()]))
  const move = (key, dir) => setLines((ls) => {
    const i = ls.findIndex((l) => l.key === key), j = i + dir
    if (j < 0 || j >= ls.length) return ls
    const n = [...ls]; [n[i], n[j]] = [n[j], n[i]]; return n
  })
  const dropOn = (key) => setLines((ls) => {
    if (!drag || drag === key) return ls
    const from = ls.findIndex((l) => l.key === drag), to = ls.findIndex((l) => l.key === key)
    const n = [...ls]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n
  })
  const pickItem = (key, code) => {
    const it = itemOf(code)
    if (!it) return
    setLine(key, { code: it.code, ar: it.ar, price: String(it.price), unit: it.unit, qty: '1', tax: it.tax, vatex: '' })
  }

  /* ---------- الأوامر ---------- */
  const tryIssue = () => {
    setTried(true)
    if (hasErr) { (document.querySelector('.ob-main__c') || document.querySelector('.ob-main'))?.scrollTo({ top: 0, behavior: 'auto' }); return }
    setConfirm(true)
  }
  const doIssue = () => {
    setConfirm(false); setIssued(true); setPv(false)
    toast.ok(`تم إصدار الفاتورة ${no}`, { sub: 'اتقيّدت في الحسابات' })
  }
  const saveDraft = () => toast.ok('تم حفظ المسودة', { sub: no })
  const schedule = () => toast.info('جدولة الفاتورة', { sub: 'بتتكرر تلقائيًا كل فترة تحدّدها — هتظهر في «الفواتير المجدولة»' })

  const bankObj = DATA.banks.find((b) => b.id === bank)
  const brObj = DATA.branches.find((b) => b.id === branch)
  const itemsN = filled.length
  const nLabel = itemsN === 1 ? 'بند واحد' : itemsN === 2 ? 'بندان' : `${itemsN} بنود`

  const paperDoc = {
    no, date, due, party: cust?.cash ? null : cust,
    lines: calc.per.filter((l) => l.code || l.ar || l.desc).map((l) => ({ ar: l.ar || l.desc, qty: num(l.qty), price: num(l.price), disc: num(l.dpc) })),
    sub: calc.sub, disc: calc.disc, vat: calc.vat, total: calc.total, notes: note, zatcaOk: issued,
  }

  const aside = pv && (
    <PreviewPanel title="معاينة الطباعة" doc={paperDoc} onClose={() => setPv(false)} />
  )

  const actions = issued ? <>
    <button type="button" className="btn btn--ghost" onClick={() => nav('/sales/invoices')}>رجوع</button>
    <button type="button" className="btn" onClick={() => toast.ok('الملف اتنزّل', { sub: no + '.pdf' })}><Ico.download size={20} />PDF</button>
    <button type="button" className="btn btn--primary" onClick={() => toast.ok('اتبعتت للعميل', { sub: cust?.ar })}><Ico.send size={20} className="ob-dir" />إرسال للعميل</button>
  </> : <>
    <button type="button" className="btn btn--ghost" onClick={() => nav('/sales/invoices')}>رجوع</button>
    <button type="button" className="btn" aria-pressed={pv} onClick={() => setPv((v) => !v)}><Ico.eye size={20} />{pv ? 'غلق المعاينة' : 'معاينة'}</button>
    <span className="ob-contents ob-hide-sm">{oldOrder ? <>
      <button type="button" className="btn" onClick={tryIssue}>{K.issue}</button>
      <button type="button" className="btn btn--primary" onClick={saveDraft}>حفظ كمسودة</button>
    </> : <>
      <button type="button" className="btn" onClick={saveDraft}>حفظ كمسودة</button>
      <IssueSplit label={K.issue} onIssue={tryIssue} onSchedule={schedule} />
    </>}</span>
  </>

  return (
    <AppShell aside={aside}>
      <PageHeader title={K.title}
        chip={<Chip tone={issued ? 'ok' : 'draft'}>{issued ? 'صادرة' : 'مسودة'}</Chip>}
        usage={<UsageLine used={plan.used} limit={plan.limit} />}
        actions={actions} />

      <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
        {plan.locked && plan.used / plan.limit >= 0.9 && !issued && (
          <Alert tone="warn">بقي لك <span className="num">{plan.limit - plan.used}</span> فواتير في باقة الفوترة هذا الشهر.</Alert>
        )}
        {show && hasErr && <Alert tone="err">صحّح البنود المعلّمة قبل الإصدار.</Alert>}
        {issued && (
          <Alert tone="ok" title={`تم إصدار الفاتورة ${no}`}
            actions={<button type="button" className="ob-link" onClick={() => nav('/sales/invoices')}>عرض الفاتورة</button>}>
            <small className="ob-row" style={{ gap: 6 }}><Chip tone="zatca">الهيئة</Chip>بانتظار الإرسال للهيئة — الحساب غير مربوط بمنصة فاتورة</small>
          </Alert>
        )}
      </div>

      {/* ================= ١) تفاصيل الفاتورة ================= */}
      <section className="ob-card" aria-label="تفاصيل الفاتورة">
        <div className="ob-g2 ob-g2--hdr">
          <div className="ob-kv ob-kv--compact">
            <div>
              <label className="ob-kv__k" htmlFor="inv-no">{K.noL}</label>
              <span className="ob-in ob-in--sm n"><input id="inv-no" value={no} disabled={ro} onChange={(e) => setNo(e.target.value)} /></span>
            </div>
            <div><span className="ob-kv__k">تاريخ الإصدار</span><CompactDate value={date} onChange={setDate} disabled={ro} /></div>
            <div><span className="ob-kv__k">{K.due}</span><CompactDate value={due} min={date} onChange={setDueOv} disabled={ro} /></div>
            {xtra.rep && <div><span className="ob-kv__k">مندوب المبيعات</span>
              <span style={{ flex: 1, maxWidth: 240 }}><QuietSelectBox value={rep} disabled={ro} label="مندوب المبيعات" onChange={setRep} options={DATA.reps.map((r) => ({ id: r.id, label: r.ar }))} /></span></div>}
            {xtra.prj && <div><span className="ob-kv__k">المشروع</span>
              {plan.locked ? <span style={{ flex: 1, maxWidth: 380 }}><LockRow>تتبع المشاريع متاح في الباقة الأساسية</LockRow></span>
                : <span style={{ flex: 1, maxWidth: 240 }}><QuietSelectBox value={prj} disabled={ro} label="المشروع" placeholder="اختر المشروع" onChange={setPrj} options={DATA.projects.map((p) => ({ id: p.id, label: p.ar }))} /></span>}</div>}
            {xtra.ref && <div><label className="ob-kv__k" htmlFor="inv-ref">المرجع</label>
              <span className="ob-in ob-in--sm"><input id="inv-ref" value={ref} disabled={ro} onChange={(e) => setRef(e.target.value)} placeholder="رقم أمر الشراء مثلًا" /></span></div>}
            {!ro && <XtraMenu xtra={xtra} setXtra={setXtra} />}
            {cust && !cust.cash && !dueOv && <span className="ob-muted" style={{ fontSize: 12 }}>الاستحقاق من شروط العميل: {cust.terms}</span>}
            {dueOv && !ro && <button type="button" className="ob-link ob-link--quiet" style={{ minHeight: 32, fontSize: 12 }} onClick={() => setDueOv('')}>رجّع الاستحقاق لشروط العميل</button>}
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span className="ob-logo"><img src={DATA.org.logo} alt={DATA.org.nameAr} /></span>
            <div style={{ display: 'grid', gap: 6, minWidth: 0, flex: 1 }}>
              <div className="ob-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <b style={{ fontSize: 15, color: 'var(--ink-strong)' }}>{DATA.org.nameAr}</b>
                {!ro && <button type="button" className="ob-link ob-link--quiet" onClick={() => nav('/settings/organization')}><Ico.edit size={16} />تعديل</button>}
              </div>
              <QuietSelectBox value={branch} disabled={ro} label="الفرع" onChange={setBranch}
                options={DATA.branches.map((b) => ({ id: b.id, label: `${b.ar} — ${b.code}` }))} />
              <span style={{ fontSize: 13, color: 'var(--ink-label)' }}>الرقم الضريبي: <span className="num">{DATA.org.vat}</span></span>
              <span style={{ fontSize: 13, color: 'var(--ink-label)' }}>السجل التجاري: <span className="num">{DATA.org.cr}</span> · {brObj?.city}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ٢) جسم الفاتورة ================= */}
      <section className="ob-card" style={{ marginTop: 12 }} aria-label="جسم الفاتورة">
        {/* ---- العميل ---- */}
        <div className="ob-sec">
          <h3>العميل <span className="ob-req">*</span></h3>
          {cust ? (
            <div className="ob-box ob-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ lineHeight: 1.6, minWidth: 0 }}>
                <b style={{ fontSize: 15, color: 'var(--ink-strong)', display: 'block' }}>{cust.ar}</b>
                {cust.cash ? <span className="ob-muted" style={{ fontSize: 13 }}>فاتورة ضريبية مبسطة</span> : <>
                  <span style={{ fontSize: 13, color: 'var(--ink-label)', display: 'block' }}>{cust.en}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-label)', display: 'block' }}>الرقم الضريبي: <span className="num">{cust.vat}</span> · {cust.city}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-label)', display: 'block' }}>الجوال: <span className="num">{cust.phone}</span> · شروط الدفع: {cust.terms}</span>
                </>}
              </div>
              {!ro && <div className="ob-row">
                <CustPicker onPick={(id) => { setCustId(id); setDueOv('') }} label="تغيير" nav={nav} />
                {!cust.cash && <button type="button" className="btn" onClick={() => nav(`/sales/customers/${cust.id}/edit`)}><Ico.edit size={20} />تعديل</button>}
              </div>}
            </div>
          ) : (
            <div className={`ob-empty${show && errs.cust ? ' is-err' : ''}`}>
              <p>{show && errs.cust ? <><Ico.alert size={16} />اختر العميل قبل الإصدار</> : <><Ico.info size={16} />الفاتورة تحتاج عميلًا. للبيع النقدي اختر «عميل نقدي».</>}</p>
              <CustPicker onPick={(id) => { setCustId(id); setDueOv('') }} label="اختيار العميل" primaryIcon nav={nav} />
            </div>
          )}
        </div>

        <hr className="ob-divider" />

        {/* ---- البنود ---- */}
        <div className="ob-sec">
          <h3>بنود الفاتورة {itemsN > 0 && <small>{nLabel}</small>}</h3>
          <div className="ob-row" style={{ marginBottom: 8 }}>
            <QuietSelect label="المستودع" value={wh} onChange={setWh}
              options={DATA.warehouses.map((w) => ({ id: w.id, label: `${w.id} — ${w.ar}` }))} />
            <QuietSelect label="طريقة التسعير" value={incl} onChange={setIncl}
              options={[{ id: 'ex', label: 'السعر خالي من الضريبة' }, { id: 'in', label: 'السعر شامل الضريبة' }]} />
            <span className="ob-sp" />
            {!ro && <ColsMenu cols={cols} setCols={setCols} />}
          </div>

          {show && errs.lines && <div style={{ marginBottom: 10 }}><Alert tone="err">أضف بندًا واحدًا على الأقل، ولكل بند سعر وحدة.</Alert></div>}

          <LinesTable {...{ calc, cols, ro, setLine, delLine, pickItem, move, moving, setMoving, drag, setDrag, dropOn, show, lineErr, vatexErr, stockWarn, incl }} />

          {!ro && (
            <button type="button" className="btn" onClick={addLine}
              style={{ width: '100%', marginTop: 10, borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: 600 }}>
              <Ico.plus size={20} />إضافة بند
            </button>
          )}
        </div>

        <hr className="ob-divider" />

        {/* ---- المطبوع + الإجماليات ---- */}
        <div className="ob-g2 ob-g2--wide">
          <div className="ob-sec" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <h3 style={{ margin: 0 }}>يظهر على الفاتورة المطبوعة</h3>
            <label className="fld">
              <span className="ob-lbl">ملاحظات</span>
              <textarea className="fld__i fld__i--area" value={note} disabled={ro} placeholder="إضافة ملاحظات" onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="fld">
              <span className="ob-lbl">الحساب البنكي</span>
              <QuietSelectBox value={bank} disabled={ro} label="الحساب البنكي" onChange={setBank} up
                options={[{ id: 'none', label: 'بدون حساب بنكي' }, ...DATA.banks.map((b) => ({ id: b.id, label: b.ar, sub: b.iban }))]} />
              {bankObj && <span className="fld__h num" style={{ marginTop: 4 }}>{bankObj.iban}</span>}
            </div>
            <div className="fld">
              <span className="ob-lbl">الختم</span>
              {plan.locked ? <LockRow>الختم متاح في الباقة الأساسية</LockRow> : stamp ? (
                <div className="ob-row" style={{ border: '1px solid var(--border-base)', borderRadius: 8, padding: '8px 12px', background: 'var(--surface-raised)', flexWrap: 'nowrap' }}>
                  <span style={{ width: 52, height: 52, borderRadius: 99, border: '3px double #948B82', display: 'grid', placeItems: 'center', fontSize: 7, fontWeight: 700, color: '#6F675F', flex: 'none', textAlign: 'center', lineHeight: 1.2 }}>{DATA.org.nameEn.split(' ').slice(0, 2).join(' ')}</span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}><b style={{ display: 'block', color: 'var(--ink-strong)', fontSize: 14 }}>ختم المؤسسة</b><small className="ob-muted">يُطبع أسفل الفاتورة</small></span>
                  {!ro && <button type="button" className="btn" onClick={() => setStamp(false)}>إزالة</button>}
                </div>
              ) : (
                <div className="ob-empty"><p>بدون ختم</p>{!ro && <button type="button" className="btn" onClick={() => setStamp(true)}><Ico.plus size={20} />إضافة الختم</button>}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            {/* صندوق الإجماليات — ما بيتغيّرش (handoff §7-6) */}
            <div className="ob-box" style={{ display: 'grid', gap: 4 }} aria-label="الإجماليات">
              <TotRow l="المجموع الفرعي" v={calc.sub} />
              {disc == null ? (
                !ro && <div><button type="button" className="ob-link" onClick={() => setDisc('')}><Ico.plus size={20} />إضافة خصم</button></div>
              ) : (
                <div className="ob-row" style={{ justifyContent: 'space-between', minHeight: 44, flexWrap: 'nowrap' }}>
                  <span style={{ color: 'var(--ink-label)' }}>الخصم</span>
                  <span className="ob-row" style={{ flexWrap: 'nowrap', gap: 4 }}>
                    <span className="ob-in n" style={{ width: 140, height: 40, minHeight: 40 }}>
                      <input inputMode="decimal" value={disc} disabled={ro} autoFocus placeholder="0.00" aria-label="مبلغ الخصم" onChange={(e) => setDisc(e.target.value)} /><Riyal />
                    </span>
                    {!ro && <button type="button" className="iconbtn" aria-label="إزالة الخصم" onClick={() => setDisc(null)}><Ico.close size={20} /></button>}
                  </span>
                </div>
              )}
              <TotRow l="ضريبة القيمة المضافة 15%" v={calc.vat} />
              <div className="ob-row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-base)', paddingTop: 10, marginTop: 4, flexWrap: 'nowrap' }}>
                <b style={{ fontSize: 16, color: 'var(--ink-strong)' }}>الإجمالي</b>
                <Amt v={calc.total} className="ob-strong" />
              </div>
            </div>

            <Disc title="تسجيل دفعة عند الإصدار" icon={Ico.wallet} open={payOn}
              summary={payOn ? { unpaid: 'غير مدفوعة', partial: 'مدفوعة جزئياً', full: 'مدفوعة بالكامل' }[payState] : ''}
              onToggle={() => { if (ro) return; setPayOn((o) => { if (o) setPayState('unpaid'); return !o }) }}>
              <div className="fld"><span className="ob-lbl">حالة الدفع</span>
                <Seg fill value={payState} onChange={setPayState} label="حالة الدفع"
                  options={[{ id: 'unpaid', label: 'غير مدفوعة' }, { id: 'partial', label: 'جزئياً' }, { id: 'full', label: 'بالكامل' }]} /></div>
              {payState !== 'unpaid' && <>
                {payState === 'partial' && <label className="fld"><span className="ob-lbl">مبلغ الدفعة</span>
                  <span className="ob-in n"><input inputMode="decimal" value={pay.amt} placeholder="0.00" onChange={(e) => setPay({ ...pay, amt: e.target.value })} /><Riyal /></span></label>}
                <div className="fld"><span className="ob-lbl">الحساب المالي</span>
                  <QuietSelectBox value={pay.acc} label="الحساب المالي" onChange={(v) => setPay({ ...pay, acc: v })} options={DATA.cashAccounts.map((a) => ({ id: a.acc, label: a.ar }))} /></div>
                <DateField label="تاريخ الدفع" value={pay.date} onChange={(v) => setPay({ ...pay, date: v })} />
                <div className="fld"><span className="ob-lbl">طريقة الدفع</span>
                  <Seg fill value={pay.way} onChange={(v) => setPay({ ...pay, way: v })} label="طريقة الدفع" options={[{ id: 'transfer', label: 'تحويل بنكي' }, { id: 'cash', label: 'نقدًا' }]} /></div>
                <label className="fld"><span className="ob-lbl">المرجع</span>
                  <input className="fld__i" value={pay.ref} placeholder="رقم التحويل" onChange={(e) => setPay({ ...pay, ref: e.target.value })} /></label>
              </>}
            </Disc>

            <Disc title="احتجاز حسن التنفيذ" icon={Ico.shield} open={retOn}
              summary={retOn ? (ret.mode === 'pct' ? `${ret.pct || 0}%` : fmtMoney(num(ret.fixed))) : ''}
              onToggle={() => { if (!ro) setRetOn((o) => !o) }}>
              <div className="fld"><span className="ob-lbl">طريقة الاحتجاز</span>
                <Seg value={ret.mode} onChange={(v) => setRet({ ...ret, mode: v })} label="طريقة الاحتجاز" options={[{ id: 'pct', label: 'نسبة' }, { id: 'fixed', label: 'مبلغ ثابت' }]} /></div>
              {ret.mode === 'pct' ? (
                <div className="fld"><span className="ob-lbl">نسبة الاحتجاز</span>
                  <div className="ob-row">
                    <Seg value={['5', '10'].includes(ret.pct) ? ret.pct : ''} onChange={(v) => setRet({ ...ret, pct: v })} label="نسبة جاهزة" options={[{ id: '5', label: '5%' }, { id: '10', label: '10%' }]} />
                    <span className="ob-in n" style={{ width: 110 }}><input inputMode="decimal" value={ret.pct} aria-label="نسبة أخرى" onChange={(e) => setRet({ ...ret, pct: e.target.value })} />%</span>
                  </div></div>
              ) : (
                <label className="fld"><span className="ob-lbl">مبلغ الاحتجاز</span>
                  <span className="ob-in n"><input inputMode="decimal" value={ret.fixed} placeholder="0.00" onChange={(e) => setRet({ ...ret, fixed: e.target.value })} /><Riyal /></span></label>
              )}
              {ret.mode === 'pct' && <div className="fld"><span className="ob-lbl">أساس الاحتجاز</span>
                <Seg value={ret.base} onChange={(v) => setRet({ ...ret, base: v })} label="أساس الاحتجاز" options={[{ id: 'pre', label: 'قبل الضريبة' }, { id: 'incl', label: 'شامل الضريبة' }]} /></div>}
              <DateField label="تاريخ الإفراج المتوقع" value={ret.date} min={date} onChange={(v) => setRet({ ...ret, date: v })} />
              <label className="fld"><span className="ob-lbl">شرط الإفراج</span>
                <input className="fld__i" value={ret.cond} placeholder="مثال: بعد انتهاء فترة الضمان" onChange={(e) => setRet({ ...ret, cond: e.target.value })} /></label>
            </Disc>

            {(calc.paid > 0.009 || calc.retAmt > 0.009) && (
              <div className="ob-box" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border-control)', display: 'grid', gap: 4 }} aria-label="المستحق بعد الدفعة والاحتجاز">
                <b style={{ fontSize: 14, color: 'var(--ink-strong)', marginBottom: 4 }}>المستحق بعد الدفعة والاحتجاز</b>
                <TotRow l="الإجمالي شامل الضريبة" v={calc.total} />
                {calc.retAmt > 0.009 && <TotRow l="حسن التنفيذ" v={-calc.retAmt} />}
                {calc.retAmt > 0.009 && <TotRow l="الصافي المستحق" v={calc.netDue} />}
                {calc.paid > 0.009 && <TotRow l={`المبلغ المدفوع · ${payState === 'full' ? 'مدفوعة بالكامل' : 'مدفوعة جزئياً'}`} v={-calc.paid} />}
                <div className="ob-row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-control)', paddingTop: 8, marginTop: 4, flexWrap: 'nowrap' }}>
                  <b style={{ color: 'var(--ink-strong)' }}>المبلغ المتبقي</b><Amt v={calc.rem} className="ob-strong" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= ٣) المرفقات ================= */}
      <section className="ob-card" style={{ marginTop: 12 }} aria-label="المرفقات">
        <div className="ob-row" style={{ justifyContent: 'space-between' }}>
          <h3 className="ob-sech" style={{ margin: 0 }}>المرفقات</h3>
          {!ro && <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Ico.clip size={20} />إرفاق ملف</button>}
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => { const f = [...e.target.files].map((x) => ({ n: x.name, s: Math.max(1, Math.round(x.size / 1024)) })); setFiles((a) => [...a, ...f]); e.target.value = '' }} />
        </div>
        {files.length === 0 ? <p className="ob-muted" style={{ margin: '8px 0 0', fontSize: 13 }}>لا توجد مرفقات</p> : (
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 6 }}>
            {files.map((f, i) => (
              <li key={i} className="ob-row" style={{ border: '1px solid var(--border-base)', borderRadius: 8, padding: '0 4px 0 12px', flexWrap: 'nowrap' }}>
                <Ico.file size={20} /><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.n}</span>
                <span className="ob-muted num" style={{ fontSize: 12 }}>{f.s} KB</span>
                {!ro && <button type="button" className="iconbtn" aria-label={'إزالة ' + f.n} onClick={() => setFiles((a) => a.filter((_, j) => j !== i))}><Ico.close size={20} /></button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ================= بار الموبايل ================= */}
      {!issued && (
        <div className="ob-stickybar">
          <div className="ob-stickybar__tot"><span>الإجمالي</span><Amt v={calc.total} /></div>
          <button type="button" className="btn" onClick={saveDraft}>حفظ كمسودة</button>
          <button type="button" className="btn btn--primary" onClick={tryIssue}>{K.issue}</button>
        </div>
      )}

      {confirm && (
        <ObModal title="إصدار الفاتورة؟" onClose={() => setConfirm(false)}
          actions={<>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>إلغاء</button>
            <button type="button" className="btn btn--primary" onClick={doIssue}>إصدار</button>
          </>}>
          <p className="cfm__b">بعد الإصدار لا يمكن تعديل الفاتورة، ويتم ترقيمها وتسجيلها في الحسابات.</p>
          <div className="ob-kvl">
            <div><span>العميل</span><b>{cust?.ar}</b></div>
            <div><span>البنود</span><b>{nLabel}</b></div>
            <div><span>ضريبة القيمة المضافة</span><Amt v={calc.vat} /></div>
            <div><span>الإجمالي</span><b><Amt v={calc.total} /></b></div>
          </div>
        </ObModal>
      )}
    </AppShell>
  )
}

/* ---------- أجزاء صغيرة ---------- */
function IssueSplit({ label, onIssue, onSchedule }) {
  const p = usePop()
  return (
    <span className="ob-split" ref={p.ref}>
      <button type="button" className="btn btn--primary" onClick={onIssue}><Ico.send size={20} className="ob-dir" />{label}</button>
      <button type="button" className="btn btn--primary ob-split__more" aria-label="خيارات الإصدار" aria-haspopup="menu" aria-expanded={p.open} onClick={p.toggle}>
        <Ico.chevron size={20} />
      </button>
      {p.open && (
        <div className="ob-menu" role="menu">
          <button type="button" role="menuitem" className="ob-menu__i" onClick={() => { p.setOpen(false); onSchedule() }}><Ico.calendar size={20} />جدولة الفاتورة</button>
        </div>
      )}
    </span>
  )
}


function TotRow({ l, v }) {
  return (
    <div className="ob-row" style={{ justifyContent: 'space-between', minHeight: 34, fontSize: 14, flexWrap: 'nowrap' }}>
      <span style={{ color: 'var(--ink-label)' }}>{l}</span><Amt v={v} className="ob-strong" />
    </div>
  )
}

/* تاريخ مضغوط ٣٨ في هيدر التفاصيل (INV-CREATE-01) */
function CompactDate({ value, onChange, min, disabled }) {
  return <span className="ob-cdate" style={{ flex: 1, maxWidth: 240 }}><DateField value={value} onChange={onChange} min={min} disabled={disabled} /></span>
}

function XtraMenu({ xtra, setXtra }) {
  const p = usePop()
  return (
    <span className="ob-picker" ref={p.ref}>
      <button type="button" className="ob-link ob-link--quiet" aria-haspopup="menu" aria-expanded={p.open} onClick={p.toggle}><Ico.plus size={20} />حقول إضافية</button>
      {p.open && (
        <div className="ob-menu" role="menu" style={{ minWidth: 220 }}>
          {XTRA.map((x) => (
            <button key={x.id} type="button" role="menuitemcheckbox" aria-checked={!!xtra[x.id]} className="ob-menu__i"
              onClick={() => setXtra((v) => ({ ...v, [x.id]: !v[x.id] }))}>
              <span className={`ob-menu__cb${xtra[x.id] ? ' on' : ''}`}>{xtra[x.id] && <Ico.check size={14} />}</span>{x.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

function ColsMenu({ cols, setCols }) {
  const p = usePop()
  return (
    <span className="ob-picker" ref={p.ref}>
      <button type="button" className="ob-link ob-link--quiet" aria-haspopup="menu" aria-expanded={p.open} onClick={p.toggle}><Ico.columns size={20} />تعديل الحقول</button>
      {p.open && (
        <div className="ob-menu is-end" role="menu" style={{ minWidth: 240 }}>
          <div className="ob-menu__h">إظهار في الجدول</div>
          {COLS.map((x) => (
            <button key={x.id} type="button" role="menuitemcheckbox" aria-checked={!!cols[x.id]} className="ob-menu__i"
              onClick={() => setCols((v) => ({ ...v, [x.id]: !v[x.id] }))}>
              <span style={{ flex: 1 }}>{x.label}</span><Switch on={!!cols[x.id]} />
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

function CustPicker({ onPick, label, primaryIcon, nav }) {
  const p = usePop()
  const [q, setQ] = useState('')
  const list = [CASH, ...DATA.customers].filter((c) => !q.trim() || c.ar.includes(q.trim()) || (c.vat || '').includes(q.trim()))
  return (
    <span className="ob-picker" ref={p.ref}>
      <button type="button" className="btn" aria-haspopup="listbox" aria-expanded={p.open} onClick={p.toggle}>
        {primaryIcon && <Ico.plus size={20} />}{label}
      </button>
      {p.open && (
        <div className="ob-menu is-end" role="listbox" style={{ width: 320, maxWidth: 'calc(100vw - 32px)', maxHeight: 340, overflow: 'auto' }}>
          <label className="search" style={{ marginBottom: 6 }}><Ico.search size={20} /><input autoFocus value={q} placeholder="ابحث بالاسم أو الرقم الضريبي" onChange={(e) => setQ(e.target.value)} /></label>
          <button type="button" className="ob-menu__i ob-menu__new" onClick={() => nav('/sales/customers/new')}><Ico.plus size={20} />عميل جديد</button>
          {list.map((c) => (
            <button key={c.id} type="button" role="option" className="ob-menu__i" onClick={() => { onPick(c.id); p.setOpen(false) }}>
              <span style={{ flex: 1 }}>{c.ar}</span><small className="num">{c.cash ? 'فاتورة مبسطة' : c.vat}</small>
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

function ItemPicker({ l, onPick, onFree, disabled, bad }) {
  const p = usePop()
  const [q, setQ] = useState('')
  const list = ITEMS.filter((i) => !q.trim() || i.ar.includes(q.trim()) || i.code.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <span className="ob-picker ob-picker--block" ref={p.ref} style={{ minWidth: 0 }}>
      <button type="button" disabled={disabled} className={`ob-in ob-in--btn${l.ar ? '' : ' is-ph'}${bad ? ' is-bad' : ''}`}
        aria-haspopup="listbox" aria-expanded={p.open} aria-label="بند الفاتورة" onClick={p.toggle}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.ar || 'اختر الصنف'}</span><Ico.chevron size={16} />
      </button>
      {p.open && (
        <div className="ob-menu" role="listbox" style={{ width: 340, maxWidth: 'calc(100vw - 32px)', maxHeight: 320, overflow: 'auto' }}>
          <label className="search" style={{ marginBottom: 6 }}><Ico.search size={20} />
            <input autoFocus value={q} placeholder="ابحث أو اكتب بندًا حرًا" onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && q.trim() && list.length === 0) { onFree(q.trim()); p.setOpen(false) } }} /></label>
          <button type="button" className="ob-menu__i ob-menu__new" onClick={() => toast.info('صنف جديد', { sub: 'بيفتح فورم الصنف الجديد' })}><Ico.plus size={20} />صنف جديد</button>
          {q.trim() && list.length === 0 && (
            <button type="button" className="ob-menu__i" onClick={() => { onFree(q.trim()); p.setOpen(false) }}>استخدم «{q.trim()}» كبند حر</button>
          )}
          {list.map((i) => (
            <button key={i.code} type="button" role="option" className="ob-menu__i" onClick={() => { onPick(i.code); p.setOpen(false); setQ('') }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.ar}</span><small><Amt v={i.price} /></small>
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

function TaxCell({ l, setLine, disabled, bad }) {
  const opts = DATA.taxRates.map((t) => ({ id: t.id, label: t.ar }))
  const rate = DATA.rateOf(l.tax)
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <QuietSelect value={l.tax} options={opts} onChange={(v) => setLine(l.key, { tax: v, vatex: '' })}
        className="ob-taxq" label="" display={<span className="num">{rate}%</span>} disabled={disabled} />
      {DATA.needsVatex(l.tax) && (
        <QuietSelectBox value={l.vatex} disabled={disabled} bad={bad} placeholder="كود الإعفاء" label="كود الإعفاء المطلوب من الهيئة"
          onChange={(v) => setLine(l.key, { vatex: v })} options={DATA.vatexFor(l.tax).map((x) => ({ id: x.id, label: x.id, sub: x.ar }))} />
      )}
    </div>
  )
}

/* ============================================================
   جدول البنود (handoff §5) — ويتحوّل كروت تحت ٩٠٠px
   ============================================================ */
function LinesTable({ calc, cols, ro, setLine, delLine, pickItem, move, moving, setMoving, setDrag, dropOn, show, lineErr, vatexErr, stockWarn, incl }) {
  /* ★ البنود بالعرض (صف) دايمًا على الديسكتوب — حتى لو المنيو مفتوحة
     أو المساحة ضيقة. بتنزل كروت تحت بعض على الموبايل والتابلت بالطول
     بس (أقل من ٩٠٠px عرض شاشة) — طلب مهاب ١٩ سبتمبر. */
  const mq = '(max-width: 899px)'
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(mq).matches)
  const box = useRef(null)
  /* مساحة ضيقة على الديسكتوب (المنيو مفتوحة/شاشة ١٠٢٤): الصف بيفضل بالعرض
     وكل خانة جنب التانية — بس الأعمدة الثابتة بتصغر شوية عشان الوصف ياخد مساحة. */
  const [tight, setTight] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el || narrow) return
    const r = new ResizeObserver(([e]) => setTight(e.contentRect.width < 960))
    r.observe(el)
    return () => r.disconnect()
  }, [narrow])
  useEffect(() => {
    const m = window.matchMedia?.(mq)
    if (!m) return
    const on = () => setNarrow(m.matches)
    on(); m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

  const msgs = (l) => {
    const out = []
    if (show && lineErr(l)) out.push({ err: true, t: 'أدخل سعر الوحدة' })
    if (show && vatexErr(l)) out.push({ err: true, t: 'البند المعفي أو الصفري محتاج كود إعفاء من الهيئة' })
    if (stockWarn(l)) out.push({ err: false, t: 'الكمية أكبر من المتاح في المستودع' })
    return out
  }
  const msgEl = (m, k) => (
    <span key={k} className="ob-emsg" style={m.err ? undefined : { color: '#B45309' }}><Ico.alert size={16} />{m.t}</span>
  )
  const delBtn = (l) => !ro && <button type="button" className="ob-hbtn ob-hbtn--del" aria-label="إزالة" onClick={() => delLine(l.key)}><Ico.close size={16} /></button>
  const handle = (l, i, n, withDel = true) => (
    <div className="ob-row" style={{ gap: 2, flexWrap: 'nowrap' }}>
      <span className="ob-muted num" style={{ fontSize: 12.5, minWidth: 16 }}>{i + 1}</span>
      {!ro && <>
        <button type="button" className="ob-hbtn" aria-label="تحريك البند" draggable={!touch}
          onDragStart={() => setDrag(l.key)} onDragEnd={() => setDrag(null)}
          onClick={() => setMoving(moving === l.key ? null : l.key)} style={{ cursor: 'grab' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.8" /><circle cx="15" cy="6" r="1.8" /><circle cx="9" cy="12" r="1.8" /><circle cx="15" cy="12" r="1.8" /><circle cx="9" cy="18" r="1.8" /><circle cx="15" cy="18" r="1.8" /></svg>
        </button>
        {withDel && delBtn(l)}
      </>}
      {moving === l.key && !ro && (
        <span className="ob-row" style={{ gap: 2 }}>
          <button type="button" className="ob-hbtn" aria-label="لأعلى" disabled={i === 0} onClick={() => move(l.key, -1)}><Ico.arrowUp size={16} /></button>
          <button type="button" className="ob-hbtn" aria-label="لأسفل" disabled={i === n - 1} onClick={() => move(l.key, 1)}><Ico.arrowDown size={16} /></button>
        </span>
      )}
    </div>
  )
  const price = (l) => (
    <div>
      <span className={`ob-in n${show && lineErr(l) ? ' is-bad' : ''}`} style={{ width: '100%' }}>
        <input inputMode="decimal" value={l.price} disabled={ro} placeholder="0.00" aria-label="سعر الوحدة" onChange={(e) => setLine(l.key, { price: e.target.value })} />
      </span>
      {itemOf(l.code) && <div className="ob-sub ob-muted" style={{ fontSize: 11.5, marginTop: 2 }}>آخر بيع: <Amt v={itemOf(l.code).price} /></div>}
    </div>
  )
  const qty = (l) => (
    <span className="ob-in n" style={{ width: '100%' }}>
      <input inputMode="decimal" value={l.qty} disabled={ro} aria-label="الكمية" onChange={(e) => setLine(l.key, { qty: e.target.value })} />
    </span>
  )

  if (narrow) {
    return (
      <div ref={box} style={{ display: 'grid', gap: 10 }}>
        {calc.per.map((l, i) => (
          <div key={l.key} className="ob-card" style={{ padding: '12px 14px', display: 'grid', gap: 10 }}
            onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(l.key)}>
            <div className="ob-row" style={{ flexWrap: 'nowrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ItemPicker l={l} disabled={ro} bad={show && lineErr(l)} onPick={(c) => pickItem(l.key, c)} onFree={(t) => setLine(l.key, { ar: t, code: '' })} />
              </div>
              {handle(l, i, calc.per.length)}
            </div>
            <input className="fld__i" value={l.desc} disabled={ro} placeholder="الوصف" onChange={(e) => setLine(l.key, { desc: e.target.value })} />
            <div className="ob-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <label className="fld" style={{ flex: '0 0 auto' }}><span className="ob-lbl">الكمية</span>{qty(l)}</label>
              <label className="fld" style={{ flex: 1 }}><span className="ob-lbl">سعر الوحدة</span>{price(l)}</label>
            </div>
            <div className="ob-row" style={{ justifyContent: 'space-between' }}>
              <span className="ob-row" style={{ gap: 4 }}><span className="ob-muted" style={{ fontSize: 13 }}>الضريبة</span><TaxCell l={l} setLine={setLine} disabled={ro} bad={show && vatexErr(l)} /></span>
              <Amt v={l.amount} className="ob-strong" />
            </div>
            {msgs(l).map((m, k) => msgEl(m, k))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={box} className="ob-tblwrap">
      <table className="ob-tbl ob-lines">
        <thead>
          <tr>
            <th style={{ width: 72 }}>#</th>
            {cols.img && <th style={{ width: 44 }}><span className="ob-sr">الصورة</span></th>}
            <th style={{ width: tight ? '28%' : '32%' }}>بند الفاتورة</th>
            <th>الوصف</th>
            <th style={{ width: tight ? 80 : 96 }}>الكمية</th>
            <th style={{ width: tight ? 118 : 140 }}>سعر الوحدة</th>
            {cols.dpc && <th style={{ width: 80 }}>الخصم %</th>}
            {cols.acct && <th style={{ width: 200 }}>الحساب</th>}
            <th style={{ width: 72 }}>الضريبة</th>
            {cols.amt && <th className="n" style={{ width: tight ? 112 : 140 }}>المبلغ{incl === 'in' ? ' شامل' : ''}</th>}
            {!ro && <th style={{ width: 56 }}><span className="ob-sr">إزالة</span></th>}
          </tr>
        </thead>
        <tbody>
          {calc.per.map((l, i) => {
            const m = msgs(l)
            const span = 6 + (ro ? 0 : 1) + (cols.img ? 1 : 0) + (cols.dpc ? 1 : 0) + (cols.acct ? 1 : 0) + (cols.amt ? 1 : 0) - 1
            return [
              <tr key={l.key} className={moving === l.key ? 'is-sel' : ''} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(l.key)}>
                <td>{handle(l, i, calc.per.length, false)}</td>
                {cols.img && <td><span style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface-sunken)', display: 'grid', placeItems: 'center', color: 'var(--ink-muted)' }}><Ico.box size={16} /></span></td>}
                <td>
                  <ItemPicker l={l} disabled={ro} bad={show && lineErr(l) && !l.ar} onPick={(c) => pickItem(l.key, c)} onFree={(t) => setLine(l.key, { ar: t, code: '' })} />
                  {cols.unit && l.unit && <div className="ob-sub ob-muted" style={{ fontSize: 11.5 }}>الوحدة: {l.unit}</div>}
                </td>
                <td><input className="fld__i" style={{ width: '100%', minWidth: 110 }} value={l.desc} disabled={ro} placeholder="الوصف" aria-label="الوصف" onChange={(e) => setLine(l.key, { desc: e.target.value })} /></td>
                <td>{qty(l)}</td>
                <td>{price(l)}</td>
                {cols.dpc && <td><span className="ob-in n" style={{ width: 72 }}><input inputMode="decimal" value={l.dpc} disabled={ro} aria-label="الخصم %" onChange={(e) => setLine(l.key, { dpc: e.target.value })} /></span></td>}
                {cols.acct && <td><QuietSelectBox value={l.acct} disabled={ro} label="الحساب" placeholder="حساب الإيراد" onChange={(v) => setLine(l.key, { acct: v })} options={DATA.accountsOf('revenue').map((x) => ({ id: x.id, label: x.ar }))} /></td>}
                <td><TaxCell l={l} setLine={setLine} disabled={ro} bad={show && vatexErr(l)} /></td>
                {cols.amt && <td className="n"><Amt v={l.amount} /></td>}
                {!ro && <td className="ob-lines__del">{delBtn(l)}</td>}
              </tr>,
              m.length > 0 && (
                <tr key={l.key + 'm'} className="rowmsg"><td /><td colSpan={span} style={{ height: 'auto', paddingTop: 0, paddingBottom: 10 }}>
                  {m.map((x, k) => msgEl(x, k))}
                </td></tr>
              ),
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}
