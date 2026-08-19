import DocumentList from './DocumentList.jsx'
import NoteBanner from './_NoteBanner.jsx'
import { Button } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import * as DATA from '../data/mock.js'

export default function DebitNotes() {
  const rows = DATA.debitNotes.map((n) => ({
    key: n.no,
    cells: [
      <DocNo value={n.no} />,
      <PartyCell party={n.c} />,
      <DocNo value={n.src} href="#/sales/invoices" />,
      <span style={{ fontSize: 'var(--fs-sm)' }}>{n.reason}</span>,
      <DateCell value={n.date} />,
      <StatusCell status={n.status} zatca={n.zatca} zatcaReason={n.zatcaReason} />,
      <Money value={n.total} />,
    ],
  }))

  return (
    <DocumentList
      title="إشعارات مدينة"
      sub="زيادة مبلغ مستحق على عميل — رسوم أو خدمات إضافية"
      primaryAction={<Button label="إشعار مدين جديد" variant="primary" icon="＋" />}
      secondaryAction={<Button label="تصدير" variant="ghost" />}
      note={<NoteBanner
        strong="الإشعار المدين يزيد ما على العميل."
        text="تستخدمه لما تضيف رسوم أو خدمة بعد إصدار الفاتورة. يُرسل للهيئة مرتبطًا بالفاتورة الأصلية."
        link={<a className="link" href="#/sales/credit-notes">الإشعار الدائن يعمل العكس ←</a>} />}
      filters={[
        { label: 'الحالة', value: 'الكل' },
        { label: 'العميل', value: 'الكل' },
        { label: 'الفترة', value: '2026', on: true },
      ]}
      searchPlaceholder="ابحث برقم الإشعار أو الفاتورة الأصلية…"
      columns={[
        { label: 'رقم الإشعار', width: '130px', sortable: true },
        { label: 'العميل' },
        { label: 'الفاتورة الأصلية', width: '140px' },
        { label: 'السبب', width: '160px' },
        { label: 'التاريخ', width: '135px', sortable: true, sorted: 'desc' },
        { label: 'الحالة', width: '175px' },
        { label: 'المبلغ المضاف', num: true, width: '160px', sortable: true },
      ]}
      rows={rows}
      bulkActions={['تحميل PDF', 'إرسال بالبريد', 'تصدير CSV']}
      pagination={{ from: 1, to: 4, total: 11 }}
      empty={{
        title: 'ما فيه إشعارات مدينة',
        text: 'الإشعار المدين يزيد المبلغ المستحق على العميل — مثل رسوم شحن أو خدمة إضافية.',
        action: <Button label="إنشاء إشعار مدين" variant="primary" />,
      }}
    />
  )
}
