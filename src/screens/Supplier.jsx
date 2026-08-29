import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, CurrencyNote, Tabs } from '../components/layout.jsx'
import { DataTable } from '../components/table.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR, Money, DocNo, StatusCell } from '../components/data.jsx'
import { fmtDate, fmtMoney, daysFrom } from '../lib/format.js'
import { useDoc } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   شاشة المورد.

   عند العميل الحاجة الوحيدة اللي تفتحها على المورد هي **«كشف
   الحساب»** — جدول مدين/دائن ومفيش غيره. ومقلوب كمان: فاتورة
   الشراء متحطّة في **مدين** والدفعة في **دائن**، مع إن حساب
   المورد ذمم **دائنة** — يعني الاتجاه معكوس في كشف بيتبعت للمورد.

   هنا الاتجاه اتصلّح، والشاشة بقت تجاوب أربع أسئلة بأربع تابات:
   **عليّ له كام · بشتري منه إيه · طلبات مفتوحة · كشف الحساب**.
   ============================================================ */

const TABS = [
  { id: 'sum',    label: 'نظرة عامة' },
  { id: 'bills',  label: 'الفواتير' },
  { id: 'orders', label: 'أوامر الشراء' },
  { id: 'ledger', label: 'كشف الحساب' },
]

export default function Supplier() {
  const { id } = useParams()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'sum')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const s = useDoc('suppliers', id)
  const bills = useMemo(() => (s ? DATA.billsOf(s.id) : []), [s])
  const pos   = useMemo(() => (s ? DATA.poOf(s.id) : []), [s])
  const led   = useMemo(() => (s ? DATA.supplierLedger(s.id, from, to) : null), [s, from, to])

  if (!s) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>المورد ده مش موجود</b>
          <span>يمكن يكون اتحذف. ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const bal = DATA.supplierBalance(s.id)
  const posted = bills.filter((b) => b.status === 'posted')
  const late = posted.filter((b) => DATA.isLate(b))
  const lateSum = late.reduce((a, b) => a + DATA.billDue(b), 0)
  const spend = posted.reduce((a, b) => a + b.total, 0)
  const openPO = pos.filter(DATA.poLive)
  const commit = openPO.reduce((a, p) => a + DATA.poOpenValue(p), 0)
  const last = DATA.lastBuy(s.id)

  const counts = { sum: null, bills: bills.length, orders: pos.length, ledger: led.rows.length }

  const acts = [
    { id: 'bill',  label: 'فاتورة مشتريات جديدة', Ic: Ico.plus },
    { id: 'po',    label: 'أمر شراء جديد', Ic: Ico.plus },
    { id: 'stmt',  label: 'إرسال كشف الحساب', Ic: Ico.send },
    { id: 'edit',  label: 'تعديل البيانات', Ic: Ico.edit },
    { id: 'del',   label: 'حذف المورد', Ic: Ico.trash, tone: 'crit' },
  ]

  const run = (a) => {
    switch (a) {
      case 'bill': return nav('/purchases/bills/new')
      case 'po':   return nav('/purchases/orders/new')
      case 'stmt': return ACT.sendStatement(s, 'email')
      case 'edit': return nav('/purchases/suppliers?edit=' + s.id)
      case 'del':  return ACT.deleteSupplier(s, bills.length).then((ok) => ok && nav('/purchases/suppliers'))
      default: return undefined
    }
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/purchases/suppliers')}>
          <Ico.back size={16} />الموردون
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no dochead__no--ar">{s.ar}</h1>
            <span className="doc__tags">
              <span className={`kind kind--${s.type === 'company' ? 'product' : 'service'}`}>
                {s.type === 'company' ? 'شركة' : 'فرد'}
              </span>
              {!s.vat && <span className="st st--neutral">غير مسجّل ضريبيًا</span>}
              {late.length > 0 && <span className="st st--attention">{late.length} فاتورة متأخرة</span>}
            </span>
            <span className="dochead__sub num">{s.id}{s.en ? ` · ${s.en}` : ''}</span>
          </div>
          <div className="dochead__act">
            <button className="btn btn--primary" onClick={() => run('bill')}>
              <Ico.plus size={16} />فاتورة مشتريات
            </button>
          </div>
        </div>
      </div>

      <div className="docgrid">
        <div className="form">
          <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={setTab} />

          {/* ---------- نظرة عامة ---------- */}
          {tab === 'sum' && (
            <>
              <section className="fcard">
                <h2 className="fcard__t">التعامل معه <em>من أول فاتورة اتسجّلت في حسيم</em></h2>
                <div className="kpis">
                  <div className="kpi">
                    <span className="kpi__l">إجمالي المشتريات</span>
                    <span className="kpi__v"><SAR v={spend} /></span>
                    <span className="kpi__s">{posted.length} فاتورة مُرحَّلة</span>
                  </div>
                  <div className="kpi">
                    <span className="kpi__l">المسدّد</span>
                    <span className="kpi__v"><SAR v={posted.reduce((a, b) => a + (b.paid || 0), 0)} /></span>
                    <span className="kpi__s">{DATA.supPaymentsOf(s.id).length} دفعة</span>
                  </div>
                  <div className="kpi">
                    <span className="kpi__l">التزام مفتوح</span>
                    <span className="kpi__v"><SAR v={commit} /></span>
                    <span className="kpi__s">{openPO.length} أمر شراء لسه ما اتفوترش</span>
                  </div>
                  <div className="kpi">
                    <span className="kpi__l">آخر شراء</span>
                    <span className="kpi__v">
                      {last ? <span style={{ fontSize: 'var(--fs-md)' }}>{fmtDate(last.date)}</span>
                            : <em className="hint">مفيش</em>}
                    </span>
                    <span className="kpi__s">{last ? `${last.no} · ${fmtMoney(last.total)} ر.س` : '—'}</span>
                  </div>
                </div>
              </section>

              {late.length > 0 && (
                <section className="fcard">
                  <h2 className="fcard__t">
                    فواتير عدّت الاستحقاق <em>دي اللي محتاجة قرار دلوقتي</em>
                  </h2>
                  <ul className="latelist">
                    {late.map((b) => (
                      <li key={b.no}>
                        <button className="cell-doc cell-doc--link"
                          onClick={() => nav(`/purchases/bills/${b.no}`)}>{b.no}</button>
                        <span className="latelist__d">
                          متأخرة {Math.abs(daysFrom(b.due))} يوم — استحقت {fmtDate(b.due)}
                        </span>
                        <span className="latelist__m"><SAR v={DATA.billDue(b)} /></span>
                      </li>
                    ))}
                  </ul>
                  <p className="fnote fnote--warn">
                    <Ico.check size={14} />
                    إجمالي المتأخر <b>{fmtMoney(lateSum)}</b> ر.س من أصل <b>{fmtMoney(bal)}</b> ر.س عليك له.
                  </p>
                </section>
              )}

              <section className="fcard">
                <h2 className="fcard__t">الأصناف اللي بتشتريها منه</h2>
                {(() => {
                  const map = {}
                  posted.forEach((b) => (b.lines || []).forEach((l) => {
                    map[l.sku] = map[l.sku] || { sku: l.sku, qty: 0, val: 0, last: b.date }
                    map[l.sku].qty += l.qty
                    map[l.sku].val += DATA.lineNet(l)
                    if (b.date > map[l.sku].last) map[l.sku].last = b.date
                  }))
                  const list = Object.values(map).sort((a, b) => b.val - a.val)
                  if (!list.length) return <p className="fempty">لسه ما اشتريتش منه أي صنف.</p>
                  return (
                    <ul className="buylist">
                      {list.map((r) => {
                        const it = DATA.findItem(r.sku)
                        return (
                          <li key={r.sku}>
                            <span className="buylist__n">
                              <b>{it?.ar || r.sku}</b>
                              <em>آخر مرة {fmtDate(r.last)}</em>
                            </span>
                            <span className="buylist__q num">{r.qty} {it?.unitName || ''}</span>
                            <span className="buylist__v"><SAR v={r.val} /></span>
                          </li>
                        )
                      })}
                    </ul>
                  )
                })()}
              </section>
            </>
          )}

          {/* ---------- الفواتير ---------- */}
          {tab === 'bills' && (
            <section className="fcard">
              <h2 className="fcard__t">فواتير المشتريات <em>كل اللي اشتريته منه</em></h2>
              {bills.length === 0 ? (
                <p className="fempty">مفيش فواتير على المورد ده.</p>
              ) : (
                <DataTable selectable={false}
                  columns={[
                    { label: 'الرقم', width: '140px' },
                    { label: 'مستند المورد', width: '150px' },
                    { label: 'التاريخ', width: '120px' },
                    { label: 'الحالة', width: '128px' },
                    { label: 'الإجمالي', num: true, width: '124px' },
                    { label: 'المتبقي', num: true, width: '124px' },
                  ]}
                  rows={[...bills].sort((a, b) => b.date.localeCompare(a.date)).map((b) => ({
                    key: b.no,
                    onOpen: () => nav(`/purchases/bills/${b.no}`),
                    cells: [
                      <DocNo value={b.no} onClick={() => nav(`/purchases/bills/${b.no}`)} />,
                      <span className="num" style={{ fontSize: 'var(--fs-xs)' }}>
                        {b.ref || <em className="hint">—</em>}
                      </span>,
                      <span>{fmtDate(b.date)}</span>,
                      <StatusCell status={b.status} />,
                      <Money value={b.total} />,
                      DATA.billDue(b) > 0.009
                        ? <span className={DATA.isLate(b) ? 'is-warn' : ''}><Money value={DATA.billDue(b)} /></span>
                        : <span className="hint">—</span>,
                    ],
                  }))}
                />
              )}
            </section>
          )}

          {/* ---------- أوامر الشراء ---------- */}
          {tab === 'orders' && (
            <section className="fcard">
              <h2 className="fcard__t">أوامر الشراء <em>اللي طلبته منه</em></h2>
              {pos.length === 0 ? (
                <p className="fempty">مفيش أوامر شراء على المورد ده.</p>
              ) : (
                <DataTable selectable={false}
                  columns={[
                    { label: 'الرقم', width: '140px' },
                    { label: 'التاريخ', width: '120px' },
                    { label: 'الحالة', width: '124px' },
                    { label: 'الاستلام', width: '120px' },
                    { label: 'الفوترة', width: '120px' },
                    { label: 'القيمة', num: true, width: '124px' },
                  ]}
                  rows={[...pos].sort((a, b) => b.date.localeCompare(a.date)).map((p) => ({
                    key: p.no,
                    onOpen: () => nav(`/purchases/orders/${p.no}`),
                    cells: [
                      <DocNo value={p.no} onClick={() => nav(`/purchases/orders/${p.no}`)} />,
                      <span>{fmtDate(p.date)}</span>,
                      <StatusCell status={p.status} />,
                      <span className="num">{DATA.poGot(p)} / {DATA.poQty(p)}</span>,
                      <span className="num">{DATA.poBilled(p)} / {DATA.poQty(p)}</span>,
                      <Money value={DATA.docTotal(p)} />,
                    ],
                  }))}
                />
              )}
            </section>
          )}

          {/* ---------- كشف الحساب ---------- */}
          {tab === 'ledger' && (
            <section className="fcard">
              <div className="fcard__h">
                <h2 className="fcard__t">
                  كشف الحساب <em>الفاتورة دائن والدفعة مدين — حساب المورد ذمم دائنة</em>
                </h2>
                <button className="gbtn2" onClick={() => ACT.sendStatement(s, 'email')}>
                  <Ico.send size={14} />إرسال الكشف
                </button>
              </div>

              <div className="frow frow--2">
                <label className="fld">
                  <span className="fld__l">من تاريخ</span>
                  <input className="fld__i" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="fld">
                  <span className="fld__l">إلى تاريخ</span>
                  <input className="fld__i" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
              </div>

              <div className="tablewrap" style={{ marginTop: 16 }}>
                <table className="dt dt--flat">
                  <thead>
                    <tr>
                      <th style={{ width: '116px' }}>التاريخ</th>
                      <th style={{ width: '132px' }}>النوع</th>
                      <th>المرجع</th>
                      <th style={{ width: '128px' }} className="n">مدين</th>
                      <th style={{ width: '128px' }} className="n">دائن</th>
                      <th style={{ width: '136px' }} className="n">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="ldg__open">
                      <td colSpan={5}>رصيد افتتاحي</td>
                      <td className="n"><SAR v={led.open} dec /></td>
                    </tr>
                    {led.rows.map((r, i) => (
                      <tr key={i} className="is-open"
                        onClick={() => r.go && nav(r.go)}>
                        <td>{fmtDate(r.date)}</td>
                        <td>
                          <span className={`ldg__k ldg__k--${r.cr ? 'cr' : 'dr'}`}>{r.kind}</span>
                        </td>
                        <td className="num" style={{ fontSize: 'var(--fs-xs)' }}>{r.ref}</td>
                        <td className="n">{r.dr ? <SAR v={r.dr} dec /> : <span className="hint">—</span>}</td>
                        <td className="n">{r.cr ? <SAR v={r.cr} dec /> : <span className="hint">—</span>}</td>
                        <td className="n"><SAR v={r.bal} dec /></td>
                      </tr>
                    ))}
                    <tr className="ldg__close">
                      <td colSpan={5}>الرصيد الختامي — اللي عليك له</td>
                      <td className="n"><SAR v={led.close} dec /></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {led.rows.length === 0 && (
                <p className="fempty">مفيش حركة في الفترة دي.</p>
              )}

              <p className="fnote fnote--quiet" style={{ marginTop: 14 }}>
                المسودات مش في الكشف — الفاتورة بتدخل حساب المورد عند الترحيل بس.
              </p>
            </section>
          )}
        </div>

        {/* ---------- الرَّيل ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">الرصيد عليك</span>
            <div className="rail__v"><SAR v={bal} dec /></div>
            <span className={`rail__due${lateSum > 0 ? ' is-late' : ''}`}>
              {bal <= 0.009 ? 'الحساب مقفول — مفيش مستحقات'
                : lateSum > 0 ? `منها ${fmtMoney(lateSum)} ر.س متأخرة`
                : 'كلها لسه في مواعيدها'}
            </span>
            <dl className="rail__sum">
              <div><dt>فواتير مُرحَّلة</dt><dd>{posted.length}</dd></div>
              <div><dt>منها مستحقة</dt>
                <dd>{posted.filter((b) => DATA.billDue(b) > 0.009).length}</dd></div>
              <div><dt>التزام مفتوح</dt><dd><SAR v={commit} /></dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات المورد</span>
            <dl className="deflist">
              <div><dt>رمز المورد</dt><dd className="num">{s.id}</dd></div>
              <div><dt>الرقم الضريبي</dt>
                <dd className="num">{s.vat || <em className="hint">غير مسجّل</em>}</dd></div>
              <div><dt>السجل التجاري</dt>
                <dd className="num">{s.cr || <em className="hint">—</em>}</dd></div>
              <div><dt>الجوال</dt><dd className="num" dir="ltr">{s.phone || <em className="hint">—</em>}</dd></div>
              <div><dt>البريد</dt><dd dir="ltr" style={{ fontSize: 'var(--fs-xs)' }}>{s.email || <em className="hint">—</em>}</dd></div>
              <div><dt>المدينة</dt><dd>{s.city}</dd></div>
              <div><dt>شروط السداد</dt><dd>{s.terms || <em className="hint">—</em>}</dd></div>
            </dl>
            {!s.vat && (
              <p className="fnote fnote--warn">
                <Ico.check size={14} />
                من غير رقم ضريبي مش هتقدر تخصم ضريبة مدخلات فواتيره في الإقرار.
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
        </aside>
      </div>
    </AppShell>
  )
}
