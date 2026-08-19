import DocumentList from './DocumentList.jsx'
import { Button } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import * as DATA from '../data/mock.js'

const LIVE = ['issued', 'partial', 'overdue']

export default function Invoices() {
  const rows = DATA.invoices.map((v) => {
    const rem = v.total - v.paid
    const live = LIVE.includes(v.status)
    let sub = ''
    if (v.status === 'overdue') sub = `متأخرة ${v.overdueDays} يوم`
    if (v.status === 'partial') sub = `سُدِّد ${Math.round((v.paid / v.total) * 100)}٪`
    return {
      key: v.no,
      cells: [
        <DocNo value={v.no} />,
        <PartyCell party={v.c} />,
        <DateCell value={v.date} />,
        <DateCell value={v.due} rel={v.status === 'issued' || v.status === 'partial'} />,
        <StatusCell status={v.status} zatca={v.zatca} zatcaReason={v.zatcaReason} sub={sub} />,
        <Money value={v.total} muted={v.status === 'cancelled' || v.status === 'void'} />,
        live && rem > 0 ? <Money value={rem} /> : <span className="hint">—</span>,
      ],
    }
  })

  return (
    <DocumentList
      title="فواتير المبيعات"
      sub="إصدار الفواتير ومتابعة التحصيل"
      primaryAction={<Button label="فاتورة جديدة" variant="primary" icon="＋" />}
      secondaryAction={<Button label="تصدير" variant="ghost" />}
      tabs={[
        { id: 'all', label: 'كل الفواتير', count: 142 },
        { id: 'overdue', label: 'متأخرة', count: 14 },
        { id: 'draft', label: 'مسودات', count: 6 },
        { id: 'rejected', label: 'مرفوضة من الهيئة', count: 2 },
        { id: 'recurring', label: 'فواتير متكررة', count: 4 },
      ]}
      filters={[
        { label: 'الحالة', value: 'الكل' },
        { label: 'العميل', value: 'الكل' },
        { label: 'الفترة', value: '2026', on: true },
        { label: 'الفرع', value: 'الكل' },
      ]}
      searchPlaceholder="ابحث برقم الفاتورة أو اسم العميل…"
      columns={[
        { label: 'رقم الفاتورة', width: '125px', sortable: true },
        { label: 'العميل' },
        { label: 'تاريخ الإصدار', width: '135px', sortable: true },
        { label: 'الاستحقاق', width: '150px', sortable: true, sorted: 'desc' },
        { label: 'الحالة', width: '175px' },
        { label: 'المبلغ', num: true, width: '155px', sortable: true },
        { label: 'المتبقي', num: true, width: '150px' },
      ]}
      rows={rows}
      bulkActions={['تحميل PDF', 'إرسال بالبريد', 'تعليم كمدفوعة', 'تصدير CSV']}
      pagination={{ from: 1, to: 15, total: 142 }}
      empty={{
        title: 'ما فيه فواتير في هذه الفترة',
        text: 'جرّب توسيع الفترة الزمنية، أو أنشئ أول فاتورة وابدأ التحصيل.',
        action: <Button label="إنشاء فاتورة" variant="primary" />,
      }}
    />
  )
}
