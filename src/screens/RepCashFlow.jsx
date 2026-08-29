import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportShell, KpiRow, DrillTable } from '../components/reportshell.jsx'
import { CashBars } from '../components/charts.jsx'
import { DataTable } from '../components/table.jsx'
import { Money, SAR } from '../components/data.jsx'
import { periodRange } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   التدفق النقدي.

   ★ ده أحسن تقرير عند العميل، وأخدنا منه فكرته: كل كارت فيه
   زرار «عرض» بيبدّل الجدول تحته لتفاصيل الكارت ده. الكارت مدخل
   مش رقم ساكت — والنمط ده عمّمناه على التقارير كلها.

   اللي صلّحناه فيه:
   • جدوله بيعرض حسابات تجارب فاضية (`asdf` · `xxx` · `الدرج`)
   • عمود الوصف نص عادي — **مش لينك للمستند**، فمفيش وصول
     للفاتورة اللي المبلغ جاي منها
   • بعض القيم إنجليزي (`Payment INV-521401`)
   ============================================================ */

const KIND_AR = {
  receipt: 'تحصيل من عميل', payment: 'سداد لمورد',
  expenses: 'مصروف', opening: 'رأس مال افتتاحي',
  invoices: 'فاتورة مبيعات', bills: 'فاتورة مشتريات',
}

export default function RepCashFlow() {
  const nav = useNavigate()
  const [period, setPeriod] = useState({ id: 'y' })
  const [view, setView] = useState(null)

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const cf = useMemo(() => R.cashFlow(from, to), [from, to])
  /* ★ الاتجاه الشهري — آخر رصيد ختامي في الرسم لازم يساوي
     الرصيد الختامي في الكروت فوق، لأن الاتنين من نفس الدفتر. */
  const trend = useMemo(() => R.cashTrend(from, to), [from, to])
  const prev = R.prevPeriod(from, to)
  const pCf = useMemo(() => R.cashFlow(prev.from, prev.to), [prev.from, prev.to])

  const moves = useMemo(() => {
    if (view === 'in') return cf.moves.filter((m) => m.dir === 'in')
    if (view === 'out') return cf.moves.filter((m) => m.dir === 'out')
    if (view === 'change') return cf.moves
    return []
  }, [cf, view])

  const title = view === 'in' ? 'المتحصلات' : view === 'out' ? 'المدفوعات' : 'كل الحركة النقدية'

  return (
    <ReportShell
      title="التدفق النقدي"
      sub="النقد اللي دخل واللي خرج، ومن أنهي حساب"
      period={period} onPeriod={setPeriod}
      note="بيعد الحركة النقدية الفعلية بس — الفاتورة اللي ما اتحصّلتش مش هنا، هي في الذمم المدينة."
    >
      <KpiRow
        value={view} onPick={setView}
        items={[
          { id: 'close', lead: true, label: 'الرصيد الختامي', value: cf.close, dec: true,
            sub: `في ${DATA.accountsOf('cash').length} حسابات نقدية`,
            delta: R.delta(cf.close, pCf.close) },
          { id: 'open', label: 'الرصيد الافتتاحي', value: cf.open, dec: true,
            sub: 'أول الفترة' },
          { id: 'in', label: 'المتحصلات', value: cf.inflow, dec: true, drill: true,
            sub: `${cf.moves.filter((m) => m.dir === 'in').length} حركة` },
          { id: 'out', label: 'المدفوعات', value: cf.outflow, dec: true, drill: true,
            sub: `${cf.moves.filter((m) => m.dir === 'out').length} حركة` },
          { id: 'change', label: 'صافي التغير', value: cf.change, dec: true, drill: true,
            tone: cf.change < 0 ? 'bad' : 'good',
            sub: cf.change >= 0 ? 'النقد زاد' : 'النقد قلّ' },
        ]}
      />

      {/* ★ الحسبة ظاهرة — المستخدم يشوف الأرقام بتتجمع مش يصدّقها */}
      <p className="fnote fnote--quiet" style={{ marginTop: -4, marginBottom: 16 }}>
        <b>{fmtMoney(cf.open)}</b> افتتاحي + <b>{fmtMoney(cf.inflow)}</b> داخل −{' '}
        <b>{fmtMoney(cf.outflow)}</b> خارج = <b>{fmtMoney(cf.close)}</b> ختامي
      </p>

      {trend.length > 1 && (
        <CashBars rows={trend} title="حركة النقد شهريًا"
          hint="الداخل فوق خط الصفر والخارج تحته — والخط هو الرصيد الختامي" />
      )}

      {view && (
        <DrillTable
          title={title}
          empty="مفيش حركة نقدية في الفترة دي"
          cols={[
            { label: 'التاريخ', width: '118px' },
            { label: 'الحساب', width: '196px' },
            { label: 'البيان' },
            { label: 'المستند', width: '148px' },
            { label: 'المبلغ', num: true, width: '132px' },
          ]}
          rows={moves.map((m, i) => ({
            key: `${m.no}-${i}`, go: m.go,
            cells: [
              <span>{fmtDate(m.date)}</span>,
              <span className="hint">{DATA.accName(m.acc)}</span>,
              <span className="itcell">
                <b>{m.memo}</b>
                <em>{KIND_AR[m.kind] || m.kind}{m.party ? ` · ${m.party}` : ''}</em>
              </span>,
              m.go
                ? <span className="cell-doc cell-doc--link num">{m.no}</span>
                : <span className="num hint">{m.no}</span>,
              <span className={`flowamt is-${m.dir}`}>
                {m.dir === 'in' ? '+' : '−'}<Money value={Math.abs(m.amount)} />
              </span>,
            ],
          }))}
        />
      )}

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">الحركة حسب الحساب</h2>
        </header>
        {cf.byAccount.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش حركة نقدية</b>
            <span>مفيش تحصيل ولا سداد في الفترة دي.</span>
          </div>
        ) : (
          <DataTable
            selectable={false}
            columns={[
              { label: 'الحساب' },
              { label: 'افتتاحي', num: true, width: '132px' },
              { label: 'داخل', num: true, width: '132px' },
              { label: 'خارج', num: true, width: '132px' },
              { label: 'صافي التغير', num: true, width: '132px' },
              { label: 'ختامي', num: true, width: '136px' },
            ]}
            rows={cf.byAccount.map((a) => ({
              key: a.id,
              cells: [
                <span className="itcell"><b>{DATA.accName(a.id)}</b>
                  <em className="num">{a.id}</em></span>,
                <Money value={a.open} />,
                a.inflow ? <span className="flowamt is-in">+<Money value={a.inflow} /></span>
                  : <span className="hint">—</span>,
                a.outflow ? <span className="flowamt is-out">−<Money value={a.outflow} /></span>
                  : <span className="hint">—</span>,
                <span className={a.change < 0 ? 'is-warn' : ''}><Money value={a.change} /></span>,
                <b><SAR v={a.close} dec /></b>,
              ],
            }))}
          />
        )}
        <p className="fnote fnote--quiet" style={{ marginTop: 14 }}>
          الحسابات اللي مالهاش رصيد ولا حركة في الفترة مش معروضة — القايمة بتعرض
          اللي ليه معنى بس.
        </p>
      </section>
    </ReportShell>
  )
}
