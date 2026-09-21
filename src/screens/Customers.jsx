import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { ObList } from '../components/oblist.jsx'
import { Amt, Chip } from '../components/ob.jsx'
import { daysFrom, fmtDate } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'

/* ============================================================
   العملاء — Option B (نمط القايمة المعمّم · قرار ٠-٩).
   كل رقم متحسِب من الداتا (زي النسخة السابقة)، والشكل بقى
   جدول القايمة الموحّد: الضغط على الصف بيفتح ملف العميل.
   ============================================================ */

const LATE_IDS = new Set(
  DATA.invoices
    .filter((v) => v.status === 'overdue' || (!['paid', 'draft', 'cancelled', 'void'].includes(v.status) && v.due && daysFrom(v.due) < 0))
    .map((v) => v.c?.id).filter(Boolean)
)
const IDLE_DAYS = 90
const idleDays = (c) => (c.last ? -daysFrom(c.last) : null)
const isIdle = (c) => { const d = idleDays(c); return d !== null && d > IDLE_DAYS }
const bal = (c) => DATA.customerBalance(c.id)
const CITIES = [...new Set(DATA.customers.map((c) => c.city).filter(Boolean))]
const TERMS = [...new Set(DATA.customers.map((c) => c.terms).filter(Boolean))]

export default function Customers() {
  const nav = useNavigate()
  const all = useDocs('customers')
  const open = (c) => nav(`/sales/customers/${c.id}`)

  const menu = (c) => [
    { label: 'فتح العميل', Ic: Ico.eye, onClick: () => open(c) },
    { label: 'كشف الحساب', Ic: Ico.file, onClick: () => nav(`/sales/customers/${c.id}?tab=ledger`) },
    { label: 'تعديل البيانات', Ic: Ico.edit, onClick: () => nav(`/sales/customers/${c.id}/edit`) },
    { sep: true },
    { label: 'فاتورة جديدة له', Ic: Ico.invoice, onClick: () => nav('/sales/invoices/new') },
    { label: 'عرض سعر جديد', Ic: Ico.file, onClick: () => nav('/sales/invoices/new?kind=quote') },
    { label: 'إرسال بالبريد', Ic: Ico.mail, onClick: () => ACT.sendEmail('invoices', { no: c.id, c }) },
    { sep: true },
    { label: 'حذف العميل', Ic: Ico.trash, danger: true, onClick: () => ACT.deleteCustomer(c, DATA.invoicesOf(c.id).length) },
  ]
  const ctx = (c) => (bal(c) > 0.009
    ? { label: 'كشف الحساب', Ic: Ico.file, onClick: () => nav(`/sales/customers/${c.id}?tab=ledger`) }
    : null)

  return (
    <AppShell>
      <PageHeader title="العملاء" sub="بيانات العملاء وأرصدتهم ومستحقاتهم"
        usage={<span className="ob-usage">إجمالي المستحقات <Amt v={all.reduce((a, c) => a + Math.max(0, bal(c)), 0)} className="ob-strong" /> على <span className="num">{all.filter((c) => bal(c) > 0.009).length}</span> عميل</span>}
        actions={<button type="button" className="btn btn--primary ob-hide-sm" onClick={() => nav('/sales/customers/new')}><Ico.plus size={20} />عميل جديد</button>} />

      <ObList
        rows={all}
        rowKey={(c) => c.id}
        search={(c) => [c.ar, c.en, c.id, c.vat, c.phone, c.city].join(' ')}
        searchPh="ابحث بالاسم أو الرقم الضريبي أو الجوال"
        pills={[
          { id: 'all', label: 'الكل' },
          { id: 'due', label: 'عليهم مستحقات', dot: '#F59E0B', test: (c) => bal(c) > 0.009 },
          { id: 'late', label: 'متأخرون', dot: '#EF4444', test: (c) => LATE_IDS.has(c.id) },
          { id: 'idle', label: 'غير نشطين', dot: '#948B82', test: isIdle },
        ]}
        quiet={[
          { id: 'city', label: 'المدينة', options: [{ id: 'all', label: 'كل المدن' }, ...CITIES.map((x) => ({ id: x, label: x }))], test: (c, v) => v === 'all' || c.city === v },
          { id: 'terms', label: 'شروط السداد', options: [{ id: 'all', label: 'الكل' }, ...TERMS.map((x) => ({ id: x, label: x }))], test: (c, v) => v === 'all' || c.terms === v },
          { id: 'type', label: 'النوع', options: [{ id: 'all', label: 'الكل' }, { id: 'b2b', label: 'منشأة' }, { id: 'b2c', label: 'فرد' }], test: (c, v) => v === 'all' || c.type === v },
        ]}
        sorts={[
          { id: 'bal', label: 'الرصيد: من الأعلى', cmp: (a, b) => bal(b) - bal(a) },
          { id: 'name', label: 'الاسم', cmp: (a, b) => a.ar.localeCompare(b.ar, 'ar') },
          { id: 'last', label: 'آخر تعامل: الأحدث', cmp: (a, b) => String(b.last).localeCompare(String(a.last)) },
        ]}
        columns={[
          { id: 'name', h: 'العميل', cell: (c) => <><div style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>{c.ar}</div><div className="ob-sub"><span className="num">{c.id}</span> · {c.type === 'b2c' ? 'فرد' : 'منشأة'}</div></> },
          { id: 'vat', h: 'الرقم الضريبي', cell: (c) => <span className="num">{c.vat || '—'}</span> },
          { id: 'city', h: 'المدينة', cell: (c) => c.city },
          { id: 'terms', h: 'شروط السداد', cell: (c) => c.terms },
          { id: 'last', h: 'آخر تعامل', cell: (c) => <>{c.last ? <span className="num">{fmtDate(c.last)}</span> : '—'}{isIdle(c) && <div className="ob-sub">غير نشط</div>}</>, style: { whiteSpace: 'nowrap' } },
          { id: 'st', h: 'الحالة', cell: (c) => LATE_IDS.has(c.id) ? <Chip tone="err">متأخر</Chip> : bal(c) > 0.009 ? <Chip tone="warn">عليه مستحقات</Chip> : <Chip tone="ok">مسدَّد</Chip> },
          { id: 'bal', h: 'الرصيد', n: true, cell: (c) => bal(c) > 0.009 ? <Amt v={bal(c)} className="ob-strong" /> : <span className="ob-muted">—</span> },
        ]}
        compactCols={['name', 'st', 'bal']}
        rowClass={(c) => (LATE_IDS.has(c.id) ? 'is-late' : '')}
        onRow={open}
        context={ctx}
        menu={menu}
        bulk={[
          { label: 'إرسال كشف حساب', Ic: Ico.send, onClick: (ids) => ACT.bulkAction('كشف حساب', 'customers', ids) },
          { label: 'تصدير CSV', Ic: Ico.download, onClick: (ids) => ACT.bulkAction('تصدير CSV', 'customers', ids) },
        ]}
        cardTitle={(c) => c.ar}
        cardSub={(c) => <><span className="num">{c.id}</span> · {c.city}</>}
        cardChips={(c) => LATE_IDS.has(c.id) ? <Chip tone="err">متأخر</Chip> : bal(c) > 0.009 ? <Chip tone="warn">عليه مستحقات</Chip> : null}
        cardAmount={(c) => <Amt v={bal(c)} />}
        cardAmountLabel="الرصيد"
        empty={{ t: 'لا يوجد عملاء بعد', p: 'أضف أول عميل وسيظهر هنا مع رصيده.' }}
        emptyAction={<button type="button" className="btn btn--primary" onClick={() => nav('/sales/customers/new')}><Ico.plus size={20} />عميل جديد</button>}
      />
      <div className="ob-stickybar">
        <button type="button" className="btn btn--primary" onClick={() => nav('/sales/customers/new')}><Ico.plus size={20} />عميل جديد</button>
      </div>
    </AppShell>
  )
}
