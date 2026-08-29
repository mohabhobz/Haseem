import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Drawer } from './drawer.jsx'
import { Ico } from './icons.jsx'
import { SAR } from './data.jsx'
import { fmtDate, daysFrom, dayAr } from '../lib/format.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   قائمة الإشعارات.

   ده مش صندوق بريد. الرسالة بتتقرا وتتقفل، أما الإشعار هنا
   فبيقول **إن فيه شغل مطلوب**: فاتورة الهيئة رفضتها، عرض سعر
   هيقفل بكرة، فلوس متأخرة. عشان كده:

   ١) الأمر ظاهر دايمًا — مش بيستنى الهوفر.
   ٢) كل نوع ليه أيقونة ولون حدّة — العين تفرّق من غير ما تقرا.
   ٣) في «الكل» الصفوف متجمّعة بنوعها بالترتيب الأخطر أولًا.
   ٤) «غير مقروء» = الاسم أتقل وبس.
   ٥) رقم المستند وتاريخه في سطر واحد، والمبلغ عمود لوحده متمركز
      رأسيًا — عشان العين تمسح المبالغ من فوق لتحت في خط واحد.

   ★ الإشعارات **بتتولّد من الداتا نفسها** مش مكتوبة بالإيد:
   فاتورة الهيئة رفضتها بتطلّع إشعار رفض، ومسودة قديمة بتطلّع
   إشعار «لسه ما اتصدرتش». يعني الرقم اللي في الجرس بيتغيّر
   لوحده لما الداتا تتغيّر، والضغط بيوَدّي **للمستند الحقيقي**.

   الموديولز اللي خلصت (الفواتير · عروض الأسعار · العملاء) أوامرها
   موصولة. أي حاجة برّه الموديولز دي بتفضل من غير وصلة لحد ما
   الشاشة بتاعتها تتبني.
   ============================================================ */

const ago = (iso) => Math.max(0, -(daysFrom(iso) ?? 0))
/* تمييز العدد في العربية: ٣–١٠ جمع، وفوق العشرة مفرد منصوب */
/* ---------- المصادر: كلها من الداتا ---------- */
const rejected = DATA.invoices.filter((v) => v.zatca === 'bad')
const overdue  = DATA.invoices.filter((v) => v.status === 'overdue')
const drafts   = DATA.invoices.filter((v) => v.status === 'draft')
/* عرض مقبول لسه ما اتحوّلش، أو مُرسَل وقرب ينتهي */
const quotes = DATA.quotations
  .filter((q) => {
    const d = daysFrom(q.valid)
    if (q.status === 'accepted') return true
    return q.status === 'sent' && d !== null && d >= 0 && d <= 30
  })
  .sort((a, b) => new Date(a.valid) - new Date(b.valid))

export const GROUPS = [
  {
    id: 'rejected', label: 'مرفوضة', tone: 'crit',
    full: 'مرفوضة من هيئة الزكاة والضريبة والجمارك',
    Ic: Ico.rejected, cta: 'تصحيح وإرسال',
    rows: rejected.map((v) => ({
      no: v.no, c: v.c.ar, v: v.total, d: fmtDate(v.date),
      m: v.zatcaReason || 'الهيئة رفضت الفاتورة', unread: true,
      to: `/sales/invoices/${v.no}`,
    })),
  },
  {
    id: 'overdue', label: 'متأخرة', tone: 'warn',
    full: 'تجاوزت تاريخ الاستحقاق',
    Ic: Ico.overdue, cta: 'إرسال تذكير',
    rows: overdue.map((v) => ({
      no: v.no, c: v.c.ar, v: v.total - v.paid, d: fmtDate(v.due),
      m: `متأخرة ${dayAr(v.overdueDays ?? ago(v.due))}`,
      unread: (v.overdueDays ?? 0) >= 14,
      to: `/sales/invoices/${v.no}`,
    })),
  },
  {
    id: 'quotes', label: 'عروض أسعار', tone: 'info',
    full: 'عروض أسعار تحتاج تصرّفًا',
    Ic: Ico.expiring, cta: 'تحويل لفاتورة',
    rows: quotes.map((q) => {
      const left = daysFrom(q.valid)
      return {
        no: q.no, c: q.c.ar, v: q.total, d: fmtDate(q.valid),
        m: q.status === 'accepted'
          ? 'مقبول من العميل — لم يُحوَّل لفاتورة بعد'
          : `تنتهي صلاحيته خلال ${dayAr(left)}`,
        unread: q.status === 'accepted',
        /* مفيش شاشة مستند لعرض السعر لحد دلوقتي — الضغط بيوَدّي للقائمة،
           والأمر بيفتح فاتورة جديدة لأن ده معنى «التحويل». */
        to: '/sales/quotations',
        act: '/sales/invoices/new',
      }
    }),
  },
  {
    id: 'drafts', label: 'مسودات', tone: 'mute',
    full: 'مسودات لم تُصدَر بعد',
    Ic: Ico.invoice, cta: 'إصدار',
    rows: drafts.map((v) => ({
      no: v.no, c: v.c.ar, v: v.total, d: fmtDate(v.date),
      m: `أُنشئت قبل ${dayAr(ago(v.date))}`,
      to: `/sales/invoices/${v.no}`,
    })),
  },
]

const ALL = GROUPS.flatMap((g) => g.rows.map((r) => ({ ...r, g })))
export const NOTIF_COUNT = ALL.length

function Row({ r, read, go }) {
  const g = r.g
  const unread = r.unread && !read
  const open = () => go(r.to)
  const act  = (e) => { e.stopPropagation(); go(r.act || r.to) }

  return (
    <div className={`nt__row nt__row--${g.tone}${unread ? ' is-unread' : ''}`}
      role="button" tabIndex={0} title={g.full} data-component="NotifRow"
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}>

      <span className="nt__ic" aria-hidden="true"><g.Ic size={16} /></span>

      <span className="nt__body">
        <span className="nt__line1">
          <span className="nt__from">{r.c}</span>
        </span>
        <span className="nt__subj">{r.m}</span>
        {/* رقم المستند وتاريخه مع بعض — الاتنين بيعرّفوا نفس الحاجة */}
        <span className="nt__line3">
          <span className="nt__no num">{r.no}</span>
          <span className="nt__time">{r.d}</span>
        </span>
      </span>

      {/* المبلغ عمود لوحده متمركز رأسيًا */}
      <SAR v={r.v} className="nt__v" />

      <button className="nt__cta" onClick={act}>{g.cta}</button>
    </div>
  )
}

export function NotificationsDrawer({ open, onClose }) {
  const nav = useNavigate()
  const [tab, setTab] = useState('all')
  const [read, setRead] = useState(false)

  /* الدروار بيتقفل قبل ما نتنقل — مينفعش يفضل فوق الشاشة الجديدة */
  const go = (to) => { onClose?.(); if (to) nav(to) }

  const unread = read ? 0 : ALL.filter((r) => r.unread).length
  const shown = tab === 'all' ? GROUPS : GROUPS.filter((g) => g.id === tab)
  const count = shown.reduce((a, g) => a + g.rows.length, 0)

  return (
    <Drawer open={open} onClose={onClose} width={548}
      title="الإشعارات"
      meta={unread ? `${unread} غير مقروء` : 'لا جديد'}
      footer={
        <div className="nt__foot">
          <button className="lnk lnk--mute" disabled={!unread} onClick={() => setRead(true)}>
            تعليم الكل كمقروء
          </button>
          <span className="nt__footn">{ALL.length} إشعارًا في آخر 30 يومًا</span>
        </div>
      }>

      {/* ---------- تابات الفلترة ---------- */}
      <div className="nt__tabs" data-component="NotifTabs">
        <button className={`nt__tab${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>
          الكل<span className="nt__tabn num">{ALL.length}</span>
        </button>
        {GROUPS.map((g) => (
          <button key={g.id} className={`nt__tab nt__tab--${g.tone}${tab === g.id ? ' on' : ''}`}
            onClick={() => setTab(g.id)} title={g.full}>
            {g.label}<span className="nt__tabn num">{g.rows.length}</span>
          </button>
        ))}
      </div>

      {/* ---------- المجموعات ---------- */}
      <div className="nt__list">
        {shown.map((g) => g.rows.length > 0 && (
          <section key={g.id} className="nt__grp">
            {tab === 'all' && (
              <header className="nt__gh">
                <span className={`nt__gt nt__gt--${g.tone}`}>{g.full}</span>
                <span className="nt__gn num">{g.rows.length}</span>
              </header>
            )}
            {g.rows.map((r) => <Row key={r.no} r={{ ...r, g }} read={read} go={go} />)}
          </section>
        ))}

        {count === 0 && <div className="nt__empty">لا توجد إشعارات هنا</div>}
      </div>
    </Drawer>
  )
}
