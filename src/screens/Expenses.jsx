import { useState, useMemo } from 'react'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { DataTable, BulkActionBar, Pagination, useSelection } from '../components/table.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { Money, StatusCell } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { DateField } from '../components/datefield.jsx'
import { Modal } from '../components/modal.jsx'
import { PageFilter, FilterChips, applyFilter, emptyFilter,
  useSort, byDate, byNum, byText, DateRange, inPeriod} from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY} from '../lib/format.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   المصروفات.

   شاشة العميل جدول ستة أعمدة من غير بحث ولا فلتر ولا أرقام فوق،
   وعمود الحالة بيعرض **`POSTED`** — قيمة إنم إنجليزي خام طالعة
   للمستخدم زي ما هي.

   وأخطر من كده: قايمة **«حساب المصروف»** في الفورم بتعرض شجرة
   الحسابات كلها — ٥٦ حساب فيهم الحساب البنكي الرئيسي ورأس المال
   وإيرادات المبيعات. يعني ممكن تقيّد مصروف إيجار على حساب بنكي
   والسيستم مش هيقول حاجة.

   هنا: القايمة **مفلترة على حسابات المصروف بس**، والحالة عربي،
   والمبلغ بيتفكّ قدامك لصافي وضريبة عشان تشوف اللي هيدخل الإقرار
   قبل ما ترحّل.
   ============================================================ */

const TABS = [
  { id: 'all',    label: 'كل المصروفات', test: (e) => e.status !== 'reversed' },
  { id: 'posted', label: 'مُرحَّلة',      test: (e) => e.status === 'posted' },
  { id: 'draft',  label: 'مسودات',       test: (e) => e.status === 'draft' },
]

const FGROUPS = [
  {
    id: 'acc', label: 'حساب المصروف',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.accountsOf('expense').map((a) => ({
        id: a.id, label: DATA.accName(a.id), test: (e) => e.acc === a.id }))],
  },
  {
    id: 'cash', label: 'الحساب المالي',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.accountsOf('cash').map((a) => ({
        id: a.id, label: DATA.accName(a.id), test: (e) => e.cash === a.id }))],
  },
  {
    id: 'tax', label: 'فئة الضريبة',
    options: [{ id: 'all', label: 'الكل' },
      ...DATA.purchaseTax.map((t) => ({ id: t.id, label: t.ar, test: (e) => e.tax === t.id }))],
  },
]

const expText = (e) => [e.no, e.desc, e.ref, DATA.accName(e.acc)]
const PER_PAGE = 14

export default function Expenses() {
  const [tab, setTab] = useState('all')
  const [filter, setFilter] = useState(() => emptyFilter(FGROUPS))
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'all' })
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(null)   // null | 'new' | expense
  const { selected, toggle, selectAll, clear } = useSelection()
  const reset = (fn) => (v) => { fn(v); setPage(1) }

  const all = (useDocs('expenses').filter((e) => !e.deleted))
    .filter((x) => inPeriod(x, period, TODAY))

  const S = useSort({
    date:  byDate('date'),
    gross: byNum('gross'),
    acc:   (a, b) => DATA.accName(a.acc).localeCompare(DATA.accName(b.acc), 'ar'),
    no:    byText('no'),
  }, 'date')

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, all.filter(t.test).length])), [all])
  const inTab = useMemo(() => all.filter(TABS.find((t) => t.id === tab).test), [all, tab])
  const rows = useMemo(
    () => S.apply(applyFilter(inTab, FGROUPS, filter, q, expText)),
    [inTab, filter, q, S.sort])

  const sum = useMemo(() => {
    const p = rows.filter((e) => e.status === 'posted')
    return {
      gross: p.reduce((a, e) => a + e.gross, 0),
      vat:   p.reduce((a, e) => a + DATA.expVat(e), 0),
      drafts: rows.filter((e) => e.status === 'draft').length,
      accs:  new Set(p.map((e) => e.acc)).size,
    }
  }, [rows])

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE)

  const tableRows = shown.map((e) => ({
    key: e.no,
    onOpen: () => setForm(e),
    action: e.status === 'draft'
      ? { label: 'ترحيل', tone: 'go', onClick: () => ACT.postExpense(e, fmtMoney(DATA.expNet(e)), DATA.expVat(e)) }
      : null,
    menu: [
      { label: 'فتح المصروف', Ic: Ico.search, onClick: () => setForm(e) },
      { label: 'ترحيل', Ic: Ico.check,
        onClick: () => ACT.postExpense(e, fmtMoney(DATA.expNet(e)), DATA.expVat(e)),
        off: e.status !== 'draft', why: 'المُرحَّل ما بيترحّلش تاني' },
      { sep: true },
      { label: 'عكس المصروف', Ic: Ico.retry, onClick: () => ACT.reverseExpense(e),
        off: e.status !== 'posted', why: 'العكس للمُرحَّل بس' },
      { label: 'حذف المسودة', Ic: Ico.trash, tone: 'crit', onClick: () => ACT.deleteExpense(e),
        off: e.status !== 'draft', why: 'المُرحَّل بيتعكس مش بيتحذف' },
    ],
    cells: [
      <span className="num" style={{ fontSize: 'var(--fs-xs)' }}>{e.no}</span>,

      <span className="itcell">
        <b>{e.desc || <em className="hint">من غير وصف</em>}</b>
        <em>{DATA.accName(e.acc)}{e.ref ? ` · ${e.ref}` : ''}</em>
      </span>,

      <span>{fmtDate(e.date)}</span>,

      <span className="dcell">
        {DATA.accName(e.cash)}
        <em>{DATA.taxOf(e.tax)?.ar}</em>
      </span>,

      <StatusCell status={e.status} />,

      <span className="netvat">
        <b><Money value={e.gross} /></b>
        <em>
          صافي {fmtMoney(DATA.expNet(e))}
          {DATA.expVat(e) > 0 ? ` · ضريبة ${fmtMoney(DATA.expVat(e))}` : ' · بدون ضريبة'}
        </em>
      </span>,
    ],
  }))

  const col = S.col

  return (
    <AppShell search="ابحث بالوصف أو الحساب…">
      <div className="tophead">
        <PageHeader title="المصروفات"
          sub={<>المصروفات التشغيلية اللي بتترحّل في دفتر الأستاذ<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={reset(setPeriod)} today={TODAY} />
          <Button label="تصدير CSV" variant="ghost"
            onClick={() => ACT.bulkAction('تصدير CSV', 'expenses', rows.map((e) => e.no))} />
          <Button label="مصروف جديد" variant="primary" icon="＋" onClick={() => setForm('new')} />
        </div>
      </div>

      <SummaryStrip
        label="إجمالي المصروفات"
        value={sum.gross}
        note={`${rows.filter((e) => e.status === 'posted').length} مصروف مُرحَّل على ${sum.accs} حساب`}
        items={[
          { label: 'ضريبة مدخلات قابلة للخصم', value: sum.vat },
          { label: 'مسودات لسه ما اترحّلتش', value: String(sum.drafts), money: false, alert: sum.drafts > 0 },
          { label: 'صافي بدون ضريبة', value: sum.gross - sum.vat },
        ]}
      />

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={reset(setTab)} />

      <section className="sect" data-component="ExpensesTable">
        <header className="sect__h">
          <h2 className="sect__t">المصروفات<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="الوصف أو المرجع أو الحساب…" width={260}
              value={q} onChange={reset(setQ)} />
            <PageFilter groups={FGROUPS} value={filter} onChange={reset(setFilter)} />
          </div>
        </header>

        <FilterChips groups={FGROUPS} value={filter} onChange={reset(setFilter)}
          q={q} onQ={reset(setQ)} shown={rows.length} total={inTab.length} />

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش مصروفات بالفلترة دي</b>
            <span>جرّب توسّع الفلترة أو تمسحها، أو غيّر التابة اللي فوق.</span>
          </div>
        ) : (
          <>
            <DataTable
              columns={[
                col('الرقم', 'no', { width: '120px' }),
                col('المصروف', 'acc'),
                col('التاريخ', 'date', { width: '124px' }),
                { label: 'اندفع من', width: '188px' },
                { label: 'الحالة', width: '124px' },
                col('المبلغ شامل الضريبة', 'gross', { num: true, width: '196px' }),
              ]}
              rows={tableRows} selected={selected} onSelect={toggle}
              onSelectAll={(on) => selectAll(on, shown.map((e) => e.no))}
            />
            <Pagination
              from={(cur - 1) * PER_PAGE + 1} to={(cur - 1) * PER_PAGE + shown.length}
              total={rows.length} page={cur} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </section>

      <BulkActionBar count={selected.size} onClear={clear}
        onAction={(label) => ACT.bulkAction(label, 'expenses', [...selected]).then(() => clear())}
        actions={['ترحيل المصروفات', 'تصدير CSV']} />

      {form && (
        <ExpenseForm e={form === 'new' ? null : form} onClose={() => setForm(null)} />
      )}
    </AppShell>
  )
}

/* ---------- فورم المصروف ---------- */
function ExpenseForm({ e, onClose }) {
  const edit = !!e
  const readOnly = e?.status === 'posted'
  const [date, setDate]   = useState(e?.date || DATA.TODAY)
  const [acc, setAcc]     = useState(e?.acc || '5020')
  const [cash, setCash]   = useState(e?.cash || '1020')
  const [gross, setGross] = useState(String(e?.gross ?? ''))
  const [tax, setTax]     = useState(e?.tax || 'S')
  const [ref, setRef]     = useState(e?.ref || '')
  const [desc, setDesc]   = useState(e?.desc || '')
  const [tried, setTried] = useState(false)

  const g = Number(gross) || 0
  const rate = DATA.taxOf(tax)?.rate || 0
  const net = +(g / (1 + rate)).toFixed(2)
  const vat = +(g - net).toFixed(2)

  const errs = {
    gross: g <= 0 ? 'المبلغ مطلوب ولازم يكون أكبر من صفر' : null,
    desc: !desc.trim() ? 'الوصف مطلوب — ده اللي هيفكّرك بالمصروف بعد ٦ شهور' : null,
  }
  const show = (k) => (tried ? errs[k] : null)
  const bad = Object.values(errs).some(Boolean)

  const save = async () => {
    setTried(true)
    if (bad) return
    const ok = await ACT.saveExpense({ no: e?.no || 'EXP-جديد', date, acc, cash, gross: g, tax, ref, desc }, edit)
    if (ok) onClose()
  }

  const post = async () => {
    const ok = await ACT.postExpense(e, fmtMoney(net), vat)
    if (ok) onClose()
  }

  return (
    <Modal
      title={readOnly ? `المصروف ${e.no}` : edit ? `تعديل ${e.no}` : 'مصروف جديد'}
      sub={readOnly
        ? 'مُرحَّل — دخل دفتر الأستاذ والإقرار. التعديل بيتم بعكسه وتسجيله من جديد.'
        : 'مصروف تشغيلي بيتدفع من حساب مالي — مش فاتورة على مورد.'}
      onClose={onClose}
      footer={readOnly ? (
        <>
          <button className="btn btn--ghost" onClick={onClose}>إغلاق</button>
          <button className="btn btn--outline" onClick={() => ACT.reverseExpense(e).then(onClose)}>
            عكس المصروف
          </button>
        </>
      ) : (
        <>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          {edit && <button className="btn btn--outline" onClick={post}>ترحيل</button>}
          <button className="btn btn--primary" onClick={save}>
            {edit ? 'حفظ التعديلات' : 'حفظ كمسودة'}
          </button>
        </>
      )}>

      <label className="fld">
        <span className="fld__l">الوصف</span>
        <input className={`fld__i${show('desc') ? ' is-bad' : ''}`} value={desc} disabled={readOnly}
          onChange={(ev) => setDesc(ev.target.value)} placeholder="إيجار المكتب — أغسطس" />
        {show('desc') && <em className="fld__e">{show('desc')}</em>}
      </label>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">حساب المصروف</span>
          <Select className="fld__i" value={acc} disabled={readOnly}
            onChange={(ev) => setAcc(ev.target.value)}>
            {DATA.accountsOf('expense').map((a) => (
              <option key={a.id} value={a.id}>{a.ar}</option>
            ))}
          </Select>
          <em className="fld__h">حسابات المصروف بس — مش شجرة الحسابات كلها.</em>
        </label>
        <label className="fld">
          <span className="fld__l">اندفع من</span>
          <Select className="fld__i" value={cash} disabled={readOnly}
            onChange={(ev) => setCash(ev.target.value)}>
            {DATA.accountsOf('cash').map((a) => (
              <option key={a.id} value={a.id}>{a.ar}</option>
            ))}
          </Select>
          <em className="fld__h">النقدية والبنوك بس.</em>
        </label>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">المبلغ الإجمالي <em>شامل الضريبة</em></span>
          <input className={`fld__i num${show('gross') ? ' is-bad' : ''}`} type="number" step="0.01"
            value={gross} disabled={readOnly}
            onChange={(ev) => setGross(ev.target.value)} placeholder="0.00" />
          {show('gross') && <em className="fld__e">{show('gross')}</em>}
        </label>
        <label className="fld">
          <span className="fld__l">فئة الضريبة</span>
          <Select className="fld__i" value={tax} disabled={readOnly}
            onChange={(ev) => setTax(ev.target.value)}>
            {DATA.purchaseTax.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
          </Select>
        </label>
      </div>

      {/* ★ فكّ المبلغ قدام المستخدم — ده اللي هيدخل الإقرار فعلًا */}
      {g > 0 && (
        <div className="bna" style={{ marginTop: 14 }}>
          <span className="bna__c">
            <em>الصافي على حساب المصروف</em><b className="num">{fmtMoney(net)}</b>
          </span>
          <Ico.plus size={14} className="bna__x" />
          <span className="bna__c">
            <em>ضريبة مدخلات</em>
            <b className="num">{vat > 0 ? fmtMoney(vat) : '0.00'}</b>
          </span>
          <span className="bna__u">= {fmtMoney(g)} ريال</span>
        </div>
      )}

      <label className="fld" style={{ marginTop: 14 }}>
        <span className="fld__l">المرجع <em>اختياري</em></span>
        <input className="fld__i" value={ref} disabled={readOnly}
          onChange={(ev) => setRef(ev.target.value)} placeholder="رقم الفاتورة أو العقد" />
      </label>

      <div style={{ marginTop: 14 }}>
        <DateField label="تاريخ المصروف" value={date} onChange={setDate} disabled={readOnly}
          hint="الضريبة بتدخل إقرار الفترة اللي فيها التاريخ ده." />
      </div>
    </Modal>
  )
}
