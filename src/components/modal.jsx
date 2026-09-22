import { useEffect, useState, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/* ★ حركة الأدراج (Motion): اللوح بيدخل من الشمال والخلفية بتظهر تدريجي،
   وبيخرج بنفس الطريق قبل ما يتشال. transform/opacity بس عشان تبقى ناعمة،
   ولو المستخدم مفعّل «تقليل الحركة» بتبقى ظهور واختفاء بس. */
const EASE_IN = [0.22, 1, 0.36, 1]
const EASE_OUT = [0.4, 0, 1, 1]

/* ============================================================
   مودال الفورم.

   الماركب ده كان متكرّر بالحرف في أكتر من شاشة (`.cfm`). بقى
   كمبوننت واحد عشان سلوك الإغلاق (Escape والضغط برّا) وقفل
   سكرول الصفحة يبقى **واحد** في كل مكان بدل ما كل شاشة تعمله
   من جديد وتنسى نص منه.

   ملاحظة: مودال **التأكيد** حاجة تانية خالص وموجود في
   `feedback.jsx` — ده للفورمات بس.
   ============================================================ */
/* ============================================================
   ★ الدرج الموحّد (قرار مهاب ٢٢ سبتمبر):
   أي إنشاء/تعديل غير فاتورة المبيعات بيفتح في درج جانبي،
   والخلفية وراه بلور. الأكشنز (حفظ/إلغاء) دايمًا فوق على
   الشمال في رأس الدرج — نفس مكانها في رأس الصفحة. على
   الموبايل بتنزل شريط ثابت تحت.
   Modal و ObModal و Drawer كلهم بيرسموا نفس الـSheet ده.
   `dialog` = نافذة تأكيد صغيرة في النص (مش فورم).
   ============================================================ */
export function Sheet({ title, sub, meta, onClose, actions, mbar, size, children, component = 'Sheet', closing = false }) {
  const reduce = useReducedMotion()
  const [leaving, setLeaving] = useState(false)
  const out = leaving || closing
  const done = useRef(false)
  const requestClose = () => { if (!out) setLeaving(true) }
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  })
  const w = size === 'xl' ? ' ob-sheet--xl' : size === 'wide' ? ' ob-sheet--wide' : ''
  const panelFrom = reduce ? { opacity: 0 } : { x: '-100%' }
  const panelAt = reduce ? { opacity: 1 } : { x: 0 }
  return (
    <div className={`ob-sheet${w}${out ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} data-component={component}>
      <motion.div className="ob-sheet__scrim" onClick={requestClose}
        initial={{ opacity: 0 }} animate={{ opacity: out ? 0 : 1 }}
        transition={{ duration: out ? 0.2 : 0.28, ease: out ? EASE_OUT : EASE_IN }} />
      <motion.aside className="ob-sheet__panel"
        initial={panelFrom} animate={out ? panelFrom : panelAt}
        transition={{ duration: out ? 0.22 : 0.34, ease: out ? EASE_OUT : EASE_IN }}
        onAnimationComplete={() => { if (leaving && !done.current) { done.current = true; onClose?.() } }}>
        <header className="ob-sheet__head">
          <button type="button" className="ob-sheet__x" onClick={requestClose} aria-label="إغلاق"><CloseIc /></button>
          <div className="ob-sheet__ht">
            <h2 className="ob-sheet__t">{title}</h2>
            {(sub || meta) && <p className="ob-sheet__s">{sub || meta}</p>}
          </div>
          {actions && <div className="ob-sheet__acts">{actions}</div>}
        </header>
        <div className="ob-sheet__body">{children}</div>
        {(mbar || actions) && <footer className="ob-sheet__mbar">{mbar || actions}</footer>}
      </motion.aside>
    </div>
  )
}
const CloseIc = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
)

export function Modal({ title, sub, onClose, footer, wide = false, size, dialog = false, children }) {
  if (!dialog) {
    return <Sheet title={title} sub={sub} onClose={onClose} actions={footer} size={size || (wide ? 'wide' : undefined)} component="Modal">
      <div className="cfm__form">{children}</div>
    </Sheet>
  }
  return <DialogBox title={title} sub={sub} onClose={onClose} footer={footer} wide={wide} size={size}>{children}</DialogBox>
}

function DialogBox({ title, sub, onClose, footer, wide = false, size, children }) {
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
      <motion.div className="cfm__scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} />
      <motion.div className={`cfm__box cfm__box--form${
        size === 'xl' ? ' cfm__box--xl' : wide ? ' cfm__box--wide' : ''}`}
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE_IN }}>
        <h2 className="cfm__t">{title}</h2>
        {sub && <p className="cfm__b">{sub}</p>}
        <div className="cfm__form">{children}</div>
        {footer && <div className="cfm__acts" style={{ marginTop: 22 }}>{footer}</div>}
      </motion.div>
    </div>
  )
}
