import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import { ViewToggle } from '../components/doclist.jsx'
import { QGROUPS, qgroupOf, QGroup, QMoneyHead } from '../components/quotelist.jsx'
import { PageFilter, FilterChips, DateRange, applyFilter, emptyFilter, inPeriod,
  useSort, byDate, byNum, byText, byParty } from '../components/pagefilter.jsx'
import { daysFrom, TODAY } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'

const DIM = ['cancelled', 'rejected', 'expired']

/* المدن اللي فيها عملاء فعلًا — مفيش خيار بيرجّع صفر */
const CITIES = [...new Set(DATA.quotations.map((q) => q.c?.city).filter(Boolean))]

/* ---------- أبعاد الفلترة جوّه الجدول ----------
   الفترة مش هنا — دي فوق، لأنها بتغيّر «إيه اللي بنتكلم عنه» مش «إيه اللي بنعرضه». */
const FGROUPS = [
  {
    id: 'type', label: 'نوع المستند',
    options: [
      { id: 'all', label: 'الكل' },
      { id: 'quo', label: 'عروض أسعار',      test: (q) => !DATA.isPrf(q) },
      { id: 'prf', label: 'فواتير مبدئية',   test: (q) => DATA.isPrf(q) },
    ],
  },
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
  const all = useDocs('quotations')
  const inRange = useMemo(
    () => all.filter((x) => inPeriod(x, period, TODAY)), [all, period])

  const rows = useMemo(
    () => applyFilter(inRange, FGROUPS, filter, q), [inRange, filter, q])

  const S = useSort({
    no: byText('no'), party: byParty, date: byDate('date'),
    valid: byDate('valid'), total: byNum('total'),
  }, 'valid')

  const open = (no) => nav(`/sales/quotations/${no}`)

  const on = (id, q) => {
    switch (id) {
      case 'send':    return ACT.sendEmail('quotations', q)
      case 'mail':    return ACT.sendEmail('quotations', q)
      case 'remind':  return ACT.sendEmail('quotations', q)
      case 'convert': return ACT.convertQuote(q, () => nav('/sales/invoices/new'))
      case 'renew':
      case 'revise':
      case 'dup':     return nav('/sales/invoices/new?kind=quote')
      case 'goinv':   return nav(`/sales/invoices/${q.linked || ''}`)
      case 'view':    return open(q.no)
      case 'pdf':     return ACT.downloadPdf('quotations', q)
      case 'print':   return ACT.printDoc()
      case 'cancel':  return ACT.cancelDoc('quotations', q)
      default: return undefined
    }
  }
  const bulk = (label) => ACT.bulkAction(label, 'quotations', [...selected]).then(clear)

  const grouped = useMemo(() => {
    const g = QGROUPS.map(() => [])
    rows.forEach((x) => g[qgroupOf(x)].push(x))
    return g
  }, [rows])

  const tableRows = S.apply(rows).map((x) => {
    const left = daysFrom(x.valid)
    let sub = ''
    if (x.status === 'sent' && left !== null && left >= 0 && left <= 7) sub = `ينتهي خلال ${left} يوم`
    if (x.status === 'converted' && x.linked) sub = `الفاتورة ${x.linked}`
    if (x.status === 'accepted') sub = 'ينتظر التحويل'
    if (DATA.isPrf(x) && x.status === 'sent' && !sub) sub = 'بانتظار السداد'
    const act = x.status === 'accepted'
      ? { label: 'تحويل لفاتورة', onClick: () => on('convert', x) } : null
    return {
      key: x.no,
      onOpen: () => nav(`/sales/quotations/${x.no}`),
      action: act,
      menu: [
        { label: DATA.isPrf(x) ? 'عرض المستند' : 'عرض العرض', onClick: () => open(x.no) },
        { sep: true },
        { label: 'تنزيل PDF', onClick: () => on('pdf', x) },
        { label: 'طباعة', onClick: () => on('print', x) },
        { label: 'إرسال بالبريد', onClick: () => on('mail', x) },
      ],
      cells: [
        <DocNo value={x.no} sub={DATA.qKindAr(x)} />,
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
        <PageHeader title="عروض الأسعار والفواتير المبدئية" sub={<CurrencyNote />} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="فاتورة مبدئية" variant="outline"
            onClick={() => nav('/sales/invoices/new?kind=prf')} />
          <Button label="عرض سعر جديد" variant="primary" icon="＋"
            onClick={() => nav('/sales/invoices/new?kind=quote')} />
        </div>
      </div>

      <QMoneyHead rows={inRange} />

      <section className="sect" data-component="QuoteTable">
        <header className="sect__h">
          <h2 className="sect__t">المستندات<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث باسم العميل أو رقم المستند…" width={260}
              value={q} onChange={setQ} />
            <PageFilter groups={FGROUPS} value={filter} onChange={setFilter} />
            <ViewToggle value={view} onChange={setView} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={setFilter}
          q={q} onQ={setQ} shown={rows.length} total={inRange.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>ما فيه مستندات بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر الفترة من فوق.</span>
          </div>
        ) : view === 'list' ? (
          <div className="dlist dlist--quote" data-component="QuoteList">
            {QGROUPS.map((g, i) => (
              <QGroup key={g.id} group={g} rows={grouped[i]}
                selected={selected} onSelect={toggle} onOpen={open} on={on} />
            ))}
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                S.col('رقم المستند', 'no', { width: '124px' }),
                S.col('العميل', 'party'),
                S.col('تاريخ المستند', 'date', { width: '120px' }),
                S.col('صالح حتى', 'valid', { width: '132px' }),
                { label: 'الحالة', width: '232px' },
                S.col('القيمة', 'total', { num: true, width: '125px' }),
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, rows.map((x) => x.no))}
            />
            <Pagination from={1} to={rows.length} total={rows.length} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear} onAction={bulk}
        actions={['تنزيل PDF', 'إرسال بالبريد', 'تحويل لفواتير', 'إلغاء', 'تصدير CSV']} />
    </AppShell>
  )
}
