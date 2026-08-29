import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { DataTable, Pagination } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, StatusCell } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byDate, byNum, byText, DateRange, inPeriod } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'
import { JournalForm } from '../components/journalform.jsx'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   قيود اليومية.

   ★ أهم فكرة في الشاشة دي: **أغلب القيود مش بتتكتب بالإيد.**

   في السيستم ده كل مستند بيترحّل بيكتب قيده لوحده — الفاتورة
   والمصروف وسند الصرف والتحويل. القيد اليدوي هو الاستثناء:
   تسويات آخر الشهر اللي مالهاش مستند.

   شاشة قيود اليومية عند العميل بتعرض القيود اليدوية بس، فالمستخدم
   بيفتكر إن الدفتر شبه فاضي. هنا بنعرض **الدفتر كله**، وكل قيد
   بيقول جاي من فين: «فاتورة INV-…» ولا «قيد يدوي». والفلتر
   الأول في الشاشة هو ده بالظبط.

   وقاعدة من البورد: **رقم القيد هو المسلسل الوحيد** في السيستم،
   وباقي المستندات أرقامها عشوائية. عشان كده القيود اليدوية
   متتابعة من غير فجوات، والفجوة فيها معناها قيد اتمسح — وده
   ما بيحصلش أصلًا لأن المُرحَّل بيتعكس مش بيتحذف.
   ============================================================ */

const SRC = {
  journal:     { ar: 'قيد يدوي',        go: null },
  invoices:    { ar: 'فاتورة مبيعات',   go: '/sales/invoices' },
  receipt:     { ar: 'تحصيل',           go: '/cash/receipts' },
  creditNotes: { ar: 'إشعار دائن',      go: '/sales/credit-notes' },
  debitNotes:  { ar: 'إشعار مدين',      go: '/sales/debit-notes' },
  bills:       { ar: 'فاتورة مشتريات',  go: '/purchases/bills' },
  payment:     { ar: 'سداد مورد',       go: '/cash/payments' },
  supCredit:   { ar: 'إشعار مورد دائن', go: '/purchases/bills' },
  supDebit:    { ar: 'إشعار مورد مدين', go: '/purchases/bills' },
  expenses:    { ar: 'مصروف',           go: '/purchases/expenses' },
  customs:     { ar: 'بيان جمركي',      go: '/purchases/customs' },
  receipts:    { ar: 'سند قبض',         go: '/cash/receipts' },
  payments:    { ar: 'سند صرف',         go: '/cash/payments' },
  transfers:   { ar: 'تحويل بين حسابات', go: '/cash/transfers' },
  opening:     { ar: 'رصيد افتتاحي',    go: null },
}

const TABS = [
  { id: 'all',    label: 'كل القيود',   test: () => true },
  { id: 'manual', label: 'يدوية',       test: (e) => e.kind === 'journal' },
  { id: 'auto',   label: 'من المستندات', test: (e) => e.kind !== 'journal' },
]

const PER_PAGE = 16

const FGROUPS = [
  {
    id: 'src', label: 'مصدر القيد',
    options: [{ id: 'all', label: 'الكل' },
      ...Object.entries(SRC).map(([k, v]) => ({
        id: k, label: v.ar, test: (e) => e.kind === k }))],
  },
]

export default function JournalEntries() {
  const nav = useNavigate()
  const [tab, setTab] = useState('all')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'y' })
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(false)
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  /* الدفتر كله + المسودات اليدوية (اللي لسه ما دخلتش الدفتر) */
  const all = useMemo(() => {
    const posted = R.journal().map((e) => ({
      ...e,
      total: e.lines.reduce((s, l) => s + l.dr, 0),
      status: 'posted',
      n: e.lines.length,
    }))
    const drafts = DATA.journalEntries
      .filter((j) => j.status === 'draft')
      .map((j) => ({
        date: j.date, kind: 'journal', no: j.no, memo: j.memo,
        go: `/accounting/journal/${j.no}`, lines: j.lines,
        total: DATA.entryDr(j), status: 'draft', n: j.lines.length,
      }))
    return [...drafts, ...posted]
      .filter((e) => inPeriod(e, period, TODAY))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [period])

  const S = useSort({
    no: byText('no'), date: byDate('date'), total: byNum('total'),
  }, 'date')

  const text = (e) => [e.no, e.memo, e.party, SRC[e.kind]?.ar]
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])
  const inTab = useMemo(() => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])
  const rows = useMemo(
    () => S.apply(applyFilter(inTab, FGROUPS, filter, q, text)), [inTab, filter, q, S.sort])

  const sum = useMemo(() => ({
    total: rows.filter((e) => e.status === 'posted').reduce((a, e) => a + e.total, 0),
    manual: rows.filter((e) => e.kind === 'journal' && e.status === 'posted').length,
    drafts: rows.filter((e) => e.status === 'draft').length,
  }), [rows])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const openEntry = (e) => {
    if (e.kind === 'journal') nav(`/accounting/journal/${e.no}`)
    else if (e.go) nav(e.go)
  }

  const tableRows = shown.map((e) => ({
    key: `${e.no}-${e.date}-${e.kind}`,
    onOpen: () => openEntry(e),
    menu: [
      { label: e.kind === 'journal' ? 'فتح القيد' : 'فتح المستند', Ic: Ico.search,
        onClick: () => openEntry(e), off: !e.go, why: 'القيد ده مالوش مستند' },
      { label: 'دفتر الأستاذ', Ic: Ico.ledger,
        onClick: () => nav(`/accounting/ledger?acc=${e.lines[0]?.acc}`) },
    ],
    cells: [
      <span className="num" style={{ fontSize: 'var(--fs-xs)' }}>{e.no}</span>,
      <span>{fmtDate(e.date)}</span>,
      <span className="itcell">
        <b>{e.memo}</b>
        <em>{e.party || `${e.n} أطراف`}</em>
      </span>,
      e.kind === 'journal'
        ? <span className="st st--info">قيد يدوي</span>
        : <span className="st st--neutral">{SRC[e.kind]?.ar || e.kind}</span>,
      <StatusCell status={e.status} />,
      <Money value={e.total} />,
    ],
  }))

  const col = S.col

  return (
    <AppShell search="ابحث برقم القيد أو البيان…">
      <div className="tophead">
        <PageHeader title="قيود اليومية"
          sub={<>كل حركة في الدفتر — من المستندات ومن التسويات اليدوية<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={reset(setPeriod)} today={TODAY} />
          <Button label="دفتر الأستاذ" variant="ghost" onClick={() => nav('/accounting/ledger')} />
          <Button label="قيد يدوي جديد" variant="primary" icon="＋" onClick={() => setForm(true)} />
        </div>
      </div>

      <SummaryStrip
        label="حركة الدفتر في الفترة"
        value={sum.total}
        note={`${rows.filter((e) => e.status === 'posted').length} قيد مُرحَّل — مجموع الطرف المدين`}
        items={[
          { label: 'قيود يدوية', value: String(sum.manual), money: false },
          { label: 'مسودات لسه ما اترحّلتش', value: String(sum.drafts),
            money: false, alert: sum.drafts > 0 },
        ]}
      />

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={reset(setTab)} />

      <section className="sect" data-component="JournalTable">
        <header className="sect__h">
          <h2 className="sect__t">القيود<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="الرقم أو البيان أو الطرف…" width={260}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش قيود بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو غيّر الفترة من فوق.</span>
          </div>
        ) : (
          <>
            <DataTable
              selectable={false}
              columns={[
                col('رقم القيد', 'no', { width: '134px' }),
                col('التاريخ', 'date', { width: '120px' }),
                { label: 'البيان' },
                { label: 'المصدر', width: '164px' },
                { label: 'الحالة', width: '140px' },
                col('المبلغ', 'total', { num: true, width: '140px' }),
              ]}
              rows={tableRows}
            />
            <Pagination from={(cur - 1) * PER_PAGE + 1}
              to={Math.min(cur * PER_PAGE, rows.length)} total={rows.length}
              page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}

        <p className="fnote fnote--quiet">
          القيد اللي مصدره مستند <b>بيتعدّل من المستند نفسه</b> — مش من هنا.
          والقيد المُرحَّل مينفعش يتعدّل خالص: التصحيح بيبقى بقيد عكسي.
        </p>
      </section>

      {form && <JournalForm onClose={() => setForm(false)} />}
    </AppShell>
  )
}
