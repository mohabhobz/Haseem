import { useState, useMemo } from 'react'
import { ReportShell, KpiRow, FinRow, FinBlock } from '../components/reportshell.jsx'
import { periodRange } from '../components/pagefilter.jsx'
import { Ico } from '../components/icons.jsx'
import { fmtMoney, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   قائمة الدخل.

   عند العميل «إجمالي الربح» = «صافي المبيعات» بالظبط — لأن سطر
   **تكلفة البضاعة المباعة مش موجود في التقرير أصلًا**، مع إن
   الحساب موجود في شجرة حساباته. يعني أهم رقم في قائمة الدخل
   (هامش الربح الإجمالي) مش موجود.

   وتحت التقرير مكتوب «اتساق دفتر الأستاذ: **Healthy**» — إنم
   إنجليزي خام.

   هنا: تكلفة البضاعة سطر حقيقي، والهامش نسبة مئوية جنب كل
   مستوى ربح، والاتساق بادچ عربي بيقول الميزان متوازن ولا لأ.
   ============================================================ */

export default function RepIncome() {
  const [period, setPeriod] = useState({ id: 'y' })

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const inc = useMemo(() => R.incomeStatement(from, to), [from, to])
  const prev = R.prevPeriod(from, to)
  const pInc = useMemo(() => R.incomeStatement(prev.from, prev.to), [prev.from, prev.to])
  const tb = useMemo(() => R.trialBalance(from, to), [from, to])

  return (
    <ReportShell
      title="قائمة الدخل"
      sub="الإيراد ناقص التكلفة ناقص المصروف — النتيجة للفترة"
      period={period} onPeriod={setPeriod} pdf
      note="محسوبة من القيود المرحّلة. المسودات مش داخلة — الفاتورة بتدخل القائمة عند الإصدار، وفاتورة الشراء عند الترحيل."
    >
      <KpiRow items={[
        { id: 'net', lead: true, label: 'صافي الربح', value: inc.net, dec: true,
          sub: `هامش ${inc.margin}٪ من صافي المبيعات`,
          tone: inc.net < 0 ? 'bad' : null,
          delta: R.delta(inc.net, pInc.net) },
        { id: 'sales', label: 'صافي المبيعات', value: inc.netSales, dec: true,
          sub: inc.returns > 0 ? `بعد مردودات ${fmtMoney(inc.returns)}` : 'من غير مردودات',
          delta: R.delta(inc.netSales, pInc.netSales) },
        { id: 'gp', label: 'مجمل الربح', value: inc.grossProfit, dec: true,
          sub: `هامش ${inc.grossMargin}٪` },
        { id: 'opex', label: 'المصروفات التشغيلية', value: inc.opex, dec: true,
          sub: `${inc.opexRows.length} حساب` },
      ]} />

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">تفاصيل الربح والخسارة</h2>
          <div className="sect__ctrl">
            <span className={`chkb${tb.balanced ? ' is-ok' : ' is-bad'}`}>
              {tb.balanced ? <Ico.check size={14} /> : <Ico.close size={14} />}
              {tb.balanced ? 'دفتر الأستاذ متوازن' : 'الدفتر مش متوازن'}
            </span>
          </div>
        </header>

        <div className="finsheet">
          <FinBlock title="الإيرادات">
            {inc.revenue.map((r) => (
              <FinRow key={r.id} code={r.id} label={DATA.accLabel(r)} value={r.amount} level={1} />
            ))}
            {inc.contra.map((r) => (
              <FinRow key={r.id} code={r.id} label={`يُطرح: ${DATA.accLabel(r)}`}
                value={r.amount} level={1} kind="minus" />
            ))}
            <FinRow label="صافي المبيعات" value={inc.netSales} kind="sub" />
          </FinBlock>

          <FinBlock title="تكلفة الإيراد"
            hint={inc.cogs === 0 ? 'مفيش تكلفة بضاعة مباعة في الفترة دي' : null}>
            {inc.cogsRows.length === 0 ? (
              <FinRow label="تكلفة البضاعة المباعة" value={0} level={1}
                note="المشتريات دخلت المخزون كأصل — التكلفة بتتقيّد لما البضاعة تتصرف" />
            ) : inc.cogsRows.map((r) => (
              <FinRow key={r.id} code={r.id} label={DATA.accLabel(r)} value={r.amount} level={1} />
            ))}
            <FinRow label="مجمل الربح" value={inc.grossProfit} kind="sub"
              note={`هامش ${inc.grossMargin}٪`} />
          </FinBlock>

          <FinBlock title="المصروفات التشغيلية">
            {inc.opexRows.length === 0
              ? <p className="fempty">مفيش مصروفات مرحّلة في الفترة دي.</p>
              : inc.opexRows.map((r) => (
                <FinRow key={r.id} code={r.id} label={DATA.accLabel(r)} value={r.amount}
                  level={1} go="/purchases/expenses" />
              ))}
            <FinRow label="إجمالي المصروفات التشغيلية" value={inc.opex} kind="sub" />
          </FinBlock>

          <FinBlock>
            <FinRow label="الربح التشغيلي" value={inc.operating} kind="sub" />
            {inc.otherRows.length > 0
              ? inc.otherRows.map((r) => (
                <FinRow key={r.id} code={r.id} label={`يُضاف: ${DATA.accLabel(r)}`}
                  value={r.amount} level={1} go="/cash/receipts" />
              ))
              : <FinRow label="يُضاف: إيرادات أخرى" value={0} level={1}
                  note="تعويضات وفوائد وأي دخل مش من البيع" />}
            <FinRow label="الربح قبل الزكاة" value={inc.beforeZakat} kind="sub" />
            <FinRow label="يُطرح: الزكاة / ضريبة الدخل المقدّرة" value={inc.zakat} level={1}
              note="بتتحسب عند إعداد الربط الزكوي" />
            <FinRow label="صافي الربح" value={inc.net} kind="total"
              note={`هامش ${inc.margin}٪`} />
          </FinBlock>
        </div>
      </section>
    </ReportShell>
  )
}
