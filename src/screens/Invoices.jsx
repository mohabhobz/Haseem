import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { RowMenu, docMenu } from '../components/rowmenu.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import { Pick, DateRange, inPeriod, periodRange, docText } from '../components/pagefilter.jsx'
import { daysFrom, TODAY, fmtMoney } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import { toast } from '../components/feedback.jsx'
import { PrintPreview } from '../components/printpreview.jsx'
import { Drawer } from '../components/drawer.jsx'
import { SelectField } from '../components/selectfield.jsx'

/* ============================================================
   فواتير المبيعات — **منقولة من سيستم الكلاينت بالحرف**.

   المرجع: التصوير المباشر من app-staging.haseem.com (دوك ١٩).
   مش من التدقيق المكتوب — ده اللي غلّطنا أول مرة.

   ★ ليه مش جدول؟ لأن سيستمهم مش جدول. هو **قايمة كروت**:
   كل فاتورة كارت مستقل بمسافة بينه وبين اللي بعده، وجواه
   تلات كتل (من اليمين للشمال):

     يمين  — رقم الفاتورة وجنبه شارات الحالة، تحته العميل
             والمرجع، وتحتهم المستودع
     النص  — عنقود الأوامر: تسجيل دفعة · تنزيل PDF · إرسال ▾ · 👁
     شمال  — المبلغ كبير، فوقه الأصلي مشطوب لو اتقيّد عليه إشعار،
             وتحته الاستحقاق. وبعده ⋮ على الحافة.

   ★ اتنقلوا زي ما هما عشان مش تفاصيل:
   ١) **الكارت المتأخر بيتلوّن** — إطار وخلفية وردية خفيفة.
      ده اللي بيخلّي المتأخرات تبان وإنت بتنزل بعينك.
   ٢) **حالة المستند وحالة الدفع شارتين منفصلتين**. «صادر» +
      «مدفوعة جزئياً» + «متأخر» تلاتة مع بعض على نفس الكارت،
      لأنهم تلات أسئلة مختلفة — والأولى زرقا والتانية خضرا.
   ٣) **الأمر الرئيسي بيتغيّر مع الحالة** — المسودة «إصدار
      الفاتورة»، والصادرة اللي عليها متبقي «تسجيل دفعة»،
      والمدفوعة بالكامل مالهاش أمر رئيسي أصلًا.

   ★ وحاجة السيستم مش بيعرضها: **حالة الهيئة**. الفاتورة
   المرفوضة شكلها في القايمة زي أي فاتورة صادرة. سايبينها زي
   الأصل عشان «بالحرف» — وده بند مفتوح للكلاينت.
   ============================================================ */

const LIVE = ['issued', 'partial', 'overdue', 'paid']

/* ---------- البُعد الأول: حالة المستند ---------- */
function docState(v) {
  if (v.status === 'draft') return { id: 'draft', ar: 'مسودة', tone: 'neutral' }
  if (v.status === 'cancelled' || v.status === 'void')
    return { id: 'cancelled', ar: 'ملغي', tone: 'critical' }
  if (DATA.creditedState(v.no, v.total)) return { id: 'credited', ar: 'مقيدة بإشعار', tone: 'info' }
  return { id: 'issued', ar: 'صادر', tone: 'issued' }
}

/* ---------- البُعد التاني: حالة الدفع ----------
   مشتقة من المدفوع مقابل الإجمالي — مش حقل متخزّن، فمستحيل
   تختلف مع سجل المدفوعات. */
function payState(v) {
  if (!LIVE.includes(v.status)) return null
  if (v.paid >= v.total - 0.009) return { id: 'paid', ar: 'مدفوع', tone: 'positive' }
  if (v.paid > 0.009) return { id: 'partial', ar: 'مدفوعة جزئياً', tone: 'positive' }
  return { id: 'unpaid', ar: 'غير مدفوع', tone: 'attention' }
}

/* «متأخر» علامة منفصلة، مش حالة */
const isLate = (v) =>
  LIVE.includes(v.status) && v.paid < v.total - 0.009 && daysFrom(v.due) < 0

const STATES = [
  { id: 'all',       label: 'الحالة' },
  { id: 'draft',     label: 'مسودة',        test: (v) => docState(v).id === 'draft' },
  { id: 'issued',    label: 'صادر',         test: (v) => docState(v).id === 'issued' },
  { id: 'credited',  label: 'مقيدة بإشعار', test: (v) => docState(v).id === 'credited' },
  { id: 'cancelled', label: 'ملغي',         test: (v) => docState(v).id === 'cancelled' },
  { id: 'paid',      label: 'مدفوع',        test: (v) => payState(v)?.id === 'paid' },
  { id: 'partial',   label: 'مدفوعة جزئياً', test: (v) => payState(v)?.id === 'partial' },
  { id: 'unpaid',    label: 'غير مدفوع',    test: (v) => payState(v)?.id === 'unpaid' },
  { id: 'late',      label: 'متأخر',        test: isLate },
]

const CUSTS = [
  { id: 'all', label: 'العملاء' },
  ...DATA.customers.map((c) => ({ id: c.id, label: c.ar, test: (v) => v.c?.id === c.id })),
]

const SORTS = [
  { id: 'date-desc',  label: 'التاريخ: الأحدث أولاً', cmp: (a, b) => String(b.date).localeCompare(a.date) },
  { id: 'date-asc',   label: 'التاريخ: الأقدم أولاً', cmp: (a, b) => String(a.date).localeCompare(b.date) },
  { id: 'total-desc', label: 'المبلغ: الأعلى أولاً',  cmp: (a, b) => b.total - a.total },
  { id: 'total-asc',  label: 'المبلغ: الأقل أولاً',   cmp: (a, b) => a.total - b.total },
]

/* تاريخ الاستحقاق على الكارت بصيغة السيستم: Apr 26, 2026 */
const EN_M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dueFmt = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return EN_M[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
}
/* ★ مش toISOString — دي بتحوّل لـUTC فبترجّع اليوم اللي فات
   (٣١ ديسمبر بيطلع ٣٠). التاريخ هنا محلي، فبيتبني بالإيد. */
const isoDay = (d) =>
  d.getFullYear() + '-' +
  String(d.getMonth() + 1).padStart(2, '0') + '-' +
  String(d.getDate()).padStart(2, '0')

export default function Invoices() {
  const nav = useNavigate()
  const [tab, setTab] = useState('inv')
  const [period, setPeriod] = useState({ id: 'y' })
  const [params] = useSearchParams()
  const [state, setState] = useState(() => {
    const z = params.get('zatca')
    return z === 'bad' ? 'all' : (params.get('state') || 'all')
  })
  const [cust, setCust] = useState(params.get('cust') || 'all')
  const [sort, setSort] = useState('date-desc')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { selected, toggle, selectAll, clear } = useSelection()

  const all = useDocs('invoices')

  /* ---------- الفلاتر الإضافية ----------
     أربع أبعاد مش في الشريط الرئيسي عشان مش كل يوم بتتفلتر
     بيها. مكانها دراور — زي أي عرض معلومات في السيستم — والشريط
     بيقول كام واحدة منها شغّالة، وفوق الجدول بتبان كشارات
     تتشال بنقرة. من غير الشارات دي المستخدم ممكن ينسى إن
     الجدول مفلتر ويقرا رقم ناقص على إنه الرقم الكامل. */
  const ADV = [
    { id: 'branch', label: 'الفرع',         opts: DATA.branches.map((x) => ({ id: x.id, label: x.ar })),
      of: (v) => DATA.branchOfDoc(v.no)?.id },
    { id: 'rep',    label: 'المندوب',        opts: DATA.reps.map((x) => ({ id: x.id, label: x.ar })),
      of: (v) => DATA.repOfDoc(v.no)?.id },
    { id: 'wh',     label: 'المستودع',       opts: DATA.warehouses.map((x) => ({ id: x.id, label: x.ar })),
      of: (v) => DATA.whOf(v.no)?.id },
    { id: 'cc',     label: 'مركز التكلفة',   opts: DATA.costCenters.map((x) => ({ id: x.id, label: x.ar })),
      of: (v) => DATA.ccOfDoc(v.no)?.id },
  ]
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({})
  const advOn = ADV.filter((f) => adv[f.id])
  const advLabel = (f) => f.opts.find((o) => o.id === adv[f.id])?.label

  const rows = useMemo(() => {
    const st = STATES.find((s) => s.id === state)
    const cu = CUSTS.find((c) => c.id === cust)
    const cmp = (SORTS.find((s) => s.id === sort) || SORTS[0]).cmp
    const needle = q.trim().toLowerCase()
    return all
      .filter((v) => inPeriod(v, period, TODAY))
      .filter((v) => (st?.test ? st.test(v) : true))
      .filter((v) => (cu?.test ? cu.test(v) : true))
      .filter((v) => (needle ? docText(v).includes(needle) : true))
      .filter((v) => ADV.every((f) => !adv[f.id] || f.of(v) === adv[f.id]))
      .sort(cmp)
  }, [all, period, state, cust, sort, q, adv])

  const [PER, setPER] = useState(12)
  const pages = Math.max(1, Math.ceil(rows.length / PER))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER, cur * PER)

  /* ★ «عرض» بقى دراور جنبي فيه المستند كامل، مش تنقّل لصفحة.
     السبب: العرض **قراءة**، والقراءة ما تستاهلش تخرجك من
     القايمة وتضيّع مكانك وفلترتك. اللي عايز الصفحة الكاملة
     بأوامرها بيدوس على رقم الفاتورة نفسه. */
  const [peek, setPeek] = useState(null)
  const open = (no) => nav('/sales/invoices/' + no)
  const VAT_R = 0.15
  const peekDoc = (v) => {
    const lines = DATA.linesOf(v)
    const net = lines.reduce((a, l) => a + l.total, 0)
    return {
      no: v.no, date: v.date, due: v.due, party: v.c,
      lines: lines.map((l) => ({
        code: l.code, ar: l.ar, unit: l.unit, qty: l.qty,
        price: l.price ?? +(l.total / l.qty).toFixed(2),
        net: l.total, taxAmt: +(l.total * VAT_R).toFixed(2),
        total: +(l.total * (1 + VAT_R)).toFixed(2),
      })),
      net, tax: +(net * VAT_R).toFixed(2), total: v.total,
      bank: DATA.banks[0], zatcaOk: v.zatca === 'ok',
    }
  }

  const on = (id, v) => {
    switch (id) {
      case 'issue':    return ACT.issueDoc('invoices', v)
      case 'resubmit': return ACT.resubmitZatca('invoices', v)
      case 'pay':      return open(v.no)
      case 'email':
      case 'mail':     return ACT.sendEmail('invoices', v)
      case 'wa':       return ACT.sendWhatsApp('invoices', v)
      case 'correct':  return ACT.correctDoc('invoices', v, () => nav('/sales/invoices/new'))
      case 'view':     return open(v.no)
      case 'pdf':      return ACT.downloadPdf('invoices', v)
      case 'xml':      return ACT.downloadXml('invoices', v)
      case 'print':    return ACT.printDoc()
      case 'cn':       return nav('/sales/credit-notes/new')
      case 'cancel':   return ACT.cancelDoc('invoices', v)
      case 'schedule': return toast.info('جدولة ' + v.no,
        { sub: 'بتتكرر الفاتورة تلقائيًا — الشاشة في تبويب «الفواتير المجدولة»' })
      default: return undefined
    }
  }
  const bulk = (label) => ACT.bulkAction(label, 'invoices', [...selected]).then(clear)

  /* جدول ولا كروت — الاختيار بيفضل عبر الجلسة.
     الجدول هو الافتراضي: بيوري ضعف عدد الفواتير في نفس
     الشاشة، والمسح بالعين أسرع لما الأعمدة على خط واحد.
     والكروت باقية لأنها شكل سيستم العميل اللي اتعوّد عليه. */
  const [view, setView] = useState(() => localStorage.getItem('iv:view') || 'table')
  const pickView = (v) => { setView(v); try { localStorage.setItem('iv:view', v) } catch {} }

  const pr = periodRange(period, TODAY)
  const allOn = shown.length > 0 && shown.every((v) => selected.has(v.no))

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="فواتير المبيعات" sub="إدارة الفواتير وتتبع المستحقات" />
        <div className="tophead__ctrl">
          <Button label="إنشاء فاتورة مبيعات" variant="primary" icon="＋"
            onClick={() => nav('/sales/invoices/new')} />
        </div>
      </div>

      <div className="doclist" data-component="InvoiceList">
        {/* ---------- التبويبان — خط تحتاني زي السيستم ---------- */}
        <div className="dtabs dtabs--line" role="tablist">
          <button role="tab" aria-selected={tab === 'inv'}
            className={'dtabs__t' + (tab === 'inv' ? ' is-on' : '')}
            onClick={() => setTab('inv')}>فواتير المبيعات</button>
          <button role="tab" aria-selected={tab === 'sch'}
            className={'dtabs__t' + (tab === 'sch' ? ' is-on' : '')}
            onClick={() => setTab('sch')}>الفواتير المجدولة</button>
        </div>

        {tab === 'sch' ? (
          <div className="sect__empty">
            <b>مفيش فواتير مجدولة</b>
            <span>
              الفاتورة المجدولة بتتكرر لوحدها كل فترة. تقدر تجدول أي فاتورة
              من قايمة الأوامر (⋮) على كارتها.
            </span>
          </div>
        ) : (
          <>
            {/* ---------- شريط الأدوات ---------- */}
            <div className="ltools">
              <SearchField placeholder="البحث في الفواتير…" width={250}
                value={q} onChange={(v) => { setQ(v); setPage(1) }} />
              <Pick label="الحالة" value={state} options={STATES}
                onChange={(v) => { setState(v); setPage(1) }} />
              <Pick label="العملاء" value={cust} options={CUSTS}
                onChange={(v) => { setCust(v); setPage(1) }} />
              <DateRange value={period} onChange={(v) => { setPeriod(v); setPage(1) }} today={TODAY} />
              <Pick label="التاريخ" value={sort} options={SORTS} onChange={setSort} />
              <button className={'ltools__more' + (advOn.length ? ' is-on' : '')}
                aria-expanded={advOpen} onClick={() => setAdvOpen(true)}>
                <Ico.filter size={14} />مزيد من الفلاتر
                {advOn.length > 0 && <b className="ltools__n">{advOn.length}</b>}
              </button>

              {/* مبدّل العرض — آخر الشريط، بعيد عن الفلاتر عشان
                  ما يتقريش كأنه فلتر */}
              <div className="vsw" role="group" aria-label="شكل العرض">
                <button className={view === 'table' ? 'is-on' : ''}
                  aria-pressed={view === 'table'} title="جدول"
                  onClick={() => pickView('table')}><Ico.viewtable size={15} /></button>
                <button className={view === 'cards' ? 'is-on' : ''}
                  aria-pressed={view === 'cards'} title="كروت"
                  onClick={() => pickView('cards')}><Ico.viewlist size={15} /></button>
              </div>
            </div>

            {advOn.length > 0 && (
              <div className="advchips">
                {advOn.map((f) => (
                  <button key={f.id} className="advchip"
                    onClick={() => setAdv((a) => ({ ...a, [f.id]: '' }))}>
                    <span>{f.label}: <b>{advLabel(f)}</b></span>
                    <Ico.close size={12} />
                  </button>
                ))}
                <button className="advchips__x" onClick={() => setAdv({})}>مسح الكل</button>
              </div>
            )}

            {rows.length === 0 ? (
              <div className="sect__empty">
                <b>مفيش فواتير بالفلترة دي</b>
                <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر الفترة.</span>
              </div>
            ) : (
              <>
                {view === 'cards' ? (
                  <>
                    {/* شريط تحديد الصفحة — بوكس مستقل فوق الكروت */}
                    <label className="doclist__all">
                      <input type="checkbox" checked={allOn}
                        onChange={(e) => selectAll(e.target.checked, shown.map((v) => v.no))} />
                      <span>تحديد كل الصفحة</span>
                    </label>

                    <ul className="ivlist">
                      {shown.map((v) => (
                        <InvoiceCard key={v.no} v={v}
                          on={(id) => on(id, v)} open={() => open(v.no)}
                          onPeek={() => setPeek(v)}
                          checked={selected.has(v.no)} onCheck={() => toggle(v.no)} />
                      ))}
                    </ul>
                  </>
                ) : (
                  <InvoiceTable rows={shown} allOn={allOn}
                    onAll={(c) => selectAll(c, shown.map((v) => v.no))}
                    selected={selected} onCheck={toggle}
                    on={on} open={open} onPeek={setPeek} />
                )}

                <Pagination
                  from={(cur - 1) * PER + 1} to={Math.min(cur * PER, rows.length)}
                  total={rows.length} page={cur} perPage={PER} onPage={setPage}
                  onPerPage={(n) => { setPER(n); setPage(1) }} />
              </>
            )}
          </>
        )}
      </div>

      <Drawer open={advOpen} onClose={() => setAdvOpen(false)}
        title="مزيد من الفلاتر" meta="أبعاد إضافية على نفس القائمة"
        footer={(
          <div className="advdrw__f">
            <button className="btn btn--sec" onClick={() => setAdv({})}>مسح الكل</button>
            <button className="btn btn--primary" onClick={() => setAdvOpen(false)}>
              عرض {rows.length} فاتورة
            </button>
          </div>
        )}>
        <div className="advdrw">
          {ADV.map((f) => (
            <label key={f.id} className="advdrw__f1">
              <span className="fld__l">{f.label}</span>
              <SelectField value={adv[f.id] || ''} placeholder="الكل" ariaLabel={f.label}
                options={[{ id: '', label: 'الكل' }, ...f.opts]}
                onChange={(val) => { setAdv((a) => ({ ...a, [f.id]: val })); setPage(1) }} />
            </label>
          ))}
        </div>
      </Drawer>

      {peek && <PrintPreview doc={peekDoc(peek)} onClose={() => setPeek(null)} />}

      <BulkActionBar count={selected.size} onClear={clear} onAction={bulk}
        actions={['تنزيل PDF', 'إرسال بالبريد', 'تعليم كمدفوعة', 'إلغاء المسودات', 'تصدير CSV']} />
    </AppShell>
  )
}

/* ============================================================
   جدول الفواتير — الشكل الافتراضي.
   ------------------------------------------------------------
   نفس معلومات الكارت بالظبط، بس على خط واحد. الفرق إن
   الأعمدة بتخلّي **المقارنة** ممكنة: عينك بتنزل عمود المبلغ
   لوحده، أو عمود الاستحقاق لوحده، من غير ما تقرا كل صف.

   ★ الأوامر بتظهر عند الهوفر مش على طول. في الكارت كان فيه
   مساحة تستحمل أربع أزرار في كل صف؛ في الجدول ده بيعمل جدار
   من الأزرار بيغطي على البيانات. الصف اللي إيدك عليه هو
   بس اللي بيوري أوامره — والـ⋮ ثابت عشان اللي بالكيبورد.

   ★ الصف المتأخر بياخد شريط أحمر رفيع على حافة اليمين بدل
   خلفية وردية: في الجدول الخلفية الملوّنة بتتحوّل لبقعة كبيرة
   بتكسر المسح بالعين.
   ============================================================ */
function InvoiceTable({ rows, allOn, onAll, selected, onCheck, on, open, onPeek }) {
  return (
    <div className="ivtable__w">
      <table className="dt ivtable">
        <thead>
          <tr>
            <th className="checkcell">
              <input type="checkbox" checked={allOn} aria-label="تحديد كل الصفحة"
                onChange={(e) => onAll(e.target.checked)} />
            </th>
            <th>رقم الفاتورة</th>
            <th>العميل</th>
            <th>الحالة</th>
            <th>الاستحقاق</th>
            <th className="n">المبلغ</th>
            <th className="ivtable__ac" />
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const ds = docState(v)
            const ps = payState(v)
            const late = isLate(v)
            const live = LIVE.includes(v.status)
            const rem = v.total - v.paid
            const credited = DATA.creditedState(v.no, v.total)
            const now = ds.id === 'cancelled' ? 0 : (credited ? credited.net : v.total)
            const was = (ds.id === 'cancelled' || credited) ? v.total : null
            const menu = [
              ...docMenu({ zatca: v.zatca, status: v.status, onView: () => open(v.no), on: (id) => on(id, v) }),
              { sep: true },
              { label: 'جدولة الفاتورة', Ic: Ico.calendar, onClick: () => on('schedule', v) },
              { label: 'إلغاء الفاتورة', Ic: Ico.ban, tone: 'crit',
                off: ds.id !== 'issued' && ds.id !== 'credited',
                why: ds.id === 'draft' ? 'المسودة بتتحذف مش بتتلغي' : 'ملغاة أصلًا',
                onClick: () => on('cancel', v) },
            ]

            return (
              <tr key={v.no} className={(selected.has(v.no) ? 'selected' : '') + (late ? ' is-late' : '')}>
                <td className="checkcell">
                  <input type="checkbox" checked={selected.has(v.no)}
                    aria-label={'تحديد ' + v.no} onChange={() => onCheck(v.no)} />
                </td>

                <td>
                  <button className="ivt__no" onClick={() => open(v.no)}>{v.no}</button>
                  <em className="ivt__wh">{DATA.whOf(v.no)?.ar}</em>
                </td>

                <td>
                  <span className="ivt__cn">{v.c?.ar}</span>
                  <em className="ivt__cid ltr num">{v.c?.id}</em>
                </td>

                <td>
                  <span className="ivt__st">
                    <span className={'st st--' + ds.tone}>{ds.ar}</span>
                    {ps && <span className={'st st--' + ps.tone}>{ps.ar}</span>}
                    {late && <span className="st st--critical">متأخر</span>}
                  </span>
                </td>

                <td>
                  <span className="ivt__due">
                    {v.due ? <span className="num ltr">{dueFmt(v.due)}</span> : '—'}
                  </span>
                </td>

                <td className="n">
                  {was != null && (
                    <s className="ivt__was"><span className="num">{fmtMoney(was)}</span><Riyal /></s>
                  )}
                  <b className="ivt__amt"><span className="num">{fmtMoney(now)}</span><Riyal /></b>
                </td>

                <td className="ivtable__ac">
                  <div className="ivt__acts">
                    {/* الأمر الرئيسي **الأول** يعني الأيمن في العربي —
                        هو اللي المستخدم جاي عشانه، فبيقابل عينه قبل
                        الأيقونات. والأيقونات بعده ملزوقة بالـ⋮ */}
                    {ds.id === 'draft' ? (
                      <button className="gbtn2 gbtn2--go ivt__go" onClick={() => on('issue', v)}>
                        <Ico.check size={13} />إصدار
                      </button>
                    ) : live && rem > 0.009 ? (
                      <button className="gbtn2 gbtn2--go ivt__go" onClick={() => on('pay', v)}>
                        <Ico.wallet size={13} />دفعة
                      </button>
                    ) : <span className="ivt__gap" aria-hidden="true" />}

                    <button className="ivt__ic" title="عرض الفاتورة" aria-label={'عرض ' + v.no}
                      onClick={() => onPeek(v)}><Ico.eye size={16} /></button>
                    <button className="ivt__ic" title="إرسال" aria-label={'إرسال ' + v.no}
                      disabled={!live} onClick={() => on('email', v)}><Ico.send size={15} /></button>
                    <button className="ivt__ic" title="تنزيل PDF" aria-label={'PDF ' + v.no}
                      disabled={v.zatca !== 'ok'} onClick={() => on('pdf', v)}>
                      <Ico.download size={15} />
                    </button>

                    <RowMenu items={menu} label={'أوامر ' + v.no} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ============================================================
   كارت الفاتورة.
   ============================================================ */
function InvoiceCard({ v, on, open, onPeek, checked, onCheck }) {
  const ds = docState(v)
  const ps = payState(v)
  const late = isLate(v)
  const live = LIVE.includes(v.status)
  const rem = v.total - v.paid

  /* المبلغ المشطوب فوق: الأصلي قبل الإشعارات أو قبل الإلغاء.
     ده اللي السيستم بيعمله — بيقولك «كان كذا وبقى كذا». */
  const credited = DATA.creditedState(v.no, v.total)
  const now = ds.id === 'cancelled' ? 0 : (credited ? credited.net : v.total)
  const was = (ds.id === 'cancelled' || credited) ? v.total : null

  const menu = [
    ...docMenu({ zatca: v.zatca, status: v.status, onView: open, on }),
    { sep: true },
    { label: 'جدولة الفاتورة', Ic: Ico.calendar, onClick: () => on('schedule') },
    { label: 'إلغاء الفاتورة', Ic: Ico.ban, tone: 'crit',
      off: ds.id !== 'issued' && ds.id !== 'credited',
      why: ds.id === 'draft' ? 'المسودة بتتحذف مش بتتلغي' : 'ملغاة أصلًا',
      onClick: () => on('cancel') },
  ]

  return (
    <li className={'ivcard' + (late ? ' is-late' : '')} data-component="InvoiceCard">
      {/* ---------- ⋮ على حافة الشمال ---------- */}
      <RowMenu items={menu} label={'أوامر ' + v.no} />

      {/* ---------- شمال: المبلغ ---------- */}
      <div className="ivcard__amt">
        {was != null && (
          <s className="ivcard__was"><span className="num">{fmtMoney(was)}</span><Riyal /></s>
        )}
        <b className="ivcard__now"><span className="num">{fmtMoney(now)}</span><Riyal /></b>
        <span className="ivcard__due">
          {v.due ? <>مستحق <span className="num ltr">{dueFmt(v.due)}</span></> : 'لم يُرسل بعد'}
        </span>
      </div>

      {/* ---------- عنقود الأوامر — نفس ترتيب الجدول ----------
           الأمر الرئيسي الأيمن، وبعده الأيقونات، وكلهم مخفيين
           لحد ما إيدك تيجي على الكارت. الكارت والجدول نفس
           الشاشة بشكلين — فمينفعش الأوامر تترتّب بطريقتين. */}
      <div className="ivcard__acts">
        {ds.id === 'draft' ? (
          <button className="gbtn2 gbtn2--go ivt__go" onClick={() => on('issue')}>
            <Ico.check size={13} />إصدار
          </button>
        ) : live && rem > 0.009 ? (
          <button className="gbtn2 gbtn2--go ivt__go" onClick={() => on('pay')}>
            <Ico.wallet size={13} />دفعة
          </button>
        ) : <span className="ivt__gap" aria-hidden="true" />}

        <button className="ivt__ic" title="عرض الفاتورة" aria-label={'عرض ' + v.no}
          onClick={onPeek}><Ico.eye size={16} /></button>
        <button className="ivt__ic" title="إرسال" aria-label={'إرسال ' + v.no}
          disabled={!live} onClick={() => on('email')}><Ico.send size={15} /></button>
        <button className="ivt__ic" title="تنزيل PDF" aria-label={'PDF ' + v.no}
          disabled={v.zatca !== 'ok'} onClick={() => on('pdf')}>
          <Ico.download size={15} />
        </button>
      </div>

      {/* ---------- يمين: التعريف ---------- */}
      <div className="ivcard__id">
        <div className="ivcard__top">
          <button className="ivcard__no" onClick={open}>{v.no}</button>
          <span className={'st st--' + ds.tone}>{ds.ar}</span>
          {ps && <span className={'st st--' + ps.tone}>{ps.ar}</span>}
          {late && <span className="st st--critical">متأخر</span>}
        </div>
        <div className="ivcard__sub">
          {v.c?.ar}
          <span className="ltr num">{v.c?.id}</span>
        </div>
        <div className="ivcard__wh">{DATA.whOf(v.no)?.ar}</div>
      </div>

      {/* ---------- الشيك بوكس على حافة اليمين ---------- */}
      <label className="ivcard__ck">
        <input type="checkbox" checked={checked} onChange={onCheck}
          aria-label={'تحديد ' + v.no} />
      </label>
    </li>
  )
}
