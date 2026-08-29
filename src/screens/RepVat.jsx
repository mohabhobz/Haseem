import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportShell, KpiRow } from '../components/reportshell.jsx'
import { Button } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR, Money } from '../components/data.jsx'
import { Tabs } from '../components/layout.jsx'
import { fmtMoney, fmtDate, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   الإقرار الضريبي — الخانات الـ١٦.

   ★ أهم إصلاح في الموديول كله:

   عند العميل **كل خانة برقم واحد**. نموذج هيئة الزكاة والضريبة
   الحقيقي لكل خانة **عمودين**: `المبلغ (ر.س)` و`ضريبة القيمة
   المضافة (ر.س)`. من غير العمودين المستخدم **مش قادر ينقل
   الإقرار للبوابة** — نص الأرقام اللي البوابة بتطلبها مش معروضة.

   وزوّدنا حاجة تانية: كل خانة بتقول **جاية من كام مستند**،
   وتدوس عليها تشوفهم بالاسم والرقم. الإقرار رقم بيتبعت للهيئة —
   لازم المستخدم يعرف الرقم جه منين قبل ما يعتمده.

   وسِبنا اللي كان كويس عنده: تنبيه «بنود صُنّفت تلقائياً».
   ============================================================ */

const TABS = [
  { id: 'form', label: 'الإقرار' },
  { id: 'files', label: 'سجل الملفات' },
]

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function RepVat() {
  const nav = useNavigate()
  const [tab, setTab] = useState('form')
  const [mode, setMode] = useState('q')
  const [year, setYear] = useState(2026)
  const [q, setQ] = useState(3)
  const [month, setMonth] = useState(8)
  const [open, setOpen] = useState(null)

  const p = useMemo(() => R.periodOf(mode, year, q, month), [mode, year, q, month])
  const v = useMemo(() => R.vatReturn(p.from, p.to), [p.from, p.to])

  const refund = v.due < 0
  const autoN = 0   /* البنود كلها مصنّفة عندنا — الفئة حقل إجباري في الفورم */

  const Box = ({ b, group }) => {
    const on = open === b.n
    const live = b.docs.length > 0
    const isTotal = [6, 12, 16].includes(b.n)
    return (
      <>
        <tr className={`vatr${isTotal ? ' vatr--tot' : ''}${on ? ' is-on' : ''}${live ? ' is-live' : ''}`}
          onClick={live ? () => setOpen(on ? null : b.n) : undefined}>
          <td className="vatr__n"><span className="num">{b.n}</span></td>
          <td>
            <span className="vatr__l">
              {b.ar}
              {live && <em className="vatr__src">{b.docs.length} مستند · {on ? 'اقفل' : 'اعرض'}</em>}
            </span>
          </td>
          <td className="n">
            {b.amount ? <Money value={b.amount} /> : <span className="hint">—</span>}
          </td>
          <td className="n">
            {b.vat ? <Money value={b.vat} /> : <span className="hint">—</span>}
          </td>
        </tr>
        {on && (
          <tr className="vatr__det">
            <td colSpan={4}>
              <ul className="vatdocs">
                {b.docs.map((d, i) => (
                  <li key={i} onClick={() => d.go && nav(d.go)} className={d.go ? 'is-go' : ''}>
                    <span className="vatdocs__n">
                      <b className="num">{d.no}</b>
                      {d.party && <em>{d.party}</em>}
                    </span>
                    <span className="vatdocs__a"><Money value={d.amount} /></span>
                    <span className="vatdocs__v"><Money value={d.vat} /></span>
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        )}
      </>
    )
  }

  const Section = ({ title, hint, boxes }) => (
    <section className="sect">
      <header className="sect__h">
        <h2 className="sect__t">{title}</h2>
        <span className="sect__hint">{hint}</span>
      </header>
      <div className="tablewrap">
        <table className="dt dt--flat tbl-vat">
          <thead>
            <tr>
              <th style={{ width: '52px' }}>خانة</th>
              <th>البيان</th>
              <th className="n" style={{ width: '168px' }}>المبلغ (ر.س)</th>
              <th className="n" style={{ width: '168px' }}>ضريبة القيمة المضافة (ر.س)</th>
            </tr>
          </thead>
          <tbody>{boxes.map((b) => <Box key={b.n} b={b} />)}</tbody>
        </table>
      </div>
    </section>
  )

  return (
    <ReportShell
      title="الإقرار الضريبي"
      sub="الخانات الستّ عشرة كما تطلبها هيئة الزكاة والضريبة والجمارك"
      pdf csv
      extra={
        <>
          <label className="repbar__f">
            <span className="repbar__l">دورية الإقرار</span>
            <select className="fld__i" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="q">ربع سنوي</option>
              <option value="m">شهري</option>
            </select>
          </label>
          {mode === 'q' ? (
            <label className="repbar__f">
              <span className="repbar__l">الربع</span>
              <select className="fld__i" value={q} onChange={(e) => setQ(+e.target.value)}>
                {[1, 2, 3, 4].map((x) => <option key={x} value={x}>الربع {x}</option>)}
              </select>
            </label>
          ) : (
            <label className="repbar__f">
              <span className="repbar__l">الشهر</span>
              <select className="fld__i" value={month} onChange={(e) => setMonth(+e.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
          )}
          <label className="repbar__f">
            <span className="repbar__l">السنة</span>
            <select className="fld__i" value={year} onChange={(e) => setYear(+e.target.value)}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </>
      }
      note="الأرقام محسوبة من المستندات المرحّلة في الفترة. المسودات مش داخلة — ترحّلها قبل ما تعتمد الإقرار."
    >
      <Tabs items={TABS} value={tab} onChange={setTab} />

      {tab === 'files' ? (
        <section className="sect">
          <div className="sect__empty sect__empty--tall">
            <b>مفيش ملفات إقرار لسه</b>
            <span>
              لما تعتمد الإقرار وتنشئ ملفه، بيتحفظ هنا بتاريخه وأرقامه وقتها —
              عشان تقدر ترجعله وتقارنه باللي اتبعت للهيئة فعلًا.
            </span>
            <Button label="إنشاء ملف الإقرار" variant="primary"
              onClick={() => ACT.fileVatReturn(p.label, fmtDate(p.due))} />
          </div>
        </section>
      ) : (
        <>
          <div className="vathead">
            <div className="vathead__p">
              <b>{p.label}</b>
              <span>{fmtDate(p.from)} — {fmtDate(p.to)}</span>
              <em>الاستحقاق على بوابة الهيئة {fmtDate(p.due)}</em>
            </div>
            <div className={`vathead__due${refund ? ' is-refund' : ''}`}>
              <span className="vathead__l">
                {refund ? 'ضريبة مستردة من الهيئة' : 'صافي الضريبة المستحقة'}
              </span>
              <span className="vathead__v"><SAR v={Math.abs(v.due)} dec /></span>
              <span className="vathead__s">
                {refund
                  ? 'مدخلاتك أكبر من مخرجاتك — الفرق بيترحّل أو يترد'
                  : 'ده اللي هيتدفع للهيئة عن الفترة دي'}
              </span>
            </div>
          </div>

          <KpiRow items={[
            { id: 'out', label: 'ضريبة المخرجات', value: v.outVat, dec: true,
              sub: `من ${fmtMoney(v.boxes[6].amount)} مبيعات` },
            { id: 'in', label: 'ضريبة المدخلات', value: v.inVat, dec: true,
              sub: `من ${fmtMoney(v.boxes[12].amount)} مشتريات` },
            { id: 'net', lead: true, label: refund ? 'مستردة' : 'مستحقة',
              value: Math.abs(v.due), dec: true, tone: refund ? 'good' : null,
              sub: 'الخانة ١٦' },
          ]} />

          <p className="fnote fnote--quiet" style={{ marginTop: -4, marginBottom: 16 }}>
            <b>{fmtMoney(v.outVat)}</b> مخرجات − <b>{fmtMoney(v.inVat)}</b> مدخلات ={' '}
            <b>{fmtMoney(v.due)}</b> {refund ? '(سالب = مستردة)' : ''}
          </p>

          <Section title="المبيعات" hint="الخانات من ١ إلى ٦" boxes={v.sales} />
          <Section title="المشتريات" hint="الخانات من ٧ إلى ١٢" boxes={v.purchases} />
          <Section title="الإجماليات والتسويات" hint="الخانات من ١٣ إلى ١٦" boxes={v.totals} />

          <div className="vatfoot">
            <p className="fnote">
              <Ico.check size={14} />
              الخانة ٨ بتتغذّى من <button className="linkish"
                onClick={() => nav('/purchases/customs')}>البيانات الجمركية</button> —
              بالقيمة الجمركية والرسوم، مش بإجمالي فاتورة المورد.
            </p>
            <Button label="إنشاء ملف الإقرار" variant="primary"
              onClick={() => ACT.fileVatReturn(p.label, fmtDate(p.due))} />
          </div>
        </>
      )}
    </ReportShell>
  )
}
