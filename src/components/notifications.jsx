import { useState } from 'react'
import { Drawer } from './drawer.jsx'
import { Ico } from './icons.jsx'
import { SAR } from './data.jsx'

/* ============================================================
   إشعارات السيستم — بشكل صندوق بريد
   تابات فوق للفلترة، وصفوف مفصولة بخط بدل الكروت.
   ============================================================ */
export const GROUPS = [
  { id: 'rejected', label: 'مرفوضة', full: 'مرفوضة من هيئة الزكاة',
    Ic: Ico.rejected, crit: true, cta: 'تصحيح وإرسال', rows: [
      { no: 'INV-027120', c: 'مصنع الرياض للبلاستيك', v: 5780, d: '12 أغسطس',
        m: 'الرقم الضريبي للعميل غير صالح', unread: true },
      { no: 'INV-027108', c: 'شركة نسيج الحديثة', v: 5400, d: '9 أغسطس',
        m: 'تاريخ التوريد ناقص', unread: true },
    ]},
  { id: 'overdue', label: 'متأخرة', full: 'تجاوزت تاريخ الاستحقاق',
    Ic: Ico.overdue, cta: 'إرسال تذكير', rows: [
      { no: 'INV-027121', c: 'شركة الفهد للمقاولات', v: 84300, d: '26 يوليو',
        m: 'متأخرة 20 يوم', late: true, unread: true },
      { no: 'INV-027094', c: 'مؤسسة درب الشرق', v: 43110, d: '8 أغسطس',
        m: 'متأخرة 7 أيام', late: true },
    ]},
  { id: 'quotes', label: 'عروض أسعار', full: 'عروض أسعار تنتهي قريبًا',
    Ic: Ico.expiring, cta: 'تحويل لفاتورة', rows: [
      { no: 'QUO-004412', c: 'مجموعة الأفق التجارية', v: 21000, d: '17 أغسطس',
        m: 'تنتهي بعد يومين', unread: true },
      { no: 'QUO-004409', c: 'شركة أصالة للأثاث المكتبي', v: 15500, d: '19 أغسطس',
        m: 'تنتهي بعد 4 أيام' },
      { no: 'QUO-004401', c: 'مؤسسة النخبة للتجارة', v: 9500, d: '21 أغسطس',
        m: 'تنتهي بعد 6 أيام' },
    ]},
  { id: 'drafts', label: 'مسودات', full: 'مسودات لم تُصدَر',
    Ic: Ico.invoice, cta: 'إصدار', rows: [
      { no: 'INV-027125', c: 'شركة الخليج للتوريدات الطبية', v: 31015, d: '12 أغسطس',
        m: 'اتعملت من 3 أيام' },
      { no: 'INV-027124', c: 'مؤسسة وادي القمم', v: 23900, d: '10 أغسطس',
        m: 'اتعملت من 5 أيام' },
    ]},
]

/* كل الصفوف مسطّحة ومعاها بيانات مجموعتها */
const ALL = GROUPS.flatMap((g) => g.rows.map((r) => ({ ...r, g })))
export const NOTIF_COUNT = ALL.length
const UNREAD = ALL.filter((r) => r.unread).length

export function NotificationsDrawer({ open, onClose }) {
  const [tab, setTab] = useState('all')
  const rows = tab === 'all' ? ALL : ALL.filter((r) => r.g.id === tab)

  return (
    <Drawer open={open} onClose={onClose} width={520}
      title="كل الإشعارات" meta={`${UNREAD} غير مقروء`}>

      {/* ---------- تابات الفلترة ---------- */}
      <div className="nt__tabs" data-component="NotifTabs">
        <button className={`nt__tab${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>
          الكل<span className="nt__tabn num">{ALL.length}</span>
        </button>
        {GROUPS.map((g) => (
          <button key={g.id} className={`nt__tab${tab === g.id ? ' on' : ''}`}
            onClick={() => setTab(g.id)} title={g.full}>
            {g.label}<span className="nt__tabn num">{g.rows.length}</span>
          </button>
        ))}
      </div>

      {/* ---------- الصفوف ---------- */}
      <div className="nt__list">
        {rows.map((r) => (
          <button key={r.no} className={`nt__row${r.unread ? ' is-unread' : ''}`}>
            <span className="nt__dot" aria-hidden="true" />

            <span className="nt__body">
              <span className="nt__from">{r.c}</span>
              <span className={`nt__subj${r.late || r.g.crit ? ' is-crit' : ''}`}>{r.m}</span>
              <span className="nt__line3">
                <span className="nt__no num">{r.no}</span>
                <span className="nt__time">{r.d}</span>
                <SAR v={r.v} className="nt__v" />
              </span>
            </span>

            <span className="nt__cta">{r.g.cta}</span>
          </button>
        ))}

        {rows.length === 0 && <div className="nt__empty">مفيش إشعارات هنا</div>}
      </div>
    </Drawer>
  )
}
