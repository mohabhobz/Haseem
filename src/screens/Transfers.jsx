import { Modal } from '../components/modal.jsx'
import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader, Tabs } from '../components/layout.jsx'
import { DataTable, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byDate, byText, DateRange, inPeriod} from '../components/pagefilter.jsx'
import { fmtDate, TODAY} from '../lib/format.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import { toast } from '../components/feedback.jsx'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   نقل المخزون بين المستودعات.

   ★ القاعدة اللي في سيستم العميل واتمسكت زي ما هي: النقل بيتحفظ
   **مسودة** الأول، والرصيد ما بيتحركش غير عند **الإصدار**. ده
   مكتوب صراحة في سيستمه («أضف الملفات إلى المسودة قبل إصدارها»)،
   وإحنا بنقوله للمستخدم بصوت عالي بدل ما يكتشفه لما الرصيد ما
   يتغيّرش.

   عشان كده المسودة ليها تابة لوحدها وأمر رئيسي على الصف: إصدار.
   ============================================================ */

function Form({ sku, onClose }) {
  const prods = DATA.stockItems()
  const [item, setItem] = useState(sku || '')
  const [from, setFrom] = useState(DATA.stores[0].id)
  const [to, setTo]     = useState(DATA.stores[1]?.id || '')
  const [qty, setQty]   = useState('')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState([])
  const [tried, setTried] = useState(false)

  const it   = DATA.findItem(item)
  const have = it ? DATA.stockAt(it.sku, from) : null
  const n    = +qty || 0

  const errs = {}
  if (!item) errs.item = 'اختر الصنف الأول'
  if (from === to) errs.to = 'المستودع المصدر والمستهدف نفس المكان'
  if (!qty || n <= 0) errs.qty = 'الكمية لازم تكون أكبر من صفر'
  else if (have !== null && n > have) errs.qty = `المتاح في ${DATA.storeOf(from).ar} هو ${have} بس`
  const show = (k) => (tried ? errs[k] : null)

  const save = () => {
    setTried(true)
    if (Object.keys(errs).length) return
    toast.ok('النقل اتحفظ كمسودة', {
      sub: 'الرصيد ما اتحركش لسه — بيتحرّك عند الإصدار' })
    onClose()
  }

  return (
    <Modal title={"نقل جديد"} sub="نقل كمية من صنف بين مستودعين." onClose={onClose}
      footer={<>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>
            <Ico.check size={16} />حفظ كمسودة
          </button>
      </>}>

        <label className="fld">
          <span className="fld__l">الصنف</span>
          <Select className={`fld__i${show('item') ? ' is-bad' : ''}`} value={item}
            onChange={(e) => setItem(e.target.value)}>
            <option value="">اختر صنفًا يتتبع المخزون…</option>
            {prods.map((p) => <option key={p.sku} value={p.sku}>{p.ar}</option>)}
          </Select>
          {show('item') && <em className="fld__e">{show('item')}</em>}
        </label>

        {/* من ← إلى في صف واحد، عشان اتجاه الحركة يبان بالشكل */}
        <div className="frow frow--2" style={{ marginTop: 14 }}>
          <label className="fld">
            <span className="fld__l">من المستودع</span>
            <Select className="fld__i" value={from} onChange={(e) => setFrom(e.target.value)}>
              {DATA.stores.map((s) => <option key={s.id} value={s.id}>{s.ar}</option>)}
            </Select>
            {it && <em className="fld__h">المتاح: <b className="num">{have}</b> {it.unitName}</em>}
          </label>
          <label className="fld">
            <span className="fld__l">إلى المستودع</span>
            <Select className={`fld__i${show('to') ? ' is-bad' : ''}`} value={to}
              onChange={(e) => setTo(e.target.value)}>
              {DATA.stores.map((s) => <option key={s.id} value={s.id}>{s.ar}</option>)}
            </Select>
            {show('to') && <em className="fld__e">{show('to')}</em>}
          </label>
        </div>

        <label className="fld" style={{ marginTop: 14 }}>
          <span className="fld__l">الكمية</span>
          <div className={`qtyin qtyin--wide${show('qty') ? ' is-bad' : ''}`}>
            <input className="qtyin__i num" inputMode="decimal" value={qty}
              onChange={(e) => setQty(e.target.value)} placeholder="0" />
            <span className="qtyin__s">{it?.unitName || 'وحدة'}</span>
          </div>
          {show('qty') && <em className="fld__e">{show('qty')}</em>}
        </label>

        <label className="fld" style={{ marginTop: 14 }}>
          <span className="fld__l">ملاحظة <span className="fld__opt">— اختياري</span></span>
          <input className="fld__i" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="تغذية مشروع جدة" />
        </label>

        <div className="fld" style={{ marginTop: 14 }}>
          <span className="fld__l">المرفقات <span className="fld__opt">— اختياري</span></span>
          <button className="updrop updrop--wide"
            onClick={() => { setFiles((x) => [...x, `مرفق ${x.length + 1}`]); toast.ok('المرفق اتضاف للمسودة') }}>
            <Ico.plus size={18} />
            <em>إرفاق ملف<span>صورة إذن الصرف أو بوليصة الشحن</span></em>
          </button>
          {files.length > 0 && (
            <em className="fld__h">{files.length} مرفق على المسودة</em>
          )}
          <em className="fld__h">
            ★ ضيف الملفات للمسودة <b>قبل الإصدار</b> — بعد الإصدار المستند بيتقفل.
          </em>
        </div>

    </Modal>
  )
}

const TABS = [
  { id: 'all',    label: 'كل عمليات النقل', test: () => true },
  { id: 'draft',  label: 'مسودات',          test: (t) => t.status === 'draft' },
  { id: 'issued', label: 'صادرة',           test: (t) => t.status === 'issued' },
]

const FGROUPS = [
  {
    id: 'from', label: 'من مستودع',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.stores.map((s) => ({ id: s.id, label: s.ar, test: (t) => t.from === s.id }))],
  },
  {
    id: 'to', label: 'إلى مستودع',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.stores.map((s) => ({ id: s.id, label: s.ar, test: (t) => t.to === s.id }))],
  },
]

const trfText = (t) => [t.no, t.note, t.who, DATA.findItem(t.sku)?.ar]
const PER_PAGE = 20

export default function Transfers() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState(params.get('sku') ? { sku: params.get('sku') } : null)
  const [tab, setTab] = useState('all')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'all' })
  const [page, setPage] = useState(1)
  const { selected, toggle, selectAll } = useSelection()
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const all = useDocs('transfers').filter((x) => inPeriod(x, period, TODAY))
  const S = useSort({ no: byText('no'), date: byDate('date'), qty: (a, b) => a.qty - b.qty }, 'date')

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])
  const inTab = useMemo(
    () => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])
  const rows = useMemo(
    () => S.apply(applyFilter(inTab, FGROUPS, filter, q, trfText)), [inTab, filter, q, S.sort])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const tableRows = shown.map((t) => {
    const it = DATA.findItem(t.sku)
    const draft = t.status === 'draft'
    return {
      key: t.no,
      openLabel: 'فتح الصنف', onOpen: () => nav(`/inventory/items/${t.sku}`),
      action: draft ? { label: 'إصدار', onClick: () => ACT.issueTransfer(t) } : null,
      menu: [
        { label: 'فتح الصنف', Ic: Ico.search, onClick: () => nav(`/inventory/items/${t.sku}`) },
        { label: 'نقل مضاد', Ic: Ico.retry, onClick: () => setForm({ sku: t.sku }) },
      ],
      cells: [
        <span className="cell-doc num">{t.no}</span>,
        <span className="itcell"><b>{it?.ar || t.sku}</b><em className="num">{t.sku}</em></span>,
        <span className="movecell">
          <b>{DATA.storeOf(t.from)?.ar}</b>
          <Ico.back size={14} />
          <b>{DATA.storeOf(t.to)?.ar}</b>
        </span>,
        <span className="num" style={{ fontWeight: 'var(--fw-semi)' }}>{t.qty}</span>,
        <span className={`st st--${draft ? 'neutral' : 'positive'}`}>
          {draft ? 'مسودة' : 'صادر'}
        </span>,
        <span style={{ fontSize: 'var(--fs-sm)' }}>{fmtDate(t.date)}</span>,
        t.files > 0
          ? <span className="fcount"><Ico.copy size={13} /><span className="num">{t.files}</span></span>
          : <span className="hint" />,
      ],
    }
  })

  const drafts = all.filter((t) => t.status === 'draft').length

  return (
    <AppShell search="ابحث برقم النقل أو الصنف…">
      <div className="tophead">
        <PageHeader title="نقل المخزون"
          sub="نقل الأصناف بين المستودعات — الرصيد بيتحرّك عند الإصدار" />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={reset(setPeriod)} today={TODAY} />
          <Button label="إنشاء نقل مخزون" variant="primary" icon="＋" onClick={() => setForm({})} />
        </div>
      </div>

      {/* ★ القاعدة اللي المستخدم لازم يعرفها قبل ما يستغرب */}
      {drafts > 0 && (
        <p className="banner banner--info">
          <Ico.bell size={16} />
          <span>
            <b>{drafts === 1 ? 'مسودة نقل واحدة' : `${drafts} مسودات نقل`} لسه ما اتصدرتش.</b>
            {' '}الرصيد ما بيتحركش غير عند الإصدار — يعني الكميات دي لسه في مكانها الأصلي.
          </span>
          <button className="lnk" onClick={() => setTab('draft')}>عرضها</button>
        </p>
      )}

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={reset(setTab)} />

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">عمليات النقل<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="ابحث برقم النقل أو الصنف…" width={260}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش عمليات نقل بالفلترة دي</b>
            <span>النقل بيتسجّل لما تحرّك كمية من مستودع لمستودع تاني.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                S.col('رقم النقل', 'no', { width: '132px' }),
                { label: 'الصنف' },
                { label: 'من ← إلى', width: '270px' },
                S.col('الكمية', 'qty', { num: true, width: '96px' }),
                { label: 'الحالة', width: '104px' },
                S.col('التاريخ', 'date', { width: '124px' }),
                { label: 'مرفقات', width: '92px' },
              ]}
              rows={tableRows}
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
