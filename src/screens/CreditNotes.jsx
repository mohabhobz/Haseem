import DocumentList from './DocumentList.jsx'
import NoteBanner from './_NoteBanner.jsx'
import { Button } from '../components/primitives.jsx'
import { Money, DateCell, PartyCell, StatusCell, DocNo } from '../components/data.jsx'
import * as DATA from '../data/mock.js'

export default function CreditNotes() {
  const rows = DATA.creditNotes.map((n) => ({
    key: n.no,
    cells: [
      <DocNo value={n.no} />,
      <PartyCell party={n.c} />,
      <DocNo value={n.src} href="#/sales/invoices" />,
      <span style={{ fontSize: 'var(--fs-sm)' }}>{n.reason}</span>,
      <DateCell value={n.date} />,
      <StatusCell status={n.status} zatca={n.zatca} zatcaReason={n.zatcaReason} />,
      <Money value={n.total} muted={n.status === 'void'} />,
    ],
  }))

  return (
    <DocumentList
      title="إشعارات دائنة"
      sub="تقليل مبلغ مستحق على عميل — مرتجعات وخصومات لاحقة"
      primaryAction={<Button label="إشعار دائن جديد" variant="primary" icon="＋" />}
      secondaryAction={<Button label="تصدير" variant="ghost" />}
      note={<NoteBanner
        strong="الإشعار الدائن يقلّل ما على العميل."
        text="تستخدمه لما ترجع بضاعة أو تعطي خصم بعد إصدار الفاتورة. يُرسل للهيئة مرتبطًا بالفاتورة الأصلية."
        link={<a className="link" href="#/sales/debit-notes">الإشعار المدين يعمل العكس ←</a>} />}
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
        { label: 'السبب', width: '150px' },
        { label: 'التاريخ', width: '135px', sortable: true, sorted: 'desc' },
        { label: 'الحالة', width: '175px' },
        { label: 'المبلغ المخصوم', num: true, width: '165px', sortable: true },
      ]}
      rows={rows}
      bulkActions={['تحميل PDF', 'إرسال بالبريد', 'تصدير CSV']}
      pagination={{ from: 1, to: 6, total: 24 }}
      empty={{
        title: 'ما فيه إشعارات دائنة',
        text: 'الإشعار الدائن يقلّل المبلغ المستحق على العميل — مثل مرتجع بضاعة أو خصم لاحق.',
        action: <Button label="إنشاء إشعار دائن" variant="primary" />,
      }}
    />
  )
}
