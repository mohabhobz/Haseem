import { useState, useEffect } from 'react'
import { Ico, Riyal } from './icons.jsx'
import { fmtMoney, fmtDate } from '../lib/format.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   معاينة الطباعة — ثنائية اللغة زي المطلوب من الهيئة.
   شكلين: فاتورة كاملة (A4) و فاتورة حرارية (٨٠مم لطابعة الكاشير).
   الـQR بيظهر لو الفاتورة اتقبلت من الهيئة بس — نفس القاعدة
   المطبّقة في شاشة الفاتورة، عشان المعاينة متكدبش على المستخدم.
   ============================================================ */

function Money({ v }) {
  return <span className="pp__m"><Riyal className="pp__r" />{fmtMoney(v)}</span>
}

export function PrintPreview({ doc, onClose }) {
  const [form, setForm] = useState('full')
  const [tpl, setTpl] = useState('default')

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [onClose])

  const {
    no, date, due, org = DATA.org, party, lines = [],
    net = 0, disc = 0, tax = 0, total = 0, retention = 0, netDue = total,
    bank, zatcaOk = false, note,
  } = doc

  return (
    <div className="pp" role="dialog" aria-modal="true" aria-label="معاينة الطباعة">
      <div className="pp__scrim" onClick={onClose} />
      <div className="pp__box">
        <header className="pp__h">
          <span className="pp__t"><Ico.search size={16} />معاينة الطباعة</span>
          <div className="pp__ctrl">
            <div className="segs segs--sm" role="group" aria-label="شكل المستند">
              <button className={form === 'full' ? 'on' : ''} onClick={() => setForm('full')}>فاتورة كاملة</button>
              <button className={form === 'thermal' ? 'on' : ''} onClick={() => setForm('thermal')}>فاتورة حرارية</button>
            </div>
            <button className="gbtn2"><Ico.print size={14} />طباعة</button>
            <button className="gbtn2" disabled={!zatcaOk}
              title={zatcaOk ? undefined : 'الـPDF المعتمد بيتولد بعد قبول الهيئة'}>
              <Ico.download size={14} />PDF
            </button>
            <button className="pp__x" aria-label="إغلاق" onClick={onClose}><Ico.close size={18} /></button>
          </div>
        </header>

        <div className="pp__body">
          {form === 'thermal' ? (
            <Thermal doc={doc} />
          ) : (
          <div className="pp__paper pp__paper--full">
            <h1 className="pp__title">فاتورة / Invoice</h1>

            <dl className="pp__meta">
              <div><dt>رقم الفاتورة / Invoice No</dt><dd>{no}</dd></div>
              <div><dt>التاريخ / Issue date</dt><dd>{date}</dd></div>
              <div><dt>الاستحقاق / Due date</dt><dd>{due}</dd></div>
            </dl>

            <div className="pp__parties">
              <div>
                <b>{org.nameAr}</b>
                <span>{org.branch}</span>
                <span>الرقم الضريبي: {org.vat || '—'}</span>
                <span>السجل التجاري: {org.cr || '—'}</span>
              </div>
              <div>
                <b>{party?.ar || '—'}</b>
                <span>{party?.en || ''}</span>
                <span>Tax ID: {party?.vat || '—'}</span>
                <span>{party?.city || ''}</span>
              </div>
            </div>

            <table className="pp__lines">
              <thead>
                <tr>
                  <th>#</th>
                  <th>البند<em>Item</em></th>
                  <th className="c">الكمية<em>Qty</em></th>
                  <th className="c">الوحدة<em>Unit</em></th>
                  <th className="n">سعر الوحدة<em>Unit Price</em></th>
                  <th className="n">الخصم<em>Discount</em></th>
                  <th className="n">الخاضع للضريبة<em>Taxable</em></th>
                  <th className="n">الضريبة<em>Tax</em></th>
                  <th className="n">المجموع<em>Line Amount</em></th>
                </tr>
              </thead>
              <tbody>
                {(lines.length ? lines : [{ key: 'x', ar: '—', qty: 1, unit: 'قطعة / Piece' }]).map((l, i) => (
                  <tr key={l.key || i}>
                    <td>{i + 1}</td>
                    <td>{l.ar || '—'}</td>
                    <td className="c">{l.qty ?? 1}</td>
                    <td className="c">{l.unit || '—'}</td>
                    <td className="n"><Money v={l.price || 0} /></td>
                    <td className="n"><Money v={l.discAmt || 0} /></td>
                    <td className="n"><Money v={l.net || 0} /></td>
                    <td className="n"><Money v={l.taxAmt || 0} /></td>
                    <td className="n"><Money v={l.total || 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pp__foot">
              {zatcaOk
                ? <div className="pp__qr" aria-hidden="true" />
                : <p className="pp__noqr">رمز الاستجابة السريعة بيتولد بعد قبول هيئة الزكاة والضريبة.</p>}
              <dl className="pp__sum">
                <div><dt>الإجمالي قبل الخصم / Subtotal</dt><dd><Money v={net + disc} /></dd></div>
                {disc > 0 && <div><dt>الخصم / Discount</dt><dd>− <Money v={disc} /></dd></div>}
                <div><dt>الضريبة / VAT</dt><dd><Money v={tax} /></dd></div>
                <div className="pp__sum--t"><dt>الإجمالي / Total</dt><dd><Money v={total} /></dd></div>
                {retention > 0 && (
                  <>
                    <div className="pp__sum--ret"><dt>حسن التنفيذ / Retention</dt><dd>− <Money v={retention} /></dd></div>
                    <div className="pp__sum--t"><dt>الصافي المستحق / Net Due</dt><dd><Money v={netDue} /></dd></div>
                  </>
                )}
              </dl>
            </div>

            {bank && (
              <table className="pp__bank">
                <tbody>
                  <tr><th>البنك</th><td>{bank.ar}</td><th className="en">Bank</th></tr>
                  <tr><th>الآيبان</th><td className="ltr">{bank.iban}</td><th className="en">IBAN</th></tr>
                </tbody>
              </table>
            )}

            {note && <p className="pp__note">{note}</p>}
          </div>
          )}
        </div>

        <footer className="pp__f">
          <label className="pp__tpl">
            <span>قالب الطباعة</span>
            <select className="fld__i" value={tpl} onChange={(e) => setTpl(e.target.value)}>
              {DATA.printTemplates.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
            </select>
          </label>
        </footer>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------
   الفاتورة الحرارية — عرض ٨٠مم لطابعة الكاشير.
   مفيش أعمدة جنب بعض ومفيش بوردرات: كل حاجة تحت بعضها،
   الليبل يمين والقيمة شمال، والجدول أربع أعمدة بس.
   ------------------------------------------------------------ */
function Thermal({ doc }) {
  const {
    no, date, org = DATA.org, party, lines = [],
    net = 0, disc = 0, tax = 0, total = 0, retention = 0, netDue = total,
    bank, zatcaOk = false, note,
  } = doc

  const rows = lines.length ? lines : [{ key: 'x', ar: '—', qty: 1, price: 0, total: 0 }]

  return (
    <div className="pp__paper pp__paper--thermal">
      <h1 className="th__title">فاتورة / Invoice</h1>

      <dl className="th__meta">
        <div><dt>رقم الفاتورة</dt><dd>{no}</dd></div>
        <div><dt>التاريخ</dt><dd>{date}</dd></div>
      </dl>

      <section className="th__party">
        <h2>البائع</h2>
        <b>{org.nameAr}</b>
        <span>{org.address || org.branch}</span>
        <span>الرقم الضريبي: {org.vat || '—'}</span>
      </section>

      <section className="th__party">
        <h2>العميل</h2>
        <b>{party?.ar || '—'}</b>
        <span>الرقم الضريبي: {party?.vat || '—'}</span>
      </section>

      <table className="th__lines">
        <thead>
          <tr>
            <th>#</th><th>البند</th>
            <th className="c">الكمية</th>
            <th className="n">سعر الوحدة</th>
            <th className="n">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={l.key || i}>
              <td>{i + 1}</td>
              <td>{l.ar || '—'}</td>
              <td className="c">{l.qty ?? 1}</td>
              <td className="n"><Money v={l.price || 0} /></td>
              <td className="n"><Money v={l.total || 0} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="th__sum">
        <div><dt>الإجمالي قبل الخصم</dt><dd><Money v={net + disc} /></dd></div>
        {disc > 0 && <div><dt>الخصم</dt><dd>− <Money v={disc} /></dd></div>}
        <div><dt>الضريبة</dt><dd><Money v={tax} /></dd></div>
        <div className="th__sum--t"><dt>الإجمالي</dt><dd><Money v={total} /></dd></div>
        {retention > 0 && (
          <>
            <div><dt>حسن التنفيذ</dt><dd>− <Money v={retention} /></dd></div>
            <div className="th__sum--t"><dt>الصافي المستحق</dt><dd><Money v={netDue} /></dd></div>
          </>
        )}
      </dl>

      {zatcaOk
        ? <div className="th__qr" aria-hidden="true" />
        : <p className="th__noqr">رمز الاستجابة السريعة بيتولد بعد قبول الهيئة</p>}

      {bank && (
        <dl className="th__meta th__meta--bank">
          <div><dt>البنك</dt><dd className="ltr">{bank.ar}</dd></div>
          <div><dt>اسم صاحب الحساب</dt><dd className="ltr">{bank.holder || org.nameEn || org.nameAr}</dd></div>
        </dl>
      )}

      {note && <p className="th__note">{note}</p>}
    </div>
  )
}
