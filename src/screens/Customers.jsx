import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, PartyCell } from '../components/data.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter } from '../components/pagefilter.jsx'
import { daysFrom, dayAr } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import { toast } from '../components/feedback.jsx'

/* ============================================================
   العملاء.

   قبل كده كانت الشاشة دي بتعرض تابات وفلاتر شكلها شغّال وهي
   مش شغّالة، وأرقام مكتوبة بالإيد (٦٤ عميل) مالهاش علاقة
   بالداتا (١٢). دلوقتي كل رقم على الشاشة **متحسِب من الداتا**،
   وكل كنترول بيغيّر اللي تحته فعلًا.

   نفس محرّك الفلترة بتاع باقي شاشات المبيعات (pagefilter) —
   مفيش نظام تاني اتعمل مخصوص للشاشة دي.
   ============================================================ */

/* «متأخر» مش صفة في كارت العميل — دي نتيجة فواتيره.
   بنحسبها من الفواتير عشان الرقم ميكدبش. */
const LATE_IDS = new Set(
  DATA.invoices
    .filter((v) => v.status === 'overdue' || (v.status !== 'paid' && daysFrom(v.due) < 0))
    .map((v) => v.c?.id)
    .filter(Boolean)
)

/* غير نشط = عدّى ٩٠ يوم من غير أي تعامل */
const IDLE_DAYS = 90
const idleDays = (c) => (c.last ? -daysFrom(c.last) : null)
const isIdle = (c) => { const d = idleDays(c); return d !== null && d > IDLE_DAYS }

const TABS = [
  { id: 'all',  label: 'كل العملاء',      test: () => true },
  { id: 'due',  label: 'عليهم مستحقات',   test: (c) => DATA.customerBalance(c.id) > 0 },
  { id: 'late', label: 'متأخرون',         test: (c) => LATE_IDS.has(c.id) },
  { id: 'idle', label: 'غير نشطين',       test: isIdle },
]

/* الخيارات بتتولّد من الداتا — عمرك ما تلاقي خيار بيرجّع صفر */
const CITIES = [...new Set(DATA.customers.map((c) => c.city).filter(Boolean))]
const TERMS  = [...new Set(DATA.customers.map((c) => c.terms).filter(Boolean))]

const FGROUPS = [
  {
    id: 'city', label: 'المدينة',
    options: [{ id: 'all', label: 'الكل' },
      ...CITIES.map((x) => ({ id: x, label: x, test: (c) => c.city === x }))],
  },
  {
    id: 'terms', label: 'شروط السداد',
    options: [{ id: 'all', label: 'الكل' },
      ...TERMS.map((x) => ({ id: x, label: x, test: (c) => c.terms === x }))],
  },
  {
    id: 'type', label: 'النوع',
    options: [
      { id: 'all', label: 'الكل' },
      { id: 'b2b', label: 'منشأة', test: (c) => c.type === 'b2b' },
      { id: 'b2c', label: 'فرد',   test: (c) => c.type === 'b2c' },
    ],
  },
  {
    id: 'bal', label: 'الرصيد',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'open', label: 'عليه رصيد',    test: (c) => DATA.customerBalance(c.id) > 0 },
      { id: 'zero', label: 'مسدَّد بالكامل', test: (c) => DATA.customerBalance(c.id) <= 0.009 },
    ],
  },
]

/* البحث بالاسم أو الرقم الضريبي أو رقم العميل */
const custText = (c) => [c.ar, c.en, c.vat, c.id]

/* جمع «عميل» زي ما العربي بيتقال فعلًا — مش «6 عميل» */
const clients = (n) =>
  n === 0 ? 'ولا عميل'
  : n === 1 ? 'عميل واحد'
  : n === 2 ? 'عميلين'
  : n <= 10 ? `${n} عملاء`
  : `${n} عميلًا`

const PER_PAGE = 12

const SORTS = {
  name: (a, b) => a.ar.localeCompare(b.ar, 'ar'),
  docs: (a, b) => DATA.invoicesOf(a.id).length - DATA.invoicesOf(b.id).length,
  bal:  (a, b) => DATA.customerBalance(a.id) - DATA.customerBalance(b.id),
}

export default function Customers() {
  const nav = useNavigate()
  const [tab, setTab] = useState('all')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ key: 'bal', dir: 'desc' })
  const [page, setPage] = useState(1)
  const { selected, toggle, selectAll, clear } = useSelection()

  /* أي تغيير في الفلترة بيرجّعنا لأول صفحة — وإلا المستخدم
     بيلاقي نفسه في صفحة ٣ مفيهاش نتايج */
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const all = useDocs('customers')

  /* عدّاد كل تابة بيتحسب على الداتا كلها — عشان يفضل ثابت وأنت
     بتتنقّل بين التابات، زي ما المستخدم متوقّع */
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])

  const inTab = useMemo(
    () => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])

  const rows = useMemo(() => {
    const out = applyFilter(inTab, FGROUPS, filter, q, custText)
    const cmp = SORTS[sort.key]
    return cmp ? [...out].sort((a, b) => (sort.dir === 'asc' ? cmp(a, b) : cmp(b, a))) : out
  }, [inTab, filter, q, sort])

  /* الملخّص بيتحسب على اللي معروض دلوقتي — الرقم فوق لازم يوصف
     اللي تحته، مش حاجة تانية */
  const sum = useMemo(() => {
    const owing = rows.filter((c) => DATA.customerBalance(c.id) > 0.009)
    const total = owing.reduce((s, c) => s + DATA.customerBalance(c.id), 0)
    return {
      total,
      max: owing.length ? Math.max(...owing.map((c) => DATA.customerBalance(c.id))) : 0,
      avg: owing.length ? total / owing.length : 0,
      active: rows.filter((c) => !isIdle(c)).length,
      owing: owing.length,
    }
  }, [rows])

  const onSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
    setPage(1)
  }

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const tableRows = shown.map((c) => {
    const d = idleDays(c)
    return {
      key: c.id,
      onOpen: () => nav(`/sales/customers/${c.id}`),
      cells: [
        <PartyCell party={c} />,
        <span className="num" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-muted)' }}>{c.vat}</span>,
        <span style={{ fontSize: 'var(--fs-sm)' }}>{c.city}</span>,
        <span style={{ fontSize: 'var(--fs-sm)' }}>{c.terms}</span>,
        <span className="num" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-muted)' }}>
          {DATA.invoicesOf(c.id).length}
        </span>,
        DATA.customerBalance(c.id) > 0.009
          ? <Money value={DATA.customerBalance(c.id)} />
          : <span className="hint">مسدَّد بالكامل</span>,
      ],
      /* العميل الساكت مش حالة خطأ — ده أمر: كلّمه. */
      action: d !== null && d > IDLE_DAYS
        ? { label: `آخر تعامل من ${dayAr(d)}`, tone: 'quiet',
            onClick: () => ACT.sendEmail('invoices', { no: c.id, c }) }
        : null,
      menu: [
        { label: 'فتح العميل', onClick: () => nav(`/sales/customers/${c.id}`) },
        { label: 'كشف الحساب', onClick: () => nav(`/sales/customers/${c.id}?tab=ledger`) },
        { label: 'تعديل البيانات', onClick: () => nav(`/sales/customers/${c.id}/edit`) },
        { sep: true },
        { label: 'فاتورة جديدة له', onClick: () => nav('/sales/invoices/new') },
        { label: 'عرض سعر جديد', onClick: () => nav('/sales/quotations') },
        { sep: true },
        { label: 'إرسال بالبريد', onClick: () => ACT.sendEmail('invoices', { no: c.id, c }) },
        { label: 'حذف العميل', tone: 'crit',
          onClick: () => ACT.deleteCustomer(c, DATA.invoicesOf(c.id).length) },
      ],
    }
  })

  const col = (label, key, extra = {}) => ({
    label, sortable: true, onSort: () => onSort(key),
    sorted: sort.key === key ? sort.dir : null, ...extra,
  })

  return (
    <AppShell search="ابحث بالاسم أو الرقم الضريبي…">
      <div className="tophead">
        <PageHeader title="العملاء" sub={<>بيانات العملاء وأرصدتهم<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <Button label="استيراد" variant="ghost"
            onClick={() => toast.info('الاستيراد بيتم من ملف Excel أو CSV',
              { sub: 'الشاشة دي جاية مع موديول الاستيراد' })} />
          <Button label="عميل جديد" variant="primary" icon="＋"
            onClick={() => nav('/sales/customers/new')} />
        </div>
      </div>

      <SummaryStrip
        label="إجمالي أرصدة العملاء"
        value={sum.total}
        note={rows.length === all.length
          ? `مستحق على ${clients(sum.owing)} من أصل ${all.length}`
          : `مستحق على ${clients(sum.owing)} من ${rows.length} معروضين`}
        items={[
          { label: 'أكبر رصيد مستحق', value: sum.max, alert: true },
          { label: 'متوسط الرصيد', value: sum.avg },
          { label: 'عملاء نشطون', value: String(sum.active), money: false },
        ]}
      />

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={reset(setTab)} />

      <section className="sect" data-component="CustomerTable">
        <header className="sect__h">
          <h2 className="sect__t">العملاء<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث بالاسم أو الرقم الضريبي…" width={260}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش عملاء بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر التابة اللي فوق.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                col('العميل', 'name'),
                { label: 'الرقم الضريبي', width: '165px' },
                { label: 'المدينة', width: '100px' },
                { label: 'شروط السداد', width: '130px' },
                col('المستندات', 'docs', { num: true, width: '110px' }),
                col('الرصيد المستحق', 'bal', { num: true, width: '170px' }),
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, shown.map((c) => c.id))}
            />
            <Pagination
              from={(cur - 1) * PER_PAGE + 1} to={(cur - 1) * PER_PAGE + shown.length}
              total={rows.length} page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear}
        onAction={(l) => ACT.bulkAction(l, 'customers', [...selected]).then(clear)}
        actions={['كشف حساب', 'إرسال بالبريد', 'تصدير CSV']} />
    </AppShell>
  )
}
