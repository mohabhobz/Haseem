import DocumentList from './DocumentList.jsx'
import { Button } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import { daysFrom } from '../lib/format.js'
import * as DATA from '../data/mock.js'

const DIM = ['cancelled', 'rejected', 'expired']

export default function Quotations() {
  const rows = DATA.quotations.map((q) => {
    const left = daysFrom(q.valid)
    let sub = ''
    if (q.status === 'sent' && left >= 0 && left <= 7) sub = `تنتهي خلال ${left} يوم`
    if (q.status === 'converted') sub = `الفاتورة ${q.linked}`
    return {
      key: q.no,
      cells: [
        <DocNo value={q.no} />,
        <PartyCell party={q.c} />,
        <DateCell value={q.date} />,
        <DateCell value={q.valid} rel={q.status === 'sent'} />,
        <StatusCell status={q.status} sub={sub} />,
        <Money value={q.total} muted={DIM.includes(q.status)} />,
      ],
    }
  })

  return (
    <DocumentList
      title="عروض الأسعار"
      sub="العروض والفواتير المبدئية قبل الإصدار"
      primaryAction={<Button label="عرض سعر جديد" variant="primary" icon="＋" />}
      secondaryAction={<Button label="تصدير" variant="ghost" />}
      summary={{
        label: 'قيمة العروض المفتوحة',
        value: 265680.0,
        note: '4 عروض بانتظار رد العميل',
        items: [
          { label: 'مقبولة لم تُحوَّل', value: 207000.0, alert: true },
          { label: 'تنتهي خلال أسبوع', value: 46000.0 },
          { label: 'نسبة القبول', value: '62٪', money: false },
        ],
      }}
      tabs={[
        { id: 'all', label: 'كل العروض', count: 38 },
        { id: 'waiting', label: 'بانتظار الرد', count: 4 },
        { id: 'accepted', label: 'مقبولة', count: 2 },
        { id: 'expiring', label: 'قاربت على الانتهاء', count: 3 },
      ]}
      filters={[
        { label: 'الحالة', value: 'الكل' },
        { label: 'العميل', value: 'الكل' },
        { label: 'الفترة', value: '2026', on: true },
      ]}
      searchPlaceholder="ابحث برقم العرض أو اسم العميل…"
      columns={[
        { label: 'رقم العرض', width: '130px', sortable: true },
        { label: 'العميل' },
        { label: 'تاريخ العرض', width: '135px', sortable: true },
        { label: 'صالح حتى', width: '155px', sortable: true, sorted: 'desc' },
        { label: 'الحالة', width: '185px' },
        { label: 'القيمة', num: true, width: '160px', sortable: true },
      ]}
      rows={rows}
      bulkActions={['تحميل PDF', 'إرسال بالبريد', 'تحويل لفاتورة', 'تصدير CSV']}
      pagination={{ from: 1, to: 10, total: 38 }}
      empty={{
        title: 'ما فيه عروض أسعار بعد',
        text: 'ابدأ بعرض سعر، وحوّله لفاتورة بضغطة واحدة لما العميل يوافق.',
        action: <Button label="إنشاء عرض سعر" variant="primary" />,
      }}
    />
  )
}
