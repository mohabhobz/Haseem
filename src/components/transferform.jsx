import { useState, useMemo } from 'react'
import { Modal } from './modal.jsx'
import { DateField } from './datefield.jsx'
import { fmtMoney, amountInWords } from '../lib/format.js'
import * as R from '../lib/reports.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ---------- تحويل جديد ---------- */
export function TransferForm({ onClose }) {
  const [from, setFrom] = useState('1030')
  const [to, setTo] = useState('1020')
  const [amount, setAmount] = useState('')
  const [fee, setFee] = useState('')
  const [date, setDate] = useState(DATA.TODAY)
  const [ref, setRef] = useState('')
  const [touched, setTouched] = useState(false)

  const n = Number(amount) || 0
  const f = Number(fee) || 0
  const bal = useMemo(() => R.balanceOf(from, DATA.TODAY), [from])
  const same = from === to
  const over = n + f > bal
  const bad = n <= 0 || same

  const fromA = DATA.cashAccountOf(from)
  const toA = DATA.cashAccountOf(to)
  const fx = fromA && toA && fromA.cur !== toA.cur

  const save = async () => {
    setTouched(true)
    if (bad) return
    /* API: POST /cash/transfers → { from, to, amount, fee, date, ref } */
    const ok = await ACT.postTransfer(
      { no: 'TRF-جديد', amount: n, fee: f },
      DATA.accName(from), DATA.accName(to), fmtMoney(n + f))
    if (ok) onClose()
  }

  return (
    <Modal title="تحويل بين الحسابات" sub="الفلوس بتغيّر مكانها — مش بتخرج من المنشأة"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>حفظ وترحيل</button>
        </>
      }>
      <div className="frow frow--2">
        <label className="fld">
          <span className="fld__l">من حساب</span>
          <select className={`fld__i${touched && same ? ' is-bad' : ''}`} value={from}
            onChange={(e) => setFrom(e.target.value)}>
            {DATA.cashAccounts.map((a) => <option key={a.acc} value={a.acc}>{a.ar}</option>)}
          </select>
          <em className={`fld__h${over ? ' is-warn' : ''}`}>
            الرصيد الحالي <b className="num">{fmtMoney(bal)}</b>
            {over && ' — المبلغ والرسوم أكبر من الرصيد'}
          </em>
        </label>

        <label className="fld">
          <span className="fld__l">إلى حساب</span>
          <select className={`fld__i${touched && same ? ' is-bad' : ''}`} value={to}
            onChange={(e) => setTo(e.target.value)}>
            {DATA.cashAccounts.map((a) => <option key={a.acc} value={a.acc}>{a.ar}</option>)}
          </select>
          {same
            ? <em className="fld__e">مينفعش تحوّل لنفس الحساب</em>
            : <em className="fld__h">
                {DATA.CASH_KIND_AR[toA?.kind]}
                {toA?.settleDays ? ` · بيتسوّى بعد ${toA.settleDays} يوم` : ''}
              </em>}
        </label>
      </div>

      <div className="frow frow--2" style={{ marginTop: 12 }}>
        <label className="fld">
          <span className="fld__l">المبلغ المحوّل</span>
          <input className={`fld__i num${touched && n <= 0 ? ' is-bad' : ''}`} inputMode="decimal"
            value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
          {n > 0
            ? <em className="fld__h words">{amountInWords(n)}</em>
            : touched && <em className="fld__e">المبلغ لازم يكون أكبر من صفر</em>}
        </label>

        <label className="fld">
          <span className="fld__l">رسوم البنك <em>اختياري</em></span>
          <input className="fld__i num" inputMode="decimal" value={fee}
            placeholder="0.00" onChange={(e) => setFee(e.target.value)} />
          <em className="fld__h">بتتقيّد مصروف «رسوم بنكية» — مش بتتخصم من المحوّل</em>
        </label>
      </div>

      {fx && (
        <label className="fld" style={{ marginTop: 12 }}>
          <span className="fld__l">سعر الصرف</span>
          <input className="fld__i num" inputMode="decimal" defaultValue="1.00" />
          <em className="fld__h">
            الحسابين بعملتين مختلفتين ({fromA.cur} ← {toA.cur}) — السعر قابل للتعديل
          </em>
        </label>
      )}

      <div className="frow frow--2" style={{ marginTop: 12 }}>
        <DateField label="التاريخ" value={date} onChange={setDate} />
        <label className="fld">
          <span className="fld__l">البيان</span>
          <input className="fld__i" value={ref} placeholder="تسوية شبكة · تغذية خزنة…"
            onChange={(e) => setRef(e.target.value)} />
        </label>
      </div>

      <p className="fnote fnote--quiet">
        هيخرج من <b>{DATA.accName(from)}</b> مبلغ{' '}
        <b>{fmtMoney(n + f)}</b> ر.س، ويدخل <b>{DATA.accName(to)}</b> مبلغ{' '}
        <b>{fmtMoney(n)}</b> ر.س{f > 0 ? `، والفرق ${fmtMoney(f)} رسوم بنكية.` : '.'}
      </p>
    </Modal>
  )
}
