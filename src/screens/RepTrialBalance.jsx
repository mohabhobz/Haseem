import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportShell, KpiRow } from '../components/reportshell.jsx'
import { Money, SAR } from '../components/data.jsx'
import { Ico } from '../components/icons.jsx'
import { periodRange } from '../components/pagefilter.jsx'
import { fmtMoney, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   ميزان المراجعة.

   عند العميل: تلات أعمدة (الحساب · مدين · دائن) وقايمة مسطّحة من
   عشر حسابات وصف إجمالي. اللي ناقص:
   • **عمود الرصيد** — وده العمود اللي المحاسب بيقرا منه أصلًا
   • **التجميع بفئة الحساب** — أصول والتزامات وحقوق ملكية وإيراد
     ومصروف كلهم مخلوطين في قايمة واحدة
   • **الميزان متوازن بس مفيش حاجة بتقول كده** — الرقمين متساويين
     والمستخدم لازم يقارنهم بعينه

   هنا: مجمّع بالفئة، وفيه عمود رصيد بجهته، والتوازن بادچ.
   وكل حساب بيفتح كشفه.
   ============================================================ */

const GROUPS = [
  { id: 'asset',     ar: 'الأصول',         sign: 'dr' },
  { id: 'liability', ar: 'الالتزامات',     sign: 'cr' },
  { id: 'equity',    ar: 'حقوق الملكية',   sign: 'cr' },
  { id: 'revenue',   ar: 'الإيرادات',      sign: 'cr' },
  { id: 'cogs',      ar: 'تكلفة الإيراد',  sign: 'dr' },
  { id: 'expense',   ar: 'المصروفات',      sign: 'dr' },
]

export default function RepTrialBalance() {
  const nav = useNavigate()
  const [period, setPeriod] = useState({ id: 'y' })

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const tb = useMemo(() => R.trialBalance(from, to), [from, to])

  const groups = GROUPS.map((g) => {
    const rows = tb.rows.filter((r) => r.type === g.id)
    return {
      ...g, rows,
      dr: +rows.reduce((s, r) => s + r.dr, 0).toFixed(2),
      cr: +rows.reduce((s, r) => s + r.cr, 0).toFixed(2),
      bal: +rows.reduce((s, r) => s + r.net, 0).toFixed(2),
    }
  }).filter((g) => g.rows.length)

  return (
    <ReportShell
      title="ميزان المراجعة"
      sub="أرصدة كل الحسابات في الفترة، مجمّعة بفئتها"
      period={period} onPeriod={setPeriod}
      note="كل قيد بيتكتب طرفيه مع بعض، عشان كده مجموع المدين لازم يساوي مجموع الدائن. لو الرقمين اختلفوا يبقى فيه قيد ناقص."
    >
      <KpiRow items={[
        { id: 'dr', lead: true, label: 'مجموع المدين', value: tb.totDr, dec: true,
          sub: `${tb.rows.length} حساب فيه حركة` },
        { id: 'cr', label: 'مجموع الدائن', value: tb.totCr, dec: true,
          sub: tb.balanced ? 'مطابق للمدين' : 'مش مطابق' },
        { id: 'diff', label: 'الفرق', value: +(tb.totDr - tb.totCr).toFixed(2), dec: true,
          tone: tb.balanced ? 'good' : 'bad',
          sub: tb.balanced ? 'الميزان مظبوط' : 'محتاج مراجعة' },
      ]} />

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">الحسابات</h2>
          <div className="sect__ctrl">
            <span className={`chkb${tb.balanced ? ' is-ok' : ' is-bad'}`}>
              {tb.balanced ? <Ico.check size={14} /> : <Ico.close size={14} />}
              {tb.balanced ? 'الميزان متوازن' : `فرق ${fmtMoney(tb.totDr - tb.totCr)}`}
            </span>
          </div>
        </header>

        <div className="tablewrap">
          <table className="dt dt--flat tbl-tb">
            <thead>
              <tr>
                <th>الحساب</th>
                <th className="n" style={{ width: '150px' }}>مدين</th>
                <th className="n" style={{ width: '150px' }}>دائن</th>
                <th className="n" style={{ width: '168px' }}>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <>
                  <tr key={g.id} className="tbl-tb__g">
                    <td colSpan={3}>{g.ar}</td>
                    <td className="n">
                      <span className="tbl-tb__gb">
                        <SAR v={Math.abs(g.bal)} dec />
                        <em>{g.bal >= 0 ? 'مدين' : 'دائن'}</em>
                      </span>
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.id} className="is-open"
                      onClick={() => nav(`/reports/statement?acc=${r.id}`)}>
                      <td>
                        <span className="itcell">
                          <b>{DATA.accLabel(r)}</b>
                          <em className="num">{r.id}</em>
                        </span>
                      </td>
                      <td className="n">{r.dr ? <Money value={r.dr} /> : <span className="hint">—</span>}</td>
                      <td className="n">{r.cr ? <Money value={r.cr} /> : <span className="hint">—</span>}</td>
                      <td className="n">
                        <span className={`balside is-${r.side}`}>
                          <SAR v={r.bal} dec />
                          <em>{r.side === 'dr' ? 'مدين' : 'دائن'}</em>
                        </span>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
              <tr className="tbl-tb__tot">
                <td>الإجمالي</td>
                <td className="n"><SAR v={tb.totDr} dec /></td>
                <td className="n"><SAR v={tb.totCr} dec /></td>
                <td className="n">
                  {tb.balanced
                    ? <span className="chkb is-ok"><Ico.check size={13} />متوازن</span>
                    : <span className="chkb is-bad"><Ico.close size={13} />
                        {fmtMoney(tb.totDr - tb.totCr)}</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </ReportShell>
  )
}
