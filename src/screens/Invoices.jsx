import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import { GROUPS, groupOf, Group, MoneyHead, ChangeLine, ViewToggle } from '../components/doclist.jsx'
import { PageFilter, FilterChips, DateRange, applyFilter, emptyFilter, inPeriod } from '../components/pagefilter.jsx'
import { daysFrom, TODAY } from '../lib/format.js'
import * as DATA from '../data/mock.js'

const LIVE = ['issued', 'partial', 'overdue']

/* التغييرات اللي جت من برة الشاشة */
const CHANGES = ['فاتورة اترفضت من الهيئة', 'دفعتين اتسجّلوا', 'فاتورة بقت متأخرة']

/* المدن اللي فيها عملاء فعلًا — مفيش خيار بيرجّع صفر */
const CITIES = [...new Set(DATA.invoices.map((v) => v.c?.city).filter(Boolean))]

/* ---------- أبعاد الفلترة جوّه الجدول ----------
   الفترة مش هنا — دي فوق، لأنها بتغيّر «إيه اللي بنتكلم عنه» مش «إيه اللي بنعرضه». */
const FGROUPS = [
  {
    id: 'state', label: 'الحالة',
    options: [
      { id: 'all',    label: 'الكل' },
      { id: 'act',    label: 'محتاج تصرّف', test: (v) => groupOf(v) === 0 },
      { id: 'live',   label: 'تحت التحصيل', test: (v) => groupOf(v) === 1 },
      { id: 'draft',  label: 'مسودات',      test: (v) => v.status === 'draft' },
      { id: 'closed', label: 'مقفولة',      test: (v) => ['paid', 'void', 'cancelled'].includes(v.status) },
    ],
  },
  {
    id: 'zatca', label: 'الهيئة',
    options: [
      { id: 'all',     label: 'الكل' },
      { id: 'ok',      label: 'مقبولة',     test: (v) => v.zatca === 'ok' },
      { id: 'bad',     label: 'مرفوضة',     test: (v) => v.zatca === 'bad' },
      { id: 'pending', label: 'عند الهيئة', test: (v) => v.zatca === 'pending' },
      { id: 'none',    label: 'ما اتصدرتش', test: (v) => !v.zatca },
    ],
  },
  {
    id: 'due', label: 'الاستحقاق',
    options: [
      { id: 'all',   label: 'الكل' },
      { id: 'late',  label: 'متأخرة',     test: (v) => LIVE.includes(v.status) && daysFrom(v.due) < 0 },
      { id: 'week',  label: 'خلال أسبوع', test: (v) => { const d = daysFrom(v.due); return LIVE.includes(v.status) && d !== null && d >= 0 && d <= 7 } },
      { id: 'month', label: 'خلال شهر',   test: (v) => { const d = daysFrom(v.due); return LIVE.includes(v.status) && d !== null && d >= 0 && d <= 30 } },
    ],
  },
  {
    id: 'city', label: 'المدينة',
    options: [
      { id: 'all', label: 'الكل' },
      ...CITIES.map((c) => ({ id: c, label: c, test: (v) => v.c?.city === c })),
    ],
  },
]

export default function Invoices() {
  const nav = useNavigate()
  const [view, setView] = useState('list')
  const [period, setPeriod] = useState({ id: 'y' })
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const { selected, toggle, selectAll, clear } = useSelection()

  /* ★ الفترة بتحدّد الشغلانة كلها — الانسايتس والجدول بيقروا من نفس المصدر */
  const inRange = useMemo(
    () => DATA.invoices.filter((v) => inPeriod(v, period, TODAY)), [period])

  /* فلترة الجدول جوّه الفترة */
  const rows = useMemo(
    () => applyFilter(inRange, FGROUPS, filter, q), [inRange, filter, q])

  const grouped = useMemo(() => {
    const g = GROUPS.map(() => [])
    rows.forEach((v) => g[groupOf(v)].push(v))
    return g
  }, [rows])

  const open = (no) => nav(`/sales/invoices/${no}`)

  const tableRows = rows.map((v) => {
    const rem = v.total - v.paid
    const live = LIVE.includes(v.status)
    let sub = ''
    if (v.status === 'overdue') sub = `متأخرة ${v.overdueDays} يوم`
    if (v.status === 'partial') sub = `سُدِّد ${Math.round((v.paid / v.total) * 100)}٪`
    return {
      key: v.no,
      onOpen: () => open(v.no),
      cells: [
        <DocNo value={v.no} />,
        <PartyCell party={v.c} />,
        <DateCell value={v.date} />,
        <DateCell value={v.due} rel={v.status === 'issued' || v.status === 'partial'} />,
        <StatusCell status={v.status} zatca={v.zatca} zatcaReason={v.zatcaReason} sub={sub} />,
        <Money value={v.total} muted={v.status === 'cancelled' || v.status === 'void'} />,
        live && rem > 0 ? <Money value={rem} /> : <span className="hint" />,
      ],
    }
  })

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="فواتير المبيعات" sub={<CurrencyNote />} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="فاتورة جديدة" variant="primary" icon="＋"
            onClick={() => nav('/sales/invoices/new')} />
        </div>
      </div>

      <MoneyHead rows={inRange} />
      <ChangeLine items={CHANGES} onOpen={() => {}} />

      {/* ---------- الجدول: اسمه ظاهر، والفلترة والعرض بتوعه جنبه ---------- */}
      <section className="sect" data-component="InvoiceTable">
        <header className="sect__h">
          <h2 className="sect__t">الفواتير<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث باسم العميل أو رقم الفاتورة…" width={260}
              value={q} onChange={setQ} />
            <PageFilter groups={FGROUPS} value={filter} onChange={setFilter} />
            <ViewToggle value={view} onChange={setView} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={setFilter}
          q={q} onQ={setQ} shown={rows.length} total={inRange.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش فواتير بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر الفترة من فوق.</span>
          </div>
        ) : view === 'list' ? (
          <div className="dlist" data-component="DocList">
            {GROUPS.map((g, i) => (
              <Group key={g.id} group={g} rows={grouped[i]}
                selected={selected} onSelect={toggle} onOpen={open} />
            ))}
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'رقم الفاتورة', width: '112px', sortable: true },
                { label: 'العميل' },
                { label: 'تاريخ الإصدار', width: '116px', sortable: true },
                { label: 'الاستحقاق', width: '132px', sortable: true, sorted: 'desc' },
                { label: 'الحالة', width: '232px' },
                { label: 'المبلغ', num: true, width: '125px', sortable: true },
                { label: 'المتبقي', num: true, width: '112px' },
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, rows.map((v) => v.no))}
            />
            <Pagination from={1} to={rows.length} total={rows.length} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear}
        actions={['تنزيل PDF', 'إرسال بالبريد', 'تعليم كمدفوعة', 'إلغاء المسودات', 'تصدير CSV']} />
    </AppShell>
  )
}
