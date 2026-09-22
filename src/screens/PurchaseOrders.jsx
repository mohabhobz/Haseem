import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
   أوامر الشراء.

   سيستم العميل عنده **٩ حالات** على الأمر الواحد: مسودة · معتمد ·
   مرسل · استلام جزئي · مستلم · مفوتر جزئياً · مفوتر · مغلق · ملغي.
   المستخدم لازم يحفظ التسعة ويعرف الفرق بين «مستلم» و«مفوتر».

   بس دول مش تسعة — دول **حالة واحدة وبُعدين**:
   • حالة الأمر: مسودة ← معتمد ← مرسل ← مقفول (أو ملغي)
   • **الاستلام** — وصل كام من اللي طلبناه؟
   • **الفوترة**  — اتفوتر كام من اللي طلبناه؟

   والبُعدين دول أرقام مش أسماء. فبقوا **شريطين تقدّم** بيقولوا
   «١٦٠٠ من ٢٨٠٠ اتستلم» بدل بادچ مكتوب عليه «استلام جزئي».
   ============================================================ */

const TABS = [
  { id: 'open',   label: 'مفتوحة',  test: (p) => DATA.poLive(p) },
  { id: 'recv',   label: 'مستنية استلام', test: (p) => DATA.poLive(p) && DATA.poRecvPct(p) < 1 },
  { id: 'bill',   label: 'مستنية فوترة',  test: (p) => DATA.poLive(p) && DATA.poGot(p) > DATA.poBilled(p) },
  { id: 'draft',  label: 'مسودات',  test: (p) => p.status === 'draft' },
  { id: 'all',    label: 'الكل',    test: () => true },
]

const FGROUPS = [
  {
    id: 'st', label: 'حالة الأمر',
    options: [
      { id: 'all', label: 'الكل' },
      { id: 'draft',    label: 'مسودة',  test: (p) => p.status === 'draft' },
      { id: 'approved', label: 'معتمد',  test: (p) => p.status === 'approved' },
      { id: 'sent',     label: 'مُرسَل',  test: (p) => p.status === 'sent' },
      { id: 'closed',   label: 'مقفول',  test: (p) => p.status === 'closed' },
      { id: 'cancelled', label: 'ملغي',  test: (p) => p.status === 'cancelled' },
    ],
  },
  {
    id: 'recv', label: 'الاستلام',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'no',   label: 'ما وصلش حاجة', test: (p) => DATA.poGot(p) === 0 },
      { id: 'part', label: 'وصل جزء',      test: (p) => DATA.poGot(p) > 0 && DATA.poRecvPct(p) < 1 },
      { id: 'full', label: 'وصل بالكامل',  test: (p) => DATA.poRecvPct(p) >= 1 },
    ],
  },
  {
    id: 'bill', label: 'الفوترة',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'no',   label: 'ما اتفوترش',   test: (p) => DATA.poBilled(p) === 0 },
      { id: 'part', label: 'اتفوتر جزء',   test: (p) => DATA.poBilled(p) > 0 && DATA.poBillPct(p) < 1 },
      { id: 'full', label: 'اتفوتر بالكامل', test: (p) => DATA.poBillPct(p) >= 1 },
    ],
  },
  {
    id: 'sup', label: 'المورد',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.suppliers.map((s) => ({ id: s.id, label: s.ar, test: (p) => p.s.id === s.id }))],
  },
]

const poText = (p) => [p.no, p.s?.ar, p.s?.en, p.note]
const PER_PAGE = 12

/* شريط التقدّم — ده اللي بيشيل مكان أربع حالات من التسعة */
function Prog({ done, total, unit, label }) {
  const pct = total > 0 ? Math.min(1, done / total) : 0
  const full = pct >= 1
  return (
    <span className={`prog${full ? ' is-full' : done > 0 ? ' is-part' : ''}`}>
      <b className="num">{done}<em> من {total}</em></b>
      <i className="prog__bar" aria-hidden="true"><i style={{ width: `${pct * 100}%` }} /></i>
      <em className="prog__l">{full ? `${label} بالكامل` : done > 0 ? `${label} جزئي` : `لسه ما ${label}ش`}</em>
    </span>
  )
}

export default function PurchaseOrders() {
  const nav = useNavigate()
  const [tab, setTab] = useState('open')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'all' })
  const [page, setPage] = useState(1)
  const { selected, toggle, selectAll, clear } = useSelection()
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const all = (useDocs('purchaseOrders').filter((p) => !p.deleted))
    .filter((x) => inPeriod(x, period, TODAY))

  const S = useSort({
    date: byDate('date'),
    expect: byDate('expect'),
    sup: (a, b) => String(a.s?.ar || '').localeCompare(String(b.s?.ar || ''), 'ar'),
    value: (a, b) => DATA.docTotal(a) - DATA.docTotal(b),
    open: (a, b) => DATA.poOpenValue(a) - DATA.poOpenValue(b),
    no: byText('no'),
  }, 'date')

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])

  const inTab = useMemo(
    () => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])

  const rows = useMemo(
    () => S.apply(applyFilter(inTab, FGROUPS, filter, q, poText)),
    [inTab, filter, q, S.sort])

  const sum = useMemo(() => {
    const live = rows.filter(DATA.poLive)
    return {
      commit: live.reduce((a, p) => a + DATA.poOpenValue(p), 0),
      waitRecv: live.filter((p) => DATA.poRecvPct(p) < 1).length,
      waitBill: live.filter((p) => DATA.poGot(p) > DATA.poBilled(p)).length,
      late: live.filter((p) => { const d = daysFrom(p.expect); return d !== null && d < 0 && DATA.poRecvPct(p) < 1 }).length,
    }
  }, [rows])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const open = (no) => nav(`/purchases/orders/${no}`)

  const tableRows = shown.map((p) => {
    const qty = DATA.poQty(p), got = DATA.poGot(p), billed = DATA.poBilled(p)
    const lateD = daysFrom(p.expect)
    const isLate = DATA.poLive(p) && lateD !== null && lateD < 0 && got < qty
    return {
      key: p.no,
      onOpen: () => open(p.no),
      action: p.status === 'draft'
        ? { label: 'اعتماد', tone: 'go', onClick: () => ACT.approvePO(p) }
        : DATA.poLive(p) && got < qty
          ? { label: 'تسجيل استلام', tone: 'go', onClick: () => open(p.no) }
          : DATA.poLive(p) && got > billed
            ? { label: 'تحويل لفاتورة', tone: 'go', onClick: () => open(p.no) }
            : null,
      menu: [
        { label: 'فتح الأمر', Ic: Ico.search, onClick: () => open(p.no) },
        { label: 'اعتماد الأمر', Ic: Ico.check, onClick: () => ACT.approvePO(p),
          off: p.status !== 'draft', why: 'الاعتماد للمسودة بس' },
        { label: 'إرسال للمورد', Ic: Ico.send, onClick: () => ACT.sendPO(p, 'email'),
          off: p.status === 'draft' || !DATA.poLive(p), why: 'لازم يتعتمد الأول' },
        { sep: true },
        { label: 'تنزيل PDF', Ic: Ico.download, onClick: () => ACT.downloadPdf('purchaseOrders', p) },
        { label: 'طباعة', Ic: Ico.print, onClick: () => ACT.printDoc('purchaseOrders', p) },
        { sep: true },
        { label: 'إقفال الأمر', Ic: Ico.ban, onClick: () => ACT.closePO(p, DATA.poOpenValue(p)),
          off: !DATA.poLive(p), why: 'الأمر مقفول أو ملغي أصلًا' },
        { label: 'إلغاء الأمر', Ic: Ico.trash, tone: 'crit', onClick: () => ACT.cancelPO(p),
          off: !DATA.poLive(p), why: 'الأمر مقفول أو ملغي أصلًا' },
      ],
      cells: [
        <DocNo value={p.no} onClick={() => open(p.no)} />,

        <span className="itcell">
          <b>{p.s?.ar}</b>
          <em>{p.note || <span className="hint">من غير ملاحظة</span>}</em>
        </span>,

        <StatusCell status={p.status} />,

        <span className="dcell">
          {fmtDate(p.date)}
          {p.expect && (
            <em className={isLate ? 'is-late' : ''}>
              {isLate ? `متأخر ${Math.abs(lateD)} يوم` : `متوقع ${fmtDate(p.expect)}`}
            </em>
          )}
        </span>,

        <Prog done={got} total={qty} label="استلم" />,
        <Prog done={billed} total={qty} label="اتفوتر" />,

        <Money value={DATA.docTotal(p)} />,
      ],
    }
  })

  const col = S.col

  return (
    <AppShell search="ابحث برقم الأمر أو المورد…">
      <div className="tophead">
        <PageHeader title="أوامر الشراء"
          sub={<>اللي طلبته من الموردين، ووصل منه كام واتفوتر منه كام<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={reset(setPeriod)} today={TODAY} />
          <Button label="تصدير CSV" variant="ghost"
            onClick={() => ACT.bulkAction('تصدير CSV', 'purchaseOrders', rows.map((p) => p.no))} />
          <Button label="إنشاء أمر شراء" variant="primary" icon="＋"
            onClick={() => nav('/purchases/orders/new')} />
        </div>
      </div>

      <SummaryStrip
        label="الالتزام المفتوح"
        value={sum.commit}
        note="قيمة اللي طلبته ولسه ما اتفوترش — ده اللي هيتحوّل التزام لما يوصل"
        items={[
          { label: 'مستنية استلام', value: String(sum.waitRecv), money: false },
          { label: 'وصلت وما اتفوترتش', value: String(sum.waitBill), money: false },
          { label: 'عدّت التاريخ المتوقع', value: String(sum.late), money: false, alert: sum.late > 0 },
        ]}
      />

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={reset(setTab)} />

      <section className="sect" data-component="PurchaseOrdersTable">
        <header className="sect__h">
          <h2 className="sect__t">أوامر الشراء<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="رقم الأمر أو المورد…" width={260}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش أوامر بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر التابة اللي فوق.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                col('رقم الأمر', 'no', { width: '138px' }),
                col('المورد', 'sup'),
                { label: 'الحالة', width: '124px' },
                col('التواريخ', 'date', { width: '156px' }),
                { label: 'الاستلام', width: '144px' },
                { label: 'الفوترة', width: '144px' },
                col('القيمة', 'value', { num: true, width: '128px' }),
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, shown.map((p) => p.no))}
            />
            <Pagination
              from={(cur - 1) * PER_PAGE + 1} to={(cur - 1) * PER_PAGE + shown.length}
              total={rows.length} page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}

        <p className="fnote fnote--quiet" style={{ marginTop: 14 }}>
          الاستلام والفوترة بُعدين مستقلين: ممكن توصل البضاعة قبل الفاتورة، وممكن تستلم
          فاتورة على دفعة لسه ما وصلتش. الالتزام المفتوح بيتحسب على اللي **ما اتفوترش**.
        </p>
      </section>

      <BulkActionBar count={selected.size} onClear={clear}
        onAction={(label) => ACT.bulkAction(label, 'purchaseOrders', [...selected]).then(() => clear())}
        actions={['اعتماد الأوامر', 'تنزيل PDF', 'إقفال الأوامر', 'تصدير CSV']} />
    </AppShell>
  )
}
