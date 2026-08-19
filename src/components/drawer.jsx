import { useEffect, useState } from 'react'
import { Ico } from './icons.jsx'

/* ============================================================
   Drawer — لوح جانبي بيطلع من الشمال وبيرجع يدخل لما يتقفل.
   الخروج في بداية السطر (يمين). بيتقفل بـEsc أو بالضغط على الخلفية.
   ============================================================ */
export function Drawer({ open, onClose, title, meta, footer, children, width = 460 }) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return }
    if (!mounted) return
    setClosing(true)
    const t = setTimeout(() => { setMounted(false); setClosing(false) }, 280)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div data-component="Drawer" className={`drawer__root${closing ? ' is-closing' : ''}`}
      role="dialog" aria-modal="true" aria-label={title}>
      <div className="drawer__scrim" onClick={onClose} />
      <aside className="drawer" style={{ width }}>
        <header className="drawer__head">
          <button className="drawer__x" onClick={onClose} aria-label="إغلاق" title="إغلاق">
            <Ico.close size={18} />
          </button>
          <div className="drawer__ht">
            <h2 className="drawer__title">{title}</h2>
            {meta && <span className="drawer__meta">{meta}</span>}
          </div>
        </header>

        <div className="drawer__body">{children}</div>

        {footer && <footer className="drawer__foot">{footer}</footer>}
      </aside>
    </div>
  )
}
