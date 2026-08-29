import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote, Tabs } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtDate, fmtMoney, daysFrom, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   شاشة المشروع.

   تلات تابات، وكل واحدة بتجاوب على سؤال:
   • **الملخّص** — كسبنا ولا خسرنا، وفين إحنا من الميزانية
   • **المستندات** — الفواتير والتكاليف المربوطة بالمشروع
   • **الحركة** — القيود نفسها، وكل سطر بيوصل لمصدره

   والرقم القائد هو **النتيجة** مش الإيراد: الإيراد لوحده بيخدع،
   لأن مشروع بإيراد كبير وتكلفة أكبر بيبان ناجح وهو خسران.
   ============================================================ */

const TABS = [
  { id: 'sum',  label: 'الملخّص' },
  { id: 'docs', label: 'المستندات' },
  { id: 'ledg', label: 'الحركة' },
]

export default function Project() {
  const { id } = useParams()
  const nav = useNavigate()
  const [tab, setTab] = useState('sum')

  const rep = useMemo(() => R.projectReport(null, DATA.TODAY), [])
  const p = rep.rows.find((x) => x.id === id)

  if (!p) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>المشروع ده مش موجود</b>
          <span>ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const c = p.c ? DATA.customers.find((x) => x.id === p.c) : null
  const left = p.end ? daysFrom(p.end) : null
  const late = p.status === 'active' && left !== null && left < 0
  const rest = +(p.budget - p.cost).toFixed(2)
  const unbilled = +(p.budget - p.revenue).toFixed(2)

  /* المستندات المربوطة — من الفواتير والمصروفات وفواتير الشراء */
  const docs = useMemo(() => {
    const out = []
    DATA.invoices.forEach((v) => {
      if (v.prj !== id || ['draft', 'cancelled'].includes(v.status)) return
      out.push({ no: v.no, kind: 'فاتورة مبيعات', date: v.date, party: v.c?.ar,
        amount: v.total, side: 'rev', go: `/sales/invoices/${v.no}` })
    })
    DATA.expenses.forEach((e) => {
      if (e.prj !== id || e.status !== 'posted') return
      out.push({ no: e.no, kind: 'مصروف', date: e.date, party: e.desc,
        amount: e.gross, side: 'cost', go: '/purchases/expenses' })
    })
    DATA.bills.forEach((b) => {
      if (b.status !== 'posted') return
      const mine = (b.lines || []).filter((l) => (l.prj || b.prj) === id)
      if (!mine.length) return
      const amount = mine.reduce((a, l) => a + DATA.lineNet(l) + DATA.lineVat(l), 0)
      out.push({ no: b.no, kind: 'فاتورة مشتريات', date: b.date, party: b.s?.ar,
        amount: +amount.toFixed(2), side: 'cost', go: `/purchases/bills/${b.no}` })
    })
    return out.sort((a, b) => b.date.localeCompare(a.date))
  }, [id])

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/projects')}>
          <Ico.back size={16} />المشاريع
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no">{p.ar}</h1>
            <span className="doc__tags">
              <span className="ldg__k num">{p.code}</span>
              <span className={`st st--${p.status === 'active' ? 'info' : 'neutral'}`}>
                {DATA.PRJ_STATUS[p.status]}
              </span>
              {late && <span className="st st--attention">متأخر {Math.abs(left)} يوم</span>}
            </span>
            <span className="dochead__sub">
              {c ? c.ar : 'مشروع داخلي'} · مدير المشروع {p.manager}
            </span>
          </div>
          <div className="dochead__act">
            <button className="btn btn--outline"
              onClick={() => ACT.exportCashStatement(`مشروع ${p.code}`)}>
              <Ico.download size={16} />تصدير الحركة
            </button>
          </div>
        </div>
      </div>

      <Tabs items={TABS} value={tab} onChange={setTab} />

      <div className="docgrid">
        <div className="form">
          {tab === 'sum' && (
            <>
              <section className="fcard">
                <h2 className="fcard__t">
                  فين إحنا من الميزانية <em>الميزانية {fmtMoney(p.budget)} ر.س</em>
                </h2>
                <ul className="efflist">
                  <li>
                    <span className="efflist__k">اتفوتر للعميل</span>
                    <span className="efflist__v">
                      <b><SAR v={p.revenue} /></b> — {p.billed}٪ من الميزانية،
                      {' '}فاضل <b>{fmtMoney(Math.max(0, unbilled))}</b> ما اتفوترش
                    </span>
                  </li>
                  <li>
                    <span className="efflist__k">اتصرف على المشروع</span>
                    <span className="efflist__v">
                      <b><SAR v={p.cost} /></b> — {p.burn}٪ من الميزانية،
                      {' '}{rest >= 0
                        ? <>فاضل <b>{fmtMoney(rest)}</b></>
                        : <b className="is-warn">تعدّى الميزانية بـ{fmtMoney(-rest)}</b>}
                    </span>
                  </li>
                  <li>
                    <span className="efflist__k">النتيجة لحد النهارده</span>
                    <span className="efflist__v">
                      <b><SAR v={p.profit} /></b>
                      {p.revenue <= 0 ? ' — لسه ما اتفوترش'
                        : p.billed < 25 ? ' — الهامش لسه ملوش معنى، الفوترة في أولها'
                        : ` — هامش ${p.margin}٪`}
                    </span>
                  </li>
                </ul>

                {p.profit < 0 && p.billed < 60 && (
                  <p className="fnote fnote--quiet">
                    النتيجة سالبة لأن <b>التكلفة بتتصرف قبل الفوترة</b> — ده طبيعي في
                    أول المشروع. الرقم اللي يقلق هو نسبة الصرف لو سبقت نسبة الفوترة
                    بفارق كبير في آخر المشروع.
                  </p>
                )}
              </section>

              <section className="fcard">
                <h2 className="fcard__t">المصروف حسب الحساب</h2>
                <ByAccount rows={p.rows.filter((r) => r.side === 'cost')} nav={nav} />
              </section>
            </>
          )}

          {tab === 'docs' && (
            <section className="fcard">
              <h2 className="fcard__t">
                المستندات المربوطة <em>{docs.length} مستند</em>
              </h2>
              {docs.length === 0 ? (
                <p className="fempty">
                  مفيش مستندات متوسومة بالمشروع ده. المستند بياخد المشروع وقت
                  التسجيل — من حقل «المشروع» في الفاتورة أو المصروف.
                </p>
              ) : (
                <div className="tablewrap">
                  <table className="dt dt--flat">
                    <thead>
                      <tr>
                        <th style={{ width: '112px' }}>التاريخ</th>
                        <th style={{ width: '140px' }}>المستند</th>
                        <th>النوع والطرف</th>
                        <th style={{ width: '104px' }}>الاتجاه</th>
                        <th style={{ width: '138px' }} className="n">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((d) => (
                        <tr key={d.no}>
                          <td>{fmtDate(d.date)}</td>
                          <td>
                            <button className="cell-doc cell-doc--link num"
                              onClick={() => nav(d.go)}>{d.no}</button>
                          </td>
                          <td><span className="itcell"><b>{d.kind}</b><em>{d.party}</em></span></td>
                          <td>
                            <span className={`st st--${d.side === 'rev' ? 'positive' : 'neutral'}`}>
                              {d.side === 'rev' ? 'إيراد' : 'تكلفة'}
                            </span>
                          </td>
                          <td className="n"><SAR v={d.amount} dec /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'ledg' && (
            <section className="fcard">
              <h2 className="fcard__t">
                القيود المتوسومة بالمشروع <em>{p.rows.length} سطر</em>
              </h2>
              {p.rows.length === 0 ? (
                <p className="fempty">مفيش قيود على المشروع ده لحد دلوقتي.</p>
              ) : (
                <div className="tablewrap">
                  <table className="dt dt--flat">
                    <thead>
                      <tr>
                        <th style={{ width: '112px' }}>التاريخ</th>
                        <th style={{ width: '132px' }}>القيد</th>
                        <th>البيان</th>
                        <th style={{ width: '190px' }}>الحساب</th>
                        <th style={{ width: '134px' }} className="n">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.rows.map((l, i) => (
                        <tr key={`${l.no}-${i}`}>
                          <td>{fmtDate(l.date)}</td>
                          <td className="num" style={{ fontSize: 'var(--fs-xs)' }}>{l.no}</td>
                          <td><span className="itcell"><b>{l.memo}</b>
                            {l.party && <em>{l.party}</em>}</span></td>
                          <td className="hint">{DATA.accName(l.acc)}</td>
                          <td className="n">
                            <span className={`flowamt is-${l.side === 'rev' ? 'in' : 'out'}`}>
                              <SAR v={l.side === 'rev' ? l.cr - l.dr : l.dr - l.cr} dec />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">النتيجة لحد النهارده</span>
            <div className="rail__v"><SAR v={p.profit} dec /></div>
            <span className={`rail__due${p.profit < 0 ? ' is-late' : ''}`}>
              {p.revenue <= 0 ? 'لسه ما اتفوترش'
                : p.billed < 25 ? 'الفوترة لسه في أولها — الهامش ملوش معنى'
                : `هامش ${p.margin}٪ من المفوتر`}
            </span>
            <dl className="rail__sum">
              <div><dt>الإيراد</dt><dd><SAR v={p.revenue} dec /></dd></div>
              <div><dt>التكلفة</dt><dd><SAR v={p.cost} dec /></dd></div>
              <div><dt>الميزانية</dt><dd><SAR v={p.budget} dec /></dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات المشروع</span>
            <dl className="deflist">
              <div><dt>الكود</dt><dd className="num">{p.code}</dd></div>
              <div><dt>العميل</dt>
                <dd>{c
                  ? <button className="cell-doc cell-doc--link"
                      onClick={() => nav(`/sales/customers/${c.id}`)}>{c.ar}</button>
                  : <em className="hint">مشروع داخلي</em>}</dd></div>
              <div><dt>مدير المشروع</dt><dd>{p.manager}</dd></div>
              <div><dt>البداية</dt><dd>{fmtDate(p.start)}</dd></div>
              <div><dt>التسليم</dt>
                <dd className={late ? 'is-warn' : ''}>{p.end ? fmtDate(p.end) : '—'}</dd></div>
              <div><dt>الحالة</dt><dd>{DATA.PRJ_STATUS[p.status]}</dd></div>
            </dl>
            {p.note && <p className="rail__note">{p.note}</p>}
          </section>

          <section className="rail__c">
            <span className="rail__lbl">أوامر</span>
            <div className="rail__acts">
              <button className="ract" onClick={() => nav('/sales/invoices/new')}>
                <Ico.invoice size={16} /><span className="ract__t">فاتورة على المشروع</span>
              </button>
              <button className="ract" onClick={() => nav('/purchases/expenses')}>
                <Ico.purchases size={16} /><span className="ract__t">مصروف على المشروع</span>
              </button>
              <button className="ract" onClick={() => nav('/accounting/cost-centers')}>
                <Ico.ledger size={16} /><span className="ract__t">مراكز التكلفة</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

/* المصروف مجمّع بالحساب — أهم من قائمة القيود لما تسأل «راح فين» */
function ByAccount({ rows, nav }) {
  const groups = useMemo(() => {
    const m = {}
    rows.forEach((l) => {
      m[l.acc] = m[l.acc] || { acc: l.acc, amount: 0, n: 0 }
      m[l.acc].amount += l.dr - l.cr
      m[l.acc].n += 1
    })
    return Object.values(m)
      .map((x) => ({ ...x, amount: +x.amount.toFixed(2) }))
      .sort((a, b) => b.amount - a.amount)
  }, [rows])

  if (!groups.length) return <p className="fempty">مفيش تكلفة متقيّدة على المشروع ده.</p>
  const max = Math.max(...groups.map((g) => g.amount))
  const total = groups.reduce((a, g) => a + g.amount, 0)

  return (
    <ul className="cclist">
      {groups.map((g) => (
        <li key={g.acc}>
          <button className="cclist__row" onClick={() => nav(`/accounting/ledger?acc=${g.acc}`)}>
            <span className="cclist__n">
              <b>{DATA.accName(g.acc)}</b>
              <em>{g.n} حركة</em>
            </span>
            <span className="cclist__b" aria-hidden="true">
              <i style={{ width: `${(g.amount / max) * 100}%` }} />
            </span>
            <span className="cclist__p num">{((g.amount / total) * 100).toFixed(0)}٪</span>
            <span className="cclist__v"><SAR v={g.amount} dec /></span>
            <Ico.chevron size={15} className="cclist__ch" />
          </button>
        </li>
      ))}
    </ul>
  )
}
