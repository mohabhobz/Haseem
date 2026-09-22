import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip, Tabs } from '../components/layout.jsx'
import { Button, SearchField } from '../components/primitives.jsx'
import { ProjectForm } from '../components/projectform.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { DateRange, periodRange } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, daysFrom, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   المشاريع.

   السؤال اللي المشروع بيتعمل عشانه: **كسبنا ولا خسرنا فيه؟**
   وده سؤال محاسبي مش سؤال إدارة مهام — عشان كده المشروع هنا
   مش قايمة مهام ولا نسبة إنجاز مكتوبة بالإيد، هو **بُعد على
   المستندات** والربح بيتحسب من نفس دفتر اليومية.

   تلات أرقام على كل كارت، وكل واحد بيجاوب على سؤال مختلف:
   • **المفوتر** — طلعنا للعميل كام من قيمة العقد
   • **المصروف** — اتصرف كام من الميزانية
   • **النتيجة** — الفرق، وهو الرقم اللي بيتقال بصوت عالي

   وحاجة مهمة في القراءة: **المشروع في أوله بيبان خسران** لأن
   التكلفة بتتصرف قبل ما الفوترة تحصل. عشان كده الكارت بيقول
   «التكلفة سبقت الفوترة» بدل ما يرمي هامش سالب من غير سياق.
   ============================================================ */

const TABS = [
  { id: 'active', label: 'شغّالة',  test: (p) => p.status === 'active' },
  { id: 'all',    label: 'الكل',    test: () => true },
  { id: 'closed', label: 'مقفولة',  test: (p) => p.status === 'closed' },
]

const TONE = { active: 'info', onhold: 'attention', closed: 'neutral' }

export default function Projects() {
  const nav = useNavigate()
  const [tab, setTab] = useState('active')
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState({ id: 'all' })
  const [form, setForm] = useState(false)

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const rep = useMemo(() => R.projectReport(from, to), [from, to])

  const rows = useMemo(() => rep.rows
    .filter(TABS.find((t) => t.id === tab).test)
    .filter((p) => !q.trim() || [p.ar, p.code, p.manager]
      .filter(Boolean).some((x) => x.includes(q.trim()))),
  [rep, tab, q])

  const counts = Object.fromEntries(TABS.map((t) => [t.id, rep.rows.filter(t.test).length]))

  const sum = useMemo(() => ({
    revenue: rows.reduce((a, p) => a + p.revenue, 0),
    cost: rows.reduce((a, p) => a + p.cost, 0),
    budget: rows.reduce((a, p) => a + (p.budget || 0), 0),
  }), [rows])
  const profit = +(sum.revenue - sum.cost).toFixed(2)

  return (
    <AppShell search="ابحث باسم المشروع أو الكود…">
      <div className="tophead">
        <PageHeader title="المشاريع"
          sub={<>ربحية كل مشروع محسوبة من قيوده — مش من تقدير<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="إنشاء مشروع" variant="primary" icon="＋"
            onClick={() => setForm(true)} />
        </div>
      </div>

      <SummaryStrip
        label={profit >= 0 ? 'نتيجة المشاريع' : 'خسارة المشاريع لحد دلوقتي'}
        value={profit}
        note={`${rows.length} مشروع — الإيراد ناقص التكلفة المقيّدة عليهم`}
        items={[
          { label: 'المفوتر', value: sum.revenue },
          { label: 'المصروف', value: sum.cost },
          { label: 'إجمالي الميزانيات', value: sum.budget },
        ]}
      />

      {(rep.revCover < 90 || rep.costCover < 90) && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.close size={14} />
          <b>{rep.revCover}٪</b> بس من الإيراد و<b>{rep.costCover}٪</b> من التكلفة
          متوسومين بمشروع. الباقي شغل عام مش مربوط بمشروع — يعني الأرقام تحت
          بتقول ربحية <b>الشغل المربوط بمشاريع</b>، مش ربحية المنشأة كلها.
        </p>
      )}

      <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        value={tab} onChange={setTab} />

      <section className="sect" data-component="Projects">
        <header className="sect__h">
          <h2 className="sect__t">المشاريع<span className="sect__n">{rows.length}</span></h2>
          <div className="sect__ctrl">
            <SearchField placeholder="الاسم أو الكود أو المدير…" width={250}
              value={q} onChange={setQ} />
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش مشاريع في التابة دي</b>
            <span>جرّب تابة تانية أو امسح البحث.</span>
          </div>
        ) : (
          <div className="prjgrid">
            {rows.map((p) => {
              const c = p.c ? DATA.customers.find((x) => x.id === p.c) : null
              const left = p.end ? daysFrom(p.end) : null
              const early = p.profit < 0 && p.revenue < p.cost && p.billed < 60
              return (
                <article key={p.id} className="prj" data-component="ProjectCard"
                  role="button" tabIndex={0}
                  onClick={() => nav(`/projects/${p.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') nav(`/projects/${p.id}`) }}>

                  <header className="prj__h">
                    <span className="prj__id">
                      <b>{p.ar}</b>
                      <em>{p.code} · {c ? c.ar : 'مشروع داخلي'}</em>
                    </span>
                    <span className={`st st--${TONE[p.status]}`}>{DATA.PRJ_STATUS[p.status]}</span>
                  </header>

                  <div className={`prj__v${p.profit < 0 ? ' is-neg' : ''}`}>
                    <SAR v={p.profit} dec />
                    {/* الهامش ملوش معنى قبل ما الفوترة تبدأ فعلًا — «هامش
                        −٦٤١٪» في مشروع لسه في أوله رقم بيخوّف من غير سبب */}
                    <em>
                      {p.revenue <= 0 ? 'لسه ما اتفوترش'
                        : p.billed < 25 ? 'لسه في أوله'
                        : `هامش ${p.margin}٪`}
                    </em>
                  </div>

                  {early && (
                    <p className="prj__note">
                      التكلفة سبقت الفوترة — طبيعي في أول المشروع.
                    </p>
                  )}

                  <dl className="prj__bars">
                    <div>
                      <dt>المفوتر من الميزانية</dt>
                      <dd>
                        <span className="prj__bar" aria-hidden="true">
                          <i style={{ width: `${Math.min(100, p.billed)}%` }} />
                        </span>
                        <b className="num">{p.billed}٪</b>
                      </dd>
                    </div>
                    <div>
                      <dt>المصروف من الميزانية</dt>
                      <dd>
                        <span className="prj__bar prj__bar--cost" aria-hidden="true">
                          <i style={{ width: `${Math.min(100, p.burn)}%` }} />
                        </span>
                        <b className="num">{p.burn}٪</b>
                      </dd>
                    </div>
                  </dl>

                  <dl className="prj__meta">
                    <div><dt>الإيراد</dt><dd><SAR v={p.revenue} /></dd></div>
                    <div><dt>التكلفة</dt><dd><SAR v={p.cost} /></dd></div>
                    <div>
                      <dt>{p.status === 'closed' ? 'اتقفل' : 'التسليم'}</dt>
                      <dd className={left !== null && left < 0 && p.status === 'active' ? 'is-warn' : ''}>
                        {p.end ? fmtDate(p.end) : '—'}
                        {p.status === 'active' && left !== null && left < 0 && ` · متأخر ${Math.abs(left)} يوم`}
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        )}

        <p className="fnote fnote--quiet">
          إيراد المشروع وتكلفته بيتحسبوا من <b>القيود المتوسومة بيه</b> — نفس
          الدفتر اللي قائمة الدخل بتقرا منه. لو مشروع مالوش أرقام، يبقى مستنداته
          ما اتوسمتش بيه وقت التسجيل.
        </p>
      </section>

      {form && <ProjectForm onClose={() => setForm(false)} />}
    </AppShell>
  )
}
