import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportShell, KpiRow, BarList, DrillTable } from '../components/reportshell.jsx'
import { Money, DocNo, StatusCell } from '../components/data.jsx'
import { periodRange } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   تقرير المصروفات.

   ★ ده التقرير اللي فيه أوضح خطأ في السيستم كله:
   أربع كروت — «المصروفات المرحّلة» و«الذمم الدائنة المستحقة»
   و«الالتزامات المفتوحة» و«المصروفات المدفوعة» — **كلهم بيعرضوا
   نفس الرقم بالظبط**. ودول بالتعريف مستحيل يتساووا:

       المدفوع + المستحق = الإجمالي

   لو التلاتة متساويين يبقى فيه رقم واحد اتكرر أربع مرات بأربع
   تسميات. التقرير بيكذب على المستخدم.

   هنا كل رقم محسوب من مصدره: المدفوع من الدفعات الفعلية،
   والمستحق من المتبقي على فواتير المشتريات، والالتزام من أوامر
   الشراء اللي لسه ما اتفوترتش. والتلاتة بيتحققوا قدام المستخدم.
   ============================================================ */

export default function RepExpenses() {
  const nav = useNavigate()
  const [period, setPeriod] = useState({ id: 'y' })
  const [view, setView] = useState('acc')

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const rep = useMemo(() => R.expenseReport(from, to), [from, to])
  const prev = R.prevPeriod(from, to)
  const pRep = useMemo(() => R.expenseReport(prev.from, prev.to), [prev.from, prev.to])

  const expRows = useMemo(() =>
    DATA.expenses.filter((e) => e.status === 'posted' &&
      (!from || e.date >= from) && (!to || e.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date)), [from, to])

  const billRows = useMemo(() =>
    DATA.bills.filter((b) => b.status === 'posted' &&
      (!from || b.date >= from) && (!to || b.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date)), [from, to])

  return (
    <ReportShell
      title="تقرير المصروفات"
      sub="اللي صرفته في الفترة، على إيه، ولمين"
      period={period} onPeriod={setPeriod}
      note="الأرقام كلها قبل الضريبة — ضريبة المدخلات بتروح للإقرار الضريبي مش للمصروف."
    >
      <KpiRow
        value={view} onPick={setView}
        items={[
          { id: 'total', lead: true, label: 'إجمالي المصروفات', value: rep.total, dec: true,
            sub: `${rep.count} مستند`, delta: R.delta(rep.total, pRep.total) },
          { id: 'paid', label: 'المدفوع فعلًا', value: rep.paid, dec: true,
            sub: 'خرج من النقد' },
          { id: 'unpaid', label: 'مستحق على الموردين', value: rep.unpaid, dec: true,
            sub: rep.unpaid > 0 ? 'لسه ما اتدفعش' : 'مفيش مستحق',
            tone: rep.unpaid > 0 ? 'warn' : null },
          { id: 'commit', label: 'التزامات أوامر شراء', value: rep.commit, dec: true,
            sub: 'اتطلبت وما اتفوترتش' },
          { id: 'acc', label: 'أكبر بند صرف', value: rep.top?.amount || 0,
            sub: rep.top?.ar || '—', drill: true },
        ]}
      />

      {/* ★ التحقق قدام المستخدم — الرقمين بيجمعوا الإجمالي فعلًا */}
      <p className="fnote fnote--quiet" style={{ marginTop: -4, marginBottom: 16 }}>
        <b>{fmtMoney(rep.paid)}</b> مدفوع + <b>{fmtMoney(rep.unpaid)}</b> مستحق ={' '}
        <b>{fmtMoney(rep.total)}</b> إجمالي. التزامات أوامر الشراء
        (<b>{fmtMoney(rep.commit)}</b>) <b>مش</b> ضمن الإجمالي — دي لسه ما اتفوترتش.
      </p>

      <div className="repcols">
        <BarList
          title="الصرف حسب الحساب" hint="النسبة من إجمالي الصرف في الفترة"
          rows={rep.byAccount.map((r) => ({ ...r, id: r.acc,
            sub: r.capital ? 'أصل في الميزانية — مش مصروف' : `${r.n} قيد` }))}
          total={rep.total}
          foot={
            <p className="fnote fnote--quiet" style={{ marginTop: 14 }}>
              <b>{fmtMoney(rep.expensed)}</b> منها مصروف بيدخل قائمة الدخل، و
              <b>{fmtMoney(rep.capitalised)}</b> شرا بضاعة بقى <b>أصل في الميزانية</b> —
              بيتحوّل تكلفة لما البضاعة تتباع. اللون التاني هنا لأنها <b>فئة مختلفة</b>،
              مش عشان ترتيبها.
            </p>
          } />

        <BarList
          title="الصرف حسب المورد" hint="النسبة من إجمالي فواتير المشتريات"
          rows={rep.bySupplier.map((r) => ({ ...r, sub: `${r.n} فاتورة`, go: `/purchases/suppliers/${r.id}` }))}
          total={rep.billNet} onGo={(g) => nav(g)}
          empty="مفيش فواتير مشتريات في الفترة دي — كل الصرف مصروفات مباشرة." />
      </div>

      <DrillTable
        title="المصروفات المباشرة"
        empty="مفيش مصروفات مرحّلة في الفترة دي"
        cols={[
          { label: 'الرقم', width: '124px' },
          { label: 'التاريخ', width: '118px' },
          { label: 'الوصف' },
          { label: 'الحساب', width: '176px' },
          { label: 'قبل الضريبة', num: true, width: '124px' },
          { label: 'الضريبة', num: true, width: '112px' },
        ]}
        rows={expRows.map((e) => ({
          key: e.no, go: '/purchases/expenses',
          cells: [
            <span className="num" style={{ fontSize: 'var(--fs-xs)' }}>{e.no}</span>,
            <span>{fmtDate(e.date)}</span>,
            <span className="itcell"><b>{e.desc}</b>{e.ref && <em>{e.ref}</em>}</span>,
            <span className="hint">{DATA.accName(e.acc)}</span>,
            <Money value={DATA.expNet(e)} />,
            <Money value={DATA.expVat(e)} />,
          ],
        }))}
      />

      <DrillTable
        title="فواتير المشتريات"
        empty="مفيش فواتير مشتريات مرحّلة في الفترة دي"
        cols={[
          { label: 'الفاتورة', width: '132px' },
          { label: 'التاريخ', width: '118px' },
          { label: 'المورد' },
          { label: 'الحالة', width: '124px' },
          { label: 'قبل الضريبة', num: true, width: '124px' },
          { label: 'المتبقي', num: true, width: '124px' },
        ]}
        rows={billRows.map((b) => ({
          key: b.no, go: `/purchases/bills/${b.no}`,
          cells: [
            <DocNo value={b.no} onClick={() => nav(`/purchases/bills/${b.no}`)} />,
            <span>{fmtDate(b.date)}</span>,
            <span className="itcell"><b>{b.s.ar}</b>{b.ref && <em className="num">{b.ref}</em>}</span>,
            <StatusCell status={b.status} />,
            <Money value={DATA.docNet(b)} />,
            DATA.billDue(b) > 0.009
              ? <span className={DATA.isLate(b) ? 'is-warn' : ''}><Money value={DATA.billDue(b)} /></span>
              : <span className="hint">—</span>,
          ],
        }))}
      />
    </ReportShell>
  )
}
