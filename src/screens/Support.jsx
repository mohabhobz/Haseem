import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, SummaryStrip } from '../components/layout.jsx'
import { Button } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { Modal } from '../components/modal.jsx'
import { toast } from '../components/feedback.jsx'
import { fmtDate } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as H from '../data/help.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   الدعم.

   ★ الفكرة الوحيدة المهمة في الشاشة دي:

   **التذكرة بتروح ومعاها حالة السيستم.**

   تذكرة مكتوب فيها «الفاتورة مش راضية تتصدر» بتاخد ٣ ردود عشان
   الدعم يعرف أي فاتورة وأي منشأة وأي إصدار. عشان كده الفورم
   بيرفق لوحده: رقم المستند اللي بتتكلم عنه · المنشأة · الرقم
   الضريبي · الشاشة · حالة الربط مع الهيئة · إصدار السيستم.

   والمستخدم **بيشوف** اللي هيتبعت قبل ما يبعت — مش بيتبعت من
   ورا ظهره.
   ============================================================ */

const CATS = [
  { id: 'zatca', ar: 'الهيئة والفوترة', note: 'رفض · ربط · شهادة' },
  { id: 'acct',  ar: 'محاسبة وأرصدة',   note: 'قيود وتقارير وأرقام' },
  { id: 'bug',   ar: 'عطل في السيستم',  note: 'حاجة مش شغّالة' },
  { id: 'ask',   ar: 'طلب أو اقتراح',   note: 'حاجة نفسك تلاقيها' },
]

export default function Support() {
  const nav = useNavigate()
  const [form, setForm] = useState(false)

  const open = H.tickets.filter((t) => t.status !== 'done')
  const done = H.tickets.filter((t) => t.status === 'done')

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="الدعم"
          sub="التذكرة بتروح ومعاها حالة السيستم عندك — عشان الرد ييجي من أول مرة" />
        <div className="tophead__ctrl">
          <Button label="مركز المساعدة" variant="ghost" onClick={() => nav('/help')} />
          <Button label="تذكرة جديدة" variant="primary" icon="＋" onClick={() => setForm(true)} />
        </div>
      </div>

      <SummaryStrip
        label="تذاكر مفتوحة"
        value={open.length} money={false} unit="تذكرة"
        note="متوسط الرد خلال يوم عمل"
        items={[
          { label: 'اتحلّت', value: String(done.length), money: false },
          { label: 'كل التذاكر', value: String(H.tickets.length), money: false },
        ]}
      />

      <section className="sect">
        <header className="sect__h">
          <h2 className="sect__t">التذاكر<span className="sect__n">{H.tickets.length}</span></h2>
        </header>

        {H.tickets.map((t) => {
          const st = H.TICKET_STATUS[t.status]
          const c = CATS.find((x) => x.id === t.cat)
          return (
            <div key={t.no} className="tkrow tkrow--full">
              <span className="tkrow__n">
                <b>{t.subject}</b>
                <em className="num">
                  {t.no} · {fmtDate(t.date)} · {t.replies} رد
                  {t.ref ? ` · بخصوص ${t.ref}` : ''}
                </em>
              </span>
              <span className="tkrow__c">{c?.ar}</span>
              <span className="tkrow__s">
                <span className={`st st--${st.tone}`}>{st.ar}</span>
                <em>{t.last}</em>
              </span>
            </div>
          )
        })}
      </section>

      {form && <TicketForm onClose={() => setForm(false)} />}
    </AppShell>
  )
}

/* ---------- تذكرة جديدة ---------- */
function TicketForm({ onClose }) {
  const [cat, setCat] = useState('zatca')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [ref, setRef] = useState('')
  const [attach, setAttach] = useState(true)
  const [touched, setTouched] = useState(false)

  const bad = !subject.trim() || body.trim().length < 10

  /* اللقطة اللي هتتبعت — مقروءة من السيستم نفسه، مش مكتوبة بالإيد */
  const alerts = R.helpAlerts()
  const snap = [
    ['المنشأة', DATA.org?.nameAr || '—'],
    ['الرقم الضريبي', DATA.org?.vat || '—'],
    ['الفرع', DATA.branches?.[0]?.ar || '—'],
    ['حالة الربط مع الهيئة', alerts.some((a) => a.id === 'zatca-rejected')
      ? 'مربوطة — فيه فاتورة مرفوضة' : 'مربوطة وشغّالة'],
    ['بنود محتاجة انتباه', `${alerts.length}`],
    ['إصدار السيستم', '2026.8.3'],
  ]

  const send = () => {
    setTouched(true)
    if (bad) {
      toast.bad('التذكرة ناقصة', {
        sub: !subject.trim() ? 'اكتب عنوان' : 'اشرح المشكلة في سطرين على الأقل',
      })
      return
    }
    /* API: POST /support/tickets → { cat, subject, body, ref, snapshot } */
    toast.ok('التذكرة اتبعتت', { sub: 'هيوصلك رد على إيميل المنشأة' })
    onClose()
  }

  return (
    <Modal title="تذكرة دعم جديدة"
      sub="اشرح المشكلة، والباقي بيتبعت لوحده"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={send}>إرسال التذكرة</button>
        </>
      }>

      <div className="fld">
        <span className="fld__l">نوع المشكلة</span>
        <div className="pick">
          {CATS.map((c) => (
            <button key={c.id} className={`pick__o${cat === c.id ? ' is-on' : ''}`}
              onClick={() => setCat(c.id)} aria-pressed={cat === c.id}>
              <b>{c.ar}</b><em>{c.note}</em>
            </button>
          ))}
        </div>
      </div>

      <label className="fld" style={{ marginTop: 14 }}>
        <span className="fld__l">العنوان</span>
        <input className={`fld__i${touched && !subject.trim() ? ' is-bad' : ''}`} value={subject}
          placeholder="مثال: فاتورة اترفضت والسبب مش واضح"
          onChange={(e) => setSubject(e.target.value)} />
      </label>

      <label className="fld" style={{ marginTop: 12 }}>
        <span className="fld__l">اشرح اللي حصل</span>
        <textarea className={`fld__i fld__i--area${touched && body.trim().length < 10 ? ' is-bad' : ''}`}
          rows={4} value={body}
          placeholder="عملت إيه بالظبط، وإيه اللي توقّعته، وإيه اللي حصل بدل منه"
          onChange={(e) => setBody(e.target.value)} />
        {touched && body.trim().length < 10
          ? <em className="fld__e">اشرح في سطرين — ده اللي بيوفّر رحلة أسئلة</em>
          : <em className="fld__h">أهم سطر: «توقّعت يحصل كذا، وحصل كذا»</em>}
      </label>

      <label className="fld" style={{ marginTop: 12 }}>
        <span className="fld__l">رقم المستند <em>اختياري</em></span>
        <input className="fld__i num" value={ref} placeholder="INV-027120 · JE-000031 · BL-000318"
          onChange={(e) => setRef(e.target.value)} />
        <em className="fld__h">لو المشكلة في مستند معيّن، رقمه بيوفّر نص الأسئلة</em>
      </label>

      {/* ---------- اللقطة ---------- */}
      <section className="fsub">
        <h3 className="fsub__t">
          اللي هيتبعت مع التذكرة
          <em>حالة السيستم عندك دلوقتي — عشان الدعم ما يسألكش عليها</em>
        </h3>

        <label className="chk" style={{ marginBottom: 10 }}>
          <input type="checkbox" checked={attach}
            onChange={(e) => setAttach(e.target.checked)} />
          <span>أرفق حالة السيستم</span>
        </label>

        {attach ? (
          <dl className="snap">
            {snap.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        ) : (
          <p className="fempty">
            من غير اللقطة، الدعم هيسألك على المنشأة والإصدار وحالة الربط قبل ما يبدأ.
          </p>
        )}
      </section>

      <p className="fnote fnote--quiet">
        مفيش أي بيانات عملاء أو مبالغ في اللقطة — بيانات المنشأة وحالة الربط بس.
      </p>
    </Modal>
  )
}
