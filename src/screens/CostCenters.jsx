import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote, SummaryStrip } from '../components/layout.jsx'
import { Button } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { Modal } from '../components/modal.jsx'
import { toast } from '../components/feedback.jsx'
import { SAR } from '../components/data.jsx'
import { DateRange, periodRange } from '../components/pagefilter.jsx'
import { fmtDate, fmtMoney, TODAY } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   مراكز التكلفة.

   عند العميل دي **شاشة من غير تقرير**: تقدر تعمل مركز تكلفة،
   وتحطه على مستند، ومفيش مكان في السيستم كله بيقول اتصرف عليه
   كام. يعني الحقل موجود والفايدة منه لأ.

   هنا المركز بيتحسب من القيود نفسها. وأهم حاجة في الشاشة مش
   الأرقام — هي **نسبة التغطية**: كام في المية من المصروف متوزّع
   على مراكز أصلًا.

   لو ٤٧٪ من المصروف «غير موزّع»، فالتقرير اللي بيقارن المراكز
   ببعض بيقارن نص الصورة. المستخدم لازم يشوف ده قبل ما يبني عليه
   قرار — عشان كده «غير موزّع» سطر كامل في القايمة، مش محذوف ولا
   موزّع بالتساوي.
   ============================================================ */

export default function CostCenters() {
  const nav = useNavigate()
  const [period, setPeriod] = useState({ id: 'y' })
  const [open, setOpen] = useState(null)
  const [form, setForm] = useState(false)

  const range = periodRange(period, TODAY) || []
  const from = range[0]?.toISOString().slice(0, 10)
  const to = range[1]?.toISOString().slice(0, 10)

  const rep = useMemo(() => R.costCenterReport(from, to), [from, to])
  const max = Math.max(1, ...rep.rows.map((r) => Math.abs(r.amount)))

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="مراكز التكلفة"
          sub={<>المصروف موزّع على الوحدات اللي صرفته<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <DateRange value={period} onChange={setPeriod} today={TODAY} />
          <Button label="مركز جديد" variant="primary" icon="＋"
            onClick={() => setForm(true)} />
        </div>
      </div>

      <SummaryStrip
        label="المصروف في الفترة"
        value={rep.total}
        note={`موزّع على ${rep.rows.filter((r) => !r.none).length} مراكز`}
        items={[
          { label: 'غير موزّع على مركز', value: rep.unallocated, alert: rep.unallocated > 0 },
          { label: 'نسبة التغطية', value: `${rep.coverage}٪`, money: false,
            alert: rep.coverage < 80 },
        ]}
      />

      {rep.coverage < 80 && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.close size={14} />
          <b>{(100 - rep.coverage).toFixed(0)}٪</b> من المصروف مش متوزّع على أي مركز —
          يعني المقارنة تحت ناقصة. أغلبه جاي من بنود فواتير المشتريات اللي ما
          اتحطش عليها مركز وقت التسجيل.
        </p>
      )}

      <section className="sect" data-component="CostCenters">
        <header className="sect__h">
          <h2 className="sect__t">التوزيع<span className="sect__n">{rep.rows.length}</span></h2>
        </header>

        {rep.rows.length === 0 ? (
          <div className="sect__empty">
            <b>مفيش مصروف في الفترة دي</b>
            <span>غيّر الفترة من فوق.</span>
          </div>
        ) : (
          <ul className="cclist">
            {rep.rows.map((c) => {
              const pct = rep.total > 0 ? (c.amount / rep.total) * 100 : 0
              const on = open === (c.id || 'none')
              return (
                <li key={c.id || 'none'} className={c.none ? 'is-none' : ''}>
                  <button className="cclist__row" onClick={() => setOpen(on ? null : (c.id || 'none'))}
                    aria-expanded={on}>
                    <span className="cclist__n">
                      <b>{c.ar}</b>
                      <em>{c.code ? `${c.code} · ` : ''}{c.n} حركة{c.note ? ` · ${c.note}` : ''}</em>
                    </span>
                    <span className="cclist__b" aria-hidden="true">
                      <i style={{ width: `${(Math.abs(c.amount) / max) * 100}%` }} />
                    </span>
                    <span className="cclist__p num">{pct.toFixed(0)}٪</span>
                    <span className="cclist__v"><SAR v={c.amount} dec /></span>
                    <Ico.chevron size={15} className={`cclist__ch${on ? ' is-on' : ''}`} />
                  </button>

                  {on && (
                    <div className="tablewrap cclist__drill">
                      <table className="dt dt--flat">
                        <thead>
                          <tr>
                            <th style={{ width: '112px' }}>التاريخ</th>
                            <th>البيان</th>
                            <th style={{ width: '196px' }}>الحساب</th>
                            <th style={{ width: '140px' }}>المستند</th>
                            <th style={{ width: '130px' }} className="n">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.rows.map((l, i) => (
                            <tr key={`${l.no}-${i}`}>
                              <td>{fmtDate(l.date)}</td>
                              <td><span className="itcell"><b>{l.memo}</b>
                                {l.party && <em>{l.party}</em>}</span></td>
                              <td className="hint">{DATA.accName(l.acc)}</td>
                              <td>
                                {l.go
                                  ? <button className="cell-doc cell-doc--link num"
                                      onClick={() => nav(l.go)}>{l.no}</button>
                                  : <span className="num hint">{l.no}</span>}
                              </td>
                              <td className="n"><SAR v={l.dr - l.cr} dec /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <p className="fnote fnote--quiet">
          الأرقام دي مجموعها <b>{fmtMoney(rep.total)}</b> ر.س — نفس مصروفات الفترة
          في قائمة الدخل، لأن الاتنين بيقروا من نفس القيود.
        </p>
      </section>

      {form && <CostCenterForm onClose={() => setForm(false)} />}
    </AppShell>
  )
}

/* ---------- مركز تكلفة جديد ---------- */
function CostCenterForm({ onClose }) {
  const [ar, setAr] = useState('')
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const bad = !ar.trim()

  const save = () => {
    setTouched(true)
    if (bad) { toast.bad('اكتب اسم المركز'); return }
    /* API: POST /accounting/cost-centers → { ar, code, note } */
    toast.ok(`${ar} اتضاف`, { sub: 'دلوقتي يقدر يستقبل مصروفات من المستندات' })
    onClose()
  }

  return (
    <Modal title="مركز تكلفة جديد"
      sub="الوحدة اللي بيتحمّل عليها المصروف — إدارة أو قسم أو نشاط"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>إنشاء المركز</button>
        </>
      }>
      <div className="frow frow--2">
        <label className="fld">
          <span className="fld__l">اسم المركز</span>
          <input className={`fld__i${touched && bad ? ' is-bad' : ''}`} value={ar}
            placeholder="التشغيل والمستودع" onChange={(e) => setAr(e.target.value)} />
          {touched && bad && <em className="fld__e">الاسم ده اللي هيظهر في التقرير</em>}
        </label>
        <label className="fld">
          <span className="fld__l">الكود <em>اختياري</em></span>
          <input className="fld__i ltr" value={code} placeholder="OPS"
            onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </label>
      </div>
      <label className="fld" style={{ marginTop: 12 }}>
        <span className="fld__l">الوصف <em>اختياري</em></span>
        <input className="fld__i" value={note} placeholder="إيه اللي بيتحمّل على المركز ده"
          onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="fnote fnote--quiet">
        المركز بيبقى ليه رقم لما <b>توسم المستندات بيه</b> — من حقل «مركز التكلفة»
        في المصروف أو في بند القيد.
      </p>
    </Modal>
  )
}
