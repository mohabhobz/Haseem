import { useState, useRef, useEffect, useLayoutEffect, useMemo, Children, isValidElement } from 'react'
import { createPortal } from 'react-dom'
import { Ico } from './icons.jsx'

/* ============================================================
   حقل اختيار — بديل `<select>` النيتيف.

   ★ ليه شلنا النيتيف أصلًا؟

   لأن قايمة `<select>` **بيرسمها نظام التشغيل مش إحنا**. يعني:
   • خطها وألوانها ومسافاتها مالهاش علاقة بالهوية — وشكلها
     بيختلف بين ماك وويندوز وأندرويد.
   • ما ينفعش تحط فيها بحث ولا سطر تحتاني ولا علامة اختيار.
   • في شاشة عربية، ترتيب النص جوّاها بيتحكم فيه النظام.

   فالمستخدم بيشوف واجهة حسيم في كل حتة، وأول ما يفتح قايمة
   بيشوف واجهة الماك. الحقل ده بيقفل الفرق ده.

   ★ والقايمة بتترسم في **بورتال على الـbody** مش جوه الحقل.
   ده مش تعقيد زيادة: جدول البنود عليه `overflow-x:auto`، وأي
   قايمة جوّاه كانت هتتقص. البورتال بيطلّعها فوق كل حاجة،
   والموضع بيتحسب من مكان الحقل نفسه وبيتقلب لفوق لو مفيش
   مساحة تحت.
   ============================================================ */

/* البحث بيظهر **بالعدد**، مش بقرار في كل مكان بننادي منه.
   تحت ١٢ خيار عينك بتمسح القايمة أسرع ما إيدك تكتب — فالبحث
   ساعتها سطر زيادة بياخد مساحة ومش بيوفّر وقت. */
const SEARCH_FROM = 12

export function SelectField({
  value, onChange, options = [], placeholder = 'اختر…',
  search, disabled = false, className = '', ariaLabel,
}) {
  const withSearch = search ?? (options.length >= SEARCH_FROM)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(-1)          /* العنصر المضيّأ بالكيبورد */
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const pop = useRef(null)
  const inp = useRef(null)

  const cur = options.find((o) => String(o.id) === String(value))

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return options
    return options.filter((o) => String(o.label).toLowerCase().includes(n)
      || String(o.sub || '').toLowerCase().includes(n))
  }, [options, q])

  /* موضع القايمة — بيتحسب من مستطيل الحقل، وبيتقلب فوق لو ضاقت تحت */
  const place = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const H = Math.min(300, list.length * 34 + (withSearch ? 48 : 0) + 12)
    const below = window.innerHeight - r.bottom
    const up = below < H + 12 && r.top > below
    setPos({
      left: r.left, width: Math.max(r.width, 190),
      top: up ? undefined : r.bottom + 4,
      bottom: up ? window.innerHeight - r.top + 4 : undefined,
      maxH: Math.max(160, (up ? r.top : below) - 12),
    })
  }

  useLayoutEffect(() => { if (open) place() }, [open, list.length])

  useEffect(() => {
    if (!open) return
    const away = (e) => {
      if (btn.current?.contains(e.target) || pop.current?.contains(e.target)) return
      setOpen(false)
    }
    /* السكرول بيحرّك الحقل — والقايمة في بورتال فمش بتتحرك معاه.
       بنقفلها بدل ما تفضل معلّقة في الهوا. */
    const scroll = () => setOpen(false)
    document.addEventListener('mousedown', away)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', away)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    if (open && withSearch) inp.current?.focus()
    if (!open) { setQ(''); setHi(-1) }
  }, [open, withSearch])

  const choose = (o) => { onChange(o.id); setOpen(false); btn.current?.focus() }

  const keys = (e) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setOpen(true) }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(i + 1, list.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const o = list[hi] || (list.length === 1 ? list[0] : null)
      if (o) choose(o)
    }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button type="button" ref={btn} disabled={disabled}
        className={`selx ${className}`.trim()}
        role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)} onKeyDown={keys}>
        <span className={`selx__v${cur ? '' : ' is-ph'}`}>{cur?.label ?? placeholder}</span>
        <Ico.chevron size={14} />
      </button>

      {open && pos && createPortal(
        <div ref={pop} className="selx__p" role="listbox" onKeyDown={keys}
          style={{
            left: pos.left, width: pos.width,
            top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH,
          }}>
          {withSearch && (
            <div className="selx__s">
              <Ico.search size={14} />
              <input ref={inp} value={q} placeholder="ابحث…"
                onChange={(e) => { setQ(e.target.value); setHi(0) }} onKeyDown={keys} />
            </div>
          )}
          <div className="selx__l" tabIndex={-1}>
            {list.length === 0 && <p className="selx__none">مفيش نتيجة</p>}
            {list.map((o, i) => (
              <button key={o.id} type="button" role="option"
                aria-selected={String(o.id) === String(value)}
                className={`selx__o${String(o.id) === String(value) ? ' is-on' : ''}${i === hi ? ' is-hi' : ''}`}
                onMouseEnter={() => setHi(i)} onClick={() => choose(o)}>
                <span className="selx__ot">
                  {o.label}
                  {o.sub && <em>{o.sub}</em>}
                </span>
                {String(o.id) === String(value) && <Ico.check size={14} />}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}


/* ============================================================
   `<Select>` — نفس واجهة `<select>` النيتيف، بشكل حسيم.

   ★ ليه محوّلناش كل نداء بإيدنا؟

   في الشاشات ٦٠ قايمة تقريبًا، كل واحدة بتبني خياراتها بطريقة
   مختلفة (map، شرط، optgroup، خيار فاضي كـplaceholder). لو
   حوّلنا كل واحدة يدوي، كل واحدة فرصة غلطة.

   بدل كده الغلاف ده بياخد نفس الأطفال (`<option>`) وبيحوّلهم
   لـ`options`، وبيرجّع `onChange` على هيئة `{target:{value}}`
   بالظبط زي النيتيف — فمعالجات الأحداث القديمة بتشتغل من غير
   ما نلمسها. التحويل بقى: `<select>` → `<Select>` وخلاص.

   • أول `<option value="">` بيبقى الـplaceholder مش خيار.
   • `<optgroup>` بيتفرد، واسم المجموعة بينزل سطر تحتاني.
   • `fld__i` بتتشال من الكلاس — `.selx` ليه استايله الخاص —
     والمعدِّلات زي `is-bad` بتفضل (`.selx.is-bad` موجودة).
   ============================================================ */
const flat = (n) => Array.isArray(n) ? n.map(flat).join('')
  : (n == null || typeof n === 'boolean') ? '' : String(n)

export function Select({
  value, onChange, children, className = '', disabled = false,
  placeholder, search, ariaLabel, 'aria-label': al, ...rest
}) {
  const opts = []
  let ph = placeholder

  const walk = (nodes, group) => Children.forEach(nodes, (n) => {
    if (n == null || typeof n === 'boolean') return
    if (Array.isArray(n)) return walk(n, group)
    if (!isValidElement(n)) return
    if (n.type === 'optgroup') return walk(n.props.children, n.props.label)
    if (n.type !== 'option') return
    const label = flat(n.props.children)
    const id = 'value' in n.props ? n.props.value : label
    if ((id === '' || id == null) && ph === undefined) { ph = label; return }
    opts.push({ id, label, sub: group })
  })
  walk(children)

  const cls = String(className).split(/\s+/).filter((c) => c && c !== 'fld__i').join(' ')

  return (
    <SelectField
      value={value} options={opts} placeholder={ph ?? 'اختر…'}
      className={cls} disabled={disabled} search={search}
      ariaLabel={ariaLabel || al || rest['aria-labelledby']}
      onChange={(v) => onChange && onChange({ target: { value: v } })}
    />
  )
}
