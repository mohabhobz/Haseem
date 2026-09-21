import { useState, useMemo, useEffect, useRef } from 'react'
import { Ico } from './icons.jsx'
import { useSelection } from './table.jsx'
import { QuietSelect, usePop, Check } from './ob.jsx'

/* ============================================================
   ObList — نمط قايمة المستندات في Option B (List §3–§6)،
   متعمّم على كل قوايم التطبيق (قرار ٠-٩).

   نفس لغة «فواتير المبيعات» بالظبط:
   بحث + pills بنقطة + quiet selects + «المزيد» · بار جماعي
   · جدول ٦٤px بأكشن سياقي soft + عين + ⋮ · جدول مضغوط جنب
   المعاينة · كروت تحت ٦٤٠ · skeleton / فاضي / لا نتائج · ترقيم.

   كل شاشة بتدّي الإعدادات بس (الأعمدة والأوامر والفلاتر).
   ============================================================ */

export function useAvail(pv, ref) {
  /* ★ العرض الفعلي للكارت (ResizeObserver) — مش حساب من عرض الشاشة:
     السايدبار ممكن يكون ٧٦ أو ٢٦٠، والمعاينة ٥٦٠ أو ٤٤٠ */
  const [w, setW] = useState(1200)
  useEffect(() => {
    const el = ref?.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [pv, ref])
  return w
}

export function RowMenuOb({ items, label, up }) {
  const p = usePop()
  const list = items.filter(Boolean)
  return (
    <span className="ob-picker" ref={p.ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="iconbtn" aria-label={label} aria-haspopup="menu" aria-expanded={p.open} onClick={p.toggle}>
        <Ico.dotsV size={20} />
      </button>
      {p.open && (
        <div className={`ob-menu is-end${up ? ' is-up' : ''}`} role="menu" style={{ minWidth: 220 }}>
          {list.map((it, i) => it.sep
            ? <hr key={'s' + i} />
            : (
              <button key={it.label} type="button" role="menuitem" disabled={it.off}
                title={it.off ? it.why : undefined}
                className={`ob-menu__i${it.danger ? ' ob-menu__i--danger' : ''}`}
                onClick={() => { p.setOpen(false); it.onClick() }}>
                {it.Ic && <it.Ic size={20} />}{it.label}
              </button>
            ))}
        </div>
      )}
    </span>
  )
}

function Ctx({ c, stop = true, icon = true }) {
  if (!c) return null
  return (
    <button type="button" className="btn btn--soft" onClick={(e) => { if (stop) e.stopPropagation(); c.onClick() }}>
      {icon && c.Ic && <c.Ic size={20} />}{c.label}
    </button>
  )
}

export function ObList({
  rows, rowKey = (r) => r.no, search, searchPh = 'ابحث بالرقم أو اسم العميل',
  pills = [], quiet = [], sorts = [], columns, compactCols,
  rowClass, onRow, context, menu, bulk = [], bulkMore = [],
  cardTitle, cardSub, cardChips, cardAmount, cardAmountLabel = '',
  empty = { t: 'لا توجد مستندات بعد', p: 'أنشئ أول مستند وسيظهر هنا.' }, emptyAction,
  preview, loading = false, perDefault = 10, children,
}) {
  const [pill, setPill] = useState(pills[0]?.id || 'all')
  const [qv, setQv] = useState(() => Object.fromEntries(quiet.map((f) => [f.id, f.def ?? f.options[0].id])))
  const [sort, setSort] = useState(sorts[0]?.id)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(perDefault)
  const { selected, toggle, selectAll, clear } = useSelection()
  const boxRef = useRef(null)

  const scoped = useMemo(() => rows
    .filter((r) => quiet.every((f) => !f.test || f.test(r, qv[f.id])))
    .filter((r) => !q.trim() || search(r).toLowerCase().includes(q.trim().toLowerCase())), [rows, qv, q])
  const counts = Object.fromEntries(pills.map((p) => [p.id, scoped.filter((r) => !p.test || p.test(r)).length]))
  const list = useMemo(() => {
    const p = pills.find((x) => x.id === pill)
    const cmp = sorts.find((s) => s.id === sort)?.cmp
    const out = scoped.filter((r) => !p?.test || p.test(r))
    return cmp ? [...out].sort(cmp) : out
  }, [scoped, pill, sort])

  const pages = Math.max(1, Math.ceil(list.length / size))
  const cur = Math.min(page, pages)
  const shown = list.slice((cur - 1) * size, cur * size)
  const allOn = shown.length > 0 && shown.every((r) => selected.has(rowKey(r)))

  const avail = useAvail(!!preview, boxRef)
  const layout = avail < 600 ? 'cards' : (preview || avail < 860) ? 'compact' : 'full'
  const cols = layout === 'compact' && compactCols ? columns.filter((c) => compactCols.includes(c.id)) : columns
  const reset = () => { setPill(pills[0]?.id); setQv(Object.fromEntries(quiet.map((f) => [f.id, f.def ?? f.options[0].id]))); setQ(''); setPage(1) }
  const ids = [...selected]

  return (
    <div className="ob-card" data-component="ObList" ref={boxRef}>
      <div className="ob-fbar">
        <label className="search">
          <Ico.search size={20} />
          <input value={q} placeholder={searchPh} aria-label="بحث" onChange={(e) => { setQ(e.target.value); setPage(1) }} />
          {q && <button type="button" className="search__x" aria-label="مسح البحث" onClick={() => setQ('')}><Ico.close size={16} /></button>}
        </label>
        {pills.length > 0 && (
          <div className="ob-pills" role="group" aria-label="الحالة">
            {pills.map((p) => (
              <button key={p.id} type="button" aria-pressed={pill === p.id} onClick={() => { setPill(p.id); setPage(1) }}>
                {p.dot && <i style={{ background: p.dot }} />}{p.label}<small><span className="num">{counts[p.id]}</span></small>
              </button>
            ))}
          </div>
        )}
      </div>
      {(quiet.length > 0 || sorts.length > 0 || children) && (
        <div className="ob-fbar" style={{ marginTop: -4 }}>
          {quiet.map((f) => (
            <QuietSelect key={f.id} label={f.label} value={qv[f.id]} options={f.options}
              onChange={(v) => { setQv((a) => ({ ...a, [f.id]: v })); setPage(1) }} />
          ))}
          {sorts.length > 0 && <QuietSelect label="الترتيب" value={sort} options={sorts} onChange={setSort} />}
          <span className="ob-sp" />
          {children}
        </div>
      )}

      {selected.size > 0 && bulk.length > 0 && (
        <div className="ob-bulk" role="region" aria-label="الأوامر الجماعية">
          <b><span className="num">{selected.size}</span> محددة</b>
          {bulk.map((b) => (
            <button key={b.label} type="button" className="btn" disabled={b.off?.(ids)} onClick={() => Promise.resolve(b.onClick(ids)).then((ok) => ok !== false && clear())}>
              {b.Ic && <b.Ic size={20} />}{b.label}
            </button>
          ))}
          {bulkMore.length > 0 && <RowMenuOb label="أوامر جماعية أخرى"
            items={bulkMore.map((b) => b.sep ? b : ({ ...b, onClick: () => Promise.resolve(b.onClick(ids)).then((ok) => ok !== false && clear()) }))} />}
          <button type="button" className="iconbtn" aria-label="إلغاء التحديد" onClick={clear}><Ico.close size={20} /></button>
        </div>
      )}

      {loading ? (
        <div aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', height: 64, borderBottom: '1px solid var(--border-faint)' }}>
              <span className="ob-skel" style={{ width: 20 }} /><span className="ob-skel" style={{ width: 110 }} />
              <span className="ob-skel" style={{ width: 180 }} /><span className="ob-skel" style={{ flex: 1 }} /><span className="ob-skel" style={{ width: 100 }} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="ob-emptybig">
          <Ico.file size={32} /><h3>{empty.t}</h3><p>{empty.p}</p>{emptyAction}
        </div>
      ) : list.length === 0 ? (
        <div className="ob-emptybig">
          <Ico.search size={32} /><h3>لا توجد نتائج تطابق البحث</h3><p>جرّب كلمة أخرى أو امسح الفلاتر.</p>
          <button type="button" className="btn" onClick={reset}>مسح الفلاتر</button>
        </div>
      ) : layout === 'cards' ? (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(0,1fr)' }}>
          {bulk.length > 0 && (
            <label className="ob-row" style={{ minHeight: 44 }}>
              <Check on={allOn} onChange={(c) => selectAll(c, shown.map(rowKey))} label="تحديد كل الصفحة" />
              <span className="ob-muted" style={{ fontSize: 13 }}>تحديد كل الصفحة</span>
            </label>
          )}
          {shown.map((r, i) => {
            const k = rowKey(r)
            const late = rowClass?.(r)?.includes('is-late')
            const ctx = context?.(r)
            return (
              <div key={k} className="ob-card" role="button" tabIndex={0}
                style={{ padding: '12px 14px', display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0,1fr)', ...(late ? { borderInlineStart: '3px solid #EF4444', background: '#FFFAF9' } : {}) }}
                onClick={() => onRow?.(r)} onKeyDown={(e) => { if (e.key === 'Enter') onRow?.(r) }}>
                <div className="ob-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="ob-row" style={{ flexWrap: 'nowrap', minWidth: 0, flex: '1 1 160px' }} onClick={(e) => e.stopPropagation()}>
                    {bulk.length > 0 && <Check on={selected.has(k)} onChange={() => toggle(k)} label={'تحديد ' + k} />}
                    <div style={{ minWidth: 0 }}>
                      <div className="ob-strong">{cardTitle(r)}</div>
                      <div className="ob-muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cardSub?.(r)}</div>
                    </div>
                  </div>
                  {cardChips?.(r)}
                </div>
                {cardAmount && (
                  <div className="ob-row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="ob-muted">{typeof cardAmountLabel === 'function' ? cardAmountLabel(r) : cardAmountLabel}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-strong)' }}>{cardAmount(r)}</span>
                  </div>
                )}
                <div className="ob-row" style={{ flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  {ctx && <div style={{ flex: 1, display: 'flex' }}><Ctx c={ctx} /></div>}
                  <button type="button" className="btn" style={{ flex: 1 }} onClick={() => onRow?.(r)}><Ico.eye size={20} />عرض</button>
                  {menu && <RowMenuOb items={menu(r)} label={'أوامر ' + k} up={i >= shown.length - 3} />}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="ob-tblwrap">
          <table className="ob-tbl">
            <thead>
              <tr>
                {bulk.length > 0 && <th style={{ width: 44 }}><Check on={allOn} onChange={(c) => selectAll(c, shown.map(rowKey))} label="تحديد كل الصفحة" /></th>}
                {cols.map((c) => <th key={c.id} className={c.n ? 'n' : undefined} style={c.w ? { width: c.w } : undefined}>{c.h}</th>)}
                <th><span className="ob-sr">الأوامر</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => {
                const k = rowKey(r)
                const ctx = layout === 'full' ? context?.(r) : null
                const cls = [rowClass?.(r), (selected.has(k) || preview?.key === k) && 'is-sel'].filter(Boolean).join(' ')
                return (
                  <tr key={k} data-row className={cls} onClick={() => onRow?.(r)}>
                    {bulk.length > 0 && <td onClick={(e) => e.stopPropagation()}><Check on={selected.has(k)} onChange={() => toggle(k)} label={'تحديد ' + k} /></td>}
                    {cols.map((c) => <td key={c.id} className={c.n ? 'n' : undefined} style={c.style}>{c.cell(r)}</td>)}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="ob-acts">
                        {layout === 'full' && context && (ctx ? <Ctx c={ctx} icon={false} /> : <span className="ob-actph" aria-hidden="true" />)}
                        {onRow && <button type="button" className="iconbtn" aria-label={'عرض ' + k} title="عرض" onClick={() => onRow(r)}><Ico.eye size={20} /></button>}
                        {menu && <RowMenuOb items={menu(r)} label={'أوامر ' + k} up={i >= shown.length - 3} />}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="ob-pager">
          <span>عرض <span className="num">{(cur - 1) * size + 1}–{Math.min(cur * size, list.length)}</span> من <span className="num">{list.length}</span></span>
          <QuietSelect label="" value={size} up options={[10, 25, 50].map((n) => ({ id: n, label: `${n} في الصفحة` }))} onChange={(n) => { setSize(n); setPage(1) }} />
          <span className="ob-pager__sp" />
          <button type="button" className="btn" disabled={cur <= 1} onClick={() => setPage(cur - 1)}><Ico.back size={20} className="ob-dir" />السابق</button>
          <span className="num">{cur} / {pages}</span>
          <button type="button" className="btn" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>التالي<Ico.arrowEnd size={20} className="ob-dir" /></button>
        </div>
      )}
    </div>
  )
}
