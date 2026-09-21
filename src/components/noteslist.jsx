import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader } from './layout.jsx'
import { Ico } from './icons.jsx'
import { ObList } from './oblist.jsx'
import { Amt, Chip, PreviewPanel, paperOfDoc } from './ob.jsx'
import { fmtDate } from '../lib/format.js'
import { useDocs } from '../lib/store.js'
import * as ACT from '../lib/actions.js'

/* ============================================================
   الإشعارات الدائنة والمدينة — شاشة واحدة بنوعين (Option B).
   الإشعار مالوش بُعد دفع؛ الحالة = مسودة / حالة الهيئة / ملغاة.
   ============================================================ */
const CFG = {
  credit: { kind: 'creditNotes', title: 'إشعارات دائنة', sub: 'تقليل مبلغ مستحق على عميل — مرتجعات وخصومات لاحقة',
    new: 'إشعار دائن جديد', to: '/sales/credit-notes/new', amt: 'المبلغ المخصوم', paper: ['إشعار دائن', 'Credit Note'] },
  debit:  { kind: 'debitNotes', title: 'إشعارات مدينة', sub: 'زيادة مبلغ مستحق على عميل — رسوم أو خدمات إضافية',
    new: 'إشعار مدين جديد', to: '/sales/debit-notes/new', amt: 'المبلغ المضاف', paper: ['إشعار مدين', 'Debit Note'] },
}
const dead = (n) => ['void', 'cancelled'].includes(n.status)
function NChip({ n }) {
  if (n.status === 'draft') return <Chip tone="draft">مسودة</Chip>
  if (dead(n)) return <Chip tone="draft">ملغاة</Chip>
  if (n.zatca === 'bad') return <Chip tone="err">مرفوضة من الهيئة</Chip>
  if (n.zatca === 'pending') return <Chip tone="warn">عند الهيئة</Chip>
  return <Chip tone="ok">صادرة</Chip>
}

export function NotesList({ type }) {
  const C = CFG[type]
  const nav = useNavigate()
  const all = useDocs(C.kind)
  const [peek, setPeek] = useState(null)
  const REASONS = [...new Set(all.map((n) => n.reason).filter(Boolean))]

  const run = (id, n) => {
    switch (id) {
      case 'issue':    return ACT.issueDoc(C.kind, n)
      case 'resubmit': return ACT.resubmitZatca(C.kind, n)
      case 'mail':     return ACT.sendEmail(C.kind, n)
      case 'pdf':      return ACT.downloadPdf(C.kind, n)
      case 'print':    return ACT.printDoc()
      case 'cancel':   return ACT.cancelDoc(C.kind, n)
      case 'del':      return ACT.deleteDraft(C.kind, n)
      case 'src':      return nav('/sales/invoices/' + n.src)
      default: return undefined
    }
  }
  const ctx = (n) => {
    if (n.zatca === 'bad') return { label: 'إعادة الإرسال', Ic: Ico.retry, onClick: () => run('resubmit', n) }
    if (n.status === 'draft') return { label: 'إصدار', Ic: Ico.file, onClick: () => run('issue', n) }
    return null
  }
  const menu = (n) => [
    { label: 'عرض', Ic: Ico.eye, onClick: () => setPeek(n.no) },
    n.src && { label: 'فتح الفاتورة الأصلية', Ic: Ico.invoice, onClick: () => run('src', n) },
    { label: 'تنزيل PDF', Ic: Ico.download, off: n.zatca !== 'ok', why: 'بعد قبول الهيئة', onClick: () => run('pdf', n) },
    n.status === 'issued' && { label: 'إرسال بالبريد', Ic: Ico.mail, onClick: () => run('mail', n) },
    { label: 'طباعة', Ic: Ico.print, onClick: () => run('print', n) },
    (n.status === 'issued' || n.status === 'draft') && { sep: true },
    n.status === 'issued' && { label: 'إلغاء الإشعار', Ic: Ico.ban, danger: true, onClick: () => run('cancel', n) },
    n.status === 'draft' && { label: 'حذف المسودة', Ic: Ico.trash, danger: true, onClick: () => run('del', n) },
  ]

  const pn = peek && all.find((n) => n.no === peek)
  const aside = pn && (
    <PreviewPanel title={pn.no} chip={<NChip n={pn} />} onClose={() => setPeek(null)}
      doc={paperOfDoc(pn, C.paper, { qr: true })}
      actions={<>
        {ctx(pn) && <button type="button" className="btn btn--primary" onClick={ctx(pn).onClick}>{ctx(pn).label}</button>}
        {pn.src && <button type="button" className="btn" onClick={() => run('src', pn)}><Ico.invoice size={20} />الفاتورة الأصلية</button>}
      </>} />
  )

  return (
    <AppShell aside={aside}>
      <PageHeader title={C.title} sub={C.sub}
        actions={<button type="button" className="btn btn--primary ob-hide-sm" onClick={() => nav(C.to)}><Ico.plus size={20} />{C.new}</button>} />
      <ObList
        rows={all}
        search={(n) => [n.no, n.src, n.c?.ar, n.c?.en, n.reason].join(' ')}
        searchPh="ابحث برقم الإشعار أو الفاتورة أو العميل"
        pills={[
          { id: 'all', label: 'الكل' },
          { id: 'act', label: 'محتاج تصرّف', dot: '#EF4444', test: (n) => n.zatca === 'bad' },
          { id: 'issued', label: 'صادرة', dot: '#22C55E', test: (n) => n.status === 'issued' && n.zatca !== 'bad' },
          { id: 'draft', label: 'مسودة', dot: '#948B82', test: (n) => n.status === 'draft' },
          { id: 'closed', label: 'ملغاة', dot: '#B9B1A9', test: dead },
        ]}
        quiet={[
          { id: 'reason', label: 'السبب', options: [{ id: 'all', label: 'كل الأسباب' }, ...REASONS.map((r) => ({ id: r, label: r }))], test: (n, v) => v === 'all' || n.reason === v },
        ]}
        sorts={[
          { id: 'date', label: 'التاريخ: الأحدث أولاً', cmp: (a, b) => String(b.date).localeCompare(a.date) },
          { id: 'amt', label: 'المبلغ: من الأعلى', cmp: (a, b) => b.total - a.total },
        ]}
        columns={[
          { id: 'no', h: 'الإشعار', cell: (n) => <div className="ob-strong num">{n.no}</div> },
          { id: 'c', h: 'العميل', cell: (n) => <span style={{ fontWeight: 500, color: 'var(--ink-strong)' }}>{n.c?.ar}</span> },
          { id: 'src', h: 'الفاتورة الأصلية', cell: (n) => <span className="num">{n.src || '—'}</span> },
          { id: 'date', h: 'التاريخ', cell: (n) => <span className="num">{fmtDate(n.date)}</span>, style: { whiteSpace: 'nowrap' } },
          { id: 'why', h: 'السبب', cell: (n) => <>{n.reason}{n.zatca === 'bad' && n.zatcaReason && <div className="ob-sub" style={{ color: '#B91C1C', whiteSpace: 'normal' }}>{n.zatcaReason}</div>}</> },
          { id: 'st', h: 'الحالة', cell: (n) => <NChip n={n} /> },
          { id: 'amt', h: C.amt, n: true, cell: (n) => <Amt v={n.total} className="ob-strong" /> },
        ]}
        compactCols={['no', 'src', 'st', 'amt']}
        rowClass={(n) => (n.zatca === 'bad' ? 'is-late' : dead(n) || n.status === 'draft' ? 'is-draft' : '')}
        onRow={(n) => setPeek(n.no)}
        context={ctx}
        menu={menu}
        bulk={[
          { label: 'تنزيل PDF', Ic: Ico.download, onClick: (ids) => ACT.bulkAction('تنزيل PDF', C.kind, ids) },
          { label: 'إرسال', Ic: Ico.send, onClick: (ids) => ACT.bulkAction('إرسال بالبريد', C.kind, ids) },
          { label: 'إعادة الإرسال للهيئة', Ic: Ico.retry, onClick: (ids) => ACT.bulkAction('إعادة الإرسال للهيئة', C.kind, ids) },
        ]}
        bulkMore={[{ label: 'تصدير CSV', Ic: Ico.download, onClick: (ids) => ACT.bulkAction('تصدير CSV', C.kind, ids) }]}
        cardTitle={(n) => <span className="num">{n.no}</span>}
        cardSub={(n) => n.c?.ar}
        cardChips={(n) => <NChip n={n} />}
        cardAmount={(n) => <Amt v={n.total} />}
        cardAmountLabel={(n) => <>على <span className="num">{n.src}</span></>}
        empty={{ t: 'لا توجد إشعارات بعد', p: 'الإشعار بيتعمل على فاتورة صادرة.' }}
        emptyAction={<button type="button" className="btn btn--primary" onClick={() => nav(C.to)}><Ico.plus size={20} />{C.new}</button>}
        preview={pn ? { key: pn.no } : null}
      />
      <div className="ob-stickybar">
        <button type="button" className="btn btn--primary" onClick={() => nav(C.to)}><Ico.plus size={20} />{C.new}</button>
      </div>
    </AppShell>
  )
}
