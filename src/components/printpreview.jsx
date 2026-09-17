import { useState, useEffect } from 'react'
import { Ico, Riyal } from './icons.jsx'
import { fmtMoney, fmtDate } from '../lib/format.js'
import * as DATA from '../data/mock.js'
import { toast } from './feedback.jsx'
import { Select } from './selectfield.jsx'

/* ============================================================
   معاينة الطباعة — ثنائية اللغة زي المطلوب من الهيئة.
   شكلين: فاتورة كاملة (A4) و فاتورة حرارية (٨٠مم لطابعة الكاشير).
   الـQR بيظهر لو الفاتورة اتقبلت من الهيئة بس — نفس القاعدة
   المطبّقة في شاشة الفاتورة، عشان المعاينة متكدبش على المستخدم.
   ============================================================ */

function Money({ v }) {
  return <span className="pp__m"><Riyal className="pp__r" />{fmtMoney(v)}</span>
}

/* ------------------------------------------------------------
   نوع المستند.

   المعاينة كانت **متكتوبة على فاتورة المبيعات**: العنوان «فاتورة»،
   الطرف التاني «العميل»، وفيه مكان للـQR. لو طبعنا بيها أمر شراء
   أو إشعار مورد بتبقى بتكدب على المستخدم — إحنا هنا **المشتري**
   والطرف التاني **المورد**، وأمر الشراء أصلًا مش مستند ضريبي
   وماينفعش يبقى فيه رمز هيئة.

   عشان كده النوع بقى وصف مستقل، والافتراضي فاتورة المبيعات
   عشان الشاشات القديمة ما تتغيّرش.
   ------------------------------------------------------------ */
const KINDS = {
  invoice: {
    ar: 'فاتورة', en: 'Invoice', noAr: 'رقم الفاتورة', noEn: 'Invoice No',
    us: 'البائع', them: 'العميل', themEn: 'Bill to', thermal: true, qr: true,
  },
  quotation: {
    ar: 'عرض سعر', en: 'Quotation', noAr: 'رقم العرض', noEn: 'Quotation No',
    us: 'مقدّم العرض', them: 'العميل', themEn: 'Quote to',
    dueAr: 'صالح حتى', dueEn: 'Valid until',
    foot: 'عرض سعر — مش مستند ضريبي وما بيقيّدش أي حاجة لحد ما يتحوّل لفاتورة.',
  },
  custCredit: {
    ar: 'إشعار دائن', en: 'Credit Note', noAr: 'رقم الإشعار', noEn: 'Note No',
    us: 'البائع', them: 'العميل', themEn: 'Bill to', qr: true,
    dueAr: 'تاريخ التوريد', dueEn: 'Supply date',
    refAr: 'الفاتورة الأصلية', refEn: 'Original invoice',
  },
  custDebit: {
    ar: 'إشعار مدين', en: 'Debit Note', noAr: 'رقم الإشعار', noEn: 'Note No',
    us: 'البائع', them: 'العميل', themEn: 'Bill to', qr: true,
    refAr: 'الفاتورة الأصلية', refEn: 'Original invoice',
  },
  bill: {
    ar: 'فاتورة مشتريات', en: 'Purchase Invoice', noAr: 'رقم الفاتورة', noEn: 'Invoice No',
    us: 'المشتري', them: 'المورد', themEn: 'Supplier',
    foot: 'فاتورة واردة من المورد — الرمز الضريبي والاعتماد بيطلعوا من عند المورد، مش من عندنا.',
  },
  proforma: {
    ar: 'فاتورة مبدئية', en: 'Proforma Invoice', noAr: 'رقم المستند', noEn: 'Document No',
    us: 'البائع', them: 'العميل', themEn: 'Bill to',
    dueAr: 'صالحة حتى', dueEn: 'Valid until',
    foot: 'فاتورة مبدئية — مش فاتورة ضريبية وما ينفعش تتخصم بيها ضريبة مدخلات. '
        + 'الفاتورة الضريبية بتتصدر بعد السداد.',
  },
  po: {
    ar: 'أمر شراء', en: 'Purchase Order', noAr: 'رقم الأمر', noEn: 'PO No',
    us: 'المشتري', them: 'المورد', themEn: 'Supplier',
    dueAr: 'التاريخ المتوقع', dueEn: 'Expected date',
    foot: 'أمر شراء — مش مستند ضريبي. الفاتورة اللي بتتعمل منه هي اللي بتقيّد.',
  },
  supCredit: {
    ar: 'إشعار دائن من المورد', en: 'Supplier Credit Note',
    noAr: 'رقم الإشعار', noEn: 'Note No', us: 'المشتري', them: 'المورد', themEn: 'Supplier',
    foot: 'إشعار دائن — بيقلّل المستحق للمورد وبيقلّل ضريبة المدخلات في الإقرار.',
  },
  supDebit: {
    ar: 'إشعار مدين من المورد', en: 'Supplier Debit Note',
    noAr: 'رقم الإشعار', noEn: 'Note No', us: 'المشتري', them: 'المورد', themEn: 'Supplier',
    foot: 'إشعار مدين — بيزوّد المستحق للمورد وبيزوّد ضريبة المدخلات في الإقرار.',
  },
}
const kindOf = (k) => KINDS[k] || KINDS.invoice

export function PrintPreview({ doc, onClose }) {
  const [form, setForm] = useState('full')
  const [tpl, setTpl] = useState('default')
  /* مقاس الورق الحراري — ٥٨مم طابعة جيب، ٨٠مم طابعة كاشير.
     الفرق مش تزويق: البنود بتتلف على ٥٨ ولازم تتشاف قبل الطبع. */
  const [mm, setMm] = useState(80)

  /* ★ مش بنقفل سكرول الصفحة ورا.
     المعاينة **مرجع بتقارن بيه وإنت بتشتغل**، مش مودال بيوقّفك:
     في سيستم الكلاينت الصفحة بتضيق والمستند يفضل مقروء وإنت
     بتعدّل. عشان كده بنعلّم على الـbody بس، والـCSS بيزحّق
     المحتوى بعرض الدروار. */
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    document.body.dataset.pp = '1'
    return () => { document.removeEventListener('keydown', esc); delete document.body.dataset.pp }
  }, [onClose])

  const {
    no, date, due, org = DATA.org, party, lines = [],
    net = 0, disc = 0, tax = 0, total = 0, retention = 0, netDue = total,
    bank, zatcaOk = false, note, kind, ref,
  } = doc
  const K = kindOf(kind)

  return (
    <div className="pp" role="complementary" aria-label="معاينة الطباعة">
      <div className="pp__box">
        {/* الرأس سطرين: السطر الأول اسم الشاشة والإغلاق،
            والتاني كل الأوامر. قبل كده كانوا كلهم مكدّسين في
            سطر واحد بيلف، وقالب الطباعة كان كبسولة عايمة فوق
            الورقة — فكان فيه تلات أسطح بألوان مختلفة فوق بعض. */}
        {/* ★ سطر واحد: الاسم يمين، الأوامر في النص، والإغلاق شمال.
            كان سطرين — التاني فيه الأوامر والأول فيه الاسم
            والإغلاق وبينهم فراغ فاضي بعرض الدراور كله. */}
        <header className="pp__h">
          {/* السطر الأول: اسم الشاشة ورقم المستند يمين، والإغلاق
              شمال. كان الاسم لوحده والإغلاق لوحده والباقي فراغ
              بعرض الدراور — رقم المستند بيملا الفراغ بحاجة
              المستخدم محتاجها أصلًا وهو بيعاين. */}
          <div className="pp__hr">
            <span className="pp__t">
              معاينة الطباعة
              <em className="pp__tn num ltr">{no}</em>
            </span>
            <button className="pp__x" aria-label="إغلاق" title="إغلاق" onClick={onClose}>
              <Ico.close size={16} />
            </button>
          </div>

          <div className="pp__ctrl">
            {K.thermal && (
              <div className="segs segs--sm" role="group" aria-label="شكل المستند">
                <button className={form === 'full' ? 'on' : ''} onClick={() => setForm('full')}>فاتورة كاملة</button>
                <button className={form === 'thermal' ? 'on' : ''} onClick={() => setForm('thermal')}>فاتورة حرارية</button>
              </div>
            )}

            <label className="pp__tpl">
              <span>القالب</span>
              <Select value={tpl} onChange={(e) => setTpl(e.target.value)} ariaLabel="قالب الطباعة">
                {DATA.printTemplates.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
              </Select>
            </label>

            <span className="pp__sp" />

            <button className="gbtn2" onClick={() => window.print()}>
              <Ico.print size={14} />طباعة
            </button>
            <button className="gbtn2" disabled={K.qr && !zatcaOk}
              title={!K.qr || zatcaOk ? undefined : 'الـPDF المعتمد بيتولد بعد قبول الهيئة'}
              onClick={() => toast.ok(`${no}.pdf جاهز`, { sub: 'اتنزّل في مجلد التنزيلات' })}>
              <Ico.download size={14} />PDF
            </button>
          </div>
        </header>

        <div className="pp__body">
          {form === 'thermal' ? (
            <>
              <Thermal doc={doc} mm={mm} />
              <div className="segs segs--sm pp__mm" role="group" aria-label="مقاس الورق">
                <button className={mm === 58 ? 'on' : ''} onClick={() => setMm(58)}>٥٨ مم</button>
                <button className={mm === 80 ? 'on' : ''} onClick={() => setMm(80)}>٨٠ مم</button>
              </div>
            </>
          ) : (
          <div className="pp__paper pp__paper--full">
            <h1 className="pp__title">{K.ar} / {K.en}</h1>

            <dl className="pp__meta">
              <div><dt>{K.noAr} / {K.noEn}</dt><dd>{no}</dd></div>
              <div><dt>التاريخ / Issue date</dt><dd>{date}</dd></div>
              {due && (
                <div>
                  <dt>{K.dueAr || 'الاستحقاق'} / {K.dueEn || 'Due date'}</dt>
                  <dd>{due}</dd>
                </div>
              )}
              {ref && K.refAr && (
                <div><dt>{K.refAr} / {K.refEn}</dt><dd>{ref}</dd></div>
              )}
            </dl>

            <div className="pp__parties">
              <div>
                <i className="pp__plbl">{K.us}</i>
                <b>{org.nameAr}</b>
                <span>{org.branch}</span>
                <span>الرقم الضريبي: {org.vat || '—'}</span>
                <span>السجل التجاري: {org.cr || '—'}</span>
              </div>
              <div>
                <i className="pp__plbl">{K.them} / {K.themEn}</i>
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
              {!K.qr
                ? <p className="pp__noqr">{K.foot}</p>
                : zatcaOk
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

      </div>
    </div>
  )
}

/* ------------------------------------------------------------
   الفاتورة الحرارية — عرض ٨٠مم لطابعة الكاشير.
   مفيش أعمدة جنب بعض ومفيش بوردرات: كل حاجة تحت بعضها،
   الليبل يمين والقيمة شمال، والجدول أربع أعمدة بس.
   ------------------------------------------------------------ */
function Thermal({ doc, mm = 80 }) {
  const {
    no, date, org = DATA.org, party, lines = [],
    net = 0, disc = 0, tax = 0, total = 0, retention = 0, netDue = total,
    bank, zatcaOk = false, note,
  } = doc

  const rows = lines.length ? lines : [{ key: 'x', ar: '—', qty: 1, price: 0, total: 0 }]

  return (
    <div className="pp__paper pp__paper--thermal" style={{ width: mm + 'mm' }}>
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
