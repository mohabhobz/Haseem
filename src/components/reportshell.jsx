import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote } from './layout.jsx'
import { Button } from './primitives.jsx'
import { Ico, Riyal } from './icons.jsx'
import { SAR } from './data.jsx'
import { DateRange } from './pagefilter.jsx'
import { fmtMoney, fmtDate, TODAY } from '../lib/format.js'
import * as ACT from '../lib/actions.js'

/* ============================================================
   قشرة التقرير — نفس الرأس ونفس الفلاتر ونفس التصدير في كل تقرير.

   في سيستم العميل التمانية تقارير شبه بعض في الرأس بس مختلفين في
   كل حاجة تانية: واحد فيه PDF وواحد لأ، واحد فلاتره عشرة وواحد
   فلتره واحد، وكل واحد بيرسم الكروت بطريقة. المستخدم بيتعلّم
   الشاشة من أول كل مرة.

   هنا **قشرة واحدة**: العنوان والفترة والتصدير في نفس المكان
   دايمًا، واللي بيتغيّر هو المحتوى بس.
   ============================================================ */

export function ReportShell({
  title, sub, period, onPeriod, asOf, onAsOf, extra,
  csv, pdf, note, children, wide = false,
}) {
  const nav = useNavigate()
  return (
    <AppShell search="ابحث…">
      <div className="tophead">
        <PageHeader title={title} sub={<>{sub}<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          {/* ★ فلتر الفترة **أول عنصر** في مجموعة الأزرار — يعني أقصى
              اليمين — في كل شاشة في السيستم. كان هنا جوّه شريط رمادي
              تحت الرأس، وفي المبيعات فوق. بقى مكان واحد. */}
          {onPeriod && <DateRange value={period} onChange={onPeriod} today={TODAY} />}
          {onAsOf && (
            <label className="asof">
              <span className="asof__l">حتى</span>
              <input className="asof__i" type="date" value={asOf}
                onChange={(e) => onAsOf(e.target.value)} />
            </label>
          )}
          <span className="fresh"><i />محسوب من بياناتك الآن</span>
          {csv !== false && (
            <Button label="تنزيل CSV" variant="ghost"
              onClick={() => ACT.exportReport(title, 'csv')} />
          )}
          {pdf && (
            <Button label="تنزيل PDF" variant="outline"
              onClick={() => ACT.exportReport(title, 'pdf')} />
          )}
          <Button label="طباعة" variant="ghost" onClick={() => ACT.printReport(title)} />
        </div>
      </div>

      {/* الشريط بيظهر بس لو فيه فلاتر فعلًا — مش بانِد رمادي فاضي */}
      {extra && <div className="repbar">{extra}</div>}

      {children}

      {note && <p className="fnote fnote--quiet" style={{ marginTop: 16 }}>{note}</p>}
    </AppShell>
  )
}

/* ============================================================
   كروت المؤشرات — الكارت **مدخل** مش رقم ساكت.

   النمط ده مأخوذ من تقرير التدفق النقدي عند العميل: تدوس على
   الكارت فالتفاصيل بتتفتح تحته. هو الحاجة الوحيدة الكويسة في
   الموديول بتاعه، فعمّمناها على كل التقارير.

   والفرق التاني: كارت واحد **قائد** أكبر من الباقي. عنده الستة
   بنفس الحجم فـ«إجمالي المبيعات» زي «عدد البنود».
   ============================================================ */
export function KpiRow({ items, value, onPick }) {
  return (
    <div className="kpirow" data-component="KpiRow">
      {items.map((k) => {
        const on = value === k.id
        const live = !!onPick && !!k.drill
        return (
          <button key={k.id}
            className={`kpic${k.lead ? ' kpic--lead' : ''}${on ? ' is-on' : ''}${live ? ' is-live' : ''}${k.tone ? ` kpic--${k.tone}` : ''}`}
            onClick={live ? () => onPick(on ? null : k.id) : undefined}
            aria-pressed={live ? on : undefined}
            disabled={!live}>
            <span className="kpic__l">
              {k.label}
              {live && <em className="kpic__go">{on ? 'معروض' : 'عرض'}</em>}
            </span>
            <span className="kpic__v">
              {k.money === false
                ? <span className="num">{k.value}</span>
                : <SAR v={k.value} dec={k.dec} />}
            </span>
            {k.sub && <span className="kpic__s">{k.sub}</span>}
            {k.delta && (
              <span className={`kpic__d${k.delta.up ? ' is-up' : ' is-down'}`}>
                {k.delta.up ? '▲' : '▼'} {Math.abs(k.delta.pct)}٪
                <em>عن الفترة السابقة</em>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ============================================================
   سطر في تقرير مالي — التسمية شمال والرقم يمين، مع مستويات.
   ============================================================ */
export function FinRow({ label, code, value, level = 0, kind, go, note }) {
  const nav = useNavigate()
  const cls = `finrow finrow--l${level}${kind ? ` finrow--${kind}` : ''}`
  const body = (
    <>
      <span className="finrow__l">
        {code && <em className="finrow__c num">{code}</em>}
        {label}
        {note && <em className="finrow__n">{note}</em>}
      </span>
      <span className="finrow__v">
        {value === null || value === undefined
          ? <em className="hint">—</em>
          : <SAR v={value} dec />}
      </span>
    </>
  )
  if (go) return <button className={`${cls} is-go`} onClick={() => nav(go)}>{body}</button>
  return <div className={cls}>{body}</div>
}

/* قسم في تقرير مالي */
export function FinBlock({ title, hint, children, foot }) {
  return (
    <section className="finblock">
      {title && (
        <header className="finblock__h">
          <h3 className="finblock__t">{title}</h3>
          {hint && <span className="finblock__hint">{hint}</span>}
        </header>
      )}
      {children}
      {foot}
    </section>
  )
}

/* بادچ التحقّق — الحسبة بتتأكد قدام المستخدم مش وراه */
export function CheckBadge({ ok, okText, badText, detail }) {
  return (
    <span className={`chkb${ok ? ' is-ok' : ' is-bad'}`} title={detail}>
      {ok ? <Ico.check size={14} /> : <Ico.close size={14} />}
      {ok ? okText : badText}
    </span>
  )
}

/* ============================================================
   قايمة التوزيع — «مين الأكبر ومن إجمالي كام».

   ثلاث قواعد اتكسرت في النسخة الأولى واتصلّحت:

   ١. **طول العمود كان بيقول حاجة والنسبة جنبه بتقول حاجة تانية.**
      العمود كان متقاس على الأكبر (فالأكبر دايمًا ١٠٠٪ من العرض)
      والنسبة متقاسة على الإجمالي. يعني صف مكتوب جنبه ٢٤٫٥٪ وعموده
      مالي السطر بالكامل. دلوقتي **مقياس واحد**: طول العمود = نسبته
      من الإجمالي بالظبط، فالرقم والشكل بيقولوا نفس الحاجة.

   ٢. **أول صف كان بياخد لون مختلف عشان إنه أول صف.** ده لون بيتبع
      **الترتيب** مش الكيان — تغيّر الفلتر يتغيّر اللي واخد اللون.
      اللون دلوقتي واحد لكل الأعمدة، والاختلاف الوحيد المسموح هو
      **فئة مختلفة فعلًا** (المرسمل مقابل المصروف) ومعاها لابل مكتوب
      عشان الفرق ميبقاش باللون لوحده.

   ٣. **القايمة كانت عايمة على خلفية الصفحة** من غير كارت أبيض زي
      باقي الكمبوننتس.
   ============================================================ */
export function BarList({ title, hint, rows, total, onGo, foot,
  empty = 'مفيش بيانات في الفترة دي.' }) {
  return (
    <section className="barcard" data-component="BarList">
      {title && (
        <header className="barcard__h">
          <h3 className="barcard__t">{title}</h3>
          {hint && <span className="barcard__hint">{hint}</span>}
        </header>
      )}

      {!rows.length ? (
        <p className="fempty">{empty}</p>
      ) : (
        <ul className="barlist">
          {rows.map((r) => {
            const pct = total ? (r.amount / total) * 100 : 0
            const go = onGo && r.go
            return (
              <li key={r.id || r.acc} className={go ? 'is-go' : ''}
                onClick={go ? () => onGo(r.go) : undefined}
                title={`${r.ar} — ${fmtMoney(r.amount)} ر.س (${pct.toFixed(1)}٪ من الإجمالي)`}>
                <span className="barlist__n">
                  <b>{r.ar}</b>
                  {r.sub && <em>{r.sub}</em>}
                </span>
                <span className="barlist__b" aria-hidden="true">
                  {/* العرض = النسبة بالظبط من غير أي حد أدنى في الرقم.
                      الظهور مضمون بـ`min-width` في الـCSS — الحد الأدنى
                      عرض مرئي، مش قيمة متغيّرة. */}
                  <i className={r.capital ? 'is-alt' : ''}
                    style={{ width: `${Math.abs(pct)}%` }} />
                </span>
                <span className="barlist__p num">{pct.toFixed(1)}٪</span>
                <span className="barlist__v"><SAR v={r.amount} /></span>
              </li>
            )
          })}
        </ul>
      )}
      {foot}
    </section>
  )
}

/* جدول تفاصيل الكارت — نفس الشكل في كل التقارير */
export function DrillTable({ title, rows, cols, onGo, empty }) {
  const nav = useNavigate()
  if (!rows.length) return (
    <section className="sect">
      <header className="sect__h"><h2 className="sect__t">{title}</h2></header>
      <div className="sect__empty"><b>{empty || 'مفيش حركة'}</b>
        <span>غيّر الفترة أو اختر كارت تاني.</span></div>
    </section>
  )
  return (
    <section className="sect" data-component="DrillTable">
      <header className="sect__h">
        <h2 className="sect__t">{title}<span className="sect__n">{rows.length}</span></h2>
      </header>
      <div className="tablewrap">
        <table className="dt dt--flat">
          <thead>
            <tr>{cols.map((c, i) => (
              <th key={i} className={c.num ? 'n' : ''} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key || i} className={r.go ? 'is-open' : ''}
                onClick={r.go ? () => nav(r.go) : undefined}>
                {r.cells.map((c, j) => (
                  <td key={j} className={cols[j]?.num ? 'n' : ''}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
