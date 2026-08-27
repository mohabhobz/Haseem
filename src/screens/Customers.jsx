import { useNavigate } from 'react-router-dom'
import DocumentList from './DocumentList.jsx'
import { Button } from '../components/primitives.jsx'
import { Money, PartyCell } from '../components/data.jsx'
import * as DATA from '../data/mock.js'

export default function Customers() {
  const nav = useNavigate()
  const rows = DATA.customers.map((c) => ({
    key: c.id,
    cells: [
      <PartyCell party={c} />,
      <span className="num" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-muted)' }}>{c.vat}</span>,
      <span style={{ fontSize: 'var(--fs-sm)' }}>{c.city}</span>,
      <span style={{ fontSize: 'var(--fs-sm)' }}>{c.terms}</span>,
      <span className="num" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-muted)' }}>{c.docs}</span>,
      c.balance > 0 ? <Money value={c.balance} /> : <span className="hint">مسدَّد بالكامل</span>,
    ],
  }))

  return (
    <DocumentList
      title="العملاء"
      sub="بيانات العملاء وأرصدتهم"
      primaryAction={<Button label="عميل جديد" variant="primary" icon="＋"
        onClick={() => nav('/sales/customers/new')} />}
      secondaryAction={<Button label="استيراد" variant="ghost" />}
      summary={{
        label: 'إجمالي أرصدة العملاء',
        value: 310605.25,
        note: 'مستحق على 11 عميل من أصل 64',
        items: [
          { label: 'أكبر رصيد مستحق', value: 84300.0, alert: true },
          { label: 'متوسط الرصيد', value: 28236.84 },
          { label: 'عملاء نشطون', value: '41', money: false },
        ],
      }}
      tabs={[
        { id: 'all', label: 'كل العملاء', count: 64 },
        { id: 'due', label: 'عليهم مستحقات', count: 11 },
        { id: 'late', label: 'متأخرون', count: 4 },
        { id: 'idle', label: 'غير نشطين', count: 23 },
      ]}
      filters={[
        { label: 'المدينة', value: 'الكل' },
        { label: 'شروط السداد', value: 'الكل' },
        { label: 'النوع', value: 'الكل' },
      ]}
      searchPlaceholder="ابحث بالاسم أو الرقم الضريبي…"
      columns={[
        { label: 'العميل', sortable: true },
        { label: 'الرقم الضريبي', width: '165px' },
        { label: 'المدينة', width: '100px' },
        { label: 'شروط السداد', width: '130px' },
        { label: 'المستندات', num: true, width: '110px', sortable: true },
        { label: 'الرصيد المستحق', num: true, width: '170px', sortable: true, sorted: 'desc' },
      ]}
      rows={rows}
      bulkActions={['كشف حساب', 'إرسال بالبريد', 'تصدير CSV']}
      pagination={{ from: 1, to: 12, total: 64 }}
      empty={{
        title: 'ما فيه عملاء بعد',
        text: 'أضف أول عميل وتقدر تصدر له فواتير وعروض أسعار مباشرة.',
        action: <Button label="إضافة عميل" variant="primary"
          onClick={() => nav('/sales/customers/new')} />,
      }}
    />
  )
}
