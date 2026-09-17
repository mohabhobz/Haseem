import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ReportShell, KpiRow } from '../components/reportshell.jsx'
import { DataTable } from '../components/table.jsx'
import { Money, SAR } from '../components/data.jsx'
import { periodRange } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   كشف الحساب.

   ★ الرابط ده **ميّت في سيستم العميل**: موجود في القائمة الجانبية،
   وتدوس عليه فبيرجّعك للداشبورد من غير أي رسالة. اتأكدت منه مرتين.

   الأقرب لفكرته عنده هو `/accounting/ledger` — بس في موديول تاني،
   و**شجرة الحسابات فيه كلها بالإنجليزي** (`Cash on hand` ·
   `Trade receivables` · `Input VAT`) مع إن نفس الحسابات بالعربي
   في شاشة المصروفات. نفس الشجرة باسمين.

   الشاشة دي بتقفل الاتنين: كشف حساب شغّال، بالعربي، وكل سطر فيه
   بيوصل للمستند اللي وراه.
   ============================================================ */

const KIND_AR = {
  invoices: 'فاتورة مبيعات', creditNotes: 'إشعار دائن', debitNotes: 'إشعار مدين',
  bills: 'فاتورة مشتريات', receipt: 'تحصيل', payment: 'سداد',
  expenses: 'مصروف', customs: 'بيان جمركي', opening: 'رصيد افتتاحي',
}

const GROUP_AR = {
  asset: 'الأصول', liability: 'الالتزامات', equity: 'حقوق الملكية',
  revenue: 'الإيرادات', cogs: 'تكلفة الإيراد', expense: 'المصروفات',
}

export default function RepStatement() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [acc, setAcc] = useState(params.get('acc') || '1200')
  const [period, setPeriod] = useState({ id: 'y' })

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  /* الفترة ممكن تنتهي في المستقبل («السنة الحالية» بتنتهي ٣١ ديسمبر).
     الرصيد الختامي ما ينفعش يتقال إنه «في» تاريخ لسه ما جاش. */
  const todayIso = TODAY.toISOString().slice(0, 10)
  const shownTo = !to || to > todayIso ? todayIso : to

  const st = useMemo(() => R.accountStatement(acc, from, to), [acc, from, to])
  const a = DATA.accountOf(acc)

  const pick = (id) => { setAcc(id); setParams({ acc: id }) }

  /* الحسابات مجمّعة بفئتها في المنتقي — مش قايمة مسطّحة من ٣١ حساب */
  const grouped = useMemo(() => {
    const g = {}
    DATA.accounts.forEach((x) => { (g[x.type] = g[x.type] || []).push(x) })
    return g
  }, [])

  const drSide = ['asset', 'expense', 'cogs'].includes(a?.type)
  const closeSide = st.close >= 0 ? 'مدين' : 'دائن'

  return (
    <ReportShell
      title="كشف الحساب"
      sub="كل حركة على حساب واحد، بالرصيد الجاري بعد كل قيد"
      period={period} onPeriod={setPeriod}
      note="الرصيد الجاري بيتحسب سطر بسطر من الرصيد الافتتاحي. كل سطر بيوصل للمستند اللي عمله."
      extra={
        <label className="repbar__f repbar__f--wide">
          <span className="repbar__l">الحساب</span>
          <Select className="fld__i" value={acc} onChange={(e) => pick(e.target.value)}>
            {Object.entries(grouped).map(([type, list]) => (
              <optgroup key={type} label={GROUP_AR[type] || type}>
                {list.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
              </optgroup>
            ))}
          </Select>
        </label>
      }
    >
      <KpiRow items={[
        { id: 'close', lead: true, label: 'الرصيد الختامي', value: Math.abs(st.close), dec: true,
          sub: `${closeSide} · في ${fmtDate(shownTo)}` },
        { id: 'open', label: 'الرصيد الافتتاحي', value: Math.abs(st.open), dec: true,
          sub: st.open >= 0 ? 'مدين' : 'دائن' },
        { id: 'dr', label: 'مجموع المدين', value: st.totDr, dec: true,
          sub: `${st.rows.filter((r) => r.dr > 0).length} حركة` },
        { id: 'cr', label: 'مجموع الدائن', value: st.totCr, dec: true,
          sub: `${st.rows.filter((r) => r.cr > 0).length} حركة` },
      ]} />

      <p className="fnote fnote--quiet" style={{ marginTop: -4, marginBottom: 16 }}>
        <b>{a?.ar}</b> — حساب {GROUP_AR[a?.type]}، طبيعته{' '}
        <b>{drSide ? 'مدينة' : 'دائنة'}</b>. يعني {drSide
          ? 'المدين بيزوّده والدائن بيقلّله'
          : 'الدائن بيزوّده والمدين بيقلّله'}.
      </p>

      <section className="sect" data-component="StatementTable">
        <header className="sect__h">
          <h2 className="sect__t">الحركة<span className="sect__n">{st.rows.length}</span></h2>
        </header>

        {st.rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش حركة على الحساب ده في الفترة</b>
            <span>
              الرصيد الافتتاحي <b>{fmtMoney(Math.abs(st.open))}</b> فضل زي ما هو.
              وسّع الفترة أو اختر حساب تاني.
            </span>
          </div>
        ) : (
          <div className="tablewrap">
            <table className="dt dt--flat">
              <thead>
                <tr>
                  <th style={{ width: '118px' }}>التاريخ</th>
                  <th style={{ width: '150px' }}>النوع</th>
                  <th>البيان</th>
                  <th style={{ width: '136px' }}>المستند</th>
                  <th className="n" style={{ width: '132px' }}>مدين</th>
                  <th className="n" style={{ width: '132px' }}>دائن</th>
                  <th className="n" style={{ width: '150px' }}>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                <tr className="ldg__open">
                  <td colSpan={6}>رصيد افتتاحي</td>
                  <td className="n"><SAR v={st.open} dec /></td>
                </tr>
                {st.rows.map((l, i) => (
                  <tr key={i} className={l.go ? 'is-open' : ''}
                    onClick={l.go ? () => nav(l.go) : undefined}>
                    <td>{fmtDate(l.date)}</td>
                    <td>
                      <span className={`ldg__k ldg__k--${l.dr > 0 ? 'dr' : 'cr'}`}>
                        {KIND_AR[l.kind] || l.kind}
                      </span>
                    </td>
                    <td>
                      <span className="itcell">
                        <b>{l.memo}</b>
                        {l.party && <em>{l.party}</em>}
                      </span>
                    </td>
                    <td>
                      {l.go
                        ? <span className="cell-doc cell-doc--link num">{l.no}</span>
                        : <span className="num hint">{l.no}</span>}
                    </td>
                    <td className="n">{l.dr ? <Money value={l.dr} /> : <span className="hint">—</span>}</td>
                    <td className="n">{l.cr ? <Money value={l.cr} /> : <span className="hint">—</span>}</td>
                    <td className="n"><SAR v={l.bal} dec /></td>
                  </tr>
                ))}
                <tr className="ldg__close">
                  <td colSpan={4}>الرصيد الختامي — {closeSide}</td>
                  <td className="n"><SAR v={st.totDr} dec /></td>
                  <td className="n"><SAR v={st.totCr} dec /></td>
                  <td className="n"><SAR v={st.close} dec /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ReportShell>
  )
}
