import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { DateField } from '../components/datefield.jsx'
import { SAR } from '../components/data.jsx'
import { Modal } from '../components/modal.jsx'
import { Attachments } from '../components/attachments.jsx'
import { PrintPreview } from '../components/printpreview.jsx'
import { fmtDate, fmtMoney, daysFrom, STATUS } from '../lib/format.js'
import { useDoc } from '../lib/store.js'
import * as ACT from '../lib/actions.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   شاشة فاتورة المشتريات.

   عند العميل الشاشة دي اسمها **«تعديل فاتورة مشتريات»** وهي عرض
   للقراءة، وعنوان التاب «فاتورة شراء جديدة» على فاتورة عمرها
   شهور. يعني الشاشة مش عارفة هي إيه.

   هنا هي حاجة واحدة واضحة: **مستند مقفول بيقول قصته**.
   وفوق كده بيجاوب السؤال اللي عنده مالوش إجابة على الشاشة:
   «الفاتورة دي اندفع منها كام، وامتى، ومن أنهي حساب؟» — الدفعات
   بقت في الرَّيل، وكل دفعة بيتعكس منها.
   ============================================================ */

export default function Bill() {
  const { no } = useParams()
  const nav = useNavigate()
  const b = useDoc('bills', no)
  const [pay, setPay] = useState(false)
  const [preview, setPreview] = useState(false)

  if (!b) {
    return (
      <AppShell>
        <div className="sect__empty">
          <b>الفاتورة دي مش موجودة</b>
          <span>يمكن الرقم يكون اتغيّر. ارجع للقائمة وجرّب تاني.</span>
        </div>
      </AppShell>
    )
  }

  const net   = DATA.docNet(b)
  const vat   = DATA.docVat(b)
  const total = DATA.docTotal(b)
  const paid  = b.paid || 0
  const rest  = +(total - paid).toFixed(2)
  const late  = DATA.isLate(b)
  const dueIn = b.due ? daysFrom(b.due) : null
  const pays  = DATA.supPaymentsOf(b.s.id).filter((p) => p.bill === b.no)
  const st    = STATUS[b.status]

  const acts = [
    b.status === 'draft'  && { id: 'post',  label: 'ترحيل الفاتورة', Ic: Ico.check },
    b.status === 'draft'  && { id: 'edit',  label: 'تعديل الفاتورة', Ic: Ico.edit },
    b.status === 'posted' && rest > 0.009 && { id: 'pay', label: 'تسجيل دفعة', Ic: Ico.wallet },
    { id: 'pdf',   label: 'تحميل PDF', Ic: Ico.download },
    { id: 'print', label: 'معاينة وطباعة', Ic: Ico.print },
    b.status === 'posted' && { id: 'cn', label: 'إشعار دائن من المورد', Ic: Ico.retry },
    b.status === 'posted' && { id: 'dn', label: 'إشعار مدين من المورد', Ic: Ico.retry },
    b.status === 'posted' && { id: 'cancel', label: 'إلغاء الفاتورة', Ic: Ico.ban, tone: 'crit' },
  ].filter(Boolean)

  const run = (id) => {
    switch (id) {
      case 'post':   return ACT.postBill(b, fmtMoney(total))
      case 'edit':   return nav(`/purchases/bills/${b.no}/edit`)
      case 'pay':    return setPay(true)
      case 'pdf':    return ACT.downloadPdf('bills', b)
      case 'print':  return setPreview(true)
      case 'cn':     return ACT.newSupplierNote(b, 'credit', nav)
      case 'dn':     return ACT.newSupplierNote(b, 'debit', nav)
      case 'cancel': return ACT.cancelBill(b)
      default: return undefined
    }
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/purchases/bills')}>
          <Ico.back size={16} />فواتير المشتريات
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no num">{b.no}</h1>
            <span className="doc__tags">
              <span className={`st st--${st?.tone || 'neutral'}`}>{st?.label}</span>
              {b.status === 'posted' && rest <= 0.009 &&
                <span className="st st--positive">مدفوعة بالكامل</span>}
              {late && <span className="st st--attention">متأخرة {Math.abs(dueIn)} يوم</span>}
            </span>
            <span className="dochead__sub">
              {b.s.ar}
              {b.ref && <> · مستند المورد <span className="num">{b.ref}</span></>}
            </span>
          </div>
          <div className="dochead__act">
            {b.status === 'draft' ? (
              <button className="btn btn--primary" onClick={() => run('post')}>
                <Ico.check size={16} />ترحيل الفاتورة
              </button>
            ) : rest > 0.009 ? (
              <button className="btn btn--primary" onClick={() => run('pay')}>
                <Ico.wallet size={16} />تسجيل دفعة
              </button>
            ) : (
              <button className="btn btn--outline" onClick={() => run('pdf')}>
                <Ico.download size={16} />تحميل PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {b.status === 'draft' && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.check size={14} />
          مسودة — لسه ما اتقيّدتش على حساب المورد ولا دخلت الإقرار الضريبي.
          الترحيل هو اللي بيخلّيها فاتورة فعلًا.
        </p>
      )}
      {b.status === 'cancelled' && (
        <p className="fnote fnote--warn" style={{ marginBottom: 14 }}>
          <Ico.ban size={14} />
          الفاتورة ملغاة بقيد عكسي. الرقم محجوز ليها للأبد — مفيش حذف.
        </p>
      )}

      <div className="docgrid">
        <div className="form">

          {/* ---------- البنود ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">
              البنود <em>كل بند بيترحّل على حسابه في دليل الحسابات</em>
            </h2>
            <div className="tablewrap">
              <table className="dt dt--flat">
                <thead>
                  <tr>
                    <th style={{ width: '38px' }}>#</th>
                    <th>الصنف</th>
                    <th style={{ width: '84px' }} className="n">الكمية</th>
                    <th style={{ width: '116px' }} className="n">سعر الوحدة</th>
                    <th style={{ width: '176px' }}>الحساب</th>
                    <th style={{ width: '128px' }}>الضريبة</th>
                    <th style={{ width: '124px' }} className="n">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(b.lines || []).map((l, i) => {
                    const it = DATA.findItem(l.sku)
                    const t = DATA.taxOf(l.tax)
                    return (
                      <tr key={i}>
                        <td className="num">{i + 1}</td>
                        <td>
                          <span className="itcell">
                            <b>{it?.ar || l.sku}</b>
                            <em className="num">{l.sku}</em>
                          </span>
                        </td>
                        <td className="n num">{l.qty}{it ? ` ${it.unitName}` : ''}</td>
                        <td className="n"><SAR v={l.price} dec /></td>
                        <td className="hint">{DATA.accName(l.acc)}</td>
                        <td>
                          <span className="taxpill">{t?.ar}</span>
                        </td>
                        <td className="n"><SAR v={DATA.lineNet(l)} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <dl className="totals">
              <div><dt>المجموع قبل الضريبة</dt><dd><SAR v={net} dec /></dd></div>
              <div><dt>ضريبة القيمة المضافة</dt><dd><SAR v={vat} dec /></dd></div>
              <div className="totals__big"><dt>الإجمالي</dt><dd><SAR v={total} dec /></dd></div>
            </dl>

            <p className="fnote fnote--quiet">
              ضريبة المدخلات {fmtMoney(vat)} ر.س بتتخصم من الإقرار الضريبي للفترة اللي فيها تاريخ الفاتورة.
            </p>
          </section>

          {/* ---------- الأثر على المخزون ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">أثر الفاتورة <em>إيه اللي اتغيّر لما اترحّلت</em></h2>
            <ul className="efflist">
              <li>
                <span className="efflist__k">حساب المورد</span>
                <span className="efflist__v">
                  {b.status === 'posted'
                    ? <>التزام <b><SAR v={total} /></b> على {b.s.ar}</>
                    : <em className="hint">لسه ما اتقيّدش — الفاتورة مسودة</em>}
                </span>
              </li>
              <li>
                <span className="efflist__k">المخزون</span>
                <span className="efflist__v">
                  {b.store
                    ? (b.status === 'posted'
                        ? <>الكميات دخلت <b>{DATA.storeOf(b.store)?.ar}</b></>
                        : <em className="hint">هتدخل {DATA.storeOf(b.store)?.ar} عند الترحيل</em>)
                    : <em className="hint">مفيش أثر — البنود خدمات</em>}
                </span>
              </li>
              <li>
                <span className="efflist__k">الإقرار الضريبي</span>
                <span className="efflist__v">
                  {b.status === 'posted'
                    ? <>ضريبة مدخلات <b><SAR v={vat} dec /></b></>
                    : <em className="hint">ما دخلتش الإقرار</em>}
                </span>
              </li>
              {b.po && (
                <li>
                  <span className="efflist__k">أمر الشراء</span>
                  <span className="efflist__v">
                    اتعملت من{' '}
                    <button className="cell-doc cell-doc--link"
                      onClick={() => nav(`/purchases/orders/${b.po}`)}>{b.po}</button>
                  </span>
                </li>
              )}
            </ul>
          </section>

          {/* ★ الإشعارات المرتبطة — الفاتورة اللي عليها إشعار مش
              قيمتها الأصلية، ولازم تقول كده على وشها. */}
          {(() => {
            const notes = DATA.notesOfBill(b.no)
            if (!notes.length) return null
            const eff = notes.filter((x) => x.status === 'posted')
              .reduce((s, x) => s + DATA.supNoteSign(x) * DATA.docTotal(x), 0)
            return (
              <section className="fcard">
                <h2 className="fcard__t">
                  الإشعارات المرتبطة <em>بتعدّل قيمة الفاتورة</em>
                </h2>
                <ul className="efflist">
                  {notes.map((x) => (
                    <li key={x.no}>
                      <span className="efflist__k">
                        <button className="cell-doc cell-doc--link"
                          onClick={() => nav(`/purchases/notes/${x.no}`)}>{x.no}</button>
                      </span>
                      <span className="efflist__v">
                        <span className={`ldg__k ldg__k--${x.kind === 'credit' ? 'cr' : 'dr'}`}>
                          {x.kind === 'credit' ? 'دائن' : 'مدين'}
                        </span>
                        {' '}{x.reason}
                        {' — '}<b>{fmtMoney(DATA.docTotal(x))}</b>
                        {x.status === 'draft' && <em className="hint"> · مسودة ما أثّرتش</em>}
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="totals">
                  <div><dt>إجمالي الفاتورة</dt><dd><SAR v={total} dec /></dd></div>
                  <div><dt>أثر الإشعارات</dt>
                    <dd className={eff < 0 ? 'is-warn' : ''}>
                      {eff > 0 ? '+' : ''}<SAR v={eff} dec />
                    </dd></div>
                  <div className="totals__big"><dt>المبلغ المعدّل</dt>
                    <dd><SAR v={+(total + eff).toFixed(2)} dec /></dd></div>
                </dl>
              </section>
            )
          })()}

          <Attachments docNo={b.no}
            hint="فاتورة المورد الورقية · سند الاستلام · إذن الصرف" />
        </div>

        {/* ---------- الرَّيل ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">{rest > 0.009 ? 'المتبقي عليك' : 'الإجمالي'}</span>
            <div className="rail__v"><SAR v={rest > 0.009 ? rest : total} dec /></div>
            {b.status === 'posted' && (
              <>
                <span className={`rail__due${late ? ' is-late' : dueIn !== null && dueIn <= 7 ? ' is-soon' : ''}`}>
                  {rest <= 0.009 ? 'اتسدّدت بالكامل'
                    : late ? `متأخرة ${Math.abs(dueIn)} يوم عن ${fmtDate(b.due)}`
                    : dueIn === null ? 'من غير تاريخ استحقاق'
                    : `تستحق بعد ${dueIn} يوم — ${fmtDate(b.due)}`}
                </span>
                <span className="rail__bar" aria-hidden="true">
                  <i style={{ width: `${total > 0 ? Math.min(100, (paid / total) * 100) : 0}%` }} />
                </span>
              </>
            )}
            <dl className="rail__sum">
              <div><dt>الإجمالي</dt><dd><SAR v={total} dec /></dd></div>
              <div><dt>المدفوع</dt><dd><SAR v={paid} dec /></dd></div>
              <div><dt>المتبقي</dt><dd className={rest > 0.009 ? 'is-plus' : ''}><SAR v={rest} dec /></dd></div>
            </dl>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيانات الفاتورة</span>
            <dl className="deflist">
              <div><dt>المورد</dt>
                <dd>
                  <button className="cell-doc cell-doc--link"
                    onClick={() => nav(`/purchases/suppliers/${b.s.id}`)}>{b.s.ar}</button>
                </dd></div>
              <div><dt>رقم مستند المورد</dt>
                <dd className="num">{b.ref || <em className="hint">مش مسجّل</em>}</dd></div>
              <div><dt>تاريخ الفاتورة</dt><dd>{fmtDate(b.date)}</dd></div>
              <div><dt>تاريخ الاستحقاق</dt>
                <dd className={late ? 'is-warn' : ''}>{b.due ? fmtDate(b.due) : <em className="hint">—</em>}</dd></div>
              <div><dt>شروط السداد</dt><dd>{b.s.terms || <em className="hint">—</em>}</dd></div>
              <div><dt>المستودع</dt>
                <dd>{b.store ? DATA.storeOf(b.store)?.ar : <em className="hint">مفيش — خدمات</em>}</dd></div>
            </dl>
          </section>

          {pays.length > 0 && (
            <section className="rail__c">
              <span className="rail__lbl">الدفعات</span>
              <ul className="rail__pays">
                {pays.map((p) => (
                  <li key={p.no}>
                    <b><SAR v={p.amount} dec /></b>
                    <em>{fmtDate(p.date)}</em>
                    <span>
                      {DATA.accName(p.acc)}{p.ref ? ` · ${p.ref}` : ''}
                      {' · '}
                      <button className="linkish" onClick={() => ACT.reversePayment(b, p.amount)}>
                        عكس الدفعة
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rail__c">
            <span className="rail__lbl">أوامر</span>
            <div className="rail__acts">
              {acts.map((a) => (
                <button key={a.id} className={`ract${a.tone === 'crit' ? ' ract--crit' : ''}`}
                  onClick={() => run(a.id)}>
                  <a.Ic size={16} />
                  <span className="ract__t">{a.label}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {pay && (
        <PayModal b={b} rest={rest} onClose={() => setPay(false)} />
      )}

      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no: b.no, date: b.date, due: b.due,
          party: { ar: b.s.ar, city: b.s.city, vat: b.s.vat },
          lines: (b.lines || []).map((l) => ({
            code: l.sku, ar: DATA.findItem(l.sku)?.ar || l.sku,
            unit: DATA.findItem(l.sku)?.unitName || '', qty: l.qty,
            price: l.price, net: DATA.lineNet(l), taxAmt: DATA.lineVat(l),
            total: DATA.lineNet(l) + DATA.lineVat(l),
          })),
          net, tax: vat, total, kind: 'bill',
        }} />
      )}
    </AppShell>
  )
}

/* ---------- مودال تسجيل الدفعة ---------- */
function PayModal({ b, rest, onClose }) {
  const [amount, setAmount] = useState(String(rest))
  const [acc, setAcc] = useState('1020')
  const [date, setDate] = useState(DATA.TODAY)
  const [ref, setRef] = useState('')

  const n = Number(amount) || 0
  const over = n > rest + 0.009
  const after = +(rest - n).toFixed(2)
  const bad = n <= 0 || over

  const save = async () => {
    const ok = await ACT.payBill(b, { amount: n, acc, date, ref })
    if (ok) onClose()
  }

  return (
    <Modal title="تسجيل دفعة" sub={`على ${b.no} — ${b.s.ar}`} onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" disabled={bad} onClick={save}>تسجيل الدفعة</button>
        </>
      }>
      {/* الرصيد قبل وبعد — نفس فكرة التسوية: الرقم بيتغيّر قدامك */}
      <div className="bna">
        <span className="bna__c">
          <em>المتبقي دلوقتي</em><b className="num">{fmtMoney(rest)}</b>
        </span>
        <Ico.back size={16} className="bna__x" />
        <span className={`bna__c${over ? ' is-bad' : ''}`}>
          <em>بعد الدفعة</em>
          <b className="num">{over ? '—' : fmtMoney(Math.max(0, after))}</b>
        </span>
        <span className="bna__u">ريال · {b.s.ar}</span>
      </div>

      <label className="fld">
        <span className="fld__l">مبلغ الدفعة</span>
        <input className="fld__i num" type="number" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)} />
        {over
          ? <em className="fld__e">المبلغ أكبر من المتبقي ({fmtMoney(rest)} ر.س)</em>
          : n > 0 && n < rest
            ? <em className="fld__h">دفعة جزئية — الفاتورة هتفضل مستحقة بالباقي</em>
            : null}
      </label>

      <label className="fld">
        <span className="fld__l">الحساب اللي هيتدفع منه</span>
        <select className="fld__i" value={acc} onChange={(e) => setAcc(e.target.value)}>
          {DATA.accountsOf('cash').map((a) => (
            <option key={a.id} value={a.id}>{a.ar}</option>
          ))}
        </select>
        <em className="fld__h">النقدية والبنوك بس — مش شجرة الحسابات كلها</em>
      </label>

      <DateField label="تاريخ الدفعة" value={date} onChange={setDate} />

      <label className="fld">
        <span className="fld__l">مرجع الدفعة <em>اختياري</em></span>
        <input className="fld__i" value={ref} placeholder="رقم الحوالة أو الشيك"
          onChange={(e) => setRef(e.target.value)} />
      </label>
    </Modal>
  )
}
