import { useState } from 'react'
import { AppShell, PageHeader, Panel } from '../components/layout.jsx'
import { NotificationsDrawer, NOTIF_COUNT } from '../components/notifications.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { AreaChart } from '../components/charts.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'

/* ============================================================
   الرئيسية — نفس تركيبة الريفرنس بالضبط
   صف 1: 4 كروت إحصائية + كرت المنشأة
   صف 2: رسم رئيسي (2/3) + قائمة يحتاج انتباهك (1/3) + زر
   صف 3: توزيع المستحقات · خريطة المدن · دونات الحالة
   ============================================================ */

const STATS = [
  { l: 'النقد المتاح', v: 653092.47, Ic: Ico.cash,
    sub: 'في 3 حسابات بنكية' },
  { l: 'المستحق لك من العملاء', v: 29778.89, Ic: Ico.receivable,
    sub: 'منها 26,653.89 متأخر', alert: true },
  { l: 'المستحق عليك للموردين', v: 0.00, Ic: Ico.purchases,
    sub: 'لا يوجد مستحقات' },
  { l: 'صافي الربح هذا الشهر', v: 27830.00, Ic: Ico.sales,
    sub: 'الإيراد ناقص المصروف' },
]

const MONTHS = [
  { l: 'يناير',  v: 112400 }, { l: 'فبراير', v: 138900 }, { l: 'مارس',   v: 176300 },
  { l: 'أبريل',  v: 149800 }, { l: 'مايو',   v: 121500 }, { l: 'يونيو',  v: 158200 },
  { l: 'يوليو',  v: 165800 }, { l: 'أغسطس',  v: 186420 }, { l: 'سبتمبر', v: 142000 },
  { l: 'أكتوبر', v: 154600 }, { l: 'نوفمبر', v: 171200 }, { l: 'ديسمبر', v: 133700 },
]

const DISTRIB = [
  { n: 'شركة الفهد للمقاولات',  v: 84300, late: 20 },
  { n: 'مجموعة الأفق التجارية', v: 67400, late: 0  },
  { n: 'مؤسسة البناء المتين',   v: 46015, late: 6  },
  { n: 'مؤسسة وادي القمم',      v: 43110, late: 7  },
]

const RECENT = [
  { no: 'INV-027122', c: 'مؤسسة النخبة للتجارة', v: 12450,  st: 'مدفوعة' },
  { no: 'INV-027121', c: 'شركة الفهد للمقاولات',  v: 84300,  st: 'متأخرة' },
  { no: 'INV-027120', c: 'مصنع الرياض للبلاستيك', v: 5780,   st: 'مرفوضة' },
  { no: 'INV-027119', c: 'مؤسسة درب الشرق',       v: 23900,  st: 'جزئي' },
]

const VAT = [
  { l: 'ضريبة على مبيعاتك',   v: 42180.00 },
  { l: 'ضريبة على مشترياتك', v: 14217.00, minus: true },
  { l: 'الصافي المستحق',           v: 27963.00, net: true },
]

const NEEDS = [
  { t: 'مرفوضة من هيئة الزكاة', c: 2, unit: 'فاتورة', v: 11180,  Ic: Ico.rejected, crit: true },
  { t: 'تجاوزت تاريخ الاستحقاق', c: 2, unit: 'فاتورة', v: 127410, Ic: Ico.overdue },
  { t: 'عروض أسعار تنتهي قريبًا', c: 3, unit: 'عرض',   v: 46000,  Ic: Ico.expiring },
  { t: 'مسودات لم تُصدَر',        c: 2, unit: 'مسودة',  v: 54915,  Ic: Ico.invoice },
]


export default function Dashboard() {
  const [attn, setAttn] = useState(false)
  const total = NOTIF_COUNT

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="وضعك المالي" />
        <div className="tophead__ctrl">
          <button className="select select--pill">
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
          <div key={s.l} data-component="StatCard" className={`stat${s.alert ? ' stat--alert' : ''}`}>
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
          action={<button className="select select--pill"><span>شهري</span><Ico.chevron size={15} className="chev" /></button>}>
          <AreaChart data={MONTHS} highlightIndex={7} />
        </Panel>

        <Panel title="محتاج تصرّف منك" action={<Ico.more size={18} className="dots" />}>
          <div className="needs">
            {NEEDS.map((n) => (
              <button key={n.t} className="needs__row">
                <span className={`needs__ic${n.crit ? ' needs__ic--crit' : ''}`}><n.Ic size={17} /></span>
                <span className="needs__body">
                  <span className="needs__t">{n.t}</span>
                  <span className="needs__c"><b className="num">{n.c}</b> {n.unit}</span>
                </span>
                <span className="needs__v"><SAR v={n.v} /></span>
              </button>
            ))}
          </div>
          <Button label="عرض الكل" variant="primary" className="panel__foot" onClick={() => setAttn(true)} />
        </Panel>
      </div>

      {/* ---------- صف ٣ ---------- */}
      <div className="row3">
        <Panel title="أكبر المستحقات">
          <div className="distrib">
            {DISTRIB.map((c) => (
              <button key={c.n} className="distrib__row">
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
          <Button label="متابعة التحصيل" variant="primary" className="panel__foot" />
        </Panel>

        <Panel title="آخر المستندات" action={<Ico.more size={18} className="dots" />}>
          <div className="recent">
            {RECENT.map((r) => (
              <button key={r.no} className="recent__row">
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
          <Button label="كل المستندات" variant="primary" className="panel__foot" />
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

            <Button label="مراجعة الإقرار" variant="primary" className="panel__foot" />
          </div>
        </Panel>
      </div>

      <NotificationsDrawer open={attn} onClose={() => setAttn(false)} />
    </AppShell>
  )
}
