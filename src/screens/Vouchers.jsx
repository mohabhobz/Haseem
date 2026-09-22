import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { DataTable, Pagination } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, StatusCell } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { VoucherForm } from '../components/voucherform.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byDate, byNum, byText, DateRange, inPeriod } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'   /* Date — للفلاتر */
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   سندات القبض والصرف.

   ★ القرار الأساسي في الموديول ده — واخد شرح طويل لأنه بيغيّر
   شكل شاشتين:

   في سيستم العميل «تسجيل دفعة» على الفاتورة حاجة، و«سندات الصرف»
   شاشة تانية في موديول تاني وصفها «المدفوعات النقدية **خارج
   الفواتير**». يعني المستخدم اللي عايز يدفع لمورد لازم يعرف
   الفرق بين الحالتين **قبل** ما يبدأ، وهو مش عارفه.
   وكشف حساب المورد بيعرض الاتنين مع بعض أصلًا — فالتفرقة دي
   مش موجودة في النتيجة، موجودة في الطريق بس.

   عندنا: **قايمة واحدة** فيها كل قبض أو صرف، وعمود بيقول جاي
   منين — «على فاتورة INV-…» ولا «مباشر». المستخدم بيدوّر على
   الفلوس مش على الشاشة اللي اتسجّلت فيها.

   والقيد بيتكتب **مرة واحدة**: السند اللي على مستند مقيّد مع
   المستند نفسه، والمستقل بس هو اللي بيكتب قيد جديد. لو عرضناهم
   من غير القاعدة دي كان النقد هيتحسب مرتين.
   ============================================================ */

const CFG = {
  receipts: {
    ar: 'سندات القبض', one: 'سند قبض', px: 'RV',
    verb: 'مقبوض', dir: 'in', party: 'من', partyAr: 'المستلَم منه',
    sum: 'إجمالي المقبوض', route: '/cash/receipts',
    sub: 'كل ريال دخل الخزنة أو الحساب البنكي — من فاتورة أو من غيرها',
    empty: 'مفيش سندات قبض بالفلترة دي',
  },
  payments: {
    ar: 'سندات الصرف', one: 'سند صرف', px: 'PV',
    verb: 'مصروف', dir: 'out', party: 'إلى', partyAr: 'المصروف له',
    sum: 'إجمالي المصروف', route: '/cash/payments',
    sub: 'كل ريال خرج من الخزنة أو الحساب البنكي — على فاتورة أو مباشر',
    empty: 'مفيش سندات صرف بالفلترة دي',
  },
}

const TABS = [
  { id: 'all',    label: 'الكل',      test: (v) => v.status !== 'deleted' },
  { id: 'posted', label: 'مُرحَّلة',   test: (v) => v.status === 'posted' },
  { id: 'draft',  label: 'مسودات',    test: (v) => v.status === 'draft' },
  { id: 'direct', label: 'مباشرة',    test: (v) => !v.src && v.status !== 'deleted' },
]

const WAYS = ['تحويل بنكي', 'نقدًا', 'شيك', 'شبكة']
const PER_PAGE = 14

const FGROUPS = [
  {
    id: 'acc', label: 'الحساب المالي',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.cashAccounts.map((a) => ({
        id: a.acc, label: a.ar, test: (v) => v.acc === a.acc }))],
  },
  {
    id: 'src', label: 'المصدر',
    options: [
      { id: 'all', label: 'الكل' },
      { id: 'doc',    label: 'على مستند', test: (v) => !!v.src },
      { id: 'direct', label: 'مباشر',     test: (v) => !v.src },
    ],
  },
  {
    id: 'way', label: 'طريقة الدفع',
    options: [{ id: 'all', label: 'الكل' },
      ...WAYS.map((w) => ({ id: w, label: w, test: (v) => v.way === w }))],
  },
]

export default function Vouchers({ kind = 'receipts' }) {
  const C = CFG[kind]
  const nav = useNavigate()
  const [tab, setTab] = useState('all')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'y' })
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(false)
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  /* الأوفرلاي بيسري على السندات المستقلة بس — اللي على مستند
     حالته بتيجي من المستند نفسه */
  const overlay = useDocs(kind === 'receipts' ? 'receiptVouchers' : 'paymentVouchers')
  const all = useMemo(() => {
    const base = kind === 'receipts' ? DATA.receipts() : DATA.payments()
    const byNo = Object.fromEntries(overlay.map((o) => [o.no, o]))
    return base
      .map((v) => (byNo[v.no] ? { ...v, ...byNo[v.no] } : v))
      .filter((v) => v.status !== 'deleted')
      .filter((v) => inPeriod(v, period, TODAY))
  }, [overlay, period, kind])

  const S = useSort({
    no: byText('no'), date: byDate('date'), amount: byNum('amount'),
    party: (a, b) => DATA.partyAr(a.party).localeCompare(DATA.partyAr(b.party), 'ar'),
  }, 'date')

  const text = (v) => [v.no, DATA.partyAr(v.party), v.ref, v.memo, v.src]
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])
  const inTab = useMemo(() => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])
  const rows = useMemo(
    () => S.apply(applyFilter(inTab, FGROUPS, filter, q, text)), [inTab, filter, q, S.sort])

  const sum = useMemo(() => {
    const p = rows.filter((v) => v.status === 'posted')
    return {
      total: p.reduce((a, v) => a + v.amount, 0),
      onDoc: p.filter((v) => v.src).reduce((a, v) => a + v.amount, 0),
      direct: p.filter((v) => !v.src).reduce((a, v) => a + v.amount, 0),
      drafts: rows.filter((v) => v.status === 'draft').length,
    }
  }, [rows])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const open = (v) => nav(`${C.route}/${v.no}`)

  const tableRows = shown.map((v) => ({
    key: v.no,
    onOpen: () => open(v),
    action: v.status === 'draft'
      ? { label: 'ترحيل', tone: 'go',
          onClick: () => ACT.postVoucher(kind, v, fmtMoney(v.amount),
            DATA.partyAr(v.party), DATA.accName(v.acc)) }
      : null,
    menu: [
      { label: `فتح ${C.one}`, Ic: Ico.search, onClick: () => open(v) },
      { label: 'المستند الأصلي', Ic: Ico.invoice, onClick: () => v.srcGo && nav(v.srcGo),
        off: !v.src, why: 'السند ده مباشر — مالوش مستند' },
      { sep: true },
      { label: 'ترحيل', Ic: Ico.check,
        onClick: () => ACT.postVoucher(kind, v, fmtMoney(v.amount),
          DATA.partyAr(v.party), DATA.accName(v.acc)),
        off: v.status !== 'draft', why: 'المُرحَّل ما بيترحّلش تاني' },
      { label: 'عكس السند', Ic: Ico.retry, onClick: () => ACT.reverseVoucher(kind, v),
        off: v.status !== 'posted' || !!v.src,
        why: v.src ? 'اعكسه من المستند الأصلي' : 'العكس للمُرحَّل بس' },
      { label: 'حذف المسودة', Ic: Ico.trash, tone: 'crit',
        onClick: () => ACT.deleteVoucher(kind, v),
        off: v.status !== 'draft', why: 'المُرحَّل بيتعكس مش بيتحذف' },
    ],
    cells: [
      <span className="num" style={{ fontSize: 'var(--fs-xs)' }}>{v.no}</span>,

      <span className="itcell">
        <b>{DATA.partyAr(v.party)}</b>
        <em>{v.memo || <span className="hint">من غير بيان</span>}</em>
      </span>,

      <span>{fmtDate(v.date)}</span>,

      <span className="dcell">
        {DATA.accName(v.acc)}
        <em>{v.way}</em>
      </span>,

      v.src
        ? <button className="cell-doc cell-doc--link num"
            onClick={(e) => { e.stopPropagation(); nav(v.srcGo) }}>{v.src}</button>
        : <span className="st st--neutral">مباشر</span>,

      <StatusCell status={v.status} />,

      <span className={`flowamt is-${C.dir}`}>
        {C.dir === 'in' ? '+' : '−'}<Money value={v.amount} />
      </span>,
    ],
  }))

  const col = S.col

  return (
    <AppShell search={`ابحث برقم السند أو الطرف…`}>
      <div className="tophead">
        <PageHeader title={C.ar} sub={<>{C.sub}<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={reset(setPeriod)} today={TODAY} />
          <Button label="تصدير CSV" variant="ghost"
            onClick={() => ACT.bulkAction('تصدير CSV', kind, rows.map((v) => v.no))} />
          <Button label={`إنشاء ${C.one}`} variant="primary" icon="＋"
            onClick={() => setForm(true)} />
        </div>
      </div>

      <SummaryStrip
        label={C.sum}
        value={sum.total}
        note={`${rows.filter((v) => v.status === 'posted').length} سند مُرحَّل في الفترة`}
        items={[
          { label: 'على مستندات', value: sum.onDoc },
          { label: 'مباشر — من غير مستند', value: sum.direct },
          { label: 'مسودات لسه ما اترحّلتش', value: String(sum.drafts),
            money: false, alert: sum.drafts > 0 },
        ]}
      />

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={reset(setTab)} />

      <section className="sect" data-component="VoucherTable">
        <header className="sect__h">
          <h2 className="sect__t">{C.ar}<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="الرقم أو الطرف أو المرجع…" width={260}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>{C.empty}</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر الفترة من فوق.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                col('الرقم', 'no', { width: '124px' }),
                col(C.partyAr, 'party'),
                col('التاريخ', 'date', { width: '118px' }),
                { label: 'الحساب المالي', width: '182px' },
                { label: 'المصدر', width: '132px' },
                { label: 'الحالة', width: '150px' },
                col('المبلغ', 'amount', { num: true, width: '138px' }),
              ]}
              rows={tableRows}
            />
            <Pagination from={(cur - 1) * PER_PAGE + 1}
              to={Math.min(cur * PER_PAGE, rows.length)} total={rows.length}
              page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}

        <p className="fnote fnote--quiet">
          السند اللي على مستند <b>مقيّد مع المستند نفسه</b> — بيبان هنا عشان
          تلاقي الفلوس من مكان واحد، مش عشان يتقيّد تاني.
        </p>
      </section>

      {form && <VoucherForm kind={kind} onClose={() => setForm(false)} />}
    </AppShell>
  )
}
