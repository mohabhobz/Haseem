import { useState } from 'react'
import { Ico } from './icons.jsx'
import { Checkbox, IconButton, Button } from './primitives.jsx'

/* جدول حقيقي برؤوس أعمدة ومحاذاة رقمية — الإصلاح الأساسي لملاحظة A1 */
export function DataTable({ columns, rows, selectable = true, selected, onSelect, onSelectAll }) {
  const allOn = selectable && rows.length > 0 && selected.size === rows.length
  return (
    <div data-component="DataTable" className="tablewrap">
      <table className="dt">
        <thead>
          <tr>
            {selectable && (
              <th className="checkcell">
                <Checkbox checked={allOn} onChange={() => onSelectAll(!allOn)} />
              </th>
            )}
            {columns.map((c, i) => (
              <th key={i}
                className={`${c.num ? 'n' : ''} ${c.sortable ? 'sortable' : ''} ${c.sorted ? 'sorted' : ''}`}
                style={c.width ? { width: c.width } : undefined}>
                {c.label}
                {c.sortable && <span className="sort">{c.sorted === 'desc' ? '▼' : '▲'}</span>}
              </th>
            ))}
            <th className="actcell">{rows.some((r) => r.action) ? 'الأمر التالي' : ''}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.key ?? ri} data-component="DataRow"
              className={`${selected?.has(r.key ?? ri) ? 'selected' : ''}${r.onOpen ? ' is-open' : ''}`}
              onClick={r.onOpen ? (e) => { if (!e.target.closest('button,input,label')) r.onOpen() } : undefined}>
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
                  {r.action && (
                    <button className={`act act--${r.action.tone || 'go'}`}
                      onClick={(e) => { e.stopPropagation(); r.action.onClick?.() }}>
                      {r.action.label}
                    </button>
                  )}
                  <button className="dots" aria-label={`خيارات ${r.key ?? ''}`}
                    onClick={(e) => e.stopPropagation()}><Ico.more size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* شريط الأفعال الجماعية — بديل تكرار 6 أزرار في كل صف (إصلاح A2) */
export function BulkActionBar({ count, actions, onClear }) {
  if (!count) return null
  return (
    <div data-component="BulkActionBar" className="bulkbar">
      <span className="bulkbar__count">تم تحديد <span className="num">{count}</span></span>
      {actions.map((a) => <Button key={a} label={a} variant="ghost" size="sm" />)}
      <button className="bulkbar__close" onClick={onClear}>✕</button>
    </div>
  )
}

export function Pagination({ from, to, total }) {
  return (
    <div data-component="Pagination" className="pager">
      <div>عرض <span className="num">{from}</span> إلى <span className="num">{to}</span> من <span className="num">{total}</span></div>
      <div className="pager__pages">
        <button className="pager__btn">›</button>
        <button className="pager__btn on">1</button>
        <button className="pager__btn">2</button>
        <button className="pager__btn">3</button>
        <button className="pager__btn">‹</button>
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
