import { useState, useEffect, useRef, useMemo } from 'react'
import { Ico } from './icons.jsx'
import { MONTHS } from '../lib/format.js'

/* ============================================================
   فلتر الصفحة — كنترول واحد جنب البحث بيفلتر الشاشة كلها:
   الانسايتس والمجموعات والجدول والعدّادات، مش الليستة بس.
   قاعدة: أي فلتر شغّال لازم يبان كـتشيب تحت — عمرك ما تغيّر
   أرقام المستخدم من غير ما يشوف السبب.
   ============================================================ */

export const ALL = 'all'

export function emptyFilter(groups) {
  return Object.fromEntries(groups.map((g) => [g.id, ALL]))
}

export function activeOf(groups, value) {
  return groups.flatMap((g) => {
    const v = value?.[g.id]
    if (!v || v === ALL) return []
    const o = g.options.find((x) => x.id === v)
    return o ? [{ g, o }] : []
  })
}

/* الحقول اللي البحث بيدوّر فيها في المستندات: رقم المستند واسم
   العميل بالعربي والإنجليزي. الشاشات اللي سطرها مش مستند — زي
   العملاء — بتمرّر دالّتها بدل دي. */
export const docText = (r) => [r.no, r.c?.ar, r.c?.en]

/* الفلترة نفسها — كل مجموعة بتضيّق اللي قبلها (AND) */
export function applyFilter(rows, groups, value, q = '', text = docText) {
  let out = rows
  groups.forEach((g) => {
    const v = value?.[g.id]
    if (!v || v === ALL) return
    const o = g.options.find((x) => x.id === v)
    if (o?.test) out = out.filter(o.test)
  })
  const s = q.trim().toLowerCase()
  if (s) {
    out = out.filter((r) =>
      (text(r) || []).some((f) => String(f || '').toLowerCase().includes(s)))
  }
  return out
}


/* ============================================================
   الترتيب — نفس السلوك في كل جدول بدل ما كل شاشة تخترع واحد.
   الاستعمال:
     const S = useSort({ due: (a,b) => ... }, 'due')
     columns={[ S.col('الاستحقاق','due',{width:'132px'}), … ]}
     rows = S.apply(rows)
   ============================================================ */
export function useSort(cmps, defKey, defDir = 'desc') {
  const [sort, setSort] = useState({ key: defKey, dir: defDir })

  const onSort = (key) =>
    setSort((s) => (s.key === key
      ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
      : { key, dir: 'desc' }))

  const col = (label, key, extra = {}) => ({
    label, sortable: true,
    onSort: () => onSort(key),
    sorted: sort.key === key ? sort.dir : null,
    ...extra,
  })

  const apply = (rows) => {
    const c = cmps[sort.key]
    if (!c) return rows
    return [...rows].sort((a, b) => (sort.dir === 'asc' ? c(a, b) : c(b, a)))
  }

  return { sort, onSort, col, apply }
}

/* مقارنات جاهزة — التاريخ والنص والرقم */
export const byDate = (f) => (a, b) => new Date(a[f] || 0) - new Date(b[f] || 0)
export const byNum  = (f) => (a, b) => (a[f] || 0) - (b[f] || 0)
export const byText = (f) => (a, b) => String(a[f] || '').localeCompare(String(b[f] || ''), 'ar')
export const byParty = (a, b) => String(a.c?.ar || '').localeCompare(String(b.c?.ar || ''), 'ar')

/* ---------- الزرار + البانل ---------- */
export function PageFilter({ groups, value, onChange }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const active = activeOf(groups, value)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="pfilter" ref={box} data-component="PageFilter">
      <button
        className={`pfilter__btn${open ? ' is-open' : ''}${active.length ? ' is-on' : ''}`}
        aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Ico.filter size={16} />
        <span>فلترة</span>
        {active.length > 0 && <span className="pfilter__n">{active.length}</span>}
      </button>

      {open && (
        <div className="pfilter__pop" data-component="PageFilterPanel">
          <header className="pfilter__head">
            <b>فلترة الصفحة كلها</b>
            <button className="pfilter__clr" disabled={!active.length}
              onClick={() => onChange(emptyFilter(groups))}>مسح الكل</button>
          </header>

          <div className="pfilter__body">
            {groups.map((g) => (
              <section key={g.id} className="pfilter__g">
                <span className="pfilter__gl">{g.label}</span>
                <div className="pfilter__opts">
                  {g.options.map((o) => (
                    <button key={o.id}
                      className={`pfopt${(value?.[g.id] || ALL) === o.id ? ' on' : ''}`}
                      aria-pressed={(value?.[g.id] || ALL) === o.id}
                      onClick={() => onChange({ ...value, [g.id]: o.id })}>{o.label}</button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- التشيبس — الدليل الظاهر على إن الأرقام مفلترة ---------- */
export function FilterChips({ groups, value, onChange, q, onQ, shown, total }) {
  const active = activeOf(groups, value)
  const hasQ = !!(q && q.trim())
  if (!active.length && !hasQ) return null

  return (
    <div className="fchips" data-component="FilterChips">
      <span className="fchips__n">
        بتشوف <b>{shown}</b> من <b>{total}</b>
      </span>

      {hasQ && (
        <button className="fchip" onClick={() => onQ('')}>
          <span className="fchip__l">بحث</span>{q}
          <Ico.close size={13} />
        </button>
      )}

      {active.map(({ g, o }) => (
        <button key={g.id} className="fchip" onClick={() => onChange({ ...value, [g.id]: ALL })}>
          <span className="fchip__l">{g.label}</span>{o.label}
          <Ico.close size={13} />
        </button>
      ))}

      <button className="fchip fchip--clr"
        onClick={() => { onChange(emptyFilter(groups)); onQ('') }}>مسح الكل</button>
    </div>
  )
}

/* ============================================================
   فلتر الفترة — فوق مع البحث، وبيأثر على الصفحة كلها:
   الانسايتس والجدول والعدّادات. ده البُعد الوحيد اللي بيغيّر
   «إيه اللي بنتكلم عنه أصلًا»، عشان كده مكانه فوق مش جوه الجدول.
   القيمة كائن: {id} للفترات الجاهزة، أو {id:'custom', from, to}.
   ============================================================ */
/* ============================================================
   دروب داون واحد — «الحالة ▾» · «العميل ▾» · «ترتيب ▾».

   السيستم الأصلي بيحط كل بُعد في قايمته المستقلة جنب البحث،
   مش كلهم مجمّعين في بوب أوڤر واحد. الفرق مش شكلي: الفلتر
   المستقل **بيقول قيمته على طول** («العميل: مؤسسة النخبة»)،
   والمجمّع بيخفيها ورا زرار واحد.
   ============================================================ */
export function Pick({ label, value, options, onChange, width }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const cur = options.find((o) => o.id === value) || options[0]
  const on = cur?.id !== (options[0]?.id)

  return (
    <div className="pick1" ref={box} style={width ? { width } : undefined}>
      <button className={`pick1__b${on ? ' is-on' : ''}${open ? ' is-open' : ''}`}
        aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="pick1__l">{label}</span>
        <b>{cur?.label}</b>
        <Ico.chevron size={14} />
      </button>
      {open && (
        <div className="pick1__p" role="listbox">
          {options.map((o) => (
            <button key={o.id} role="option" aria-selected={o.id === value}
              className={`pick1__o${o.id === value ? ' is-on' : ''}`}
              onClick={() => { onChange(o.id); setOpen(false) }}>
              <span>{o.label}</span>
              {o.id === value && <Ico.check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const PERIODS = [
  { id: 'm',   label: 'هذا الشهر' },
  { id: 'q',   label: 'الربع الحالي' },
  { id: 'y',   label: 'هذه السنة' },
  { id: 'l12', label: 'آخر ١٢ شهر' },
  { id: 'all', label: 'كل الفترات' },
]

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function periodRange(p, today) {
  const id = typeof p === 'string' ? p : p?.id
  if (id === 'custom') {
    if (!p.from && !p.to) return null
    return [p.from ? new Date(p.from) : new Date('1970-01-01'),
            p.to   ? new Date(p.to)   : new Date('2999-12-31')]
  }
  const t = new Date(today)
  const y = t.getFullYear(), m = t.getMonth()
  if (id === 'm')   return [new Date(y, m, 1),                     new Date(y, m + 1, 0)]
  if (id === 'q')   return [new Date(y, Math.floor(m / 3) * 3, 1), new Date(y, Math.floor(m / 3) * 3 + 3, 0)]
  if (id === 'y')   return [new Date(y, 0, 1),                     new Date(y, 11, 31)]
  if (id === 'l12') return [new Date(y - 1, m, 1),                 new Date(y, m + 1, 0)]
  return null
}

export function inPeriod(row, p, today) {
  const r = periodRange(p, today)
  if (!r || !row.date) return true
  const d = new Date(row.date)
  return d >= r[0] && d <= r[1]
}

/* تسمية مختصرة: السنة بتتشال من الطرف الأول لو الطرفين في نفس السنة */
function shortRange(from, to) {
  if (from && to) {
    const a = new Date(from), b = new Date(to)
    const same = a.getFullYear() === b.getFullYear()
    const l = `${a.getDate()} ${MONTHS[a.getMonth()]}${same ? '' : ' ' + a.getFullYear()}`
    const r = `${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
    return `${l} – ${r}`
  }
  const d = new Date(from || to)
  const one = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  return from ? `من ${one}` : `حتى ${one}`
}

export function periodLabel(p, today) {
  const id = typeof p === 'string' ? p : p?.id
  if (id === 'custom' && (p.from || p.to)) return shortRange(p.from, p.to)
  if (id === 'y') return `سنة ${new Date(today).getFullYear()}`
  return PERIODS.find((x) => x.id === id)?.label || 'كل الفترات'
}

const isoDay = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
  '-' + String(d.getDate()).padStart(2, '0')

export function DateRange({ value, onChange, today }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(value?.id === 'custom')
  const [from, setFrom] = useState(value?.from || '')
  const [to, setTo] = useState(value?.to || '')
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  /* «من» بعد «إلى» = مدى فاضي — بنمنع التطبيق بدل ما نرجّع صفر من غير سبب */
  const bad   = from && to && new Date(from) > new Date(to)
  const ready = (from || to) && !bad

  const pickPreset = (id) => {
    setCustom(false)
    onChange({ id })
    setOpen(false)
  }
  const apply = () => {
    if (!ready) return
    onChange({ id: 'custom', from, to })
    setOpen(false)
  }

  const cur = typeof value === 'string' ? { id: value } : (value || { id: 'all' })

  return (
    <div className="dr" ref={box} data-component="DateRange">
      <button className={`dr__btn${open ? ' is-open' : ''}${cur.id === 'custom' ? ' is-on' : ''}`}
        aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Ico.calendar size={16} />
        <span>{periodLabel(cur, today)}</span>
        {/* المدى الفعلي جوّه الزرار نفسه — كان سطر مستقل فوق
            الشريط بيقول نفس اللي الزرار قايله بصيغة تانية */}
        {(() => {
          const r = periodRange(cur, today)
          return r ? <em className="dr__rg num ltr">{isoDay(r[0])} → {isoDay(r[1])}</em> : null
        })()}
        <Ico.chevron size={15} className="dr__chev" />
      </button>

      {open && (
        <div className="dr__pop">
          {PERIODS.map((p) => (
            <button key={p.id} className={`dr__i${cur.id === p.id ? ' on' : ''}`}
              onClick={() => pickPreset(p.id)}>
              <span>{p.id === 'y' ? periodLabel({ id: 'y' }, today) : p.label}</span>
              {cur.id === p.id && <Ico.check size={15} />}
            </button>
          ))}

          <div className="dr__sep" />

          <button className={`dr__i${custom || cur.id === 'custom' ? ' on' : ''}`}
            aria-expanded={custom} onClick={() => setCustom((c) => !c)}>
            <span>مدة محدّدة</span>
            <Ico.chevron size={14} className={custom ? 'dr__chev is-up' : 'dr__chev'} />
          </button>

          {custom && (
            <div className="dr__custom">
              <label className="dr__f">
                <span>من</span>
                <input type="date" value={from} max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="dr__f">
                <span>إلى</span>
                <input type="date" value={to} min={from || undefined}
                  onChange={(e) => setTo(e.target.value)} />
              </label>
              {bad && <p className="dr__err">تاريخ البداية بعد النهاية — بدّلهم.</p>}
              <div className="dr__cb">
                <button className="dr__clr" disabled={!from && !to}
                  onClick={() => { setFrom(''); setTo('') }}>مسح</button>
                <button className="dr__go" disabled={!ready} onClick={apply}>تطبيق</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
