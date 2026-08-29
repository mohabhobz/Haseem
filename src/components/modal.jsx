import { useEffect } from 'react'

/* ============================================================
   مودال الفورم.

   الماركب ده كان متكرّر بالحرف في أكتر من شاشة (`.cfm`). بقى
   كمبوننت واحد عشان سلوك الإغلاق (Escape والضغط برّا) وقفل
   سكرول الصفحة يبقى **واحد** في كل مكان بدل ما كل شاشة تعمله
   من جديد وتنسى نص منه.

   ملاحظة: مودال **التأكيد** حاجة تانية خالص وموجود في
   `feedback.jsx` — ده للفورمات بس.
   ============================================================ */
export function Modal({ title, sub, onClose, footer, wide = false, size, children }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="cfm" role="dialog" aria-modal="true" data-component="Modal">
      <div className="cfm__scrim" onClick={onClose} />
      <div className={`cfm__box cfm__box--form${
        size === 'xl' ? ' cfm__box--xl' : wide ? ' cfm__box--wide' : ''}`}>
        <h2 className="cfm__t">{title}</h2>
        {sub && <p className="cfm__b">{sub}</p>}
        <div className="cfm__form">{children}</div>
        {footer && <div className="cfm__acts" style={{ marginTop: 22 }}>{footer}</div>}
      </div>
    </div>
  )
}
