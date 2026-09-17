import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote } from '../components/layout.jsx'
import { Button } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { DateRange, periodRange } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   دفتر الأستاذ.

   الشاشة دي عند العميل فيها **أوضح باج لغوي في المنتج**: شجرة
   الحسابات معروضة بالإنجليزي الخام (`Cash on hand` · `Trade
   receivables` · `Input VAT`) — ونفس الحسابات بالعربي في فورم
   المصروف. يعني نفس الحساب باسمين حسب الشاشة.
   وفيها كمان `3000 - Share capital (legal-form templated)` —
   ملاحظة مطوّر عن قالب الشكل القانوني، متسرّبة للمستخدم.

   وأهم من اللغة: الدفتر عنده **جدول حركة من غير رصيد جاري**.
   الرصيد الجاري هو نص فايدة دفتر الأستاذ — إنك تشوف الرصيد بعد
   كل حركة، مش تجمع بنفسك.

   هنا: الأسماء عربي زي باقي السيستم، والرصيد الجاري عمود، وكل
   سطر بيوصل للمستند اللي كتبه.
   ============================================================ */

export default function Ledger() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [acc, setAcc] = useState(() => params.get('acc') || '1200')
  const [period, setPeriod] = useState({ id: 'y' })

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const L = useMemo(() => R.ledger(acc, from, to), [acc, from, to])
  const a = L.account

  /* الحسابات اللي عليها حركة الأول — الحساب الميّت مش هيتقفل عليه */
  const options = useMemo(() => {
    const hit = {}
    R.postings(null, DATA.TODAY).forEach((l) => { hit[l.acc] = (hit[l.acc] || 0) + 1 })
    return DATA.accounts.map((x) => ({ ...x, n: hit[x.id] || 0 }))
  }, [])

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="دفتر الأستاذ"
          sub={<>حركة حساب واحد بالتفصيل ورصيده بعد كل قيد<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="دليل الحسابات" variant="ghost"
            onClick={() => nav('/accounting/accounts')} />
          <Button label="تصدير CSV" variant="outline"
            onClick={() => ACT.exportCashStatement(DATA.accName(acc))} />
        </div>
      </div>

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">الحساب</h2>
          <div className="sect__ctrl">
            <Select className="fld__i" style={{ minWidth: 320 }} value={acc}
              onChange={(e) => setAcc(e.target.value)} aria-label="اختر الحساب">
              {options.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.id} — {DATA.accLabel(x)}{x.n === 0 ? ' (ما اتحركش)' : ''}
                </option>
              ))}
            </Select>
          </div>
        </header>

        <div className="ledhead">
          <div className="ledhead__id">
            <b>{DATA.accLabel(a)}</b>
            <em className="num">{a?.id}</em>
          </div>
          <dl className="ledhead__n">
            <div><dt>رصيد أول المدة</dt><dd><SAR v={L.open} dec /></dd></div>
            <div><dt>مدين</dt><dd><SAR v={L.totDr} dec /></dd></div>
            <div><dt>دائن</dt><dd><SAR v={L.totCr} dec /></dd></div>
            <div className="is-lead">
              <dt>رصيد آخر المدة</dt>
              <dd>
                <SAR v={Math.abs(L.close)} dec />
                <em className="ledhead__side">{L.close >= 0 ? 'مدين' : 'دائن'}</em>
              </dd>
            </div>
          </dl>
        </div>

        {!L.natural && Math.abs(L.close) > 0.009 && (
          <p className="fnote fnote--warn">
            <Ico.close size={14} />
            طبيعة الحساب <b>{L.debitNature ? 'مدينة' : 'دائنة'}</b> ورصيده طلع
            {L.debitNature ? ' دائن' : ' مدين'} — غالبًا فيه قيد على الحساب الغلط.
          </p>
        )}

        {L.rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش حركة على الحساب ده في الفترة</b>
            <span>جرّب توسّع الفترة من فوق، أو اختار حساب تاني.</span>
          </div>
        ) : (
          <div className="tablewrap">
            <table className="dt dt--flat">
              <thead>
                <tr>
                  <th style={{ width: '112px' }}>التاريخ</th>
                  <th style={{ width: '132px' }}>القيد</th>
                  <th>البيان</th>
                  <th style={{ width: '150px' }}>المستند</th>
                  <th style={{ width: '124px' }} className="n">مدين</th>
                  <th style={{ width: '124px' }} className="n">دائن</th>
                  <th style={{ width: '134px' }} className="n">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                <tr className="dt__open">
                  <td>{from ? fmtDate(from) : '—'}</td>
                  <td colSpan={5}><b>رصيد أول المدة</b></td>
                  <td className="n num">{fmtMoney(L.open)}</td>
                </tr>
                {L.rows.map((l, i) => (
                  <tr key={`${l.no}-${i}`}>
                    <td>{fmtDate(l.date)}</td>
                    <td className="num" style={{ fontSize: 'var(--fs-xs)' }}>{l.no}</td>
                    <td>
                      <span className="itcell">
                        <b>{l.memo}</b>
                        {l.party && <em>{l.party}</em>}
                      </span>
                    </td>
                    <td>
                      {l.go
                        ? <button className="cell-doc cell-doc--link num"
                            onClick={() => nav(l.go)}>فتح</button>
                        : <em className="hint">—</em>}
                    </td>
                    <td className="n">{l.dr > 0 ? <SAR v={l.dr} /> : <em className="hint">—</em>}</td>
                    <td className="n">{l.cr > 0 ? <SAR v={l.cr} /> : <em className="hint">—</em>}</td>
                    <td className="n num">{fmtMoney(l.bal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}><b>الإجمالي</b></td>
                  <td className="n"><b><SAR v={L.totDr} dec /></b></td>
                  <td className="n"><b><SAR v={L.totCr} dec /></b></td>
                  <td className="n"><b><SAR v={L.close} dec /></b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="fnote fnote--quiet">
          كل سطر هنا جاي من قيد، وكل قيد جاي من مستند أو من تسوية يدوية.
          {' '}<b>عمود «المستند»</b> بيوصلك للأصل — الدفتر مش نهاية الطريق.
        </p>
      </section>
    </AppShell>
  )
}
