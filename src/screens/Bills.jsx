import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, DocNo, StatusCell } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byDate, byNum, byText, DateRange, inPeriod} from '../components/pagefilter.jsx'
import { fmtDate, daysFrom, TODAY} from '../lib/format.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   فواتير المشتريات.

   في سيستم العميل رأس الشاشة مكتوب فيه **«الدفع»** — والشاشة
   بتعرض صفوف بحالتين ملزوقين جنب بعض: «تم التسجيل» و«مدفوعة
   جزئياً» و«متأخر» — تلات بادچات على صف واحد.

   البُعدين حقيقيين بس مش متساويين:
   **حالة المستند** (مسودة · مُرحَّلة · ملغاة) دي حالة الفاتورة،
   و**السداد** (كام اندفع من كام) ده رقم مش حالة. عشان كده الأول
   بادچ والتاني **شريط تقدّم برقم المتبقي** — اللي المستخدم فعلًا
   بيدوّر عليه.

   وزوّدنا اللي مش موجود عنده خالص: تشيك بوكس ليه شريط أوامر
   حقيقي، وترتيب على الأعمدة، وترقيم صفحات.
   ============================================================ */

const TABS = [
  { id: 'all',    label: 'كل الفواتير', test: () => true },
  { id: 'unpaid', label: 'مستحقة عليّ',  test: (b) => b.status === 'posted' && DATA.billDue(b) > 0.009 },
  { id: 'late',   label: 'متأخرة',       test: (b) => DATA.isLate(b) },
  { id: 'draft',  label: 'مسودات',       test: (b) => b.status === 'draft' },
]

const FGROUPS = [
  {
    id: 'st', label: 'حالة المستند',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'draft', label: 'مسودة',   test: (b) => b.status === 'draft' },
      { id: 'posted', label: 'مُرحَّلة', test: (b) => b.status === 'posted' },
      { id: 'cancelled', label: 'ملغاة', test: (b) => b.status === 'cancelled' },
    ],
  },
  {
    id: 'pay', label: 'السداد',
    options: [
      { id: 'all',     label: 'الكل' },
      { id: 'paid',    label: 'مدفوعة',        test: (b) => DATA.billPay(b) === 'paid' },
      { id: 'partial', label: 'مدفوعة جزئيًا', test: (b) => DATA.billPay(b) === 'partial' },
      { id: 'unpaid',  label: 'ما اندفعش',     test: (b) => DATA.billPay(b) === 'unpaid' },
    ],
  },
  {
    id: 'sup', label: 'المورد',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.suppliers.map((s) => ({ id: s.id, label: s.ar, test: (b) => b.s.id === s.id }))],
  },
  {
    id: 'due', label: 'الاستحقاق',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'late', label: 'متأخر',             test: (b) => DATA.isLate(b) },
      { id: 'w',    label: 'خلال أسبوع',        test: (b) => { const d = daysFrom(b.due); return d !== null && d >= 0 && d <= 7 } },
      { id: 'm',    label: 'خلال شهر',          test: (b) => { const d = daysFrom(b.due); return d !== null && d >= 0 && d <= 30 } },
    ],
  },
]

const billText = (b) => [b.no, b.ref, b.s?.ar, b.s?.en]
const PER_PAGE = 12

/* السداد كشريط — «فاضل كام» مش «إيه اسم الحالة» */
function PayCell({ b }) {
  if (b.status !== 'posted') return <span className="hint">—</span>
  const rest = DATA.billDue(b)
  const pct = b.total > 0 ? Math.min(1, (b.paid || 0) / b.total) : 0
  if (rest <= 0.009) {
    return <span className="paycell is-done"><b>مدفوعة بالكامل</b></span>
  }
  return (
    <span className={`paycell${DATA.isLate(b) ? ' is-late' : ''}`}>
      <b><Money value={rest} /></b>
      <i className="paycell__bar" aria-hidden="true"><i style={{ width: `${pct * 100}%` }} /></i>
      <em>{pct > 0 ? `اندفع ${Math.round(pct * 100)}٪` : 'ما اندفعش حاجة'}</em>
    </span>
  )
}

export default function Bills() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'all')
  const [filter, setFilter] = useState(() => ({
    ...emptyFilter(FGROUPS),
    ...(params.get('sup') ? { sup: params.get('sup') } : {}),
  }))
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'all' })
  const [page, setPage] = useState(1)
  const { selected, toggle, selectAll, clear } = useSelection()
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const all = (useDocs('bills').filter((b) => !b.deleted))
    .filter((x) => inPeriod(x, period, TODAY))

  const S = useSort({
    date: byDate('date'),
    due:  byDate('due'),
    sup:  (a, b) => String(a.s?.ar || '').localeCompare(String(b.s?.ar || ''), 'ar'),
    total: byNum('total'),
    rest: (a, b) => DATA.billDue(a) - DATA.billDue(b),
    no:   byText('no'),
  }, 'date')

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])

  const inTab = useMemo(
    () => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])

  const rows = useMemo(
    () => S.apply(applyFilter(inTab, FGROUPS, filter, q, billText)),
    [inTab, filter, q, S.sort])

  /* الأرقام فوق بتوصف اللي تحتها — مش أرقام ثابتة */
  const sum = useMemo(() => {
    const live = rows.filter((b) => b.status === 'posted')
    return {
      due:  live.reduce((a, b) => a + DATA.billDue(b), 0),
      late: live.filter((b) => DATA.isLate(b)).reduce((a, b) => a + DATA.billDue(b), 0),
      week: live.filter((b) => { const d = daysFrom(b.due); return d !== null && d >= 0 && d <= 7 })
              .reduce((a, b) => a + DATA.billDue(b), 0),
      drafts: rows.filter((b) => b.status === 'draft').length,
    }
  }, [rows])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const open = (no) => nav(`/purchases/bills/${no}`)

  const tableRows = shown.map((b) => {
    const rest = DATA.billDue(b)
    const canPay = b.status === 'posted' && rest > 0.009
    return {
      key: b.no,
      onOpen: () => open(b.no),
      action: canPay
        ? { label: 'تسجيل دفعة', tone: 'go', onClick: () => open(b.no) }
        : b.status === 'draft'
          ? { label: 'ترحيل', tone: 'go', onClick: () => ACT.postBill(b, b.total) }
          : null,
      menu: [
        { label: 'فتح الفاتورة', Ic: Ico.search, onClick: () => open(b.no) },
        { label: 'تعديل', Ic: Ico.edit, onClick: () => nav(`/purchases/bills/${b.no}/edit`),
          off: b.status !== 'draft', why: 'المرحّلة مينفعش تتعدّل — تتلغي وتتعاد' },
        { sep: true },
        { label: 'تحميل PDF', Ic: Ico.download, onClick: () => ACT.downloadPdf('bills', b) },
        { label: 'طباعة', Ic: Ico.print, onClick: () => ACT.printDoc('bills', b) },
        { sep: true },
        { label: 'إلغاء الفاتورة', Ic: Ico.trash, tone: 'crit',
          onClick: () => ACT.cancelBill(b),
          off: b.status !== 'posted', why: 'الإلغاء للمرحّلة بس' },
      ],
      cells: [
        <DocNo value={b.no} onClick={() => open(b.no)} />,

        <span className="itcell">
          <b>{b.s?.ar}</b>
          <em className="num">{b.ref || 'من غير رقم مستند من المورد'}</em>
        </span>,

        <StatusCell status={b.status}
          sub={b.po ? `من ${b.po}` : undefined} />,

        <span className="dcell">
          {fmtDate(b.date)}
          {b.due && <em className={DATA.isLate(b) ? 'is-late' : ''}>استحقاق {fmtDate(b.due)}</em>}
        </span>,

        <Money value={b.total} />,

        <PayCell b={b} />,
      ],
    }
  })

  const col = S.col

  return (
    <AppShell search="ابحث برقم الفاتورة أو المورد…">
      <div className="tophead">
        <PageHeader title="فواتير المشتريات"
          sub={<>اللي عليك للموردين، ومتابعة سداده<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={reset(setPeriod)} today={TODAY} />
          <Button label="تصدير CSV" variant="ghost"
            onClick={() => ACT.bulkAction('تصدير CSV', 'bills', rows.map((b) => b.no))} />
          <Button label="فاتورة مشتريات" variant="primary" icon="＋"
            onClick={() => nav('/purchases/bills/new')} />
        </div>
      </div>

      <SummaryStrip
        label="المستحق عليك"
        value={sum.due}
        note={`${rows.filter((b) => b.status === 'posted' && DATA.billDue(b) > 0.009).length} فاتورة لسه ما اتسددتش`}
        items={[
          { label: 'متأخر عن الاستحقاق', value: sum.late, alert: sum.late > 0 },
          { label: 'مستحق خلال أسبوع', value: sum.week },
          { label: 'مسودات', value: String(sum.drafts), money: false },
        ]}
      />

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={reset(setTab)} />

      <section className="sect" data-component="BillsTable">
        <header className="sect__h">
          <h2 className="sect__t">الفواتير<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="رقم الفاتورة أو رقم مستند المورد أو الاسم…" width={300}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش فواتير بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر التابة اللي فوق.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                col('رقم الفاتورة', 'no', { width: '146px' }),
                col('المورد', 'sup'),
                { label: 'الحالة', width: '150px' },
                col('التواريخ', 'date', { width: '164px' }),
                col('الإجمالي', 'total', { num: true, width: '132px' }),
                col('المتبقي', 'rest', { width: '164px' }),
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, shown.map((b) => b.no))}
            />
            <Pagination
              from={(cur - 1) * PER_PAGE + 1} to={(cur - 1) * PER_PAGE + shown.length}
              total={rows.length} page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear}
        onAction={(label) => ACT.bulkAction(label, 'bills', [...selected]).then(() => clear())}
        actions={['ترحيل الفواتير', 'تنزيل PDF', 'طباعة', 'تصدير CSV']} />
    </AppShell>
  )
}
