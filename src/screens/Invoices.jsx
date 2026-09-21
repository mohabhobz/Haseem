import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader, UsageLine } from '../components/layout.jsx'
import { useSelection } from '../components/table.jsx'
import { Ico } from '../components/icons.jsx'
import { docText } from '../components/pagefilter.jsx'
import { fmtDate, daysFrom } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import { toast } from '../components/feedback.jsx'
import { Drawer } from '../components/drawer.jsx'
import { SelectField } from '../components/selectfield.jsx'
import {
  Amt, Chip, InvChips, invKey, invNet, invRemaining, invLateDays, INV_LIVE,
  QuietSelect, usePop, Check, Alert, PaymentModal, PreviewPanel, paperOfInvoice,
} from '../components/ob.jsx'

/* ============================================================
   فواتير المبيعات — Option B · Elevate (handoff القايمة v1.0).

   اتبدّلت كروت «بالحرف» (دوك ١٩) بجدول مضغوط بقرار الكلاينت
   (قرار ٠-٩). اللي اتغيّر عن اللي قبله:
   • صف واحد لكل فاتورة · أكشن سياقي واحد soft · الباقي ورا ⋮
   • شارة دفع واحدة لكل صف (List §5) — «صادر» مش شارة
   • الصف المتأخر: #FFFAF9 + شريط أحمر ٣px (مش برواز)
   • المعاينة لوحة جانبية والجدول يتضغط جنبها
   • الترقيم 10/25/50 بدل القايمة المتصلة
   ============================================================ */

const PILLS = [
  { id: 'all',     label: 'الكل' },
  { id: 'draft',   label: 'مسودة',      dot: '#948B82' },
  { id: 'unpaid',  label: 'غير مدفوعة', dot: '#F59E0B' },
  { id: 'overdue', label: 'متأخرة',     dot: '#EF4444' },
  { id: 'paid',    label: 'مدفوعة',     dot: '#22C55E' },
  { id: 'sched',   label: 'مجدولة',     dot: '#3B82F6' },
]
const pillTest = (id, v) => id === 'all' ? true : id === 'sched' ? !!v.rec : invKey(v) === id

const PERIODS = [
  { id: 'd30',  label: 'آخر 30 يومًا', days: 30 },
  { id: 'd90',  label: 'آخر 90 يومًا', days: 90 },
  { id: 'd180', label: 'آخر 180 يومًا', days: 180 },
  { id: 'y',    label: 'السنة الحالية' },
  { id: 'all',  label: 'كل الفترات' },
]
const inPer = (v, id) => {
  if (id === 'all' || !v.date) return true
  const d = new Date(v.date), t = new Date(DATA.TODAY)
  if (id === 'y') return d.getFullYear() === t.getFullYear()
  const p = PERIODS.find((x) => x.id === id)
  return (t - d) / 86400000 <= p.days
}

const SORTS = [
  { id: 'date-desc',  label: 'التاريخ: الأحدث أولاً', cmp: (a, b) => String(b.date).localeCompare(a.date) },
  { id: 'date-asc',   label: 'التاريخ: الأقدم أولاً', cmp: (a, b) => String(a.date).localeCompare(b.date) },
  { id: 'amt-desc',   label: 'المبلغ: من الأعلى',     cmp: (a, b) => invNet(b) - invNet(a) },
  { id: 'amt-asc',    label: 'المبلغ: من الأدنى',     cmp: (a, b) => invNet(a) - invNet(b) },
  { id: 'due-asc',    label: 'الاستحقاق: الأقرب أولاً', cmp: (a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999')) },
]

/* الباقة — للعرض (List §6-6). «حد الباقة» بيتجرّب من ?plan=limit */
const PLAN = { name: 'الفوترة', used: 118, limit: 300 }

/* العرض المتاح للجدول → جدول كامل / مضغوط / كروت (List §4) */
function useAvail(pv, ref) {
  /* ★ العرض الفعلي للكارت (ResizeObserver) — مش حساب من عرض الشاشة:
     السايدبار ممكن يكون ٧٦ أو ٢٦٠، والمعاينة ٥٦٠ أو ٤٤٠ */
  const [w, setW] = useState(1200)
  useEffect(() => {
    const el = ref?.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [pv, ref])
  return w
}

export default function Invoices() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState('inv')
  const [pill, setPill] = useState(params.get('state') || 'all')
  const [per, setPer] = useState('y')
  const [cust, setCust] = useState(params.get('cust') || 'all')
  const [sort, setSort] = useState('date-desc')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [peek, setPeek] = useState(null)
  const [pay, setPay] = useState(null)
  const { selected, toggle, selectAll, clear } = useSelection()
  const boxRef = useRef(null)
  const limitHit = params.get('plan') === 'limit'
  const [loading, setLoading] = useState(params.get('state') === 'loading')
  useEffect(() => { if (!loading) return; const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t) }, [loading])

  const all = useDocs('invoices')
  const emptyAll = params.get('state') === 'empty'
  const base = emptyAll ? [] : all

  /* «المزيد» — الأبعاد الإضافية في دراور (الفرع · المندوب · المستودع · مركز التكلفة) */
  const ADV = [
    { id: 'branch', label: 'الفرع', opts: DATA.branches.map((x) => ({ id: x.id, label: x.ar })), of: (v) => DATA.branchOfDoc(v.no)?.id },
    { id: 'rep', label: 'المندوب', opts: DATA.reps.map((x) => ({ id: x.id, label: x.ar })), of: (v) => DATA.repOfDoc(v.no)?.id },
    { id: 'wh', label: 'المستودع', opts: DATA.warehouses.map((x) => ({ id: x.id, label: x.ar })), of: (v) => DATA.whOf(v.no)?.id },
    { id: 'cc', label: 'مركز التكلفة', opts: DATA.costCenters.map((x) => ({ id: x.id, label: x.ar })), of: (v) => DATA.ccOfDoc(v.no)?.id },
  ]
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({})
  const advN = ADV.filter((f) => adv[f.id]).length

  const CUSTS = [{ id: 'all', label: 'كل العملاء' }, ...DATA.customers.map((c) => ({ id: c.id, label: c.ar }))]

  const scoped = useMemo(() => base
    .filter((v) => inPer(v, per))
    .filter((v) => cust === 'all' || v.c?.id === cust)
    .filter((v) => ADV.every((f) => !adv[f.id] || f.of(v) === adv[f.id]))
    .filter((v) => !q.trim() || docText(v).includes(q.trim().toLowerCase())), [base, per, cust, adv, q])

  const counts = Object.fromEntries(PILLS.map((p) => [p.id, scoped.filter((v) => pillTest(p.id, v)).length]))
  const rows = useMemo(() => {
    const cmp = (SORTS.find((s) => s.id === sort) || SORTS[0]).cmp
    return scoped.filter((v) => pillTest(pill, v)).sort(cmp)
  }, [scoped, pill, sort])

  const pages = Math.max(1, Math.ceil(rows.length / size))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * size, cur * size)
  const allOn = shown.length > 0 && shown.every((v) => selected.has(v.no))
  const selRows = all.filter((v) => selected.has(v.no))
  const payable = selRows.filter((v) => invRemaining(v) > 0.009)

  const avail = useAvail((peek ? 'p' : '') + tab, boxRef)
  const layout = avail < 600 ? 'cards' : (peek || avail < 860) ? 'compact' : 'full'

  const reset = () => { setPill('all'); setPer('all'); setCust('all'); setAdv({}); setQ(''); setPage(1) }
  const filtered = pill !== 'all' || per !== 'y' || cust !== 'all' || advN > 0 || q.trim()

  /* الأوامر — كلها بتروح لـ lib/actions.js (نقطة الربط مع الـAPI) */
  const run = (id, v) => {
    switch (id) {
      case 'view':  return setPeek(v.no)
      case 'open':  return nav('/sales/invoices/' + v.no)
      case 'edit':  return nav('/sales/invoices/new?draft=' + v.no)
      case 'issue': return ACT.issueDoc('invoices', v)
      case 'pay':   return setPay(v)
      case 'pdf':   return ACT.downloadPdf('invoices', v)
      case 'wa':    return ACT.sendWhatsApp('invoices', v)
      case 'mail':  return ACT.sendEmail('invoices', v)
      case 'dup':   toast.ok('اتعملت نسخة كمسودة', { sub: 'من ' + v.no }); return nav('/sales/invoices/new')
      case 'cn':    return nav('/sales/credit-notes/new?src=' + v.no)
      case 'resub': return ACT.resubmitZatca('invoices', v)
      case 'sched': return toast.info('جدولة ' + v.no, { sub: 'الفاتورة هتتكرر تلقائيًا وتظهر في «الفواتير المجدولة»' })
      case 'cancel':return ACT.cancelDoc('invoices', v)
      case 'del':   return ACT.deleteDraft('invoices', v)
      default: return undefined
    }
  }
  const bulk = (label) => ACT.bulkAction(label, 'invoices', [...selected]).then((ok) => ok !== false && clear())

  const pv = peek && all.find((v) => v.no === peek)
  const aside = pv && (
    <PreviewPanel
      title={pv.no}
      chip={<InvChips v={pv} />}
      doc={paperOfInvoice(pv)}
      onClose={() => setPeek(null)}
      actions={<>
        <ContextBtn v={pv} run={run} big />
        <button type="button" className="btn" onClick={() => run('mail', pv)} disabled={!INV_LIVE.includes(pv.status)}><Ico.send size={20} />إرسال</button>
        <button type="button" className="btn" onClick={() => run('open', pv)}><Ico.file size={20} />عرض الفاتورة</button>
      </>} />
  )

  return (
    <AppShell aside={aside}>
      <PageHeader title="فواتير المبيعات"
        sub="إدارة الفواتير وتتبع المستحقات"
        usage={<UsageLine used={limitHit ? 50 : PLAN.used} limit={limitHit ? 50 : PLAN.limit} />}
        actions={
          <button type="button" className="btn btn--primary ob-hide-sm" disabled={limitHit}
            onClick={() => nav('/sales/invoices/new')}><Ico.plus size={20} />إنشاء فاتورة مبيعات</button>
        } />

      {limitHit && (
        <div style={{ marginBottom: 12 }}>
          <Alert tone="warn" title="وصلت إلى حد باقة الفوترة هذا الشهر (50 فاتورة)."
            actions={<button type="button" className="ob-link" onClick={() => toast.info('ترقية الباقة')}><Ico.lock size={16} />ترقية الباقة</button>}>
            <small>يمكنك عرض الفواتير وتسجيل الدفعات، وإنشاء فواتير جديدة يبدأ من الشهر القادم أو بترقية الباقة.</small>
          </Alert>
        </div>
      )}

      <div className="ob-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'inv'} onClick={() => setTab('inv')}>
          فواتير المبيعات<small><span className="num">{base.length}</span></small></button>
        <button type="button" role="tab" aria-selected={tab === 'sch'} onClick={() => setTab('sch')}>
          الفواتير المجدولة<small><span className="num">{DATA.scheduled.length}</span></small></button>
      </div>

      {tab === 'sch' ? <Scheduled nav={nav} /> : (
        <div className="ob-card" data-component="InvoiceList" ref={boxRef}>
          {/* ---------- الفلاتر (List §3) ---------- */}
          <div className="ob-fbar">
            <label className="search">
              <Ico.search size={20} />
              <input value={q} placeholder="ابحث برقم الفاتورة أو اسم العميل" aria-label="بحث"
                onChange={(e) => { setQ(e.target.value); setPage(1) }} />
              {q && <button type="button" className="search__x" aria-label="مسح البحث" onClick={() => setQ('')}><Ico.close size={16} /></button>}
            </label>
            <div className="ob-pills" role="group" aria-label="الحالة">
              {PILLS.map((p) => (
                <button key={p.id} type="button" aria-pressed={pill === p.id} onClick={() => { setPill(p.id); setPage(1) }}>
                  {p.dot && <i style={{ background: p.dot }} />}{p.label}<small>{counts[p.id]}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="ob-fbar" style={{ marginTop: -4 }}>
            <QuietSelect label="الفترة" value={per} options={PERIODS} onChange={(v) => { setPer(v); setPage(1) }} />
            <QuietSelect label="العميل" value={cust} options={CUSTS} onChange={(v) => { setCust(v); setPage(1) }} />
            <QuietSelect label="الترتيب" value={sort} options={SORTS} onChange={setSort} />
            <span className="ob-sp" />
            <button type="button" className="btn btn--ghost" aria-expanded={advOpen} onClick={() => setAdvOpen(true)}>
              <Ico.columns size={20} />المزيد{advN > 0 && <Chip tone="info">{advN}</Chip>}
            </button>
          </div>

          {/* ---------- الأوامر الجماعية ---------- */}
          {selected.size > 0 && (
            <div className="ob-bulk" role="region" aria-label="الأوامر الجماعية">
              <b><span className="num">{selected.size}</span> محددة</b>
              <button type="button" className="btn" onClick={() => bulk('إرسال بالبريد')}><Ico.send size={20} />إرسال</button>
              <button type="button" className="btn" onClick={() => bulk('تنزيل PDF')}><Ico.download size={20} />تنزيل PDF</button>
              <button type="button" className="btn" disabled={payable.length === 0} onClick={() => bulk('تعليم كمدفوعة')}><Ico.wallet size={20} />تسجيل دفعة</button>
              <BulkMore bulk={bulk} />
              <button type="button" className="iconbtn" aria-label="إلغاء التحديد" onClick={clear}><Ico.close size={20} /></button>
            </div>
          )}

          {loading ? <Skeleton /> : base.length === 0 ? (
            <div className="ob-emptybig">
              <Ico.invoice size={32} />
              <h3>لا توجد فواتير بعد</h3>
              <p>أنشئ أول فاتورة وستظهر هنا مع حالتها ومستحقاتها.</p>
              <button type="button" className="btn btn--primary" onClick={() => nav('/sales/invoices/new')}><Ico.plus size={20} />إنشاء فاتورة مبيعات</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="ob-emptybig">
              <Ico.search size={32} />
              <h3>لا توجد فواتير تطابق البحث</h3>
              <p>جرّب كلمة أخرى أو امسح الفلاتر.</p>
              <button type="button" className="btn" onClick={reset}>مسح الفلاتر</button>
            </div>
          ) : layout === 'cards' ? (
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(0,1fr)' }}>
              <label className="ob-row" style={{ minHeight: 44 }}>
                <Check on={allOn} onChange={(c) => selectAll(c, shown.map((v) => v.no))} label="تحديد كل الصفحة" />
                <span className="ob-muted" style={{ fontSize: 13 }}>تحديد كل الصفحة</span>
              </label>
              {shown.map((v, i) => (
                <InvCard key={v.no} v={v} run={run} sel={selected.has(v.no)} onSel={() => toggle(v.no)} up={i >= shown.length - 3} />
              ))}
            </div>
          ) : (
            <div className="ob-tblwrap">
              <table className="ob-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}><Check on={allOn} onChange={(c) => selectAll(c, shown.map((v) => v.no))} label="تحديد كل الصفحة" /></th>
                    {layout === 'full' ? <>
                      <th>الفاتورة</th><th>العميل</th><th>التاريخ</th><th>الاستحقاق</th><th>الحالة</th>
                      <th className="n">المبلغ</th><th className="n">المتبقي</th>
                    </> : <>
                      <th>الفاتورة</th><th>الاستحقاق</th><th>الحالة</th><th className="n">المتبقي</th>
                    </>}
                    <th><span className="ob-sr">الأوامر</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((v, i) => (
                    <InvRow key={v.no} v={v} run={run} compact={layout === 'compact'}
                      sel={selected.has(v.no)} onSel={() => toggle(v.no)} on={peek === v.no}
                      up={i >= shown.length - 3} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="ob-pager">
              <span>عرض <span className="num">{(cur - 1) * size + 1}–{Math.min(cur * size, rows.length)}</span> من <span className="num">{rows.length}</span></span>
              <QuietSelect label="" value={size} up
                options={[10, 25, 50].map((n) => ({ id: n, label: `${n} في الصفحة` }))}
                onChange={(n) => { setSize(n); setPage(1) }} />
              <span className="ob-pager__sp" />
              <button type="button" className="btn" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>
                <Ico.back size={20} className="ob-dir" />السابق</button>
              <span className="num">{cur} / {pages}</span>
              <button type="button" className="btn" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>
                التالي<Ico.arrowEnd size={20} className="ob-dir" /></button>
            </div>
          )}
        </div>
      )}

      {/* بار تحتاني على الموبايل */}
      <div className="ob-stickybar">
        <button type="button" className="btn btn--primary" disabled={limitHit} onClick={() => nav('/sales/invoices/new')}>
          <Ico.plus size={20} />إنشاء فاتورة مبيعات</button>
      </div>

      <Drawer open={advOpen} onClose={() => setAdvOpen(false)} title="المزيد من الفلاتر" meta="أبعاد إضافية على نفس القائمة"
        footer={<div className="ob-row" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn" onClick={() => setAdv({})}>مسح الفلاتر</button>
          <button type="button" className="btn btn--primary" onClick={() => setAdvOpen(false)}>عرض <span className="num">{rows.length}</span> فاتورة</button>
        </div>}>
        <div style={{ display: 'grid', gap: 14 }}>
          {ADV.map((f) => (
            <label key={f.id} className="fld">
              <span className="fld__l">{f.label}</span>
              <SelectField value={adv[f.id] || ''} placeholder="الكل" ariaLabel={f.label}
                options={[{ id: '', label: 'الكل' }, ...f.opts]}
                onChange={(val) => { setAdv((a) => ({ ...a, [f.id]: val })); setPage(1) }} />
            </label>
          ))}
        </div>
      </Drawer>

      {pay && <PaymentModal v={pay} onClose={() => setPay(null)} />}
    </AppShell>
  )
}

/* ---------- الأكشن السياقي: تسجيل دفعة / إصدار / ولا حاجة ---------- */
function ContextBtn({ v, run, big, icon }) {
  const cls = big ? 'btn btn--primary' : 'btn btn--soft'
  if (v.status === 'draft')
    return <button type="button" className={cls} onClick={(e) => { e.stopPropagation(); run('issue', v) }}>{(big || icon) && <Ico.file size={20} />}إصدار</button>
  if (invRemaining(v) > 0.009)
    return <button type="button" className={cls} onClick={(e) => { e.stopPropagation(); run('pay', v) }}>{(big || icon) && <Ico.wallet size={20} />}تسجيل دفعة</button>
  return big ? null : <span className="ob-actph" aria-hidden="true" />
}

/* ---------- قايمة ⋮ (List §4) ---------- */
function RowMenu({ v, run, up }) {
  const p = usePop()
  const draft = v.status === 'draft'
  const issued = INV_LIVE.includes(v.status)
  const go = (id) => (e) => { e.stopPropagation(); p.setOpen(false); run(id, v) }
  return (
    <span className="ob-picker" ref={p.ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="iconbtn" aria-label={'أوامر ' + v.no} aria-haspopup="menu" aria-expanded={p.open} onClick={p.toggle}>
        <Ico.dotsV size={20} />
      </button>
      {p.open && (
        <div className={`ob-menu is-end${up ? ' is-up' : ''}`} role="menu" style={{ minWidth: 220 }}>
          <button type="button" role="menuitem" className="ob-menu__i" onClick={go('view')}><Ico.eye size={20} />عرض</button>
          {draft && <button type="button" role="menuitem" className="ob-menu__i" onClick={go('edit')}><Ico.edit size={20} />تعديل</button>}
          <button type="button" role="menuitem" className="ob-menu__i" onClick={go('pdf')} disabled={v.zatca !== 'ok'}><Ico.download size={20} />تنزيل PDF</button>
          {issued && <button type="button" role="menuitem" className="ob-menu__i" onClick={go('wa')}><Ico.whatsapp size={20} />إرسال عبر واتساب</button>}
          {issued && <button type="button" role="menuitem" className="ob-menu__i" onClick={go('mail')}><Ico.mail size={20} />إرسال بالبريد</button>}
          <button type="button" role="menuitem" className="ob-menu__i" onClick={go('dup')}><Ico.copy size={20} />إنشاء نسخة</button>
          {issued && <button type="button" role="menuitem" className="ob-menu__i" onClick={go('cn')}><Ico.receivable size={20} />إشعار دائن</button>}
          {v.zatca === 'bad' && <button type="button" role="menuitem" className="ob-menu__i" onClick={go('resub')}><Ico.retry size={20} />إعادة الإرسال للهيئة</button>}
          {issued && <button type="button" role="menuitem" className="ob-menu__i" onClick={go('sched')}><Ico.calendar size={20} />جدولة الفاتورة</button>}
          {(issued || draft) && <hr />}
          {issued && invRemaining(v) > 0.009 && <button type="button" role="menuitem" className="ob-menu__i ob-menu__i--danger" onClick={go('cancel')}><Ico.ban size={20} />إلغاء الفاتورة</button>}
          {draft && <button type="button" role="menuitem" className="ob-menu__i ob-menu__i--danger" onClick={go('del')}><Ico.trash size={20} />حذف المسودة</button>}
        </div>
      )}
    </span>
  )
}

function BulkMore({ bulk }) {
  const p = usePop()
  return (
    <span className="ob-picker" ref={p.ref}>
      <button type="button" className="iconbtn" aria-label="أوامر جماعية أخرى" aria-expanded={p.open} onClick={p.toggle}><Ico.dotsV size={20} /></button>
      {p.open && (
        <div className="ob-menu is-end" role="menu" style={{ minWidth: 200 }}>
          <button type="button" role="menuitem" className="ob-menu__i" onClick={() => { p.setOpen(false); bulk('تصدير CSV') }}><Ico.download size={20} />تصدير CSV</button>
          <button type="button" role="menuitem" className="ob-menu__i" onClick={() => { p.setOpen(false); bulk('إعادة الإرسال للهيئة') }}><Ico.retry size={20} />إعادة الإرسال للهيئة</button>
          <hr />
          <button type="button" role="menuitem" className="ob-menu__i ob-menu__i--danger" onClick={() => { p.setOpen(false); bulk('إلغاء المسودات') }}><Ico.ban size={20} />إلغاء المسودات</button>
        </div>
      )}
    </span>
  )
}

/* ---------- عمود الاستحقاق ---------- */
function Due({ v }) {
  if (v.status === 'draft') return <span className="ob-muted">لم تُرسل بعد</span>
  if (!v.due) return <span className="ob-muted">—</span>
  const late = invLateDays(v)
  return (
    <div>
      <span className="num" style={late ? { color: '#B91C1C', fontWeight: 500 } : undefined}>{fmtDate(v.due)}</span>
      {late > 0 && <div className="ob-sub" style={{ color: '#B91C1C' }}>متأخرة <span className="num">{late}</span> {late > 10 ? 'يومًا' : late > 2 ? 'أيام' : late === 2 ? 'يومان' : 'يوم'}</div>}
    </div>
  )
}

function InvRow({ v, run, compact, sel, onSel, on, up }) {
  const late = invLateDays(v) > 0
  const rem = invRemaining(v)
  const cls = [late && 'is-late', (sel || on) && 'is-sel', v.status === 'draft' && 'is-draft'].filter(Boolean).join(' ')
  return (
    <tr data-row className={cls} onClick={() => run('view', v)}>
      <td onClick={(e) => e.stopPropagation()}><Check on={sel} onChange={onSel} label={'تحديد ' + v.no} /></td>
      {compact ? (
        <td>
          <div className="ob-strong num">{v.no}</div>
          <div className="ob-sub" style={{ color: 'var(--ink-base)' }}>{v.c?.ar}</div>
        </td>
      ) : <>
        <td>
          <div className="ob-strong num">{v.no}</div>
          {v.rec && <div className="ob-sub">من الجدولة · <span className="num">{v.rec}</span></div>}
        </td>
        <td style={{ maxWidth: 260 }}><span style={{ fontWeight: 500, color: 'var(--ink-strong)' }}>{v.c?.ar}</span></td>
        <td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDate(v.date)}</td>
      </>}
      <td style={{ whiteSpace: 'nowrap' }}><Due v={v} /></td>
      <td><InvChips v={v} /></td>
      {!compact && <td className="n"><Amt v={invNet(v)} /></td>}
      <td className="n">{v.status === 'draft' || !INV_LIVE.includes(v.status) ? <span className="ob-muted">—</span> : <Amt v={rem} bold className="ob-strong" />}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="ob-acts">
          {!compact && <ContextBtn v={v} run={run} />}
          <button type="button" className="iconbtn" aria-label={'عرض ' + v.no} title="عرض" onClick={() => run('view', v)}><Ico.eye size={20} /></button>
          <RowMenu v={v} run={run} up={up} />
        </div>
      </td>
    </tr>
  )
}

/* ---------- كارت < 640px (List §4) ---------- */
function InvCard({ v, run, sel, onSel, up }) {
  const late = invLateDays(v) > 0
  return (
    <div className="ob-card" style={{ padding: '12px 14px', display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0,1fr)', minWidth: 0,
      ...(late ? { borderInlineStart: '3px solid #EF4444', background: '#FFFAF9' } : {}) }}
      onClick={() => run('view', v)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') run('view', v) }}>
      <div className="ob-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="ob-row" style={{ flexWrap: 'nowrap', minWidth: 0, flex: '1 1 160px' }} onClick={(e) => e.stopPropagation()}>
          <Check on={sel} onChange={onSel} label={'تحديد ' + v.no} />
          <div style={{ minWidth: 0 }}>
            <div className="ob-strong num">{v.no}</div>
            <div className="ob-muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.c?.ar}</div>
          </div>
        </div>
        <InvChips v={v} />
      </div>
      <div className="ob-row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
        <span className="ob-muted ob-row" style={{ gap: 6, alignItems: 'baseline' }}>الاستحقاق <Due v={v} /></span>
        {INV_LIVE.includes(v.status) ? <Amt v={invRemaining(v)} className="ob-strong" /> : <span className="ob-muted">—</span>}
      </div>
      <div className="ob-row" style={{ flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
        {(v.status === 'draft' || invRemaining(v) > 0.009) && <div style={{ flex: 1, display: 'flex' }}><ContextBtn v={v} run={run} icon /></div>}
        <button type="button" className="btn" style={{ flex: 1 }} onClick={() => run('view', v)}><Ico.eye size={20} />عرض</button>
        <RowMenu v={v} run={run} up={up} />
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="بيحمّل الفواتير">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', height: 64, borderBottom: '1px solid var(--border-faint)' }}>
          <span className="ob-skel" style={{ width: 20 }} /><span className="ob-skel" style={{ width: 110 }} />
          <span className="ob-skel" style={{ width: 180 }} /><span className="ob-skel" style={{ width: 90 }} />
          <span className="ob-skel" style={{ flex: 1 }} /><span className="ob-skel" style={{ width: 100 }} />
        </div>
      ))}
    </div>
  )
}

/* ---------- الفواتير المجدولة — نفس الجدول (List §6-7) ---------- */
function Scheduled({ nav }) {
  const rows = DATA.scheduled
  return (
    <div className="ob-card">
      <div className="ob-tblwrap">
        <table className="ob-tbl">
          <thead><tr><th>الجدولة</th><th>العميل</th><th>التكرار</th><th>التاريخ القادم</th><th>الحالة</th><th className="n">المبلغ</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.no}>
                <td><div className="ob-strong num">{r.no}</div><div className="ob-sub">آخر فاتورة <span className="num">{fmtDate(r.last)}</span></div></td>
                <td><span style={{ fontWeight: 500, color: 'var(--ink-strong)' }}>{r.c.ar}</span></td>
                <td>{r.every}{r.left != null && <div className="ob-sub">باقي <span className="num">{r.left}</span></div>}</td>
                <td className="num">{fmtDate(r.next)}</td>
                <td><Chip tone="info">مجدولة</Chip></td>
                <td className="n"><Amt v={r.total} /></td>
                <td><div className="ob-acts">
                  <button type="button" className="btn btn--soft" onClick={() => toast.info('تعديل الجدولة ' + r.no)}>تعديل</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
