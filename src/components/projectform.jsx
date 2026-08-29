import { useState } from 'react'
import { Modal } from './modal.jsx'
import { DateField } from './datefield.jsx'
import { toast } from './feedback.jsx'
import { fmtMoney } from '../lib/format.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   مشروع جديد.

   نفس حقول سيستم العميل، بتلات فروق:

   ١) **رمز المشروع** عنده `PROJ_056605` — أندرسكور ورقم عشوائي،
      والتلميحة بتقول «أحرف إنجليزية كبيرة وأرقام وشرطات سفلية»
      وبتدّي مثال `PROJ-2026` **بشرطة** مش أندرسكور. المثال نفسه
      مخالف للقاعدة المكتوبة جنبه. عندنا الكود بيتولّد من اسم
      المشروع والسنة (`NKL-26`) وقابل للتعديل — كود بيتقرا.

   ٢) **الميزانية رقمين**: «الإيراد المستهدف» و«حد التكلفة».
      سبناهم زي ما هم لأن ده الصح — قيمة العقد حاجة والتكلفة
      المسموح بيها حاجة تانية. بس زوّدنا **الهامش المتوقّع** جنبهم،
      لأن ده الرقم اللي المشروع بيتاخد قرار عليه.

   ٣) **الحالة** عنده قايمة سيستم (`فعّال` بالإنجليزي في مكان تاني).
      عندنا تلات حالات بوصف لكل واحدة.
   ============================================================ */

const STATUSES = [
  { id: 'active', ar: 'شغّال',  note: 'بيتقيّد عليه إيراد وتكلفة' },
  { id: 'onhold', ar: 'موقوف',  note: 'مؤقتًا — مفيش مستندات جديدة' },
  { id: 'closed', ar: 'مقفول',  note: 'خلص — للقراءة بس' },
]

const codeOf = (name) => {
  const w = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const a = w.map((x) => x[0] || '').join('').toUpperCase()
  return a ? `${a}-${DATA.TODAY.slice(2, 4)}` : ''
}

export function ProjectForm({ onClose }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [codeTouched, setCodeTouched] = useState(false)
  const [status, setStatus] = useState('active')
  const [cust, setCust] = useState('')
  const [manager, setManager] = useState('')
  const [start, setStart] = useState(DATA.TODAY)
  const [end, setEnd] = useState('')
  const [target, setTarget] = useState('')
  const [cap, setCap] = useState('')
  const [touched, setTouched] = useState(false)

  const setNameAndCode = (v) => {
    setName(v)
    if (!codeTouched) setCode(codeOf(v))
  }

  const t = Number(target) || 0
  const c = Number(cap) || 0
  const margin = t > 0 && c > 0 ? +(((t - c) / t) * 100).toFixed(1) : null
  const badRange = start && end && end < start
  const bad = !name.trim() || badRange

  const save = () => {
    setTouched(true)
    if (bad) {
      toast.bad('المشروع ناقص', {
        sub: badRange ? 'تاريخ الانتهاء قبل البداية' : 'اكتب اسم المشروع',
      })
      return
    }
    /* API: POST /projects → { name, code, status, cust, manager, start, end, target, cap } */
    toast.ok(`${name} اتعمل`, {
      sub: 'دلوقتي تقدر توسم الفواتير والمصروفات بيه عشان الربحية تتحسب',
    })
    onClose()
  }

  return (
    <Modal title="مشروع جديد"
      sub="المشروع بُعد على المستندات — إيراده وتكلفته بيتحسبوا من قيوده"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>إنشاء المشروع</button>
        </>
      }>

      <div className="frow frow--2">
        <label className="fld">
          <span className="fld__l">اسم المشروع</span>
          <input className={`fld__i${touched && !name.trim() ? ' is-bad' : ''}`} value={name}
            placeholder="برج النخيل — أعمال التشطيبات"
            onChange={(e) => setNameAndCode(e.target.value)} />
          {touched && !name.trim() && <em className="fld__e">الاسم ده اللي هيظهر على المستندات</em>}
        </label>

        <label className="fld">
          <span className="fld__l">رمز المشروع</span>
          <input className="fld__i ltr" value={code} placeholder="NKL-26"
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeTouched(true) }} />
          <em className="fld__h">
            بيتولّد من الاسم والسنة — عدّله زي ما تحب. حروف إنجليزية وأرقام وشَرْطة.
          </em>
        </label>
      </div>

      <div className="fld" style={{ marginTop: 14 }}>
        <span className="fld__l">الحالة</span>
        <div className="pick">
          {STATUSES.map((s) => (
            <button key={s.id} className={`pick__o${status === s.id ? ' is-on' : ''}`}
              onClick={() => setStatus(s.id)} aria-pressed={status === s.id}>
              <b>{s.ar}</b><em>{s.note}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">العميل <em>اختياري</em></span>
          <select className="fld__i" value={cust} onChange={(e) => setCust(e.target.value)}>
            <option value="">مشروع داخلي — من غير عميل</option>
            {DATA.customers.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
          </select>
          <em className="fld__h">لو مربوط بعميل، فواتيره بتترشّح للمشروع ده تلقائيًا</em>
        </label>

        <label className="fld">
          <span className="fld__l">مدير المشروع <em>اختياري</em></span>
          <input className="fld__i" value={manager} placeholder="مين مسؤول عنه"
            onChange={(e) => setManager(e.target.value)} />
        </label>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <DateField label="تاريخ البدء" value={start} onChange={setStart} />
        <DateField label="تاريخ الانتهاء" optional value={end} onChange={setEnd} min={start}
          error={badRange ? 'الانتهاء قبل البداية' : null}
          hint={!badRange ? 'التأخير عن التاريخ ده بيتعلّم على كارت المشروع' : null} />
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">الإيراد المستهدف <em>اختياري</em></span>
          <input className="fld__i num" inputMode="decimal" value={target} placeholder="0.00"
            onChange={(e) => setTarget(e.target.value)} />
          <em className="fld__h">قيمة العقد — بيتقاس عليها «المفوتر من الميزانية»</em>
        </label>

        <label className="fld">
          <span className="fld__l">حد التكلفة <em>اختياري</em></span>
          <input className="fld__i num" inputMode="decimal" value={cap} placeholder="0.00"
            onChange={(e) => setCap(e.target.value)} />
          <em className="fld__h">أقصى صرف مسموح — بيتقاس عليه «المصروف من الميزانية»</em>
        </label>
      </div>

      {margin !== null && (
        <p className={`fnote${margin < 15 ? ' fnote--warn' : ' fnote--quiet'}`}>
          الهامش المتوقّع <b>{margin}٪</b> — يعني ربح <b>{fmtMoney(t - c)}</b> ر.س لو
          المشروع مشي على الأرقام دي بالظبط.
          {margin < 15 && ' الهامش ده ضيّق، أي زيادة في التكلفة هتاكله.'}
        </p>
      )}

      <p className="fnote fnote--quiet">
        المشروع لوحده ما بيعملش حاجة — بيبقى ليه أرقام لما <b>توسم المستندات بيه</b>
        من حقل «المشروع» في الفاتورة أو المصروف أو بند فاتورة الشراء.
      </p>
    </Modal>
  )
}
