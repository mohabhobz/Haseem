import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { DateRange, periodRange } from '../components/pagefilter.jsx'
import { VoucherForm } from '../components/voucherform.jsx'
import { TransferForm } from '../components/transferform.jsx'
import { fmtDate, fmtMoney, TODAY as CLOCK } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   شاشة الحساب النقدي.

   الفرق بينها وبين «كشف الحساب» في التقارير: التقرير بيجاوب على
   «إيه اللي حصل»، والشاشة دي بتجاوب على **«الحساب ده صحته إيه»**:
   داخل كام، خارج كام، الصافي فين، والحركة جاية منين.

   والمصادر مقسومة عشان تعرف إن الخزنة بتتغذّى من التحويلات مش من
   البيع — دي معلومة القرار، مش الرصيد لوحده.
   ============================================================ */

/* التقارير بتقارن نصوص ISO — `TODAY` بتاع `format.js` كائن Date
   وبيتستعمل للفلاتر بس */
const TODAY = DATA.TODAY

const SRC_AR = {
  invoices: 'فواتير مبيعات', receipt: 'تحصيل فواتير', receipts: 'سندات قبض',
  bills: 'فواتير مشتريات', payment: 'سداد موردين', payments: 'سندات صرف',
  expenses: 'مصروفات', transfers: 'تحويلات', opening: 'رصيد افتتاحي',
  creditNotes: 'إشعارات دائنة', debitNotes: 'إشعارات مدينة',
  customs: 'بيانات جمركية', supCredit: 'إشعارات مورد', supDebit: 'إشعارات مورد',
}

export default function CashAccount() {
  const { acc } = useParams()
  const nav = useNavigate()
  const [period, setPeriod] = useState({ id: 'y' })
  const [form, setForm] = useState(null)

  const a = DATA.cashAccountOf(acc)
  const range = periodRange(period, CLOCK) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const st = useMemo(() => (a ? R.accountStatement(acc, from, to) : null), [acc, from, to])
  const live = useMemo(() => (a ? R.balanceOf(acc, TODAY) : 0), [acc])

  const bySource = useMemo(() => {
    if (!st) return []
    const m = {}
    st.rows.forEach((l) => {
      const k = l.kind || 'other'
      m[k] = m[k] || { id: k, ar: SRC_AR[k] || k, in: 0, out: 0, n: 0 }
      m[k].in += l.dr; m[k].out += l.cr; m[k].n += 1
    })
    return Object.values(m)
      .map((x) => ({ ...x, in: +x.in.toFixed(2), out: +x.out.toFixed(2),
        net: +(x.in - x.out).toFixed(2) }))
      .sort((x, y) => (Math.abs(y.net)) - (Math.abs(x.net)))
  }, [st])

  if (!a) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>الحساب ده مش موجود</b>
          <span>ارجع لقائمة الحسابات وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const bank = DATA.banks.find((b) => b.id === a.bank)

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/cash/accounts')}>
          رجوع
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no">{a.ar}</h1>
            <span className="doc__tags">
              <span className="ldg__k">{DATA.CASH_KIND_AR[a.kind]}</span>
              <span className="st st--neutral num">{a.acc}</span>
              {a.main && <span className="st st--info">الحساب الافتراضي</span>}
            </span>
            <span className="dochead__sub">
              {bank ? bank.ar : a.provider || a.place || '—'}
            </span>
          </div>
          <div className="dochead__act">
            <DateRange value={period} onChange={setPeriod} today={CLOCK} />
          </div>
        </div>
      </div>

      <div className="docgrid">
        <div className="form">
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">
                حركة الحساب <em>{st.rows.length} حركة في الفترة</em>
              </h2>
              <button className="gbtn2" onClick={() => ACT.exportCashStatement(a.ar)}>
                <Ico.download size={14} />تصدير CSV
              </button>
            </div>

            <div className="tablewrap">
              <table className="dt dt--flat">
                <thead>
                  <tr>
                    <th style={{ width: '112px' }}>التاريخ</th>
                    <th>البيان</th>
                    <th style={{ width: '146px' }}>المستند</th>
                    <th style={{ width: '116px' }} className="n">داخل</th>
                    <th style={{ width: '116px' }} className="n">خارج</th>
                    <th style={{ width: '128px' }} className="n">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="dt__open">
                    <td>{from ? fmtDate(from) : '—'}</td>
                    <td colSpan={4}><b>رصيد أول المدة</b></td>
                    <td className="n"><SAR v={st.open} dec /></td>
                  </tr>
                  {st.rows.map((l, i) => (
                    <tr key={`${l.no}-${i}`}>
                      <td>{fmtDate(l.date)}</td>
                      <td>
                        <span className="itcell">
                          <b>{l.memo}</b>
                          <em>{SRC_AR[l.kind] || l.kind}{l.party ? ` · ${l.party}` : ''}</em>
                        </span>
                      </td>
                      <td>
                        {l.go
                          ? <button className="cell-doc cell-doc--link num"
                              onClick={() => nav(l.go)}>{l.no}</button>
                          : <span className="num hint">{l.no}</span>}
                      </td>
                      <td className="n">{l.dr > 0 ? <SAR v={l.dr} /> : <em className="hint">—</em>}</td>
                      <td className="n">{l.cr > 0 ? <SAR v={l.cr} /> : <em className="hint">—</em>}</td>
                      <td className="n num">{fmtMoney(l.bal)}</td>
                    </tr>
                  ))}
                  {st.rows.length === 0 && (
                    <tr><td colSpan={6}>
                      <p className="fempty">مفيش حركة على الحساب ده في الفترة المختارة.</p>
                    </td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}><b>الإجمالي</b></td>
                    <td className="n"><SAR v={st.totDr} dec /></td>
                    <td className="n"><SAR v={st.totCr} dec /></td>
                    <td className="n"><b><SAR v={st.close} dec /></b></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="fcard">
            <h2 className="fcard__t">
              الحركة جاية منين <em>مصدر كل ريال دخل أو خرج في الفترة</em>
            </h2>
            {bySource.length === 0 ? (
              <p className="fempty">مفيش حركة في الفترة دي.</p>
            ) : (
              <ul className="srclist">
                {bySource.map((s) => (
                  <li key={s.id}>
                    <span className="srclist__n">
                      <b>{s.ar}</b>
                      <em>{s.n} حركة</em>
                    </span>
                    <span className="srclist__io">
                      {s.in > 0 && <b className="is-in">+<SAR v={s.in} /></b>}
                      {s.out > 0 && <b className="is-out">−<SAR v={s.out} /></b>}
                    </span>
                    <span className={`srclist__net ${s.net >= 0 ? 'is-in' : 'is-out'}`}>
                      <SAR v={s.net} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">الرصيد الحالي</span>
            <div className="rail__v"><SAR v={live} dec /></div>
            <span className="rail__due">
              {a.settleDays
                ? `فيه مبالغ بتتسوّى بعد ${a.settleDays} يوم عمل`
                : 'متاح للصرف فورًا'}
            </span>
            <dl className="rail__sum">
              <div><dt>رصيد أول الفترة</dt><dd><SAR v={st.open} dec /></dd></div>
              <div><dt>داخل</dt><dd><SAR v={st.totDr} dec /></dd></div>
              <div><dt>خارج</dt><dd><SAR v={st.totCr} dec /></dd></div>
              <div><dt>رصيد آخر الفترة</dt><dd><SAR v={st.close} dec /></dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات الحساب</span>
            <dl className="deflist">
              <div><dt>رقم الحساب</dt><dd className="num">{a.acc}</dd></div>
              <div><dt>النوع</dt><dd>{DATA.CASH_KIND_AR[a.kind]}</dd></div>
              <div><dt>العملة</dt><dd>{a.cur}</dd></div>
              {bank && <div><dt>البنك</dt><dd>{bank.ar}</dd></div>}
              {a.iban && <div><dt>الآيبان</dt><dd className="ltr num">{a.iban}</dd></div>}
              {a.provider && <div><dt>مزوّد الخدمة</dt><dd>{a.provider}</dd></div>}
              {a.place && <div><dt>المكان</dt><dd>{a.place}</dd></div>}
              {a.keeper && <div><dt>أمين الصندوق</dt><dd>{a.keeper}</dd></div>}
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">أوامر</span>
            <div className="rail__acts">
              <button className="ract" onClick={() => setForm('rv')}>
                <Ico.download size={16} /><span className="ract__t">سند قبض على الحساب</span>
              </button>
              <button className="ract" onClick={() => setForm('pv')}>
                <Ico.send size={16} /><span className="ract__t">سند صرف من الحساب</span>
              </button>
              <button className="ract" onClick={() => setForm('trf')}>
                <Ico.retry size={16} /><span className="ract__t">تحويل من أو إلى الحساب</span>
              </button>
              <button className="ract" onClick={() => nav(`/reports/statement?acc=${a.acc}`)}>
                <Ico.reports size={16} /><span className="ract__t">كشف الحساب في التقارير</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      {form === 'rv' && <VoucherForm kind="receipts" onClose={() => setForm(null)} />}
      {form === 'pv' && <VoucherForm kind="payments" onClose={() => setForm(null)} />}
      {form === 'trf' && <TransferForm onClose={() => setForm(null)} />}
    </AppShell>
  )
}
