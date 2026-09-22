import { Sheet } from './modal.jsx'
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

  /* ★ نفس الدرج الموحّد (Sheet): الأكشنز فوق على الشمال والخلفية بلور */
  return (
    <Sheet title={title} meta={meta} onClose={onClose} actions={footer} closing={closing} component="Drawer">
      {children}
    </Sheet>
  )
}
