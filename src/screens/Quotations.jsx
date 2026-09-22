import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { ObList } from '../components/oblist.jsx'
import { Amt, Chip, PreviewPanel, paperOfDoc } from '../components/ob.jsx'
import { fmtDate, daysFrom } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import { toast } from '../components/feedback.jsx'

/* ============================================================
   عروض الأسعار والفواتير المبدئية — Option B (نمط القايمة
   المعمّم · قرار ٠-٩). نفس أوامر النسخة السابقة بالظبط —
   اللي اتغيّر الشكل والترتيب: أمر سياقي واحد + ⋮.
   ============================================================ */

const Q_CHIP = {
  draft:     ['draft', 'مسودة'],
  sent:      ['warn',  'بانتظار الرد'],
  accepted:  ['ok',    'مقبولة'],
  rejected:  ['err',   'مرفوضة'],
  expired:   ['draft', 'منتهية الصلاحية'],
  converted: ['info',  'حُوِّلت لفاتورة'],
  cancelled: ['draft', 'ملغاة'],
}
const QChip = ({ q }) => { const [t, a] = Q_CHIP[q.status] || Q_CHIP.draft; return <Chip tone={t}>{a}</Chip> }
const CITIES = [...new Set(DATA.quotations.map((q) => q.c?.city).filter(Boolean))]

export default function Quotations() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const all = useDocs('quotations')
  const [peek, setPeek] = useState(null)
  const open = (no) => nav(`/sales/quotations/${no}`)

  const run = (id, q) => {
    switch (id) {
      case 'send':
      case 'mail':
      case 'remind':  return ACT.sendEmail('quotations', q)
      case 'convert': return ACT.convertQuote(q, () => nav('/sales/invoices/new'))
      case 'renew':   return ACT.renewQuote ? ACT.renewQuote(q) : nav('/sales/invoices/new?kind=quote')
      case 'revise':
      case 'dup':     return nav('/sales/invoices/new?kind=' + (DATA.isPrf(q) ? 'prf' : 'quote'))
      case 'edit':    return nav('/sales/invoices/new?kind=' + (DATA.isPrf(q) ? 'prf' : 'quote'))
      case 'goinv':   return nav(`/sales/invoices/${q.linked || ''}`)
      case 'pdf':     return ACT.downloadPdf('quotations', q)
      case 'print':   return ACT.printDoc()
      case 'cancel':  return ACT.cancelDoc('quotations', q)
      default: return undefined
    }
  }
  const ctx = (q) => {
    const prf = DATA.isPrf(q)
    if (q.status === 'draft')     return { label: 'إرسال', Ic: Ico.send, onClick: () => run('send', q) }
    if (q.status === 'accepted')  return { label: 'تحويل لفاتورة', Ic: Ico.invoice, onClick: () => run('convert', q) }
    if (q.status === 'sent')      return { label: prf ? 'تذكير بالسداد' : 'تذكير', Ic: Ico.bell, onClick: () => run('remind', q) }
    if (q.status === 'expired')   return { label: 'تجديد', Ic: Ico.retry, onClick: () => run('renew', q) }
    return null
  }
  const menu = (q) => [
    { label: 'عرض', Ic: Ico.eye, onClick: () => setPeek(q.no) },
    { label: 'فتح المستند', Ic: Ico.file, onClick: () => open(q.no) },
    q.status === 'draft' && { label: 'تعديل', Ic: Ico.edit, onClick: () => run('edit', q) },
    { label: 'تنزيل PDF', Ic: Ico.download, onClick: () => run('pdf', q) },
    q.status !== 'draft' && { label: 'إرسال بالبريد', Ic: Ico.mail, onClick: () => run('mail', q) },
    { label: 'طباعة', Ic: Ico.print, onClick: () => run('print', q) },
    { label: 'إنشاء نسخة', Ic: Ico.copy, onClick: () => run('dup', q) },
    q.status === 'rejected' && { label: 'نسخة معدّلة', Ic: Ico.edit, onClick: () => run('revise', q) },
    q.status === 'converted' && { label: 'فتح الفاتورة', Ic: Ico.invoice, onClick: () => run('goinv', q) },
    !['converted', 'cancelled'].includes(q.status) && { sep: true },
    !['converted', 'cancelled'].includes(q.status) && { label: 'إلغاء', Ic: Ico.ban, danger: true, onClick: () => run('cancel', q) },
  ]

  const valid = (q) => {
    const d = daysFrom(q.valid)
    const soon = q.status === 'sent' && d !== null && d >= 0 && d <= 7
    return (
      <div>
        <span className="num">{fmtDate(q.valid)}</span>
        {soon && <div className="ob-sub" style={{ color: '#B45309' }}>ينتهي خلال <span className="num">{d}</span> {d === 1 ? 'يوم' : 'أيام'}</div>}
        {q.status === 'converted' && q.linked && <div className="ob-sub">الفاتورة <span className="num">{q.linked}</span></div>}
      </div>
    )
  }

  const pq = peek && all.find((q) => q.no === peek)
  const aside = pq && (
    <PreviewPanel title={pq.no} chip={<QChip q={pq} />} onClose={() => setPeek(null)}
      doc={paperOfDoc(pq, DATA.isPrf(pq) ? ['فاتورة مبدئية', 'Proforma Invoice'] : ['عرض سعر', 'Quotation'])}
      actions={<>
        {ctx(pq) && <button type="button" className="btn btn--primary" onClick={ctx(pq).onClick}>{(() => { const C = ctx(pq).Ic; return <C size={20} /> })()}{ctx(pq).label}</button>}
        <button type="button" className="btn" onClick={() => open(pq.no)}><Ico.file size={20} />فتح المستند</button>
      </>} />
  )

  return (
    <AppShell aside={aside}>
      <PageHeader title="عروض الأسعار والفواتير المبدئية" sub="عروض للعملاء وفواتير مبدئية قبل الإصدار"
        actions={<>
          <button type="button" className="btn ob-hide-sm" onClick={() => nav('/sales/invoices/new?kind=prf')}>فاتورة مبدئية</button>
          <button type="button" className="btn btn--primary ob-hide-sm" onClick={() => nav('/sales/invoices/new?kind=quote')}><Ico.plus size={20} />إنشاء عرض سعر</button>
        </>} />

      <ObList
        rows={all}
        search={(q) => [q.no, q.c?.ar, q.c?.en].join(' ')}
        searchPh="ابحث برقم العرض أو اسم العميل"
        pills={[
          { id: 'all', label: 'الكل' },
          { id: 'draft', label: 'مسودة', dot: '#948B82', test: (q) => q.status === 'draft' },
          { id: 'sent', label: 'بانتظار الرد', dot: '#F59E0B', test: (q) => q.status === 'sent' },
          { id: 'accepted', label: 'مقبولة', dot: '#22C55E', test: (q) => q.status === 'accepted' },
          { id: 'expired', label: 'منتهية', dot: '#EF4444', test: (q) => q.status === 'expired' },
          { id: 'converted', label: 'محوّلة', dot: '#3B82F6', test: (q) => q.status === 'converted' },
        ]}
        quiet={[
          { id: 'type', label: 'النوع', options: [{ id: 'all', label: 'الكل' }, { id: 'quote', label: 'عروض الأسعار' }, { id: 'prf', label: 'الفواتير المبدئية' }],
            test: (q, v) => v === 'all' || (v === 'prf' ? DATA.isPrf(q) : !DATA.isPrf(q)) },
          { id: 'city', label: 'المدينة', options: [{ id: 'all', label: 'كل المدن' }, ...CITIES.map((c) => ({ id: c, label: c }))],
            test: (q, v) => v === 'all' || q.c?.city === v },
        ]}
        sorts={[
          { id: 'valid', label: 'الصلاحية: الأقرب أولاً', cmp: (a, b) => String(a.valid).localeCompare(b.valid) },
          { id: 'date', label: 'التاريخ: الأحدث أولاً', cmp: (a, b) => String(b.date).localeCompare(a.date) },
          { id: 'amt', label: 'المبلغ: من الأعلى', cmp: (a, b) => b.total - a.total },
        ]}
        columns={[
          { id: 'no', h: 'المستند', cell: (q) => <><div className="ob-strong num">{q.no}</div><div className="ob-sub">{DATA.qKindAr(q)}</div></> },
          { id: 'c', h: 'العميل', cell: (q) => <span style={{ fontWeight: 500, color: 'var(--ink-strong)' }}>{q.c?.ar}</span> },
          { id: 'date', h: 'التاريخ', cell: (q) => <span className="num">{fmtDate(q.date)}</span>, style: { whiteSpace: 'nowrap' } },
          { id: 'valid', h: 'صالح حتى', cell: valid, style: { whiteSpace: 'nowrap' } },
          { id: 'st', h: 'الحالة', cell: (q) => <QChip q={q} /> },
          { id: 'amt', h: 'المبلغ', n: true, cell: (q) => <Amt v={q.total} className="ob-strong" /> },
        ]}
        compactCols={['no', 'valid', 'st', 'amt']}
        rowClass={(q) => ['cancelled', 'rejected', 'expired'].includes(q.status) ? 'is-draft' : q.status === 'draft' ? 'is-draft' : ''}
        onRow={(q) => setPeek(q.no)}
        context={ctx}
        menu={menu}
        bulk={[
          { label: 'إرسال', Ic: Ico.send, onClick: (ids) => ACT.bulkAction('إرسال بالبريد', 'quotations', ids) },
          { label: 'تنزيل PDF', Ic: Ico.download, onClick: (ids) => ACT.bulkAction('تنزيل PDF', 'quotations', ids) },
          { label: 'تحويل لفواتير', Ic: Ico.invoice, onClick: (ids) => ACT.bulkAction('تحويل لفواتير', 'quotations', ids) },
        ]}
        bulkMore={[{ label: 'تصدير CSV', Ic: Ico.download, onClick: (ids) => ACT.bulkAction('تصدير CSV', 'quotations', ids) }]}
        cardTitle={(q) => <span className="num">{q.no}</span>}
        cardSub={(q) => q.c?.ar}
        cardChips={(q) => <QChip q={q} />}
        cardAmount={(q) => <Amt v={q.total} />}
        cardAmountLabel={(q) => <>صالح حتى <span className="num">{fmtDate(q.valid)}</span></>}
        empty={{ t: 'لا توجد عروض أسعار بعد', p: 'أنشئ أول عرض سعر وسيظهر هنا مع حالته وصلاحيته.' }}
        emptyAction={<button type="button" className="btn btn--primary" onClick={() => nav('/sales/invoices/new?kind=quote')}><Ico.plus size={20} />إنشاء عرض سعر</button>}
        preview={pq ? { key: pq.no } : null}
      />

      <div className="ob-stickybar">
        <button type="button" className="btn" onClick={() => nav('/sales/invoices/new?kind=prf')}>فاتورة مبدئية</button>
        <button type="button" className="btn btn--primary" onClick={() => nav('/sales/invoices/new?kind=quote')}><Ico.plus size={20} />إنشاء عرض سعر</button>
      </div>
    </AppShell>
  )
}
