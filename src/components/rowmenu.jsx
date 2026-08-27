import { useState, useRef, useEffect } from 'react'
import { Ico } from './icons.jsx'

/* ============================================================
   قائمة أوامر الصف — اللي ورا الـ«···».
   قاعدة واحدة: الأمر اللي مينفعش دلوقتي بيفضل ظاهر ومقفول
   ومكتوب جنبه السبب، مش بيختفي. المستخدم لازم يعرف إن الأمر
   موجود وإن فيه شرط، مش يفتكر إن السيستم ناقص.
   ============================================================ */
export function RowMenu({ items, label = 'خيارات' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  if (!items?.length) return null

  return (
    <span className="rmenu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className={`dots${open ? ' is-on' : ''}`} aria-label={label}
        aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Ico.more size={16} />
      </button>

      {open && (
        <div className="rmenu__p" role="menu">
          {items.map((it, i) => it.sep ? (
            <hr key={`s${i}`} className="rmenu__sep" />
          ) : (
            <button key={it.label} role="menuitem"
              className={`rmenu__i${it.tone ? ` rmenu__i--${it.tone}` : ''}`}
              disabled={!!it.off}
              title={it.off ? it.why : undefined}
              onClick={() => { if (!it.off) { setOpen(false); it.onClick?.() } }}>
              {it.Ic && <it.Ic size={15} />}
              <span>{it.label}</span>
              {it.off && it.why && <em>{it.why}</em>}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

/* الأوامر المشتركة لأي مستند اتبعت للهيئة — نفس القاعدة في كل الشاشات:
   العرض دايمًا شغّال، والـXML والPDF بعد قبول الهيئة بس. */
export function docMenu({ zatca, onView }) {
  const ok = zatca === 'ok'
  const why = zatca === 'bad' ? 'الهيئة رفضته' : 'بيتولد بعد قبول الهيئة'
  return [
    { label: 'عرض المستند', Ic: Ico.search, onClick: onView },
    { sep: true },
    { label: 'تنزيل XML', Ic: Ico.download, off: !ok, why },
    { label: 'تنزيل PDF', Ic: Ico.download, off: !ok, why },
    { label: 'طباعة',     Ic: Ico.print },
  ]
}
