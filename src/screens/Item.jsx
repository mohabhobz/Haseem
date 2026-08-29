import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtMoney, fmtDate, daysFrom } from '../lib/format.js'
import * as ACT from '../lib/actions.js'
import { toast } from '../components/feedback.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   شاشة الصنف.

   دي **مش موجودة في سيستم العميل** — عنده التعديل مودال والصنف
   مالوش صفحة. والنتيجة إن أهم سؤال في المخزون مالوش إجابة:
   «الصنف ده فيه كام، فين، وليه اتغيّر؟»

   الشاشة بتجاوب التلاتة: الرصيد الكلي فوق، مفصّل على المستودعات،
   وتحته سجل الحركة اللي بيفسّر كل تغيير — تسوية بسببها ونقل
   بمصدره ووجهته.
   ============================================================ */

export default function Item() {
  const { sku } = useParams()
  const nav = useNavigate()
  const it = DATA.findItem(sku)

  if (!it) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>الصنف ده مش موجود</b>
          <span>يمكن يكون اتحذف. ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const isProd = it.kind === 'product'
  const qty    = isProd ? DATA.stockOf(it.sku) : null
  const rows   = isProd ? DATA.stockRows(it.sku) : []
  const moves  = DATA.movesOf(it.sku)
  const low    = DATA.isLow(it)
  const out    = DATA.isOut(it)
  const margin = it.cost > 0 ? Math.round(((it.sell - it.cost) / it.sell) * 100) : null
  const tax    = DATA.taxRates.find((t) => t.id === it.tax)
  const unit   = DATA.unitOf(it.unitCode)
  const expD   = it.expiry ? daysFrom(it.expiry) : null

  const acts = [
    { id: 'edit',   label: 'تعديل الصنف',    Ic: Ico.edit },
    isProd && { id: 'adjust', label: 'تسوية مخزون',  Ic: Ico.retry },
    isProd && { id: 'move',   label: 'نقل بين مستودعين', Ic: Ico.send },
    { id: 'dup',    label: 'نسخة جديدة منه', Ic: Ico.copy },
    { id: 'del',    label: 'حذف الصنف',      Ic: Ico.trash, tone: 'crit' },
  ].filter(Boolean)

  const run = (id) => {
    switch (id) {
      case 'edit':   return nav(`/inventory/items/${it.sku}/edit`)
      case 'adjust': return nav(`/inventory/adjustments?sku=${it.sku}`)
      case 'move':   return nav(`/inventory/transfers?sku=${it.sku}`)
      case 'dup':    return nav('/inventory/items/new')
      case 'del':    return ACT.deleteItem(it).then((ok) => ok && nav('/inventory/items'))
      default: return undefined
    }
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/inventory/items')}>
          <Ico.back size={16} />الأصناف
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no dochead__no--ar">{it.ar}</h1>
            <span className="doc__tags">
              <span className={`kind kind--${it.kind}`}>{isProd ? 'منتج' : 'خدمة'}</span>
              {out && <span className="st st--critical">نفد من المخزون</span>}
              {!out && low && <span className="st st--attention">تحت حد التنبيه</span>}
            </span>
            <span className="dochead__sub num">{it.sku}{it.en ? ` · ${it.en}` : ''}</span>
          </div>
          <div className="dochead__act">
            <button className="btn btn--primary" onClick={() => run('edit')}>
              <Ico.edit size={16} />تعديل الصنف
            </button>
          </div>
        </div>
      </div>

      <div className="docgrid">
        <div className="form">

          {/* ---------- الرصيد: الرقم الكبير ثم تفصيله ---------- */}
          {isProd ? (
            <section className="fcard">
              <div className="fcard__h">
                <h2 className="fcard__t">
                  الرصيد الحالي <em>محسوب من التسويات والنقل الصادر</em>
                </h2>
                <button className="gbtn2" onClick={() => run('adjust')}>
                  <Ico.retry size={14} />تسوية
                </button>
              </div>

              <div className="qhead">
                <span className={`qhead__n num${out ? ' is-out' : low ? ' is-low' : ''}`}>
                  {qty}
                </span>
                <span className="qhead__u">{it.unitName}</span>
                {it.reorder > 0 && (
                  <span className={`qhead__lim${low ? ' is-low' : ''}`}>
                    حد التنبيه <b className="num">{it.reorder}</b>
                  </span>
                )}
              </div>

              {/* التفصيل على المستودعات — ده اللي بيخلّي الرقم قابل للتصرّف */}
              {rows.length > 0 ? (
                <ul className="wlist">
                  {rows.map((r) => (
                    <li key={r.store.id}>
                      <span className="wlist__n">
                        <b>{r.store.ar}</b>
                        <em>{DATA.branches.find((b) => b.id === r.store.branch)?.ar}</em>
                      </span>
                      <span className="wlist__bar" aria-hidden="true">
                        <i style={{ width: `${Math.max(2, (r.qty / Math.max(qty, 1)) * 100)}%` }} />
                      </span>
                      <span className="wlist__q num">{r.qty}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fempty">الصنف مالوش رصيد في أي مستودع دلوقتي.</p>
              )}
            </section>
          ) : (
            <section className="fcard">
              <h2 className="fcard__t">المخزون <em>الخدمات ما بتتتبعش رصيد</em></h2>
              <p className="fempty">
                الصنف ده خدمة — بيتباع من غير كمية في المخزن، فمفيش رصيد ولا حد تنبيه ولا تسويات.
              </p>
            </section>
          )}

          {/* ---------- الأسعار ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">الأسعار <em>سعر البيع هو اللي بيتحط في الفاتورة</em></h2>
            <div className="kpis">
              <div className="kpi">
                <span className="kpi__l">سعر البيع</span>
                <span className="kpi__v"><SAR v={it.sell} dec /></span>
                <span className="kpi__s">لكل {it.unitName}</span>
              </div>
              <div className="kpi">
                <span className="kpi__l">سعر الشراء</span>
                <span className="kpi__v">
                  {it.cost > 0 ? <SAR v={it.cost} dec /> : <em className="hint">غير محدد</em>}
                </span>
                <span className="kpi__s">متوسط التكلفة</span>
              </div>
              <div className="kpi">
                <span className="kpi__l">هامش الربح</span>
                <span className="kpi__v">
                  {margin !== null ? <span className="num">{margin}٪</span> : <em className="hint">—</em>}
                </span>
                <span className="kpi__s">
                  {margin !== null ? `${fmtMoney(it.sell - it.cost)} على الوحدة` : 'محتاج سعر شراء'}
                </span>
              </div>
              {isProd && (
                <div className="kpi">
                  <span className="kpi__l">قيمة المخزون</span>
                  <span className="kpi__v"><SAR v={DATA.stockValue(it)} /></span>
                  <span className="kpi__s">الرصيد × التكلفة</span>
                </div>
              )}
            </div>
          </section>

          {/* ---------- سجل الحركة ---------- */}
          {isProd && (
            <section className="fcard">
              <h2 className="fcard__t">
                حركة الصنف <em>كل تغيير في الرصيد وسببه</em>
              </h2>
              {moves.length === 0 ? (
                <p className="fempty">مفيش حركة على الصنف ده بعد الرصيد الافتتاحي.</p>
              ) : (
                <ol className="mvlist">
                  {moves.map((m) => (
                    <li key={m.no} className={`mv mv--${m.k}`}>
                      <span className={`mv__q num${m.qty < 0 ? ' is-minus' : ''}`}>
                        {m.qty > 0 ? '+' : '−'}{Math.abs(m.qty)}
                      </span>
                      <span className="mv__b">
                        <b>{m.ar}{m.draft && <span className="mv__d">مسودة</span>}</b>
                        <em>{m.sub}</em>
                      </span>
                      <span className="mv__m">
                        <span className="num">{m.no}</span>
                        <em>{fmtDate(m.date)} · {m.who}</em>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {moves.some((m) => m.draft) && (
                <p className="fnote fnote--quiet">
                  النقل اللي لسه مسودة **ما اتحسبش** في الرصيد — الرصيد بيتحرّك عند الإصدار بس.
                </p>
              )}
            </section>
          )}
        </div>

        {/* ---------- الرَّيل ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">بيانات الصنف</span>
            <dl className="deflist">
              <div><dt>رمز الصنف</dt><dd className="num">{it.sku}</dd></div>
              <div><dt>الباركود</dt>
                <dd className="num">{it.barcode || <em className="hint">غير محدد</em>}</dd></div>
              <div><dt>الفئة</dt><dd>{it.cat || <em className="hint">غير محددة</em>}</dd></div>
              <div><dt>الوحدة</dt>
                <dd>{it.unitName} <span className="num deflist__c">{it.unitCode}</span></dd></div>
              <div><dt>فئة الضريبة</dt><dd>{tax?.ar || '—'}</dd></div>
              {it.expiry && (
                <div><dt>انتهاء الصلاحية</dt>
                  <dd className={expD !== null && expD <= 90 ? 'is-warn' : ''}>
                    {fmtDate(it.expiry)}
                  </dd></div>
              )}
            </dl>
            {it.expiry && expD !== null && expD <= 90 && (
              <p className="fnote fnote--warn">
                <Ico.check size={14} />
                {expD < 0
                  ? `الصلاحية انتهت من ${Math.abs(expD)} يوم — التنبيه بيظهر على الفاتورة ومش بيمنع البيع.`
                  : `الصلاحية بتنتهي خلال ${expD} يوم — التنبيه بيظهر على الفاتورة ومش بيمنع البيع.`}
              </p>
            )}
          </section>

          <section className="rail__c">
            <span className="rail__lbl">أوامر</span>
            <div className="rail__acts">
              {acts.map((a) => (
                <button key={a.id} className={`ract${a.tone === 'crit' ? ' ract--crit' : ''}`}
                  onClick={() => run(a.id)}>
                  <a.Ic size={16} />
                  <span className="ract__t">{a.label}</span>
                </button>
              ))}
            </div>
          </section>

          {it.desc && (
            <section className="rail__c">
              <span className="rail__lbl">الوصف</span>
              <p className="rail__note">{it.desc}</p>
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  )
}
