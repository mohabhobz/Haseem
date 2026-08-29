import { useState, useMemo } from 'react'
import { Modal } from './modal.jsx'
import { DateField } from './datefield.jsx'
import { toast } from './feedback.jsx'
import { fmtMoney, amountInWords } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   فورم سند القبض أو الصرف.

   نفس الفورم بمفتاح واحد، لأن الفرق بين السندين **اتجاه الفلوس
   بس**: القبض بيدخّل والصرف بيطلّع. كل حقل تاني واحد.

   تلات قرارات في الفورم ده:

   ١) **الطرف تلات أنواع** — عميل أو مورد أو جهة تانية بالاسم.
      في سيستم العميل الطرف نص حر، فتقدر تكتب اسم عميل موجود
      بإملاء مختلف والسند ما يوصلش لكشفه. هنا لو اخترت عميل،
      السند بيتقيّد على حسابه فعلًا.

   ٢) **الحساب المقابل بيتفلتر حسب الطرف** — عميل ← ذمم مدينة،
      مورد ← ذمم دائنة، جهة تانية ← مصروف أو إيراد. من غير ده
      المستخدم بيشوف شجرة الحسابات كلها ويقدر يقيّد قبض على
      رأس المال (وده بيحصل عنده فعلًا في فورم المصروف).

   ٣) **المبلغ كتابةً بيتكتب لوحده** وهو بيكتب الرقم. ده مش
      تزويق — السند اللي فيه الرقم بس ينفع يتزوّد عليه خانة.
   ============================================================ */

const WAYS = ['تحويل بنكي', 'نقدًا', 'شيك', 'شبكة']

/* الحساب المقابل حسب نوع الطرف — مش الشجرة كلها */
function accountsFor(kind, party) {
  if (party === 'customer') return DATA.accounts.filter((a) => a.id === '1200')
  if (party === 'supplier') return DATA.accounts.filter((a) => a.id === '2000')
  return kind === 'receipts'
    ? DATA.accounts.filter((a) => a.type === 'revenue' && a.kind !== 'contra')
    : DATA.accounts.filter((a) => ['expense', 'cogs'].includes(a.type))
}

export function VoucherForm({ kind = 'receipts', onClose }) {
  const rec = kind === 'receipts'
  const [pk, setPk] = useState(rec ? 'customer' : 'supplier')
  const [pid, setPid] = useState('')
  const [pname, setPname] = useState('')
  const [acc, setAcc] = useState('1020')
  const [to, setTo] = useState(rec ? '1200' : '2000')
  const [amount, setAmount] = useState('')
  const [way, setWay] = useState('تحويل بنكي')
  const [date, setDate] = useState(DATA.TODAY)
  const [ref, setRef] = useState('')
  const [memo, setMemo] = useState('')
  const [touched, setTouched] = useState(false)

  const opts = useMemo(() => accountsFor(kind, pk), [kind, pk])
  const n = Number(amount) || 0
  /* رصيد الحساب المختار — بيتحسب من الدفتر، عشان الصرف من حساب
     فاضي يبان قبل الحفظ مش بعده */
  const bal = useMemo(() => R.balanceOf(acc, DATA.TODAY), [acc])

  /* لو الطرف اتغيّر، الحساب المقابل لازم يتغيّر معاه */
  const pickParty = (k) => {
    setPk(k); setPid(''); setPname('')
    setTo(k === 'customer' ? '1200' : k === 'supplier' ? '2000' : accountsFor(kind, k)[0]?.id || '')
  }

  const partyOk = pk === 'other' ? pname.trim().length > 1 : !!pid
  const bad = n <= 0 || !partyOk || !acc || !to

  const save = async (post) => {
    setTouched(true)
    if (bad) {
      toast.bad('السند ناقص', { sub: 'راجع الحقول اللي عليها علامة حمرا' })
      return
    }
    /* API: POST /cash/vouchers  → { kind, party, acc, to, amount, way, date, ref, memo, post } */
    toast.ok(post ? 'السند اتحفظ واترحّل' : 'السند اتحفظ مسودة', {
      sub: `${fmtMoney(n)} ر.س · ${pk === 'other' ? pname : DATA.partyAr({ k: pk, id: pid })}`,
    })
    onClose()
  }

  const err = (cond) => (touched && cond ? 'fld__i is-bad' : 'fld__i')

  return (
    <Modal
      title={rec ? 'سند قبض جديد' : 'سند صرف جديد'}
      sub={rec ? 'كل ريال داخل لازم يكون ليه سند' : 'كل ريال خارج لازم يكون ليه سند'}
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--sec" onClick={() => save(false)}>حفظ مسودة</button>
          <button className="btn btn--primary" onClick={() => save(true)}>حفظ وترحيل</button>
        </>
      }>

      {/* ---------- الطرف ---------- */}
      <div className="fld">
        <span className="fld__l">{rec ? 'المستلَم منه' : 'المصروف له'}</span>
        <div className="segs" role="group" aria-label="نوع الطرف">
          <button className={pk === 'customer' ? 'on' : ''}
            onClick={() => pickParty('customer')}>عميل</button>
          <button className={pk === 'supplier' ? 'on' : ''}
            onClick={() => pickParty('supplier')}>مورد</button>
          <button className={pk === 'other' ? 'on' : ''}
            onClick={() => pickParty('other')}>جهة تانية</button>
        </div>
      </div>

      <div className="frow frow--2" style={{ marginTop: 12 }}>
        <label className="fld">
          <span className="fld__l">
            {pk === 'other' ? 'اسم الجهة' : pk === 'customer' ? 'العميل' : 'المورد'}
          </span>
          {pk === 'other' ? (
            <input className={err(!pname.trim())} value={pname} placeholder="اسم الجهة زي ما هيتكتب في السند"
              onChange={(e) => setPname(e.target.value)} />
          ) : (
            <select className={err(!pid)} value={pid} onChange={(e) => setPid(e.target.value)}>
              <option value="">اختر…</option>
              {(pk === 'customer' ? DATA.customers : DATA.suppliers)
                .map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
            </select>
          )}
          {touched && !partyOk && <em className="fld__e">لازم تحدّد الطرف — السند من غير طرف ما ينفعش</em>}
        </label>

        <label className="fld">
          <span className="fld__l">{rec ? 'الحساب اللي بيتقفل' : 'الحساب اللي بياخد المبلغ'}</span>
          <select className="fld__i" value={to} onChange={(e) => setTo(e.target.value)}>
            {opts.map((a) => <option key={a.id} value={a.id}>{DATA.accName(a.id)}</option>)}
          </select>
          <em className="fld__h">
            {pk === 'customer' ? 'القبض من عميل بيقلّل ذمته'
              : pk === 'supplier' ? 'الصرف لمورد بيقلّل المستحق له'
              : rec ? 'الحسابات المعروضة إيرادات بس' : 'الحسابات المعروضة مصروفات بس'}
          </em>
        </label>
      </div>

      {/* ---------- المبلغ والحساب المالي ---------- */}
      <div className="frow frow--2" style={{ marginTop: 12 }}>
        <label className="fld">
          <span className="fld__l">المبلغ</span>
          <input className={`${err(n <= 0)} num`} inputMode="decimal" value={amount}
            placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
          {n > 0
            ? <em className="fld__h words">{amountInWords(n)}</em>
            : touched && <em className="fld__e">المبلغ لازم يكون أكبر من صفر</em>}
        </label>

        <label className="fld">
          <span className="fld__l">{rec ? 'الفلوس داخلة فين' : 'الفلوس خارجة من فين'}</span>
          <select className="fld__i" value={acc} onChange={(e) => setAcc(e.target.value)}>
            {DATA.cashAccounts.map((a) => (
              <option key={a.acc} value={a.acc}>{a.ar}</option>
            ))}
          </select>
          <em className={`fld__h${!rec && n > bal ? ' is-warn' : ''}`}>
            {DATA.CASH_KIND_AR[DATA.cashAccountOf(acc)?.kind]} · الرصيد الحالي{' '}
            <b className="num">{fmtMoney(bal)}</b>
            {!rec && n > bal && ' — المبلغ أكبر من الرصيد'}
          </em>
        </label>
      </div>

      <div className="frow frow--2" style={{ marginTop: 12 }}>
        <label className="fld">
          <span className="fld__l">طريقة الدفع</span>
          <select className="fld__i" value={way} onChange={(e) => setWay(e.target.value)}>
            {WAYS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <DateField label="التاريخ" value={date} onChange={setDate} />
      </div>

      <div className="frow frow--2" style={{ marginTop: 12 }}>
        <label className="fld">
          <span className="fld__l">المرجع <em>اختياري</em></span>
          <input className="fld__i" value={ref} placeholder="رقم الحوالة أو الشيك"
            onChange={(e) => setRef(e.target.value)} />
        </label>
        <label className="fld">
          <span className="fld__l">البيان</span>
          <input className="fld__i" value={memo} placeholder="السند ده عن إيه"
            onChange={(e) => setMemo(e.target.value)} />
        </label>
      </div>

      <p className="fnote fnote--quiet">
        <b>حفظ مسودة</b> بيسجّل السند من غير ما يقيّد حاجة.
        {' '}<b>حفظ وترحيل</b> بيكتب القيد في الدفتر على طول، وبعدها التعديل
        بيبقى بسند عكسي بس.
      </p>
    </Modal>
  )
}
