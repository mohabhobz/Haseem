import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import { ViewToggle } from '../components/doclist.jsx'
import { QGROUPS, qgroupOf, QGroup, QMoneyHead } from '../components/quotelist.jsx'
import { PageFilter, FilterChips, DateRange, applyFilter, emptyFilter, inPeriod } from '../components/pagefilter.jsx'
import { daysFrom, TODAY } from '../lib/format.js'
import * as DATA from '../data/mock.js'

const DIM = ['cancelled', 'rejected', 'expired']

/* المدن اللي فيها عملاء فعلًا — مفيش خيار بيرجّع صفر */
const CITIES = [...new Set(DATA.quotations.map((q) => q.c?.city).filter(Boolean))]

/* ---------- أبعاد الفلترة جوّه الجدول ----------
   الفترة مش هنا — دي فوق، لأنها بتغيّر «إيه اللي بنتكلم عنه» مش «إيه اللي بنعرضه». */
const FGROUPS = [
  {
    id: 'state', label: 'الحالة',
    options: [
      { id: 'all',   label: 'الكل' },
      { id: 'act',   label: 'محتاج تصرّف',  test: (q) => qgroupOf(q) === 0 },
      { id: 'wait',  label: 'بانتظار الرد', test: (q) => q.status === 'sent' },
      { id: 'draft', label: 'مسودات',       test: (q) => q.status === 'draft' },
      { id: 'done',  label: 'مقفولة',       test: (q) => ['converted', 'rejected', 'cancelled'].includes(q.status) },
    ],
  },
  {
    id: 'answer', label: 'رد العميل',
    options: [
      { id: 'all',      label: 'الكل' },
      { id: 'accepted', label: 'وافق',        test: (q) => ['accepted', 'converted'].includes(q.status) },
      { id: 'rejected', label: 'رفض',         test: (q) => q.status === 'rejected' },
      { id: 'none',     label: 'لسه ما ردّش', test: (q) => ['sent', 'expired'].includes(q.status) },
    ],
  },
  {
    id: 'valid', label: 'الصلاحية',
    options: [
      { id: 'all',   label: 'الكل' },
      { id: 'over',  label: 'منتهية',      test: (q) => q.status === 'expired' || (q.status === 'sent' && daysFrom(q.valid) < 0) },
      { id: 'week',  label: 'خلال أسبوع',  test: (q) => { const d = daysFrom(q.valid); return q.status === 'sent' && d !== null && d >= 0 && d <= 7 } },
      { id: 'month', label: 'خلال شهر',    test: (q) => { const d = daysFrom(q.valid); return q.status === 'sent' && d !== null && d >= 0 && d <= 30 } },
    ],
  },
  {
    id: 'city', label: 'المدينة',
    options: [
      { id: 'all', label: 'الكل' },
      ...CITIES.map((c) => ({ id: c, label: c, test: (q) => q.c?.city === c })),
    ],
  },
]

export default function Quotations() {
  const nav = useNavigate()
  const [view, setView] = useState('list')
  const [period, setPeriod] = useState({ id: 'y' })
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const { selected, toggle, selectAll, clear } = useSelection()

  /* ★ الفترة بتحدّد الشغلانة كلها — الانسايتس والجدول بيقروا من نفس المصدر */
  const inRange = useMemo(
    () => DATA.quotations.filter((x) => inPeriod(x, period, TODAY)), [period])

  const rows = useMemo(
    () => applyFilter(inRange, FGROUPS, filter, q), [inRange, filter, q])

  const grouped = useMemo(() => {
    const g = QGROUPS.map(() => [])
    rows.forEach((x) => g[qgroupOf(x)].push(x))
    return g
  }, [rows])

  const tableRows = rows.map((x) => {
    const left = daysFrom(x.valid)
    let sub = ''
    if (x.status === 'sent' && left !== null && left >= 0 && left <= 7) sub = `ينتهي خلال ${left} يوم`
    if (x.status === 'converted' && x.linked) sub = `الفاتورة ${x.linked}`
    if (x.status === 'accepted') sub = 'ينتظر التحويل'
    return {
      key: x.no,
      cells: [
        <DocNo value={x.no} />,
        <PartyCell party={x.c} />,
        <DateCell value={x.date} />,
        <DateCell value={x.valid} rel={x.status === 'sent'} />,
        <StatusCell status={x.status} sub={sub} />,
        <Money value={x.total} muted={DIM.includes(x.status)} />,
      ],
    }
  })

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="عروض الأسعار" sub={<CurrencyNote />} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="عرض سعر جديد" variant="primary" icon="＋"
            onClick={() => nav('/sales/invoices/new?kind=quote')} />
        </div>
      </div>

      <QMoneyHead rows={inRange} />

      <section className="sect" data-component="QuoteTable">
        <header className="sect__h">
          <h2 className="sect__t">العروض<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث باسم العميل أو رقم العرض…" width={260}
              value={q} onChange={setQ} />
            <PageFilter groups={FGROUPS} value={filter} onChange={setFilter} />
            <ViewToggle value={view} onChange={setView} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={setFilter}
          q={q} onQ={setQ} shown={rows.length} total={inRange.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>ما فيه عروض بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر الفترة من فوق.</span>
          </div>
        ) : view === 'list' ? (
          <div className="dlist dlist--quote" data-component="QuoteList">
            {QGROUPS.map((g, i) => (
              <QGroup key={g.id} group={g} rows={grouped[i]}
                selected={selected} onSelect={toggle} />
            ))}
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'رقم العرض', width: '118px', sortable: true },
                { label: 'العميل' },
                { label: 'تاريخ العرض', width: '116px', sortable: true },
                { label: 'صالح حتى', width: '132px', sortable: true, sorted: 'desc' },
                { label: 'الحالة', width: '232px' },
                { label: 'القيمة', num: true, width: '125px', sortable: true },
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, rows.map((x) => x.no))}
            />
            <Pagination from={1} to={rows.length} total={rows.length} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear}
        actions={['تنزيل PDF', 'إرسال بالبريد', 'تحويل لفواتير', 'إلغاء', 'تصدير CSV']} />
    </AppShell>
  )
}
