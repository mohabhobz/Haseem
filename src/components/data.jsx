import { Riyal } from './icons.jsx'
import { fmtDate, fmtMoney, relDate, STATUS } from '../lib/format.js'

/* رقم مالي — مونوسبيس، خانتان عشريتان، محاذاة ثابتة */
/* العملة مش بتتكتب جنب كل رقم — معلنة مرة واحدة فوق الصفحة (CurrencyNote).
   في واجهة عربية «SAR» نص لاتيني مالوش لازمة، وتكراره ٢٠ مرة ضوضاء. */
export function Money({ value, muted = false }) {
  return (
    <span data-component="Money" className={`cell-money${muted ? ' muted' : ''}`}>
      <span className="num">{fmtMoney(value)}</span>
    </span>
  )
}

/* صيغة تاريخ واحدة في المنتج كله */
export function DateCell({ value, rel = false }) {
  return (
    <span data-component="DateCell" className="cell-date">
      {fmtDate(value)}
      {rel && value && <span className="rel">{relDate(value)}</span>}
    </span>
  )
}

/* اسم عربي + اسم إنجليزي في خلية واحدة */
export function PartyCell({ party }) {
  return (
    <div data-component="PartyCell" className="cell-party">
      <div className="ar">{party.ar}</div>
      <div className="en">{party.en}</div>
    </div>
  )
}

/* الهيئة: بتظهر بس لما يبقى فيه حاجة تتقال. «مقبولة» هي الوضع الطبيعي — سكوت. */
export function ZatcaBadge({ state, reason }) {
  if (!state || state === 'ok') return null
  const bad = state === 'bad'
  return (
    <span data-component="ZatcaBadge"
      className={`zatca${bad ? ' zatca--bad' : ' zatca--pending'}`}
      title={bad ? (reason || 'مرفوضة من الهيئة') : 'قيد الإرسال للهيئة'}>
      {bad ? 'رفض الهيئة' : 'عند الهيئة'}
    </span>
  )
}

/* الحالة ثنائية البُعد: حالة المستند عالية + حالة الهيئة هادية (إصلاح A3) */
export function StatusCell({ status, zatca, zatcaReason, sub }) {
  const s = STATUS[status] || STATUS.draft
  return (
    <div data-component="StatusCell" className={`status status--${s.tone}`}>
      <div className="status__doc">
        <span className={`status__dot status__dot--${s.dot}`} />
        <span className="status__label">{s.label}</span>
      </div>
      {sub && <span className="status__sub">{sub}</span>}
      <ZatcaBadge state={zatca} reason={zatcaReason} />
    </div>
  )
}

export function DocNo({ value, href }) {
  if (href) return <a data-component="DocNo" className="cell-doc cell-doc--link" href={href}>{value}</a>
  return <span data-component="DocNo" className="cell-doc">{value}</span>
}

/* ============================================================
   SAR — رقم + رمز الريال. الاستخدام الوحيد للمبالغ في المنتج.
   ============================================================ */
export function SAR({ v, dec = false, className = '' }) {
  const t = fmtMoney(v)
  return (
    <span data-component="SAR" className={`sar ${className}`}>
      <span className="num">{dec ? t : t.split('.')[0]}</span>
      <Riyal />
    </span>
  )
}
