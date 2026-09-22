import { useState, useEffect, useRef, useContext, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { SortBtn } from './ob.jsx'
import { PeekCtx } from './layout.jsx'
import { bulkAction } from '../lib/actions.js'
import { Ico } from './icons.jsx'
import { Checkbox, IconButton, Button } from './primitives.jsx'
import { RowMenu } from './rowmenu.jsx'

/* جدول حقيقي برؤوس أعمدة ومحاذاة رقمية — الإصلاح الأساسي لملاحظة A1 */
/* ★ معاينة الصف — نفس لوحة المعاينة (ob-pv) اللي في المبيعات:
   العنوان · الأكشنز · تفاصيل الصف كأزواج «العمود ← القيمة». */
function RowPeek({ r, columns, onClose }) {
  const title = r.peekTitle ?? (typeof r.key === 'string' ? r.key : '')
  return (
    <aside className="ob-pv ob-pv--row" aria-label={title || 'معاينة'} data-component="RowPeek">
      <div className="ob-pv__hd">
        <button type="button" className="ob-x" onClick={onClose} aria-label="غلق المعاينة" title="غلق المعاينة"><Ico.close size={20} /></button>
        <h2><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span></h2>
      </div>
      {(r.onOpen || r.action || r.actions?.length > 0 || r.menu?.length > 0) && (
        <div className="ob-pv__acts">
          {r.onOpen && <button type="button" className="btn btn--primary" onClick={() => { onClose(); r.onOpen() }}>{r.openLabel || 'عرض التفاصيل'}</button>}
          {r.action && <button type="button" className="btn" onClick={() => r.action.onClick?.()}>{r.action.label}</button>}
          {r.actions?.map((a) => <button key={a.label} type="button" className="btn" disabled={a.off} onClick={(e) => a.onClick?.(e)}>{a.label}</button>)}
          {r.menu?.length > 0 && <RowMenu label="المزيد" items={r.menu} />}
        </div>
      )}
      <div className="ob-pv__body">
        <dl className="ob-kv">
          {r.cells.map((cell, i) => columns[i]?.label ? (
            <div key={i} className="ob-kv__r"><dt>{columns[i].label}</dt><dd className={columns[i].num ? 'num' : ''}>{cell}</dd></div>
          ) : null)}
        </dl>
      </div>
    </aside>
  )
}

export function DataTable({ columns, rows, selectable = true, selected: selIn, onSelect: onSelIn, onSelectAll: onAllIn, bulk, peek = true }) {
  /* ★ التحديد المتعدد في كل القوايم (قرار p7-209): لو الشاشة مبتديرش
     التحديد بنفسها، الجدول بيديره وبيطلّع شريط الأوامر الجماعية لوحده. */
  const own = useSelection()
  const selected = selIn ?? own.selected
  const onSelect = onSelIn ?? own.toggle
  const onSelectAll = onAllIn ?? ((on) => own.selectAll(on, rows.map((r, i) => r.key ?? i)))
  const pk = useContext(PeekCtx)
  /* ★ الترتيب على الموبايل: رؤوس الأعمدة مخفية في الكروت، فالأعمدة القابلة
     للترتيب بتطلع أيقونة جنب البحث في رأس القسم (sect__ctrl). */
  const wrapRef = useRef(null)
  const [sortSlot, setSortSlot] = useState(null)
  useLayoutEffect(() => { setSortSlot(wrapRef.current?.closest('.sect')?.querySelector('.sect__ctrl') || null) }, [])
  const sortCols = columns.filter((c) => c.sortable && typeof c.onSort === 'function')
  const sortOpts = sortCols.map((c, i) => ({ id: String(i), label: c.label + (c.sorted ? (c.sorted === 'asc' ? ' ↑' : ' ↓') : '') }))
  const sortCur = String(sortCols.findIndex((c) => c.sorted))
  const openRow = (r) => {
    if (peek && pk) pk.open(r.key, <RowPeek r={r} columns={columns} onClose={pk.close} />)
    else r.onOpen?.()
  }
  const allOn = selectable && rows.length > 0 && selected.size === rows.length
  return (
    <div data-component="DataTable" className="tablewrap" ref={wrapRef}>
      {sortSlot && sortCols.length > 0 && createPortal(
        <span className="ob-show-sm ob-sortslot"><SortBtn value={sortCur} options={sortOpts} onChange={(id) => sortCols[+id]?.onSort()} /></span>, sortSlot)}
      <table className="dt">
        <thead>
          <tr>
            {selectable && (
              <th className="checkcell">
                <Checkbox checked={allOn} onChange={() => onSelectAll(!allOn)} />
              </th>
            )}
            {/* العمود بيبقى قابل للترتيب فعلًا بس لما الشاشة تبعت onSort.
                من غيرها بيفضل رأس عادي — بدل سهم شكله زرار وهو مش زرار. */}
            {columns.map((c, i) => {
              const live = c.sortable && typeof c.onSort === 'function'
              return (
                <th key={i}
                  className={`${c.num ? 'n' : ''} ${c.sortable ? 'sortable' : ''} ${c.sorted ? 'sorted' : ''}`}
                  style={c.width ? { width: c.width } : undefined}
                  aria-sort={c.sorted ? (c.sorted === 'desc' ? 'descending' : 'ascending') : undefined}
                  onClick={live ? c.onSort : undefined}
                  role={live ? 'button' : undefined}
                  tabIndex={live ? 0 : undefined}
                  onKeyDown={live ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onSort() } } : undefined}>
                  {c.label}
                  {c.sortable && <span className="sort">{c.sorted === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )
            })}
            <th className="actcell">{rows.some((r) => r.action) ? 'الأمر التالي' : ''}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.key ?? ri} data-component="DataRow"
              className={`${selected?.has(r.key ?? ri) ? 'selected' : ''}${(r.onOpen || (peek && pk)) ? ' is-open' : ''}${pk && pk.key != null && pk.key === r.key ? ' is-peek' : ''}`}
              onClick={(r.onOpen || (peek && pk)) ? (e) => { if (!e.target.closest('button,input,label,a,select')) openRow(r) } : undefined}>
              {selectable && (
                <td className="checkcell">
                  <Checkbox checked={selected.has(r.key ?? ri)} onChange={() => onSelect(r.key ?? ri)} />
                </td>
              )}
              {r.cells.map((cell, ci) => (
                <td key={ci} className={columns[ci]?.num ? 'n' : ''}>{cell}</td>
              ))}
              <td className="actcell">
                <div className="rowacts">
                  {/* ★ عنقود الأوامر — السيستم بيحط أكتر من أمر على الصف
                      (تسجيل دفعة · PDF · إرسال · معاينة) مش أمر واحد.
                      `action` فضل زي ما هو للأمر الرئيسي المميّز. */}
                  {r.actions?.map((a) => (
                    <button key={a.label} className={`iact${a.on ? ' is-on' : ''}`}
                      title={a.label} aria-label={a.label} disabled={a.off}
                      onClick={(e) => { e.stopPropagation(); a.onClick?.(e) }}>
                      {a.Ic ? <a.Ic size={15} /> : a.label}
                    </button>
                  ))}
                  {r.action && (
                    <button className={`act act--${r.action.tone || 'go'}`}
                      onClick={(e) => { e.stopPropagation(); r.action.onClick?.() }}>
                      {r.action.label}
                    </button>
                  )}
                  {/* القايمة بتيجي من الشاشة. لو الشاشة مبعتتش قايمة،
                      مبنرسمش زرار بيفتح فراغ. */}
                  {r.menu?.length > 0 && (
                    <RowMenu label={`خيارات ${r.key ?? ''}`} items={r.menu} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectable && !selIn && (
        <BulkActionBar count={own.selected.size} onClear={own.clear}
          actions={bulk?.actions || ['طباعة', 'تنزيل PDF', 'تصدير CSV']}
          onAction={(label) => bulkAction(label, bulk?.kind || 'rows', [...own.selected]).then(() => own.clear())} />
      )}
    </div>
  )
}

/* شريط الأفعال الجماعية — بديل تكرار 6 أزرار في كل صف (إصلاح A2) */
export function BulkActionBar({ count, actions, onClear, onAction }) {
  if (!count) return null
  return (
    <div data-component="BulkActionBar" className="bulkbar">
      <span className="bulkbar__count">تم تحديد <span className="num">{count}</span></span>
      {actions.map((a) => (
        <Button key={a} label={a} variant="ghost" size="sm"
          onClick={onAction ? () => onAction(a) : undefined} />
      ))}
      <button className="bulkbar__close" onClick={onClear}>✕</button>
    </div>
  )
}

/* أزرار الصفحات بتظهر بس لما يبقى فيه أكتر من صفحة فعلًا.
   قبل كده كانت ١ ٢ ٣ مرسومة دايمًا حتى لو كل النتايج في صفحة
   واحدة — زرار شكله شغّال وهو مش شغّال. */
/* ============================================================
   الترقيم.
   ------------------------------------------------------------
   ★ الأسهم كانت حروف نصّية (‹ ›) — مقاسها بيتغيّر مع الخط،
   ووزنها أرفع من أي أيقونة جنبها، واتجاهها في العربي بيلخبط.
   بقت أيقونات من نفس السيت، واتجاهها منطقي: «السابق» بيشاور
   ناحية اليمين في العربي.

   ★ وعدد الصفوف بقى **كومبوبوكس**: تختار من القايمة أو تكتب
   رقمك بإيدك. اللي بيراجع ١٥ فاتورة مش زي اللي بيراجع ٢٠٠،
   والقايمة الجاهزة لوحدها بتجبر الاتنين على نفس الرقم.
   ============================================================ */
const PER_OPTS = [12, 25, 50, 100]

function PerPage({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const box = useRef(null)

  useEffect(() => { setDraft(String(value)) }, [value])
  useEffect(() => {
    if (!open) return
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  /* الرقم بيتقبل عند الإنتر أو الخروج من الحقل — مش مع كل حرف،
     عشان ما نعيدش ترتيب الجدول وانت لسه بتكتب «1» من «100». */
  const commit = () => {
    const n = Math.max(1, Math.min(500, parseInt(draft, 10) || value))
    setDraft(String(n))
    if (n !== value) onChange(n)
    setOpen(false)
  }

  return (
    <label className="perpage" ref={box}>
      <span>صفوف</span>
      <span className="perpage__f">
        <input className="perpage__i num" value={draft} inputMode="numeric"
          aria-label="عدد الصفوف في الصفحة"
          onFocus={() => setOpen(true)}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false) }}
          onBlur={commit} />
        <button type="button" className="perpage__c" tabIndex={-1}
          aria-label="اختر من القائمة" onClick={() => setOpen((v) => !v)}>
          <Ico.chevron size={13} />
        </button>
        {open && (
          <div className="perpage__p" role="listbox">
            {PER_OPTS.map((n) => (
              <button key={n} type="button" role="option" aria-selected={n === value}
                className={n === value ? 'on' : ''}
                onMouseDown={(e) => { e.preventDefault(); setDraft(String(n)); onChange(n); setOpen(false) }}>
                <span className="num">{n}</span>
              </button>
            ))}
          </div>
        )}
      </span>
    </label>
  )
}

export function Pagination({ from, to, total, page = 1, perPage, onPage, onPerPage }) {
  const pages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1
  const show = pages > 1 && typeof onPage === 'function'

  return (
    <div data-component="Pagination" className="pager">
      <div className="pager__count">
        عرض <span className="num">{from}</span> إلى <span className="num">{to}</span> من <span className="num">{total}</span>
      </div>

      <div className="pager__side">
        {typeof onPerPage === 'function' && <PerPage value={perPage} onChange={onPerPage} />}

        {show && (
          <div className="pager__pages">
            <button className="pager__btn pager__nav" disabled={page <= 1}
              aria-label="الصفحة السابقة" onClick={() => onPage(page - 1)}>
              <Ico.chevron size={14} />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`pager__btn${n === page ? ' on' : ''}`}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => onPage(n)}>{n}</button>
            ))}
            <button className="pager__btn pager__nav" disabled={page >= pages}
              aria-label="الصفحة التالية" onClick={() => onPage(page + 1)}>
              <Ico.chevron size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ title, text, action }) {
  return (
    <div data-component="EmptyState" className="empty">
      <div className="empty__art"><i /><i /><i /></div>
      <div className="empty__title">{title}</div>
      <div className="empty__text">{text}</div>
      {action}
    </div>
  )
}

export function SkeletonRows({ count = 6 }) {
  return (
    <div data-component="SkeletonRows" style={{ padding: 'var(--sp-4)' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--sp-4)', padding: 'var(--sp-3) 0',
          borderBottom: '1px solid var(--border-faint)' }}>
          <div className="skel" style={{ width: 96 }} />
          <div className="skel" style={{ width: 180 }} />
          <div className="skel" style={{ width: 110 }} />
          <div className="skel" style={{ flex: 1 }} />
          <div className="skel" style={{ width: 88 }} />
        </div>
      ))}
    </div>
  )
}

/* هوك التحديد — يستخدمه أي شاشة قائمة */
export function useSelection() {
  const [selected, setSelected] = useState(new Set())
  const toggle = (k) => setSelected((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n })
  const selectAll = (on, keys) => setSelected(on ? new Set(keys) : new Set())
  const clear = () => setSelected(new Set())
  return { selected, toggle, selectAll, clear }
}
