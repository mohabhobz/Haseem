import { useState } from 'react'
import { Modal } from './modal.jsx'
import { toast } from './feedback.jsx'
import * as DATA from '../data/mock.js'
import { Select } from './selectfield.jsx'

/* ============================================================
   إنشاء حساب نقدي أو بنكي.

   الفورم ده موجود عند العميل، وفيه قسم مهم اسمه **«بيانات البنك
   في الفاتورة»** بملاحظة صح تمامًا: البيانات بتتحفظ **كلقطة**
   جوّه الفاتورة، فلو غيّرت الآيبان بعدين الفواتير القديمة بتفضل
   بالبيانات اللي كانت وقتها. سبناها زي ما هي لأنها قاعدة صح.

   اللي زوّدناه:
   • **الحقول بتتغيّر مع نوع الحساب** — الخزنة مالهاش آيبان،
     وبوابة الدفع مالهاش فرع بنكي. عنده نفس الحقول بتظهر لكل
     الأنواع فتملا بيانات بنك لخزنة نقدية.
   • **مدة التسوية** لنقاط البيع وبوابات الدفع — الفرق بين
     «عندي ١٤ ألف» و«عندي ١٤ ألف بعد يومين».
   • **الآيبان بيتفحص وإنت بتكتب** — سعودي: `SA` + ٢٢ رقم.
   ============================================================ */

const KINDS = [
  { id: 'bank',    ar: 'حساب بنكي',  note: 'حساب في بنك — ليه آيبان ورقم حساب' },
  { id: 'cash',    ar: 'خزنة',       note: 'كاش في الفرع — ليها أمين صندوق' },
  { id: 'pos',     ar: 'نقاط بيع',   note: 'شبكة — الفلوس بتتسوّى بعد أيام' },
  { id: 'gateway', ar: 'بوابة دفع',  note: 'مدى وأبل باي — تسوية دورية' },
]

const ibanOk = (v) => /^SA\d{22}$/.test(v.replace(/\s/g, '').toUpperCase())

export function AccountForm({ onClose }) {
  const [kind, setKind] = useState('bank')
  const [name, setName] = useState('')
  const [cur, setCur] = useState('SAR')
  const [bank, setBank] = useState('BK-01')
  const [holder, setHolder] = useState(DATA.org?.nameAr || '')
  const [iban, setIban] = useState('')
  const [accNo, setAccNo] = useState('')
  const [branch, setBranch] = useState('BR-01')
  const [allBranches, setAllBranches] = useState(true)
  const [keeper, setKeeper] = useState('')
  const [settle, setSettle] = useState('1')
  const [touched, setTouched] = useState(false)

  const isBank = kind === 'bank'
  const isCash = kind === 'cash'
  const settles = kind === 'pos' || kind === 'gateway'

  const ibanBad = isBank && iban.trim() && !ibanOk(iban)
  const bad = !name.trim() || ibanBad

  const save = () => {
    setTouched(true)
    if (bad) {
      toast.bad('الحساب ناقص', { sub: ibanBad ? 'الآيبان مش مظبوط' : 'اكتب اسم الحساب' })
      return
    }
    /* API: POST /cash/accounts → { kind, name, cur, bank, iban, accNo, branch, settle } */
    toast.ok(`${name} اتضاف`, { sub: 'الحساب جاهز يستقبل حركة — رصيده يبدأ من صفر' })
    onClose()
  }

  return (
    <Modal title="حساب جديد" sub="حساب نقدي أو بنكي بيتحرّك عليه فلوس المنشأة"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>إنشاء الحساب</button>
        </>
      }>

      {/* النوع بيحدد باقي الفورم */}
      <div className="fld">
        <span className="fld__l">نوع الحساب</span>
        <div className="pick">
          {KINDS.map((k) => (
            <button key={k.id} className={`pick__o${kind === k.id ? ' is-on' : ''}`}
              onClick={() => setKind(k.id)} aria-pressed={kind === k.id}>
              <b>{k.ar}</b>
              <em>{k.note}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="frow frow--2" style={{ marginTop: 14 }}>
        <label className="fld">
          <span className="fld__l">اسم الحساب</span>
          <input className={`fld__i${touched && !name.trim() ? ' is-bad' : ''}`} value={name}
            placeholder={isCash ? 'الصندوق الرئيسي' : 'الحساب البنكي الرئيسي'}
            onChange={(e) => setName(e.target.value)} />
          {touched && !name.trim() && <em className="fld__e">الاسم ده اللي هيظهر في كل الشاشات</em>}
        </label>

        <label className="fld">
          <span className="fld__l">العملة</span>
          <Select className="fld__i" value={cur} onChange={(e) => setCur(e.target.value)}>
            <option value="SAR">SAR — ريال سعودي</option>
            <option value="USD">USD — دولار أمريكي</option>
            <option value="AED">AED — درهم إماراتي</option>
            <option value="EUR">EUR — يورو</option>
          </Select>
          {cur !== 'SAR' && (
            <em className="fld__h">التحويل من وإلى الحساب ده هياخد سعر صرف</em>
          )}
        </label>
      </div>

      {/* الفرع */}
      <div className="fld" style={{ marginTop: 14 }}>
        <span className="fld__l">الفرع</span>
        <label className="chk">
          <input type="checkbox" checked={allBranches}
            onChange={(e) => setAllBranches(e.target.checked)} />
          <span>متاح في جميع الفروع</span>
        </label>
        <em className="fld__h">
          {allBranches
            ? 'الحساب هيبان لكل الفروع — الحالية والجديدة'
            : 'الحساب هيبان في الفرع المختار بس'}
        </em>
        {!allBranches && (
          <Select className="fld__i" style={{ marginTop: 8 }} value={branch}
            onChange={(e) => setBranch(e.target.value)}>
            {DATA.branches.map((b) => (
              <option key={b.id} value={b.id}>{b.code} — {b.ar}</option>
            ))}
          </Select>
        )}
      </div>

      {/* بيانات البنك — للحساب البنكي بس */}
      {isBank && (
        <section className="fsub">
          <h3 className="fsub__t">
            بيانات البنك في الفاتورة
            <em>بتتحفظ كلقطة جوّه الفاتورة — لو غيّرتها بعدين، الفواتير القديمة بتفضل بالقديم</em>
          </h3>
          <div className="frow frow--2">
            <label className="fld">
              <span className="fld__l">البنك</span>
              <Select className="fld__i" value={bank} onChange={(e) => setBank(e.target.value)}>
                {DATA.banks.map((b) => <option key={b.id} value={b.id}>{b.ar}</option>)}
              </Select>
            </label>
            <label className="fld">
              <span className="fld__l">اسم صاحب الحساب</span>
              <input className="fld__i" value={holder} onChange={(e) => setHolder(e.target.value)} />
            </label>
          </div>
          <div className="frow frow--2" style={{ marginTop: 12 }}>
            <label className="fld">
              <span className="fld__l">رقم الآيبان</span>
              <input className={`fld__i ltr num${ibanBad && touched ? ' is-bad' : ''}`} value={iban}
                placeholder="SA00 0000 0000 0000 0000 0000"
                onChange={(e) => setIban(e.target.value)} />
              {ibanBad
                ? <em className="fld__e">آيبان سعودي = SA + ٢٢ رقم</em>
                : <em className="fld__h">آيبان سعودي بس — بنخزّنه من غير مسافات</em>}
            </label>
            <label className="fld">
              <span className="fld__l">رقم الحساب <em>اختياري</em></span>
              <input className="fld__i num" value={accNo} onChange={(e) => setAccNo(e.target.value)} />
            </label>
          </div>
        </section>
      )}

      {/* الخزنة */}
      {isCash && (
        <label className="fld" style={{ marginTop: 14 }}>
          <span className="fld__l">أمين الصندوق <em>اختياري</em></span>
          <input className="fld__i" value={keeper} placeholder="اسم المسؤول عن الخزنة"
            onChange={(e) => setKeeper(e.target.value)} />
          <em className="fld__h">بيظهر في شاشة الحساب وفي سندات الصرف النقدي</em>
        </label>
      )}

      {/* التسوية */}
      {settles && (
        <label className="fld" style={{ marginTop: 14 }}>
          <span className="fld__l">مدة التسوية</span>
          <Select className="fld__i" value={settle} onChange={(e) => setSettle(e.target.value)}>
            <option value="0">نفس اليوم</option>
            <option value="1">يوم عمل</option>
            <option value="2">يومين عمل</option>
            <option value="3">٣ أيام عمل</option>
          </Select>
          <em className="fld__h">
            الفلوس بتوصل الحساب البنكي بعد المدة دي — عشان «المتاح فورًا» يبان صح
          </em>
        </label>
      )}

      <p className="fnote fnote--quiet">
        الحساب بيبدأ من <b>رصيد صفر</b>. لو ليه رصيد افتتاحي، بيتسجّل بقيد يومية
        عشان الميزانية تفضل متوازنة.
      </p>
    </Modal>
  )
}
