import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip } from '../components/layout.jsx'
import { DataTable } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, StatusCell } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byDate, byNum, byText, DateRange, inPeriod } from '../components/pagefilter.jsx'
import { TransferForm } from '../components/transferform.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'   /* Date — للفلاتر */
import { useDocs } from '../lib/store.js'
import * as R from '../lib/reports.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   التحويل بين الحسابات.

   التحويل مش مصروف ومش إيراد — الفلوس ما خرجتش من المنشأة، هي
   بس غيّرت مكانها. الشاشة لازم تقول ده بوضوح، وإلا المستخدم
   يفتكر إن الشركة صرفت ١٨ ألف وهي بس نقلتهم من الشبكة للبنك.

   عشان كده:
   • الصف بيتقري كجملة: **من → إلى** بسهم فعلي، مش عمودين.
   • كارت الملخّص بيقول «اتنقل» مش «اتصرف».
   • **الرسوم هي المصروف الوحيد الحقيقي** في العملية، فليها عمود
     مستقل ومكتوب إنها بتروح على «رسوم بنكية».

   عند العميل التحويل بياخد سعر صرف لو الحسابين بعملتين. كل
   حساباتنا بالريال دلوقتي، فالحقل بيظهر **لما يبقى ليه لازمة بس**
   بدل ما يبقى حقل فاضي في كل تحويل.
   ============================================================ */

const PER_PAGE = 14

const FGROUPS = [
  {
    id: 'from', label: 'من حساب',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.cashAccounts.map((a) => ({ id: a.acc, label: a.ar, test: (t) => t.from === a.acc }))],
  },
  {
    id: 'to', label: 'إلى حساب',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.cashAccounts.map((a) => ({ id: a.acc, label: a.ar, test: (t) => t.to === a.acc }))],
  },
  {
    id: 'st', label: 'الحالة',
    options: [
      { id: 'all', label: 'الكل' },
      { id: 'posted', label: 'مُرحَّلة', test: (t) => t.status === 'posted' },
      { id: 'draft',  label: 'مسودات',  test: (t) => t.status === 'draft' },
    ],
  },
]

export default function CashTransfers() {
  const nav = useNavigate()
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'y' })
  const [form, setForm] = useState(false)

  const all = useDocs('cashTransfers')
    .filter((t) => t.status !== 'deleted')
    .filter((t) => inPeriod(t, period, TODAY))

  const S = useSort({
    no: byText('no'), date: byDate('date'), amount: byNum('amount'), fee: byNum('fee'),
  }, 'date')

  const text = (t) => [t.no, t.ref, DATA.accName(t.from), DATA.accName(t.to)]
  const rows = useMemo(
    () => S.apply(applyFilter(all, FGROUPS, filter, q, text)), [all, filter, q, S.sort])

  const sum = useMemo(() => {
    const p = rows.filter((t) => t.status === 'posted')
    return {
      moved: p.reduce((a, t) => a + t.amount, 0),
      fees: p.reduce((a, t) => a + (t.fee || 0), 0),
      drafts: rows.filter((t) => t.status === 'draft').length,
    }
  }, [rows])

  const tableRows = rows.slice(0, PER_PAGE).map((t) => ({
    key: t.no,
    action: t.status === 'draft'
      ? { label: 'ترحيل', tone: 'go',
          onClick: () => ACT.postTransfer(t, DATA.accName(t.from), DATA.accName(t.to),
            fmtMoney(DATA.transferOut(t))) }
      : null,
    menu: [
      { label: 'حساب المصدر', Ic: Ico.bank, onClick: () => nav(`/cash/accounts/${t.from}`) },
      { label: 'حساب الوجهة', Ic: Ico.bank, onClick: () => nav(`/cash/accounts/${t.to}`) },
      { sep: true },
      { label: 'ترحيل', Ic: Ico.check,
        onClick: () => ACT.postTransfer(t, DATA.accName(t.from), DATA.accName(t.to),
          fmtMoney(DATA.transferOut(t))),
        off: t.status !== 'draft', why: 'المُرحَّل ما بيترحّلش تاني' },
      { label: 'عكس التحويل', Ic: Ico.retry, tone: 'crit',
        onClick: () => ACT.reverseTransfer(t),
        off: t.status !== 'posted', why: 'العكس للمُرحَّل بس' },
    ],
    cells: [
      <span className="num" style={{ fontSize: 'var(--fs-xs)' }}>{t.no}</span>,

      <span className="movecell">
        <b>{DATA.accName(t.from)}</b>
        <i aria-hidden="true">←</i>
        <b>{DATA.accName(t.to)}</b>
      </span>,

      <span>{fmtDate(t.date)}</span>,

      <span className="itcell">
        <b>{t.ref || <em className="hint">من غير بيان</em>}</b>
        <em>{DATA.CASH_KIND_AR[DATA.cashAccountOf(t.from)?.kind]} ← {DATA.CASH_KIND_AR[DATA.cashAccountOf(t.to)?.kind]}</em>
      </span>,

      <StatusCell status={t.status} />,

      t.fee > 0
        ? <span className="flowamt is-out">−<Money value={t.fee} /></span>
        : <span className="hint">مفيش</span>,

      <Money value={t.amount} />,
    ],
  }))

  const col = S.col

  return (
    <AppShell search="ابحث برقم التحويل أو الحساب…">
      <div className="tophead">
        <PageHeader title="التحويل بين الحسابات"
          sub={<>نقل فلوس بين حسابات المنشأة — مش مصروف ومش إيراد<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="إنشاء تحويل" variant="primary" icon="＋" onClick={() => setForm(true)} />
        </div>
      </div>

      <SummaryStrip
        label="اللي اتنقل بين الحسابات"
        value={sum.moved}
        note={`${rows.filter((t) => t.status === 'posted').length} تحويل مُرحَّل — الفلوس ما خرجتش من المنشأة`}
        items={[
          { label: 'رسوم بنكية على التحويلات', value: sum.fees, alert: sum.fees > 0 },
          { label: 'مسودات لسه ما اترحّلتش', value: String(sum.drafts),
            money: false, alert: sum.drafts > 0 },
        ]}
      />

      <section className="sect" data-component="TransfersTable">
        <header className="sect__h">
          <h2 className="sect__t">التحويلات<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="الرقم أو الحساب أو البيان…" width={250}
              value={q} onChange={setQ} />
            <PageFilter groups={FGROUPS} value={filter} onChange={setFilter} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={setFilter}
          q={q} onQ={setQ} shown={rows.length} total={all.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش تحويلات بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو غيّر الفترة من فوق.</span>
          </div>
        ) : (
          <DataTable
            columns={[
              col('الرقم', 'no', { width: '124px' }),
              { label: 'الحركة', width: '280px' },
              col('التاريخ', 'date', { width: '118px' }),
              { label: 'البيان' },
              { label: 'الحالة', width: '146px' },
              col('الرسوم', 'fee', { num: true, width: '120px' }),
              col('المبلغ', 'amount', { num: true, width: '134px' }),
            ]}
            rows={tableRows}
          />
        )}

        <p className="fnote fnote--quiet">
          الرسوم بتتقيّد على <b>رسوم بنكية</b> كمصروف — وهي الحاجة الوحيدة اللي
          بتخرج من المنشأة فعلًا في التحويل.
        </p>
      </section>

      {form && <TransferForm onClose={() => setForm(false)} />}
    </AppShell>
  )
}
