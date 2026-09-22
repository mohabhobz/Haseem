import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { Ico, Riyal } from './icons.jsx'
import { fmtMoney, fmtDate, daysFrom } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDismiss, closeOtherPops } from './layout.jsx'
import { DateField } from './datefield.jsx'
import { patch } from '../lib/store.js'
import { toast } from './feedback.jsx'
import { getBrand } from '../lib/brand.js'
import { Sheet } from './modal.jsx'

/* ============================================================
   مكوّنات Option B المشتركة (handoff §6).
   كل شاشة بتاخد من هنا — مفيش شاشة بتبني شارة أو قايمة
   منبثقة أو مفتاح بإيدها.
   ============================================================ */

/* ---------- مبلغ: رقم + رمز الريال (Create §2) ---------- */
export function Amt({ v, className = '', bold = false }) {
  return (
    <span className={`ob-ryl ${className}`} style={bold ? { fontWeight: 600 } : undefined}>
      <span>{fmtMoney(v)}</span><Riyal />
    </span>
  )
}

/* ---------- شارة ---------- */
export function Chip({ tone = 'draft', children }) {
  return <span className={`ob-chip ob-chip--${tone}`}>{children}</span>
}

/* ---------- حالة فاتورة المبيعات — نظام واحد (List §5 + قرار ٠-١٠/٠-١١) ----------
   شارة دفع واحدة لكل صف + «مجدولة» + «مرفوضة من الهيئة» لما تحصل.
   «صادر» مش شارة: كل اللي مش مسودة صادر. */
export const INV_LIVE = ['issued', 'partial', 'overdue', 'paid']
export function invNet(v) {
  const cr = DATA.creditedState(v.no, v.total)
  if (v.status === 'cancelled' || v.status === 'void') return 0
  return cr ? cr.net : v.total
}
export function invRemaining(v) {
  if (!INV_LIVE.includes(v.status)) return 0
  return Math.max(0, +(invNet(v) - v.paid).toFixed(2))
}
export function invLateDays(v) {
  if (!INV_LIVE.includes(v.status) || invRemaining(v) <= 0.009 || !v.due) return 0
  const d = daysFrom(v.due)
  return d < 0 ? -d : 0
}
/* المفتاح اللي بيتفلتر بيه في الـpills */
export function invKey(v) {
  if (v.status === 'draft') return 'draft'
  if (v.status === 'cancelled' || v.status === 'void') return 'cancelled'
  if (invRemaining(v) <= 0.009) return 'paid'
  if (invLateDays(v) > 0) return 'overdue'
  return 'unpaid'
}
export function invChips(v) {
  const out = []
  const k = invKey(v)
  if (k === 'draft') out.push({ tone: 'draft', ar: 'مسودة' })
  else if (k === 'cancelled') out.push({ tone: 'draft', ar: 'ملغاة' })
  else if (k === 'paid') out.push({ tone: 'ok', ar: 'مدفوعة' })
  else if (k === 'overdue') out.push({ tone: 'err', ar: 'متأخرة' })
  else if (v.paid > 0.009) out.push({ tone: 'warn', ar: 'مدفوعة جزئياً' })
  else out.push({ tone: 'warn', ar: 'غير مدفوعة' })
  const cr = DATA.creditedState(v.no, v.total)
  if (cr && k !== 'cancelled') out.push({ tone: 'draft', ar: cr.full ? 'مقيّدة بالكامل' : 'مقيّدة بإشعار' })
  if (v.rec) out.push({ tone: 'info', ar: 'مجدولة' })
  if (v.zatca === 'bad') out.push({ tone: 'err', ar: 'مرفوضة من الهيئة' })
  return out
}
export function InvChips({ v }) {
  return <span className="ob-chips">{invChips(v).map((c) => <Chip key={c.ar} tone={c.tone}>{c.ar}</Chip>)}</span>
}

/* ---------- قايمة منبثقة عامة ---------- */
export function usePop() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useDismiss(open, () => setOpen(false), [ref])
  const toggle = () => { if (!open) closeOtherPops(); setOpen((o) => !o) }
  return { open, setOpen, ref, toggle }
}

/* Quiet inline select — «التسمية: القيمة ▾» (INV-CREATE-10) */
export function QuietSelect({ label, value, options, onChange, up = false, end = false, className = '', display, disabled = false }) {
  const p = usePop()
  const cur = options.find((o) => o.id === value) || options[0]
  return (
    <span className={`ob-picker ${className}`} ref={p.ref}>
      <button type="button" className="ob-qsel" disabled={disabled} aria-haspopup="listbox" aria-expanded={p.open} onClick={p.toggle}
        aria-label={label ? undefined : cur?.label}>
        {label && <span>{label}:</span>}{display ?? cur?.label}<Ico.chevron size={16} />
      </button>
      {p.open && (
        <div className={`ob-menu${up ? ' is-up' : ''}${end ? ' is-end' : ''}`} role="listbox" style={{ minWidth: 220 }}>
          {options.map((o) => (
            <button key={o.id} type="button" role="option" aria-selected={o.id === value}
              className="ob-menu__i" onClick={() => { onChange(o.id); p.setOpen(false) }}>
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.id === value && <Ico.check size={16} />}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

/* ---------- مفتاح · مقسّم ---------- */
export function Switch({ on }) { return <span className={`ob-sw${on ? ' on' : ''}`} aria-hidden="true" /> }

export function Seg({ value, options, onChange, fill = false, label }) {
  return (
    <div className={`ob-seg${fill ? ' ob-seg--fill' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

/* ---------- توجل بوكس (INV-CREATE-11) ---------- */
export function Disc({ title, icon: I, summary, open, onToggle, children }) {
  return (
    <div className="ob-disc">
      <button type="button" aria-expanded={open} onClick={onToggle} role="switch" aria-checked={open}>
        {I && <I size={16} />}
        <span>{title}</span>
        <small>{summary}</small>
        <Switch on={open} />
      </button>
      {open && <div className="ob-disc__body">{children}</div>}
    </div>
  )
}

/* ---------- تنبيه ---------- */
export function Alert({ tone = 'err', title, children, actions }) {
  const I = tone === 'ok' ? Ico.check : tone === 'warn' ? Ico.alert : Ico.alert
  return (
    <div className={`ob-alert ob-alert--${tone}`} role={tone === 'err' ? 'alert' : 'status'}>
      <I size={20} />
      <div className="ob-alert__t">{title && <b>{title}</b>}{children}</div>
      {actions && <div className="ob-alert__acts">{actions}</div>}
    </div>
  )
}

/* ---------- صف مقفول بالباقة ---------- */
export function LockRow({ children }) {
  return (
    <div className="ob-lock">
      <Ico.lock size={16} /><span>{children}</span>
      <button type="button" className="ob-link" onClick={() => toast.info('ترقية الباقة', { sub: 'الباقات: الفوترة · الأساسية · الشاملة' })}>ترقية الباقة</button>
    </div>
  )
}

/* ---------- Checkbox 44 ---------- */
export function Check({ on, onChange, label }) {
  return (
    <button type="button" className="ob-cbw" role="checkbox" aria-checked={!!on} aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!on) }}>
      <span className={`ob-cb${on ? ' on' : ''}`}>{on && <Ico.check size={14} />}</span>
    </button>
  )
}

/* ---------- مودال Option B (480 · r16 · شيت تحت 600) ---------- */
export function ObModal({ title, children, actions, onClose, wide, dialog = false }) {
  useEffect(() => {
    if (!dialog) return
    const esc = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose, dialog])
  if (!dialog) return <Sheet title={title} onClose={onClose} actions={actions} size={wide ? 'wide' : undefined} component="ObModal">{children}</Sheet>
  return (
    <div className="cfm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cfm__scrim" onClick={onClose} />
      <div className={`cfm__box${wide ? ' cfm__box--wide' : ''}`}>
        <h2 className="cfm__t">{title}</h2>
        {children}
        {actions && <div className="cfm__acts">{actions}</div>}
      </div>
    </div>
  )
}

/* ---------- تسجيل دفعة — نفس الحقول في الإنشاء والقايمة والتفاصيل ---------- */
const FIN = DATA.cashAccounts.map((a) => ({ id: a.acc, label: a.ar }))
export function PaymentModal({ v, onClose }) {
  const rem = invRemaining(v)
  const [amt, setAmt] = useState(rem.toFixed(2))
  const [date, setDate] = useState(DATA.TODAY)
  const [way, setWay] = useState('transfer')
  const [acc, setAcc] = useState('1020')
  const [ref, setRef] = useState('')
  const n = Number(amt) || 0
  const bad = n <= 0 || n > rem + 0.009
  const save = () => {
    if (bad) return
    const paid = +(v.paid + n).toFixed(2)
    const status = paid >= invNet(v) - 0.009 ? 'paid' : (invLateDays(v) > 0 ? 'overdue' : 'partial')
    patch('invoices', v.no, { paid, status })
    toast.ok(`تم تسجيل دفعة على ${v.no}`, { sub: `${fmtMoney(n)} ريال · ${FIN.find((f) => f.id === acc)?.label}` })
    onClose()
  }
  return (
    <ObModal title={`تسجيل دفعة — ${v.no}`} onClose={onClose}
      actions={<>
        <button type="button" className="btn" onClick={onClose}>إلغاء</button>
        <button type="button" className="btn btn--primary" disabled={bad} onClick={save}>تسجيل الدفعة</button>
      </>}>
      <p className="cfm__b">{v.c?.ar} · المتبقي <Amt v={rem} /></p>
      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <label className="fld"><span className="fld__l">مبلغ الدفعة</span>
          <span className={`ob-in n${bad ? ' is-bad' : ''}`}><input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} aria-label="مبلغ الدفعة" /><Riyal /></span>
          {bad && <span className="ob-emsg"><Ico.alert size={16} />المبلغ لازم يكون أكبر من صفر ومش أكتر من المتبقي</span>}
        </label>
        <DateField label="تاريخ الدفع" value={date} onChange={setDate} />
        <div className="fld"><span className="fld__l">طريقة الدفع</span>
          <Seg fill value={way} onChange={setWay} label="طريقة الدفع"
            options={[{ id: 'transfer', label: 'تحويل بنكي' }, { id: 'cash', label: 'نقدًا' }]} />
        </div>
        <div className="fld"><span className="fld__l">الحساب المالي</span>
          <QuietSelectBox value={acc} options={FIN} onChange={setAcc} label="الحساب المالي" />
        </div>
        <label className="fld"><span className="fld__l">المرجع <em className="fld__opt">اختياري</em></span>
          <input className="fld__i" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="رقم التحويل أو الإيصال" />
        </label>
      </div>
    </ObModal>
  )
}

/* قايمة اختيار بشكل حقل (44 ببرواز) — بتفتح نفس البوب أوفر */
export function QuietSelectBox({ value, options, onChange, label, placeholder = 'اختر…', up = false, disabled = false, bad = false }) {
  const p = usePop()
  const cur = options.find((o) => o.id === value)
  return (
    <span className="ob-picker ob-picker--block" ref={p.ref}>
      <button type="button" disabled={disabled} className={`ob-in ob-in--btn${cur ? '' : ' is-ph'}${bad ? ' is-bad' : ''}`} aria-label={label}
        aria-haspopup="listbox" aria-expanded={p.open} onClick={p.toggle}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur ? cur.label : placeholder}</span>
        <Ico.chevron size={16} />
      </button>
      {p.open && (
        <div className={`ob-menu${up ? ' is-up' : ''}`} role="listbox" style={{ width: '100%', maxHeight: 300, overflow: 'auto' }}>
          {options.map((o) => (
            <button key={o.id} type="button" role="option" aria-selected={o.id === value} className="ob-menu__i"
              onClick={() => { onChange(o.id); p.setOpen(false) }}>
              <span style={{ flex: 1 }}>{o.label}</span>{o.sub && <small>{o.sub}</small>}
              {o.id === value && <Ico.check size={16} />}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

/* ============================================================
   لوحة المعاينة — Option B (Create §6 · List §3)
   inline-end · sticky · 560 / 440 تحت 1200 / ملء الشاشة تحت 600.
   ============================================================ */
const TPLS = [
  { id: 'std', label: 'القالب القياسي' },
  { id: 'compact', label: 'مدمج' },
  { id: 'gray', label: 'رمادي' },
  { id: 'classic', label: 'كلاسيكي' },
]
export function PreviewPanel({ title, chip, doc, onClose, actions }) {
  const [mode, setMode] = useState('full')
  const [w, setW] = useState('80')
  const [tpl, setTpl] = useState('std')
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <aside className="ob-pv" aria-label={title} data-component="PreviewPanel">
      {/* ★ الرأس: الإغلاق في البداية (زي الأدراج) · الرقم وتحته الحالات */}
      <div className="ob-pv__hd">
        <button type="button" className="iconbtn ob-pv__x" onClick={onClose} aria-label="غلق المعاينة" title="غلق المعاينة"><Ico.close size={20} /></button>
        <div className="ob-pv__ttl">
          <h2><span>{title}</span></h2>
          {chip && <div className="ob-pv__chips">{chip}</div>}
        </div>
      </div>
      {actions && <div className="ob-pv__acts">{actions}</div>}
      <div className="ob-pv__body">
        <div className="ob-pv__tools">
          <Seg value={mode} onChange={setMode} label="نوع الطباعة"
            options={[{ id: 'full', label: 'فاتورة كاملة' }, { id: 'th', label: 'فاتورة حرارية' }]} />
          {mode === 'th' && (
            <Seg value={w} onChange={setW} label="عرض الورق" options={[{ id: '58', label: '58 مم' }, { id: '80', label: '80 مم' }]} />
          )}
        </div>
        <Paper doc={doc} thermal={mode === 'th'} w={w} tpl={tpl} />
      </div>
      <div className="ob-pv__ft">
        <QuietSelect label="القالب" value={tpl} options={TPLS} onChange={setTpl} up className="ob-pv__tpl" />
        <div className="ob-pv__ftb">
          <button type="button" className="btn" onClick={() => window.print()}><Ico.print size={20} />طباعة</button>
          <button type="button" className="btn" onClick={() => toast.ok('الملف اتنزّل', { sub: `${doc.no}.pdf` })}><Ico.download size={20} />تنزيل PDF</button>
        </div>
      </div>
    </aside>
  )
}

/* ورقة الفاتورة — مبسطة للعميل النقدي وضريبية لعميل له رقم ضريبي */
export function Paper({ doc, thermal, w, tpl }) {
  const simplified = !doc.party?.vat
  const brand = getBrand()
  const tt = doc.title || (simplified ? ['فاتورة ضريبية مبسطة', 'Simplified Tax Invoice'] : ['فاتورة ضريبية', 'Tax Invoice'])
  return (
    <div className={`ob-paper ${thermal ? `th w${w}` : 'a4'}${tpl && tpl !== 'std' ? ` tpl-${tpl}` : ''}`} dir="rtl">
      {!thermal && (
        <div className="p-row" style={{ alignItems: 'center', marginBottom: 8 }}>
          <img className="p-logo" src={brand.logo || DATA.org.logo} alt="" />
          <span className="p-sm">{doc.no}</span>
        </div>
      )}
      <h4>{tt[0]} / {tt[1]}</h4>
      <div className={thermal ? '' : 'p-row'} style={{ gap: 8 }}>
        <div className="p-box">
          <b>{DATA.org.nameAr}</b><br />
          <span className="p-sm">الرقم الضريبي <span className="num">{DATA.org.vat}</span></span><br />
          <span className="p-sm">س.ت <span className="num">{DATA.org.cr}</span></span>
        </div>
        <div className="p-box" style={thermal ? { marginTop: 6 } : undefined}>
          <b>{doc.party?.ar || 'عميل نقدي'}</b><br />
          {doc.party?.vat && <><span className="p-sm">الرقم الضريبي <span className="num">{doc.party.vat}</span></span><br /></>}
          <span className="p-sm">رقم الفاتورة <span className="num">{doc.no}</span></span><br />
          <span className="p-sm">التاريخ <span className="num">{fmtDate(doc.date)}</span>
            {doc.due && <> · الاستحقاق <span className="num">{fmtDate(doc.due)}</span></>}</span>
        </div>
      </div>
      <table>
        <thead><tr><th>البند</th><th className="n">الكمية</th>{!thermal && <th className="n">السعر</th>}<th className="n">المبلغ</th></tr></thead>
        <tbody>
          {doc.lines.length === 0 && <tr><td colSpan={thermal ? 3 : 4} className="p-sm">—</td></tr>}
          {doc.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.ar || 'بند'}</td>
              <td className="n num">{l.qty}</td>
              {!thermal && <td className="n num">{fmtMoney(l.price)}</td>}
              <td className="n num">{fmtMoney(l.qty * l.price * (1 - (l.disc || 0) / 100))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-tot">
        <div><span>المجموع الفرعي</span><span className="num">{fmtMoney(doc.sub)}</span></div>
        {doc.disc > 0 && <div><span>الخصم</span><span className="num">{fmtMoney(-doc.disc)}</span></div>}
        <div><span>ضريبة القيمة المضافة 15%</span><span className="num">{fmtMoney(doc.vat)}</span></div>
        <div className="g"><span>الإجمالي</span><Amt v={doc.total} /></div>
      </div>
      {doc.notes && <p className="p-sm" style={{ marginTop: 10 }}>{doc.notes}</p>}
      {doc.zatcaOk ? <div className="p-qr" aria-label="رمز الاستجابة السريعة" /> :
        <p className="p-sm" style={{ textAlign: 'center', marginTop: 12 }}>رمز الاستجابة السريعة بيظهر بعد قبول الهيئة</p>}
    </div>
  )
}

/* مستند المعاينة من فاتورة محفوظة */
export function paperOfDoc(v, title, opts = {}) {
  const d = paperOfInvoice(v)
  return { ...d, title, zatcaOk: opts.qr ? v.zatca === 'ok' : false, total: opts.total ?? v.total }
}
export function paperOfInvoice(v) {
  const lines = DATA.linesOf(v).map((l) => ({ ar: l.ar, qty: l.qty, price: l.price ?? +(l.total / l.qty).toFixed(2) }))
  const sub = lines.reduce((a, l) => a + l.qty * l.price, 0)
  const vat = +(sub * 0.15).toFixed(2)
  return { no: v.no, date: v.date, due: v.due, party: v.c, lines, sub, disc: 0, vat, total: v.total, zatcaOk: v.zatca === 'ok' }
}

/* ============================================================
   ★ كارت القوايم على الموبايل (طلب مهاب ٢٢ سبتمبر) — شكل واحد:
   سطر فوق: تحديد · الرقم/الاسم وتحته الطرف · المبلغ وتحته وصفه
   سطر تحت: الحالات · معلومة التاريخ … والأكشنز على الطرف.
   الضغط على الكارت = معاينة (زي الضغط على الصف في الديسكتوب).
   ============================================================ */
export function MCard({ sel, onSel, selLabel, title, sub, chips, amount, amountSub, meta, actions, onOpen, on }) {
  return (
    <div className={`ob-mcard${sel ? ' is-sel' : ''}${on ? ' is-on' : ''}`} role="button" tabIndex={0}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.() }}>
      <div className="ob-mcard__top">
        {onSel && <span className="ob-mcard__chk" onClick={(e) => e.stopPropagation()}><Check on={sel} onChange={onSel} label={selLabel} /></span>}
        <div className="ob-mcard__id"><b>{title}</b>{sub && <span>{sub}</span>}</div>
        {amount != null && <div className="ob-mcard__amt">{amount}{amountSub && <small>{amountSub}</small>}</div>}
      </div>
      {(chips || meta || actions) && (
        <div className="ob-mcard__bot">
          <div className="ob-mcard__info">
            {chips && <span className="ob-mcard__chips">{chips}</span>}
            {meta && <span className="ob-mcard__meta">{meta}</span>}
          </div>
          {actions && <div className="ob-mcard__acts" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        </div>
      )}
    </div>
  )
}

/* ★ فلاتر الموبايل: أيقونة جنب البحث بتفتح كل الفلاتر في شيت من تحت */
export function FilterBtn({ n = 0, onClick }) {
  return (
    <button type="button" className="ob-fbtn" onClick={onClick} aria-label={n ? `الفلاتر (${n} شغّالة)` : 'الفلاتر'} title="الفلاتر">
      <Ico.filter size={20} />{n > 0 && <span className="ob-fbtn__n num">{n}</span>}
    </button>
  )
}
export function FilterSheet({ onClose, onReset, count, children }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="ob-more ob-fsheet" role="dialog" aria-modal="true" aria-label="الفلاتر">
      <motion.div className="ob-more__scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} />
      <motion.div className="ob-more__panel" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
        <span className="ob-more__grab" aria-hidden="true" />
        <div className="ob-more__hd">
          <h2>الفلاتر</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="إغلاق"><Ico.close size={20} /></button>
        </div>
        <div className="ob-more__body ob-fsheet__body">{children}</div>
        <div className="ob-fsheet__ft">
          <button type="button" className="btn" disabled={!count} onClick={onReset}>مسح الفلاتر</button>
          <button type="button" className="btn btn--primary" onClick={onClose}>عرض النتائج</button>
        </div>
      </motion.div>
    </div>
  )
}

/* ★ الترتيب على الموبايل: أيقونة جنب البحث بتفتح الاختيارات (درج من تحت) */
export function SortBtn({ value, options, onChange, def }) {
  const p = usePop()
  const changed = def != null && value !== def
  return (
    <span className="ob-picker ob-sortbtn" ref={p.ref}>
      <button type="button" className={`ob-fbtn${changed ? ' is-on' : ''}`} aria-haspopup="listbox" aria-expanded={p.open}
        onClick={p.toggle} aria-label="الترتيب" title="الترتيب">
        <Ico.sort size={20} />{changed && <span className="ob-fbtn__dot" />}
      </button>
      {p.open && (
        <div className="ob-menu is-end" role="listbox" aria-label="الترتيب">
          <div className="ob-menu__h">الترتيب</div>
          {options.map((o) => (
            <button key={o.id} type="button" role="option" aria-selected={o.id === value} className="ob-menu__i"
              onClick={() => { onChange(o.id); p.setOpen(false) }}>
              <span style={{ flex: 1 }}>{o.label}</span>{o.id === value && <Ico.check size={16} />}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
