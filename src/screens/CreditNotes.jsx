import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import { docMenu } from '../components/rowmenu.jsx'
import { ViewToggle } from '../components/doclist.jsx'
import { NGROUPS, ngroupOf, NGroup, NMoneyHead } from '../components/notelist.jsx'
import { PageFilter, FilterChips, DateRange, applyFilter, emptyFilter, inPeriod,
  useSort, byDate, byNum, byText, byParty } from '../components/pagefilter.jsx'
import { TODAY } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import { PrintPreview } from '../components/printpreview.jsx'
import { previewOf } from '../lib/preview.js'

const REASONS = [...new Set(DATA.creditNotes.map((n) => n.reason).filter(Boolean))]
const CITIES  = [...new Set(DATA.creditNotes.map((n) => n.c?.city).filter(Boolean))]

const FGROUPS = [
  {
    id: 'state', label: 'الحالة',
    options: [
      { id: 'all',    label: 'الكل' },
      { id: 'act',    label: 'محتاج تصرّف', test: (n) => ngroupOf(n) === 0 },
      { id: 'issued', label: 'صادرة',       test: (n) => n.status === 'issued' },
      { id: 'draft',  label: 'مسودات',      test: (n) => n.status === 'draft' },
      { id: 'closed', label: 'ملغاة',       test: (n) => ['void', 'cancelled'].includes(n.status) },
    ],
  },
  {
    id: 'zatca', label: 'الهيئة',
    options: [
      { id: 'all',     label: 'الكل' },
      { id: 'ok',      label: 'مقبولة',     test: (n) => n.zatca === 'ok' },
      { id: 'bad',     label: 'مرفوضة',     test: (n) => n.zatca === 'bad' },
      { id: 'pending', label: 'عند الهيئة', test: (n) => n.zatca === 'pending' },
      { id: 'none',    label: 'ما اتصدرتش', test: (n) => !n.zatca },
    ],
  },
  {
    id: 'reason', label: 'السبب',
    options: [
      { id: 'all', label: 'الكل' },
      ...REASONS.map((r) => ({ id: r, label: r, test: (n) => n.reason === r })),
    ],
  },
  {
    id: 'city', label: 'المدينة',
    options: [
      { id: 'all', label: 'الكل' },
      ...CITIES.map((c) => ({ id: c, label: c, test: (n) => n.c?.city === c })),
    ],
  },
]

export default function CreditNotes() {
  const nav = useNavigate()
  const [view, setView] = useState('list')
  const [period, setPeriod] = useState({ id: 'y' })
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const { selected, toggle, selectAll, clear } = useSelection()

  const all = useDocs('creditNotes')
  const inRange = useMemo(
    () => all.filter((n) => inPeriod(n, period, TODAY)), [all, period])

  /* المبيعات في نفس الفترة — عشان نسبة الإشعارات تبقى ليها معنى */
  const salesInRange = useMemo(
    () => DATA.invoices.filter((v) => inPeriod(v, period, TODAY) && v.status !== 'draft'), [period])

  const rows = useMemo(
    () => applyFilter(inRange, FGROUPS, filter, q), [inRange, filter, q])

  const S = useSort({
    no: byText('no'), party: byParty, date: byDate('date'), total: byNum('total'),
  }, 'date')

  /* الإشعار مالوش شاشة مستند لوحدها — «عرض المستند» بيفتح الورقة
     نفسها في المعاينة، ودي نفس اللي بتتطبع. */
  const [preview, setPreview] = useState(null)
  const open = (n) => setPreview(n)

  const on = (id, n) => {
    switch (id) {
      case 'issue':    return ACT.issueDoc('creditNotes', n)
      case 'resubmit': return ACT.resubmitZatca('creditNotes', n)
      case 'mail':     return ACT.sendEmail('creditNotes', n)
      case 'view':     return open(n)
      case 'pdf':      return ACT.downloadPdf('creditNotes', n)
      case 'xml':      return ACT.downloadXml('creditNotes', n)
      case 'print':    return ACT.printDoc()
      default: return undefined
    }
  }
  const bulk = (label) => ACT.bulkAction(label, 'creditNotes', [...selected]).then(clear)

  const grouped = useMemo(() => {
    const g = NGROUPS.map(() => [])
    rows.forEach((n) => g[ngroupOf(n)].push(n))
    return g
  }, [rows])

  const tableRows = S.apply(rows).map((n) => ({
    key: n.no,
    onOpen: () => open(n),
    menu: docMenu({ zatca: n.zatca, onView: () => open(n), on: (id) => on(id, n) }),
    cells: [
      <DocNo value={n.no} />,
      <PartyCell party={n.c} />,
      <DocNo value={n.src} onClick={() => nav(`/sales/invoices/${n.src}`)} />,
      <span className="cell-reason">{n.reason}</span>,
      <DateCell value={n.date} />,
      <StatusCell status={n.status} zatca={n.zatca} zatcaReason={n.zatcaReason} />,
      <Money value={n.total} muted={n.status === 'void'} />,
    ],
  }))

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="إشعارات دائنة"
          sub={<>تقليل مبلغ مستحق على عميل — مرتجعات وخصومات لاحقة<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="إشعار دائن جديد" variant="primary" icon="＋"
            onClick={() => nav('/sales/credit-notes/new')} />
        </div>
      </div>

      <NMoneyHead rows={inRange} sales={salesInRange} kind="credit" />

      <section className="sect" data-component="CreditNoteTable">
        <header className="sect__h">
          <h2 className="sect__t">الإشعارات<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث برقم الإشعار أو الفاتورة الأصلية…" width={260}
              value={q} onChange={setQ} />
            <PageFilter groups={FGROUPS} value={filter} onChange={setFilter} />
            <ViewToggle value={view} onChange={setView} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={setFilter}
          q={q} onQ={setQ} shown={rows.length} total={inRange.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>ما فيه إشعارات بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر الفترة من فوق.</span>
          </div>
        ) : view === 'list' ? (
          <div className="dlist dlist--note" data-component="NoteList">
            {NGROUPS.map((g, i) => (
              <NGroup key={g.id} group={g} rows={grouped[i]} kind="credit"
                selected={selected} onSelect={toggle} onOpen={open} on={on} />
            ))}
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                S.col('رقم الإشعار', 'no', { width: '118px' }),
                { label: 'العميل' },
                { label: 'الفاتورة الأصلية', width: '128px' },
                { label: 'السبب', width: '150px' },
                S.col('التاريخ', 'date', { width: '116px' }),
                { label: 'الحالة', width: '210px' },
                S.col('المبلغ المخصوم', 'total', { num: true, width: '140px' }),
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, rows.map((n) => n.no))}
            />
            <Pagination from={1} to={rows.length} total={rows.length} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear} onAction={bulk}
        actions={['تنزيل PDF', 'إرسال بالبريد', 'إعادة الإرسال للهيئة', 'تصدير CSV']} />

      {preview && (
        <PrintPreview doc={previewOf(preview, 'custCredit')} onClose={() => setPreview(null)} />
      )}
    </AppShell>
  )
}
