import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader, SummaryStrip } from '../components/layout.jsx'
import { DataTable, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byDate, byText, DateRange, inPeriod} from '../components/pagefilter.jsx'
import { fmtDate, TODAY} from '../lib/format.js'
import { toast, confirmAction } from '../components/feedback.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   تسويات المخزون.

   التسوية هي الحتة الوحيدة اللي بيتغيّر فيها الرصيد من غير
   مستند بيع أو شراء — عشان كده **السبب مش حقل اختياري، هو
   المستند نفسه**. من غيره الجرد بيبقى مالوش تفسير.

   في سيستم العميل القائمة فاضية والفورم مودال من غير أي سياق:
   بتكتب كمية وإنت مش شايف الرصيد الحالي. هنا الفورم بيوريك
   **الرصيد قبل وبعد** وإنت بتكتب.
   ============================================================ */

const REASONS = ['فرق جرد', 'تلف أثناء التخزين', 'عينات للعميل', 'تصحيح رصيد افتتاحي', 'مرتجع للمورد']

function Form({ sku, onClose }) {
  const prods = DATA.stockItems()
  const [item, setItem]   = useState(sku || '')
  const [store, setStore] = useState(DATA.stores[0].id)
  const [dir, setDir]     = useState('up')
  const [qty, setQty]     = useState('')
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)

  const it  = DATA.findItem(item)
  const now = it ? DATA.stockAt(it.sku, store) : null
  const n   = +qty || 0
  const after = now === null ? null : dir === 'up' ? now + n : now - n

  const errs = {}
  if (!item) errs.item = 'اختر الصنف الأول'
  if (!qty || n <= 0) errs.qty = 'الكمية لازم تكون أكبر من صفر'
  if (!reason.trim()) errs.reason = 'السبب مطلوب — هو اللي بيفسّر فرق الجرد بعدين'
  if (after !== null && after < 0) errs.qty = 'الكمية أكبر من الرصيد — الرصيد مينفعش يبقى بالسالب'
  const show = (k) => (tried ? errs[k] : null)

  const save = async () => {
    setTried(true)
    if (Object.keys(errs).length) return
    const ok = await confirmAction({
      title: `تسجيل تسوية ${dir === 'up' ? 'بالزيادة' : 'بالنقص'}؟`,
      tone: dir === 'up' ? 'primary' : 'danger',
      confirm: 'تسجيل التسوية',
      consequences: [
        `رصيد ${it.ar} في ${DATA.storeOf(store).ar} هيبقى ${after} ${it.unitName}`,
        'التسوية بتتقيّد في سجل الصنف بسببها',
        'مفيش تراجع — التصحيح بيبقى بتسوية مضادة',
      ],
    })
    if (!ok) return
    toast.ok('التسوية اتسجّلت', { sub: `${it.ar} · الرصيد بقى ${after} ${it.unitName}` })
    onClose()
  }

  return (
    <div className="cfm" role="dialog" aria-modal="true">
      <div className="cfm__scrim" onClick={onClose} />
      <div className="cfm__box cfm__box--form">
        <h2 className="cfm__t">تسجيل تسوية</h2>
        <p className="cfm__b">تصحيح رصيد صنف من غير فاتورة بيع أو شراء.</p>

        <div className="frow frow--2">
          <label className="fld">
            <span className="fld__l">الصنف</span>
            <select className={`fld__i${show('item') ? ' is-bad' : ''}`} value={item}
              onChange={(e) => setItem(e.target.value)}>
              <option value="">اختر صنفًا يتتبع المخزون…</option>
              {prods.map((p) => <option key={p.sku} value={p.sku}>{p.ar}</option>)}
            </select>
            {show('item') && <em className="fld__e">{show('item')}</em>}
          </label>
          <label className="fld">
            <span className="fld__l">المستودع</span>
            <select className="fld__i" value={store} onChange={(e) => setStore(e.target.value)}>
              {DATA.stores.map((s) => <option key={s.id} value={s.id}>{s.ar}</option>)}
            </select>
          </label>
        </div>

        <div className="fld" style={{ marginTop: 14 }}>
          <span className="fld__l">نوع التسوية</span>
          <div className="segs segs--wide" role="group" aria-label="نوع التسوية">
            <button className={dir === 'up' ? 'on' : ''} onClick={() => setDir('up')}>
              <Ico.plus size={15} />زيادة
            </button>
            <button className={dir === 'down' ? 'on' : ''} onClick={() => setDir('down')}>
              <Ico.close size={15} />نقص
            </button>
          </div>
        </div>

        <label className="fld" style={{ marginTop: 14 }}>
          <span className="fld__l">الكمية</span>
          <div className={`qtyin${show('qty') ? ' is-bad' : ''}`}>
            <input className="qtyin__i num" inputMode="decimal" value={qty}
              onChange={(e) => setQty(e.target.value)} placeholder="0" />
            <span className="qtyin__s">{it?.unitName || 'وحدة'}</span>
          </div>
          {show('qty') && <em className="fld__e">{show('qty')}</em>}
        </label>

        {/* ★ الرصيد قبل وبعد — ده اللي بيمنع غلطة الجرد قبل ما تحصل */}
        {it && (
          <div className="bna">
            <span className="bna__c">
              <em>الرصيد الحالي</em><b className="num">{now}</b>
            </span>
            <Ico.back size={16} className="bna__x" />
            <span className={`bna__c${after < 0 ? ' is-bad' : ''}`}>
              <em>بعد التسوية</em>
              <b className="num">{after}</b>
            </span>
            <span className="bna__u">{it.unitName} · {DATA.storeOf(store).ar}</span>
          </div>
        )}

        <label className="fld" style={{ marginTop: 14 }}>
          <span className="fld__l">السبب</span>
          <input className={`fld__i${show('reason') ? ' is-bad' : ''}`} value={reason} list="adjreasons"
            onChange={(e) => setReason(e.target.value)} placeholder="فرق جرد" />
          <datalist id="adjreasons">
            {REASONS.map((r) => <option key={r} value={r} />)}
          </datalist>
          {show('reason')
            ? <em className="fld__e">{show('reason')}</em>
            : <em className="fld__h">بيظهر في سجل حركة الصنف — اكتبه بحيث حد تاني يفهمه بعد شهر.</em>}
        </label>

        <div className="cfm__acts" style={{ marginTop: 22 }}>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>
            <Ico.check size={16} />تسجيل التسوية
          </button>
        </div>
      </div>
    </div>
  )
}

const FGROUPS = [
  {
    id: 'dir', label: 'النوع',
    options: [
      { id: 'all',  label: 'الكل' },
      { id: 'up',   label: 'زيادة', test: (a) => a.dir === 'up' },
      { id: 'down', label: 'نقص',   test: (a) => a.dir === 'down' },
    ],
  },
  {
    id: 'store', label: 'المستودع',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.stores.map((s) => ({ id: s.id, label: s.ar, test: (a) => a.store === s.id }))],
  },
]

const adjText = (a) => [a.no, a.reason, a.who, DATA.findItem(a.sku)?.ar]
const PER_PAGE = 20

export default function Adjustments() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState(params.get('sku') ? { sku: params.get('sku') } : null)
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'all' })
  const [page, setPage] = useState(1)
  const { selected, toggle, selectAll } = useSelection()
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const S = useSort({ no: byText('no'), date: byDate('date'),
    qty: (a, b) => a.qty - b.qty }, 'date')

  const all = useMemo(
    () => DATA.adjustments.filter((x) => inPeriod(x, period, TODAY)), [period])

  const rows = useMemo(
    () => S.apply(applyFilter(all, FGROUPS, filter, q, adjText)),
    [all, filter, q, S.sort])

  const sum = useMemo(() => ({
    up:   rows.filter((a) => a.dir === 'up').length,
    down: rows.filter((a) => a.dir === 'down').length,
    net:  rows.reduce((a, x) => a + (x.dir === 'up' ? x.qty : -x.qty), 0),
  }), [rows])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const tableRows = shown.map((a) => {
    const it = DATA.findItem(a.sku)
    return {
      key: a.no,
      onOpen: () => nav(`/inventory/items/${a.sku}`),
      menu: [
        { label: 'فتح الصنف', Ic: Ico.search, onClick: () => nav(`/inventory/items/${a.sku}`) },
        { label: 'تسوية مضادة', Ic: Ico.retry, onClick: () => setForm({ sku: a.sku }) },
      ],
      cells: [
        <span className="cell-doc num">{a.no}</span>,
        <span className="itcell"><b>{it?.ar || a.sku}</b><em className="num">{a.sku}</em></span>,
        <span style={{ fontSize: 'var(--fs-sm)' }}>{DATA.storeOf(a.store)?.ar}</span>,
        <span className={`adjq num${a.dir === 'down' ? ' is-minus' : ''}`}>
          {a.dir === 'up' ? '+' : '−'}{a.qty}
        </span>,
        <span className="cell-reason">{a.reason}</span>,
        <span style={{ fontSize: 'var(--fs-sm)' }}>{fmtDate(a.date)}</span>,
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-muted)' }}>{a.who}</span>,
      ],
    }
  })

  return (
    <AppShell search="ابحث برقم التسوية أو الصنف أو السبب…">
      <div className="tophead">
        <PageHeader title="تسويات المخزون"
          sub="تصحيح الرصيد من غير فاتورة — وكل تسوية ليها سبب مكتوب" />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={reset(setPeriod)} today={TODAY} />
          <Button label="تسوية جديدة" variant="primary" icon="＋" onClick={() => setForm({})} />
        </div>
      </div>

      <SummaryStrip
        label="صافي أثر التسويات"
        value={sum.net}
        note="مجموع الزيادة ناقص النقص في الفترة المعروضة"
        items={[
          { label: 'تسويات بالزيادة', value: String(sum.up), money: false },
          { label: 'تسويات بالنقص', value: String(sum.down), money: false, alert: sum.down > 0 },
          { label: 'إجمالي التسويات', value: String(rows.length), money: false },
        ]}
      />

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">التسويات<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث برقم التسوية أو الصنف…" width={260}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={DATA.adjustments.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش تسويات بالفلترة دي</b>
            <span>التسوية بتتسجّل لما الجرد يطلع مختلف عن الرصيد المحسوب.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                S.col('رقم التسوية', 'no', { width: '132px' }),
                { label: 'الصنف' },
                { label: 'المستودع', width: '150px' },
                S.col('الكمية', 'qty', { num: true, width: '96px' }),
                { label: 'السبب', width: '190px' },
                S.col('التاريخ', 'date', { width: '124px' }),
                { label: 'بواسطة', width: '120px' },
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, shown.map((a) => a.no))}
            />
            <Pagination
              from={(cur - 1) * PER_PAGE + 1} to={(cur - 1) * PER_PAGE + shown.length}
              total={rows.length} page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </section>

      {form && <Form sku={form.sku} onClose={() => setForm(null)} />}
    </AppShell>
  )
}
