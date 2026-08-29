import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, Panel } from '../components/layout.jsx'
import { NotificationsDrawer, NOTIF_COUNT } from '../components/notifications.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { AreaChart } from '../components/charts.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { toast } from '../components/feedback.jsx'
import { daysFrom, fmtMoney, STATUS } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   الرئيسية — نفس تركيبة الريفرنس بالضبط
   صف 1: 4 كروت إحصائية + كرت المنشأة
   صف 2: رسم رئيسي (2/3) + قائمة يحتاج انتباهك (1/3) + زر
   صف 3: توزيع المستحقات · خريطة المدن · دونات الحالة
   ============================================================ */

/* ★ الأربع كروت دول كانوا **مكتوبين بالإيد**: «النقد المتاح
   ٦٥٣ ألف» و«المستحق عليك للموردين صفر» — والسيستم كله بيقول
   أرقام تانية. ودي أول شاشة الكلاينت بيشوفها.

   دلوقتي كلهم من **نفس دفتر اليومية** اللي التقارير بتقرا منه،
   فمستحيل الرئيسية تخالف الميزانية ولا شاشة الموردين. */
const TODAY = DATA.TODAY
const cashTotal = DATA.cashAccounts.reduce((a, x) => a + R.balanceOf(x.acc, TODAY), 0)
const arTotal   = R.balanceOf('1200', TODAY)
const apTotal   = -R.balanceOf('2000', TODAY)
const lateAr    = DATA.invoices
  .filter((v) => ['issued', 'partial', 'overdue'].includes(v.status) && daysFrom(v.due) < 0)
  .reduce((a, v) => a + (v.total - (v.paid || 0)), 0)

/* الشهر الحالي — من أول يومه لحد النهارده */
const MSTART = `${TODAY.slice(0, 7)}-01`
const mInc = R.incomeStatement(MSTART, TODAY)

const STATS = [
  { l: 'النقد المتاح', v: cashTotal, Ic: Ico.cash,
    sub: `في ${DATA.cashAccounts.length} حسابات`, to: '/cash/accounts' },
  { l: 'المستحق لك من العملاء', v: arTotal, Ic: Ico.receivable,
    sub: lateAr > 0 ? `منها ${fmtMoney(lateAr)} متأخر` : 'مفيش متأخر',
    alert: lateAr > 0, to: '/sales/invoices?due=late' },
  { l: 'المستحق عليك للموردين', v: apTotal, Ic: Ico.purchases,
    sub: apTotal > 0 ? 'على فواتير مشتريات مرحّلة' : 'لا يوجد مستحقات',
    to: '/purchases/suppliers' },
  /* الشهر ممكن يقفل بخسارة — الكارت بيقول كده بدل ما يسمّيها «ربح» */
  { l: mInc.net < 0 ? 'خسارة الشهر' : 'صافي الربح هذا الشهر', v: mInc.net, Ic: Ico.sales,
    sub: mInc.net < 0 ? 'المصروف أكبر من الإيراد في الشهر ده' : 'الإيراد ناقص المصروف',
    alert: mInc.net < 0, to: '/reports/income-statement' },
]

/* الرسم من نفس سلسلة تقرير المبيعات — مش أرقام متخيّلة */
const MONTHS = R.salesTrend(`${TODAY.slice(0, 4)}-01-01`, TODAY)
  .map((m) => ({ l: m.label.split(' ')[0], v: m.net }))

/* أكبر المستحقات — من أرصدة العملاء الحقيقية */
/* ★ كان بيقرا `c.balance` المخزّن. الرصيد المشتق هو المصدر
   الوحيد في باقي السيستم، والمخزّن كان بيخالفه. */
const DISTRIB = DATA.customers
  .map((c) => ({ c, bal: DATA.customerBalance(c.id) }))
  .filter((x) => x.bal > 0)
  .sort((a, b) => b.bal - a.bal)
  .slice(0, 4)
  .map(({ c, bal }) => {
    const late = DATA.invoices
      .filter((v) => v.c?.id === c.id && v.status === 'overdue')
      .reduce((m, v) => Math.max(m, v.overdueDays || 0), 0)
    return { n: c.ar, v: bal, late }
  })

/* آخر أربع مستندات من الداتا نفسها — الصف بيفتح الفاتورة */
const RECENT = [...DATA.invoices]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 4)
  .map((v) => ({ no: v.no, c: v.c.ar, v: v.total, st: (STATUS[v.status] || {}).label || v.status }))

/* الإقرار من نفس محرّك التقارير — الكارت والشاشة بيقولوا رقم واحد */
const QSTART = `${TODAY.slice(0, 4)}-${String(Math.floor(Number(TODAY.slice(5, 7)) / 3) * 3 + 1).padStart(2, '0')}-01`
const qVat = R.vatReturn(QSTART, TODAY)
const qNet = +(qVat.outVat - qVat.inVat).toFixed(2)
const VAT = [
  { l: 'ضريبة على مبيعاتك',   v: qVat.outVat },
  { l: 'ضريبة على مشترياتك', v: qVat.inVat, minus: true },
  /* لما المدخلات تزيد عن المخرجات الإقرار بيبقى **مسترد** مش مستحق.
     كلمة «المستحق» جنب رقم سالب بتقلب المعنى. */
  { l: qNet < 0 ? 'مسترد من الهيئة' : 'الصافي المستحق',
    v: Math.abs(qNet), net: true },
]

/* ★ الأرقام دي كانت مكتوبة بالإيد ومختلفة عن الداتا. دلوقتي
   بتتحسب بنفس القواعد اللي الفلاتر في شاشة الفواتير بتستخدمها،
   فالكارت والشاشة اللي بيفتحها بيقولوا نفس الرقم دايمًا.
   والرابط هو الفلتر — الشاشة بتفتح على اللي الكارت بيتكلم عنه. */
const sum = (rows) => rows.reduce((a, r) => a + (r.total || 0), 0)

const REJECTED = DATA.invoices.filter((v) => v.zatca === 'bad')
const OVERDUE  = DATA.invoices.filter((v) =>
  v.status === 'overdue' || (['issued', 'partial'].includes(v.status) && daysFrom(v.due) < 0))
const DRAFTS   = DATA.invoices.filter((v) => v.status === 'draft')
const SOON     = DATA.quotations.filter((q) => {
  const d = daysFrom(q.valid)
  return q.status === 'sent' && d !== null && d >= 0 && d <= 7
})

const NEEDS = [
  { t: 'مرفوضة من هيئة الزكاة', c: REJECTED.length, unit: 'فاتورة', v: sum(REJECTED),
    Ic: Ico.rejected, crit: true, to: '/sales/invoices?zatca=bad' },
  { t: 'تجاوزت تاريخ الاستحقاق', c: OVERDUE.length, unit: 'فاتورة', v: sum(OVERDUE),
    Ic: Ico.overdue, to: '/sales/invoices?due=late' },
  { t: 'عروض أسعار تنتهي قريبًا', c: SOON.length, unit: 'عرض', v: sum(SOON),
    Ic: Ico.expiring, to: '/sales/quotations' },
  { t: 'مسودات لم تُصدَر', c: DRAFTS.length, unit: 'مسودة', v: sum(DRAFTS),
    Ic: Ico.invoice, to: '/sales/invoices?state=draft' },
].filter((n) => n.c > 0)


export default function Dashboard() {
  const nav = useNavigate()
  const [attn, setAttn] = useState(false)
  const total = NOTIF_COUNT

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="وضعك المالي" />
        <div className="tophead__ctrl">
          <button className="select select--pill"
            onClick={() => toast.info('السنة المالية الحالية 2026',
              { sub: 'تبديل السنوات بيتفتح مع موديول المحاسبة' })}>
            <span>2026</span><Ico.chevron size={15} className="chev" />
          </button>
          <SearchField placeholder="ابحث عن أي شيء…" width={240} />
          <button className="bellbtn" onClick={() => setAttn(true)} aria-label="الإشعارات" title="الإشعارات">
            <Ico.bell size={18} />
            <span className="bellbtn__n num">{total}</span>
          </button>
        </div>
      </div>

      {/* ---------- صف ١ ---------- */}
      <div className="row1">
        {STATS.map((s) => (
          <div key={s.l} data-component="StatCard" role={s.to ? 'button' : undefined}
            tabIndex={s.to ? 0 : undefined}
            onClick={s.to ? () => nav(s.to) : undefined}
            onKeyDown={s.to ? (e) => { if (e.key === 'Enter') nav(s.to) } : undefined}
            className={`stat${s.alert ? ' stat--alert' : ''}${s.to ? ' stat--go' : ''}`}>
            <div className="stat__icon" ><s.Ic size={19} /></div>
            <div className="stat__t">
              <div className="stat__l">{s.l}</div>
              <div className="stat__v"><SAR v={s.v} dec /></div>
              <div className="stat__sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- صف ٢ ---------- */}
      <div className="row2">
        <Panel title="المبيعات الشهرية"
          action={<button className="select select--pill"
            onClick={() => toast.info('العرض الشهري هو المتاح دلوقتي',
              { sub: 'الأسبوعي والربعي جايين مع موديول التقارير' })}>
            <span>شهري</span><Ico.chevron size={15} className="chev" /></button>}>
          <AreaChart data={MONTHS} highlightIndex={7} />
        </Panel>

        <Panel title="محتاج تصرّف منك" action={<Ico.more size={18} className="dots" />}>
          <div className="needs">
            {NEEDS.map((n) => (
              <button key={n.t} className="needs__row" onClick={() => nav(n.to)}>
                <span className={`needs__ic${n.crit ? ' needs__ic--crit' : ''}`}><n.Ic size={17} /></span>
                <span className="needs__body">
                  <span className="needs__t">{n.t}</span>
                  <span className="needs__c"><b className="num">{n.c}</b> {n.unit}</span>
                </span>
                <span className="needs__v"><SAR v={n.v} /></span>
              </button>
            ))}
          </div>
          <Button label="عرض الكل" variant="outline" className="panel__foot" onClick={() => setAttn(true)} />
        </Panel>
      </div>

      {/* ---------- صف ٣ ---------- */}
      <div className="row3">
        <Panel title="أكبر المستحقات">
          <div className="distrib">
            {DISTRIB.map((c) => (
              <button key={c.n} className="distrib__row"
                onClick={() => nav('/sales/invoices?due=late')}>
                <span className="distrib__body">
                  <span className="distrib__n">{c.n}</span>
                  <span className={`distrib__m${c.late ? ' is-late' : ''}`}>
                    {c.late ? `متأخرة ${c.late} يوم` : 'ضمن المهلة'}
                  </span>
                </span>
                <span className="distrib__v"><SAR v={c.v} /></span>
              </button>
            ))}
          </div>
          <Button label="متابعة التحصيل" variant="outline" className="panel__foot"
            onClick={() => nav('/sales/invoices?due=late')} />
        </Panel>

        <Panel title="آخر المستندات" action={<Ico.more size={18} className="dots" />}>
          <div className="recent">
            {RECENT.map((r) => (
              <button key={r.no} className="recent__row"
                onClick={() => nav(`/sales/invoices/${r.no}`)}>
                <span className="recent__ic"><Ico.invoice size={16} /></span>
                <span className="recent__body">
                  <span className="recent__c">{r.c}</span>
                  <span className="recent__no num">{r.no}</span>
                </span>
                <span className={`recent__st st-${r.st}`}>{r.st}</span>
                <span className="recent__v"><SAR v={r.v} /></span>
              </button>
            ))}
          </div>
          <Button label="كل المستندات" variant="outline" className="panel__foot"
            onClick={() => nav('/sales/invoices')} />
        </Panel>

        <Panel title="ضريبة القيمة المضافة"
          action={<span className="panel__meta">الربع الثالث</span>}>
          <div className="vat">
            <div className="vat__rows">
              {VAT.map((r) => (
                <div key={r.l} className={`vat__row${r.net ? ' vat__row--net' : ''}`}>
                  <span className="vat__rl">{r.l}</span>
                  <span className="vat__rv"><SAR v={r.minus ? -r.v : r.v} dec /></span>
                </div>
              ))}
            </div>

            <div className="vat__due">
              <span className="vat__due-ic"><Ico.overdue size={15} /></span>
              <span className="vat__due-t">
                <span>آخر موعد للتقديم</span>
                <span className="vat__due-d"><b>30 أكتوبر</b><em>باقي <b className="num">74</b> يوم</em></span>
              </span>
            </div>

            <Button label="مراجعة الإقرار" variant="outline" className="panel__foot"
            onClick={() => toast.info('إقرار الربع الثالث بيتفتح من موديول المحاسبة',
              { sub: 'الأرقام هنا بتتجمّع من فواتير المبيعات والمشتريات' })} />
          </div>
        </Panel>
      </div>

      <NotificationsDrawer open={attn} onClose={() => setAttn(false)} />
    </AppShell>
  )
}
