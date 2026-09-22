import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byNum, byText } from '../components/pagefilter.jsx'
import { fmtMoney, daysFrom } from '../lib/format.js'
import * as ACT from '../lib/actions.js'
import { toast } from '../components/feedback.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   الأصناف.

   في سيستم العميل الشاشة دي **عمياء**: الصف بيقول الاسم والسعر
   وبس. مفيش نوع ولا رصيد ولا تنبيه — يعني مع مية صنف مش هتعرف
   اللي قرب يخلص من اللي متكدّس من غير ما تفتح كل واحد.

   عشان كده الصف هنا بيجاوب أربع أسئلة مرة واحدة: **إيه الصنف ·
   منتج ولا خدمة · فيه كام · بكام**. والرصيد بيتكلم لما يستاهل بس:
   «تحت الحد» أو «نفد» — غير كده رقم ساكت.

   وحد التنبيه في سيستمه حقل ميّت: بتكتبه ومفيش مكان بيقولك إن
   صنف عدّاه. هنا هو تابة وعمود ولون.
   ============================================================ */

const money = (n) => fmtMoney(n)

/* حالة الرصيد — ثلاث حالات بس، وكل واحدة ليها معنى تشغيلي */
function stockState(it) {
  if (it.kind !== 'product') return null
  const q = DATA.stockOf(it.sku)
  if (q <= 0) return { k: 'out', t: 'نفد', tone: 'critical' }
  if (it.reorder > 0 && q <= it.reorder) return { k: 'low', t: 'تحت الحد', tone: 'attention' }
  return { k: 'ok', q }
}

/* الصلاحية — تنبيه غير مانع زي ما هو مكتوب في سيستم العميل */
const expiryNote = (it) => {
  if (!it.expiry) return null
  const d = daysFrom(it.expiry)
  if (d === null) return null
  if (d < 0) return { t: `منتهي من ${Math.abs(d)} يوم`, bad: true }
  if (d <= 90) return { t: `ينتهي خلال ${d} يوم`, bad: false }
  return null
}

const TABS = [
  { id: 'all',  label: 'كل الأصناف', test: () => true },
  { id: 'prod', label: 'منتجات',     test: (i) => i.kind === 'product' },
  { id: 'serv', label: 'خدمات',      test: (i) => i.kind === 'service' },
  { id: 'low',  label: 'تحت الحد',   test: DATA.isLow },
  { id: 'exp',  label: 'قرب انتهاء الصلاحية', test: (i) => !!expiryNote(i) },
]

const CATS = [...new Set(DATA.items.map((i) => i.cat).filter(Boolean))]

const FGROUPS = [
  {
    id: 'cat', label: 'الفئة',
    options: [{ id: 'all', label: 'الكل' },
      ...CATS.map((c) => ({ id: c, label: c, test: (i) => i.cat === c }))],
  },
  {
    id: 'store', label: 'المستودع',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.stores.map((s) => ({ id: s.id, label: s.ar,
        test: (i) => DATA.stockAt(i.sku, s.id) !== 0 }))],
  },
  {
    id: 'tax', label: 'فئة الضريبة',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.taxRates.map((t) => ({ id: t.id, label: t.ar, test: (i) => i.tax === t.id }))],
  },
  {
    id: 'stock', label: 'الرصيد',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'in',   label: 'متوفر',  test: (i) => i.kind === 'product' && DATA.stockOf(i.sku) > 0 },
      { id: 'out',  label: 'نفد',    test: DATA.isOut },
      { id: 'none', label: 'لا يتتبع المخزون', test: (i) => i.kind === 'service' },
    ],
  },
]

const itemText = (i) => [i.ar, i.en, i.sku, i.barcode, i.cat]
const PER_PAGE = 15

export default function Items() {
  const nav = useNavigate()
  const [tab, setTab] = useState('all')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { selected, toggle, selectAll, clear } = useSelection()
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const S = useSort({
    name:  byText('ar'),
    sku:   byText('sku'),
    stock: (a, b) => DATA.stockOf(a.sku) - DATA.stockOf(b.sku),
    sell:  byNum('sell'),
    value: (a, b) => DATA.stockValue(a) - DATA.stockValue(b),
  }, 'name', 'asc')

  const all = DATA.items
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])

  const inTab = useMemo(
    () => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])

  const rows = useMemo(
    () => S.apply(applyFilter(inTab, FGROUPS, filter, q, itemText)),
    [inTab, filter, q, S.sort])

  /* الملخّص بيتحسب على المعروض — الرقم فوق بيوصف اللي تحته */
  const sum = useMemo(() => {
    const prods = rows.filter((i) => i.kind === 'product')
    return {
      value: prods.reduce((a, i) => a + DATA.stockValue(i), 0),
      low:   rows.filter(DATA.isLow).length,
      out:   rows.filter(DATA.isOut).length,
      prods: prods.length,
    }
  }, [rows])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const open = (sku) => nav(`/inventory/items/${sku}`)

  const on = (id, it) => {
    switch (id) {
      case 'edit':   return nav(`/inventory/items/${it.sku}/edit`)
      case 'view':   return open(it.sku)
      case 'adjust': return nav(`/inventory/adjustments?sku=${it.sku}`)
      case 'move':   return nav(`/inventory/transfers?sku=${it.sku}`)
      case 'del':    return ACT.deleteItem(it)
      default: return undefined
    }
  }

  const tableRows = shown.map((it) => {
    const st = stockState(it)
    const ex = expiryNote(it)
    return {
      key: it.sku,
      onOpen: () => open(it.sku),
      menu: [
        { label: 'فتح الصنف', Ic: Ico.search, onClick: () => open(it.sku) },
        { label: 'تعديل', Ic: Ico.edit, onClick: () => on('edit', it) },
        { sep: true },
        { label: 'تسوية مخزون', Ic: Ico.retry, onClick: () => on('adjust', it),
          off: it.kind !== 'product', why: 'الخدمات ما بتتتبعش مخزون' },
        { label: 'نقل بين مستودعين', Ic: Ico.send, onClick: () => on('move', it),
          off: it.kind !== 'product', why: 'الخدمات ما بتتتبعش مخزون' },
        { sep: true },
        { label: 'حذف الصنف', Ic: Ico.trash, tone: 'crit', onClick: () => on('del', it) },
      ],
      cells: [
        <span className="itcell">
          <b>{it.ar}</b>
          <em className="num">{it.sku}{it.cat ? ` · ${it.cat}` : ''}</em>
        </span>,

        <span className={`kind kind--${it.kind}`}>
          {it.kind === 'product' ? 'منتج' : 'خدمة'}
        </span>,

        <span className="uncell">{it.unitName}<em className="num">{it.unitCode}</em></span>,

        it.kind === 'service'
          ? <span className="hint">لا يتتبع</span>
          : <span className={`stk${st.k === 'out' ? ' is-out' : st.k === 'low' ? ' is-low' : ''}`}>
              <b className="num">{DATA.stockOf(it.sku)}</b>
              {st.k !== 'ok' && <em>{st.t}</em>}
              {st.k === 'ok' && it.reorder > 0 && <em className="stk__lim num">حد {it.reorder}</em>}
            </span>,

        ex ? <span className={`exp${ex.bad ? ' is-bad' : ''}`}>{ex.t}</span>
           : <span className="hint" />,

        <Money value={it.sell} />,
      ],
    }
  })

  const col = S.col

  return (
    <AppShell search="ابحث بالاسم أو رمز الصنف أو الباركود…">
      <div className="tophead">
        <PageHeader title="الأصناف" sub={<>المنتجات والخدمات اللي بتتفوتر<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <Button label="استيراد" variant="ghost"
            onClick={() => toast.info('الاستيراد بيتم من ملف Excel أو CSV',
              { sub: 'الشاشة دي جاية مع موديول الاستيراد' })} />
          <Button label="إنشاء صنف" variant="primary" icon="＋"
            onClick={() => nav('/inventory/items/new')} />
        </div>
      </div>

      <SummaryStrip
        label="قيمة المخزون"
        value={sum.value}
        note={`${sum.prods} منتج يتتبع المخزون · بمتوسط التكلفة`}
        items={[
          { label: 'تحت حد التنبيه', value: String(sum.low), money: false, alert: sum.low > 0 },
          { label: 'نفد من المخزون', value: String(sum.out), money: false },
          { label: 'إجمالي الأصناف', value: String(rows.length), money: false },
        ]}
      />

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={reset(setTab)} />

      <section className="sect" data-component="ItemsTable">
        <header className="sect__h">
          <h2 className="sect__t">الأصناف<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث بالاسم أو الرمز أو الباركود…" width={280}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش أصناف بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر التابة اللي فوق.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                col('الصنف', 'name'),
                { label: 'النوع', width: '84px' },
                { label: 'الوحدة', width: '124px' },
                col('الرصيد', 'stock', { num: true, width: '132px' }),
                { label: 'الصلاحية', width: '132px' },
                col('سعر البيع', 'sell', { num: true, width: '128px' }),
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, shown.map((i) => i.sku))}
            />
            <Pagination
              from={(cur - 1) * PER_PAGE + 1} to={(cur - 1) * PER_PAGE + shown.length}
              total={rows.length} page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear}
        onAction={(l) => ACT.bulkAction(l, 'items', [...selected]).then(clear)}
        actions={['تصدير CSV', 'تعديل الأسعار', 'حذف']} />
    </AppShell>
  )
}
