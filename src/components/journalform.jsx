import { useState, useMemo } from 'react'
import { Modal } from './modal.jsx'
import { DateField } from './datefield.jsx'
import { Ico } from './icons.jsx'
import { toast } from './feedback.jsx'
import { fmtMoney } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { Select } from './selectfield.jsx'

/* ============================================================
   قيد يومية يدوي.

   ده الفورم الوحيد في السيستم اللي المستخدم بيكتب فيه طرفي القيد
   بنفسه. عشان كده فيه حاجة مفيش زيّها في أي فورم تاني:

   **الميزان قدامه وهو بيكتب.** مجموع المدين ومجموع الدائن والفرق
   بينهم ظاهرين تحت البنود وبيتحدّثوا مع كل رقم. القيد غير المتوازن
   ما ينفعش يترحّل — مش لأن الزرار مقفول (قاعدة البورد: **الزرار
   ميتقفلش أبدًا**)، لكن لأن الترحيل بيرفض ويقول الفرق كام بالظبط.

   وكل سطر بياخد **مركز تكلفة اختياري**، وده اللي بيخلّي تقرير
   مراكز التكلفة يشتغل بدل ما يبقى شاشة من غير رقم.
   ============================================================ */

const blank = (i) => ({ key: `L${i}`, acc: '', dr: '', cr: '', cc: '', note: '' })

export function JournalForm({ onClose }) {
  const [date, setDate] = useState(DATA.TODAY)
  const [memo, setMemo] = useState('')
  const [ref, setRef] = useState('')
  const [lines, setLines] = useState([blank(1), blank(2)])
  const [seq, setSeq] = useState(3)
  const [touched, setTouched] = useState(false)

  const set = (key, patch) =>
    setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const add = () => { setLines((p) => [...p, blank(seq)]); setSeq(seq + 1) }
  const del = (key) => setLines((p) => (p.length > 2 ? p.filter((l) => l.key !== key) : p))

  const totals = useMemo(() => {
    const dr = lines.reduce((a, l) => a + (Number(l.dr) || 0), 0)
    const cr = lines.reduce((a, l) => a + (Number(l.cr) || 0), 0)
    return { dr: +dr.toFixed(2), cr: +cr.toFixed(2), diff: +(dr - cr).toFixed(2) }
  }, [lines])

  const filled = lines.filter((l) => l.acc && (Number(l.dr) || Number(l.cr)))
  const balanced = Math.abs(totals.diff) < 0.01 && totals.dr > 0
  const bothSides = lines.some((l) => Number(l.dr) > 0 && Number(l.cr) > 0)

  const save = (post) => {
    setTouched(true)
    if (filled.length < 2) {
      toast.bad('القيد محتاج طرفين على الأقل', { sub: 'سطر مدين وسطر دائن' })
      return
    }
    if (bothSides) {
      toast.bad('في سطر فيه مدين ودائن مع بعض', { sub: 'السطر إما مدين أو دائن' })
      return
    }
    if (post && !balanced) {
      toast.bad('القيد مش متوازن', {
        sub: `الفرق ${fmtMoney(Math.abs(totals.diff))} ر.س — ${totals.diff > 0 ? 'الدائن ناقص' : 'المدين ناقص'}`,
      })
      return
    }
    /* API: POST /accounting/journal → { date, memo, ref, lines, post } */
    toast.ok(post ? 'القيد اترحّل' : 'القيد اتحفظ كمسودة', {
      sub: post ? 'مينفعش يتعدّل — التصحيح بقيد عكسي' : 'تقدر تعدّله قبل الترحيل',
    })
    onClose()
  }

  return (
    <Modal title="قيد يومية جديد"
      sub="التسويات اللي مالهاش مستند — الباقي بيتقيّد لوحده من المستندات"
      onClose={onClose} size="xl"
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--sec" onClick={() => save(false)}>حفظ كمسودة</button>
          <button className="btn btn--primary" onClick={() => save(true)}>حفظ وترحيل</button>
        </>
      }>

      <div className="frow frow--3">
        <label className="fld">
          <span className="fld__l">رقم القيد</span>
          <input className="fld__i num" value="JE-000032" readOnly />
          <em className="fld__h">مسلسل تلقائي — القيود هي المسلسل الوحيد في السيستم</em>
        </label>
        <DateField label="التاريخ" value={date} onChange={setDate} />
        <label className="fld">
          <span className="fld__l">المرجع <em>اختياري</em></span>
          <input className="fld__i" value={ref} placeholder="محضر جرد · مسير رواتب…"
            onChange={(e) => setRef(e.target.value)} />
        </label>
      </div>

      <label className="fld" style={{ marginTop: 12 }}>
        <span className="fld__l">البيان</span>
        <input className={`fld__i${touched && !memo.trim() ? ' is-bad' : ''}`} value={memo}
          placeholder="القيد ده عن إيه — هيظهر في الدفتر وفي كشوف الحسابات"
          onChange={(e) => setMemo(e.target.value)} />
      </label>

      {/* ---------- البنود ---------- */}
      <div className="fld" style={{ marginTop: 16 }}>
        <span className="fld__l">أطراف القيد</span>
        <div className="jlines">
          <div className="jlines__head">
            <span>الحساب</span>
            <span>مركز التكلفة</span>
            <span className="n">مدين</span>
            <span className="n">دائن</span>
            <span />
          </div>

          {lines.map((l) => {
            const both = Number(l.dr) > 0 && Number(l.cr) > 0
            return (
              <div key={l.key} className={`jlines__row${both ? ' is-bad' : ''}`}>
                <Select className="fld__i" value={l.acc}
                  onChange={(e) => set(l.key, { acc: e.target.value })}>
                  <option value="">اختر الحساب…</option>
                  {DATA.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.id} — {DATA.accLabel(a)}</option>
                  ))}
                </Select>

                <Select className="fld__i" value={l.cc}
                  onChange={(e) => set(l.key, { cc: e.target.value })}>
                  <option value="">—</option>
                  {DATA.costCenters.map((c) => (
                    <option key={c.id} value={c.id}>{c.ar}</option>
                  ))}
                </Select>

                <input className="fld__i num" inputMode="decimal" value={l.dr} placeholder="0.00"
                  onChange={(e) => set(l.key, { dr: e.target.value, cr: '' })} />
                <input className="fld__i num" inputMode="decimal" value={l.cr} placeholder="0.00"
                  onChange={(e) => set(l.key, { cr: e.target.value, dr: '' })} />

                <button className="lines__x" aria-label="شيل السطر"
                  onClick={() => del(l.key)} disabled={lines.length <= 2}>
                  <Ico.close size={15} />
                </button>
              </div>
            )
          })}

          <div className="jlines__add">
            <button className="gbtn2" onClick={add}>
              <Ico.plus size={14} />سطر جديد
            </button>
          </div>
        </div>
      </div>

      {/* ---------- الميزان ---------- */}
      <div className={`jbal${balanced ? ' is-ok' : ''}`}>
        <span className="jbal__p"><em>مجموع المدين</em><b>{fmtMoney(totals.dr)}</b></span>
        <span className="jbal__p"><em>مجموع الدائن</em><b>{fmtMoney(totals.cr)}</b></span>
        <span className={`chkb${balanced ? ' is-ok' : ' is-bad'}`}>
          {balanced ? <Ico.check size={14} /> : <Ico.close size={14} />}
          {balanced
            ? 'متوازن'
            : totals.dr === 0 && totals.cr === 0
              ? 'لسه ما اتكتبش'
              : `فرق ${fmtMoney(Math.abs(totals.diff))} — ${totals.diff > 0 ? 'الدائن ناقص' : 'المدين ناقص'}`}
        </span>
      </div>

      <p className="fnote fnote--quiet">
        القيد المُرحَّل <b>مينفعش يتعدّل ولا يتحذف</b> — التصحيح بيبقى بقيد عكسي،
        والرقم بيفضل في السجل للأبد.
      </p>
    </Modal>
  )
}
