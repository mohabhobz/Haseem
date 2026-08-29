import { useState, useRef, useEffect } from 'react'
import { Ico } from './icons.jsx'
import { fmtDate } from '../lib/format.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   حقل التاريخ.

   `<input type="date">` بيفتح **تقويم المتصفح**: إنجليزي، بشكل
   مختلف على كل نظام، وبأول يوم في الأسبوع حسب لغة الجهاز مش حسب
   السعودية. يعني نص الفورم بشكلنا ونصه بشكل الويندوز.

   التقويم ده بتاعنا: عربي · **الأسبوع بيبدأ أحد** · اليوم عليه
   علامة · والتنقّل بالشهور من غير ما الفورم يتقفل.

   القيمة بتفضل نص ISO زي ما هي (`2026-08-17`)، فالكود اللي
   بيستقبلها ما بيتغيّرش.
   ============================================================ */

const DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function DateField({ label, value, onChange, hint, error, optional, disabled, min }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => (value ? new Date(value) : new Date(DATA.TODAY)))
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const out = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const y = view.getFullYear()
  const m = view.getMonth()
  const first = new Date(y, m, 1).getDay()          /* الأحد = ٠ */
  const days = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]

  const pick = (d) => { onChange(iso(new Date(y, m, d))); setOpen(false) }
  const step = (n) => setView(new Date(y, m + n, 1))

  return (
    <div className="fld" ref={ref}>
      <span className="fld__l">{label}{optional && <em> اختياري</em>}</span>

      <button type="button" disabled={disabled}
        className={`datef${error ? ' is-bad' : ''}${open ? ' is-open' : ''}`}
        onClick={() => !disabled && setOpen(!open)} aria-expanded={open}>
        <Ico.calendar size={15} />
        <span className={value ? '' : 'hint'}>{value ? fmtDate(value) : 'اختر التاريخ'}</span>
        <Ico.chevron size={14} className="datef__ch" />
      </button>

      {open && (
        <div className="datep" role="dialog" aria-label="اختر التاريخ">
          <header className="datep__h">
            <button type="button" onClick={() => step(-1)} aria-label="الشهر اللي فات">
              <Ico.chevron size={15} style={{ transform: 'rotate(90deg)' }} />
            </button>
            <b>{MONTHS[m]} {y}</b>
            <button type="button" onClick={() => step(1)} aria-label="الشهر الجاي">
              <Ico.chevron size={15} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </header>

          <div className="datep__wd">
            {DAYS.map((d) => <span key={d}>{d.slice(0, 3)}</span>)}
          </div>

          <div className="datep__grid">
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />
              const id = iso(new Date(y, m, d))
              const off = min && id < min
              return (
                <button type="button" key={d} disabled={off}
                  className={`datep__d${id === value ? ' is-on' : ''}${id === DATA.TODAY ? ' is-today' : ''}`}
                  onClick={() => pick(d)}>{d}</button>
              )
            })}
          </div>

          <footer className="datep__f">
            <button type="button" className="linkish" onClick={() => { onChange(DATA.TODAY); setOpen(false) }}>
              النهارده
            </button>
            {value && (
              <button type="button" className="linkish" onClick={() => { onChange(''); setOpen(false) }}>
                مسح
              </button>
            )}
          </footer>
        </div>
      )}

      {error ? <em className="fld__e">{error}</em> : hint ? <em className="fld__h">{hint}</em> : null}
    </div>
  )
}
