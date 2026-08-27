import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtMoney, TODAY } from '../lib/format.js'
import { PrintPreview } from '../components/printpreview.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   إشعار مدين جديد.

   عكس الإشعار الدائن: ده بيزوّد اللي على العميل مش بيقلّله.
   وعشان كده الشاشة مختلفة — مفيش «اختر فاتورة» في الأول.
   الإشعار المدين بيتعمل على العميل مباشرة، لأن اللي بيتضاف
   (رسوم شحن، فرق سعر صرف، رسوم تأخير) غالبًا مش بند في فاتورة
   قديمة، هو حاجة جديدة طلعت بعدها.

   الفاتورة المرجع حقل اختياري — بس لما تتحدد بتتكتب في XML
   وبتربط الإشعار بالمستند الأصلي عند الهيئة.
   ============================================================ */

const REASONS = [
  'تصحيح',
  'رسوم شحن إضافية',
  'فرق سعر صرف',
  'رسوم تأخير سداد',
  'خدمة أو تركيب إضافي',
]

const iso = (d) => d.toISOString().slice(0, 10)
const num = (x) => Number(x) || 0

const emptyLine = () => ({
  key: Math.random().toString(36).slice(2),
  ar: '', qty: 1, price: 0, tax: 'S',
})

export default function DebitNoteNew() {
  const nav = useNavigate()
  const [reason, setReason] = useState('')
  const [cust, setCust] = useState('')
  const [no, setNo] = useState('DN-000095')
  const [editNo, setEditNo] = useState(false)
  const [noDraft, setNoDraft] = useState('')
  const [date, setDate] = useState(iso(new Date(TODAY)))
  const [pay, setPay] = useState('')
  const [src, setSrc] = useState('')          /* فاتورة مرجع — اختياري */
  const [incl, setIncl] = useState(false)
  const [note, setNote] = useState('')
  const [stamp, setStamp] = useState(false)
  const [logo, setLogo] = useState(false)
  const [lines, setLines] = useState([emptyLine()])
  const [files, setFiles] = useState([])
  const [tried, setTried] = useState(false)
  const [preview, setPreview] = useState(false)

  const c = DATA.customers.find((x) => x.id === cust)
  /* فواتير العميل المختار بس — مفيش خيار بيربط بمستند غلط */
  const custInvoices = useMemo(
    () => (c ? DATA.invoices.filter((v) => v.c?.id === c.id && v.status !== 'draft') : []), [c])

  const startEditNo = () => { setNoDraft(no); setEditNo(true) }
  const saveNo = () => { setNo(noDraft.trim() || no); setEditNo(false) }

  const setLine = (key, patch) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const delLine = (key) => setLines((ls) => ls.filter((l) => l.key !== key))
  const addLine = () => setLines((ls) => [...ls, emptyLine()])

  const calc = useMemo(() => {
    let net = 0, tax = 0
    const per = lines.map((l) => {
      const gross = num(l.qty) * num(l.price)
      const rate = DATA.rateOf(l.tax) / 100
      const base = incl ? gross / (1 + rate) : gross
      const t = base * rate
      net += base; tax += t
      return { ...l, net: +base.toFixed(2), taxAmt: +t.toFixed(2), total: +(base + t).toFixed(2) }
    })
    return { per, net: +net.toFixed(2), tax: +tax.toFixed(2), total: +(net + tax).toFixed(2) }
  }, [lines, incl])

  const errs = {}
  if (!reason) errs.reason = 'لازم تختار سبب — بيتبعت للهيئة مع الإشعار'
  if (!cust) errs.cust = 'لازم تختار عميل'
  if (!lines.some((l) => l.ar)) errs.lines = 'الإشعار لازم يكون فيه بند واحد على الأقل'
  else if (calc.total <= 0) errs.lines = 'المبلغ لازم يكون أكبر من صفر'
  const show = (k) => (tried ? errs[k] : null)
  const nErr = Object.keys(errs).length

  /* ★ الزرار شغّال دايمًا */
  const submit = () => setTried(true)

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/sales/debit-notes')}>
          <Ico.back size={16} />الإشعارات المدينة
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no dochead__no--ar">إشعار مدين جديد</h1>
          </div>
          <div className="dochead__act">
            <button className="btn btn--soft" onClick={() => setPreview(true)}>
              <Ico.search size={15} />معاينة
            </button>
          </div>
        </div>
      </div>

      <div className="docgrid">
        <div className="form">
          {/* ---------- ١) العميل والسبب — أول قرارين ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">العميل والسبب</h2>
            <div className="frow frow--2">
              <div className="fld">
                <span className="fld__l">العميل <em className="req">مطلوب</em></span>
                <select className={`fld__i${show('cust') ? ' is-bad' : ''}`} value={cust}
                  onChange={(e) => { setCust(e.target.value); setSrc('') }}>
                  <option value="">اختر عميل…</option>
                  {DATA.customers.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
                </select>
                {show('cust') && <em className="fld__e">{errs.cust}</em>}
              </div>
              <div className="fld">
                <span className="fld__l">السبب <em className="req">مطلوب</em></span>
                <select className={`fld__i${show('reason') ? ' is-bad' : ''}`} value={reason}
                  onChange={(e) => setReason(e.target.value)}>
                  <option value="">اختر سبب…</option>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {show('reason') ? <em className="fld__e">{errs.reason}</em>
                  : <em className="fld__h">بيتكتب في XML الإشعار وبيتبعت للهيئة</em>}
              </div>
            </div>

            {c && (
              <p className="fnote">
                <Ico.check size={14} />
                رصيده الحالي <SAR v={c.balance} /> · {c.city} · الرقم الضريبي {c.vat}
              </p>
            )}
          </section>

          {/* ---------- ٢) بيانات المستند ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">بيانات الإشعار</h2>
            <div className="doccols">
              <div className="doccols__main">
                <div className="frow frow--3">
                  <div className="fld">
                    <span className="fld__l">رقم الإشعار</span>
                    {editNo ? (
                      <div className="fedit">
                        <input className="fld__i" value={noDraft} autoFocus
                          onChange={(e) => setNoDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); saveNo() }
                            if (e.key === 'Escape') setEditNo(false)
                          }} />
                        <span className="fedit__a">
                          <button type="button" className="lnk" onClick={saveNo}>حفظ</button>
                          <button type="button" className="lnk lnk--mute" onClick={() => setEditNo(false)}>إلغاء</button>
                        </span>
                      </div>
                    ) : (
                      <div className="fld__ro fedit__ro">
                        <span className="fedit__v">{no}</span>
                        <button type="button" className="lnk" onClick={startEditNo}>تعديل</button>
                      </div>
                    )}
                  </div>
                  <label className="fld">
                    <span className="fld__l">تاريخ الإصدار</span>
                    <input className="fld__i" type="date" value={date}
                      onChange={(e) => setDate(e.target.value)} />
                  </label>
                  <label className="fld">
                    <span className="fld__l">طريقة الدفع <em className="fld__opt">حقل الهيئة</em></span>
                    <select className="fld__i" value={pay} onChange={(e) => setPay(e.target.value)}>
                      <option value="">غير محدد</option>
                      <option value="cash">نقدًا</option>
                      <option value="card">بطاقة</option>
                      <option value="bank">تحويل بنكي</option>
                      <option value="credit">آجل</option>
                    </select>
                  </label>
                </div>

                {/* المرجع اختياري هنا — عكس الإشعار الدائن */}
                <label className="fld" style={{ marginTop: 14 }}>
                  <span className="fld__l">فاتورة مرجع <em className="fld__opt">اختياري</em></span>
                  <select className="fld__i" value={src} disabled={!c}
                    onChange={(e) => setSrc(e.target.value)}>
                    <option value="">من غير مرجع</option>
                    {custInvoices.map((v) => (
                      <option key={v.no} value={v.no}>{v.no} — {fmtMoney(v.total)}</option>
                    ))}
                  </select>
                  <em className="fld__h">
                    {c ? 'لو الرسوم مرتبطة بفاتورة، اربطها — بيتبعت مرجعها للهيئة.'
                       : 'اختر العميل الأول عشان تظهر فواتيره.'}
                  </em>
                </label>
              </div>

              <div className="fld fld--logo">
                <span className="fld__l">الشعار</span>
                <button className={`updrop${logo ? ' is-set' : ''}`} onClick={() => setLogo((v) => !v)}>
                  {logo ? <img src={DATA.org.logo} alt="" />
                        : <><Ico.plus size={18} /><em>رفع الشعار</em></>}
                </button>
              </div>
            </div>
          </section>

          {/* ---------- ٣) البنود ---------- */}
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">بنود الإشعار</h2>
              <div className="fcard__ctrl">
                <div className="segs segs--sm" role="group" aria-label="طريقة إدخال السعر">
                  <button className={!incl ? 'on' : ''} onClick={() => setIncl(false)}>خالي من الضريبة</button>
                  <button className={incl ? 'on' : ''} onClick={() => setIncl(true)}>شامل الضريبة</button>
                </div>
              </div>
            </div>

            <div className="lines">
              <div className="lines__h cnlines">
                <span>#</span>
                <span>الوصف</span>
                <span>الكمية</span>
                <span>سعر الوحدة</span>
                <span>الضريبة</span>
                <span>المبلغ</span>
                <span />
              </div>
              {calc.per.map((l, i) => (
                <div className="lines__r cnlines" key={l.key}>
                  <span className="lines__i">{i + 1}</span>
                  <input className="fld__i" value={l.ar} placeholder="مثال: رسوم شحن مستعجل"
                    onChange={(e) => setLine(l.key, { ar: e.target.value })} />
                  <input className="fld__i n" type="number" min="0" value={l.qty}
                    onChange={(e) => setLine(l.key, { qty: e.target.value })} />
                  <input className="fld__i n" type="number" min="0" step="0.01" value={l.price}
                    onChange={(e) => setLine(l.key, { price: e.target.value })} />
                  <select className="fld__i" value={l.tax}
                    onChange={(e) => setLine(l.key, { tax: e.target.value })}>
                    {DATA.taxRates.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
                  </select>
                  <span className="lines__t">{fmtMoney(l.total)}</span>
                  <button className="lines__x" aria-label="شيل البند" onClick={() => delLine(l.key)}>
                    <Ico.close size={14} />
                  </button>
                </div>
              ))}
            </div>
            {/* مكان واحد لزرار الإضافة في كل الشاشات — تحت البنود */}
            <button className="lines__add" onClick={addLine}><Ico.plus size={15} />إضافة بند</button>
            {show('lines') && <em className="fld__e fld__e--blk">{errs.lines}</em>}
          </section>

          {/* ---------- ٤) الملاحظات والختم ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">الملاحظات والختم</h2>
            <div className="notesrow">
              <label className="fld">
                <span className="fld__l">ملاحظة للعميل <em className="fld__opt">اختياري</em></span>
                <textarea className="fld__i fld__i--area" value={note}
                  placeholder="مثال: رسوم شحن مستعجل بناءً على طلبكم بتاريخ…"
                  onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className="fld fld--logo">
                <span className="fld__l">الختم</span>
                <button className={`updrop${stamp ? ' is-set' : ''}`} onClick={() => setStamp((v) => !v)}>
                  {stamp ? <span className="stampmark">مُعتمد</span>
                         : <><Ico.plus size={18} /><em>رفع الختم</em></>}
                </button>
              </div>
            </div>
          </section>

          {/* ---------- ٥) المرفقات ---------- */}
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">المرفقات</h2>
              <button className="gbtn2"
                onClick={() => setFiles((f) => [...f, { n: `مستند-${f.length + 1}.pdf`, s: '١٥٠ ك.ب' }])}>
                <Ico.plus size={14} />إرفاق ملف
              </button>
            </div>
            {files.length === 0
              ? <p className="fempty">مفيش مرفقات — بتتبعت مع الإشعار للعميل.</p>
              : (
                <ul className="flist">
                  {files.map((f, i) => (
                    <li key={i}>
                      <Ico.invoice size={16} /><b>{f.n}</b><span>{f.s}</span>
                      <button aria-label="شيل المرفق" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>
                        <Ico.close size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </div>

        {/* ---------- الملخّص ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">قيمة الإشعار</span>
            <span className="rail__v"><SAR v={calc.total} /></span>
            <dl className="rail__sum">
              <div><dt>قبل الضريبة</dt><dd><SAR v={calc.net} dec /></dd></div>
              <div><dt>ضريبة القيمة المضافة</dt><dd><SAR v={calc.tax} dec /></dd></div>
            </dl>
          </section>

          {/* أثر الإشعار — الحاجة اللي بتفرّقه عن الدائن */}
          {c && (
            <section className="rail__c">
              <span className="rail__lbl">أثره على العميل</span>
              <dl className="rail__sum rail__sum--flat">
                <div><dt>رصيده الحالي</dt><dd><SAR v={c.balance} dec /></dd></div>
                <div><dt>الإشعار المدين</dt><dd className="is-plus">+ <SAR v={calc.total} dec /></dd></div>
                <div className="is-tot"><dt>رصيده بعد الإصدار</dt><dd><SAR v={c.balance + calc.total} dec /></dd></div>
              </dl>
              <p className="fnote fnote--quiet">الإشعار المدين بيزوّد اللي على العميل.</p>
            </section>
          )}

          <section className="rail__c">
            <span className="rail__lbl">قبل ما تصدر</span>
            <ul className="rail__check">
              <li className={cust ? 'is-ok' : ''}><Ico.check size={14} />العميل</li>
              <li className={reason ? 'is-ok' : ''}><Ico.check size={14} />سبب الإشعار</li>
              <li className={lines.some((l) => l.ar) ? 'is-ok' : ''}><Ico.check size={14} />بند واحد على الأقل</li>
              <li className={calc.total > 0 ? 'is-ok' : ''}><Ico.check size={14} />مبلغ أكبر من صفر</li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="savebar" data-component="SaveBar">
        <span className={`savebar__s${tried && nErr ? ' is-bad' : ''}`}>
          {tried && nErr
            ? <><Ico.close size={15} />ناقص {nErr === 1 ? 'حقل واحد' : nErr === 2 ? 'حقلان' : `${nErr} حقول`} — موضّحة أعلاه باللون الأحمر</>
            : nErr === 0
              ? <><Ico.check size={15} />جاهز</>
              : 'أكمل الحقول ثم أصدر — سننبّهك إن كان هناك نقص'}
        </span>
        <div className="savebar__b">
          <button className="btn btn--ghost" onClick={() => nav('/sales/debit-notes')}>إلغاء</button>
          <button className="btn btn--soft">حفظ كمسودة</button>
          <button className="btn btn--primary" onClick={submit}>
            <Ico.send size={16} />إصدار وإرسال للهيئة
          </button>
        </div>
      </div>

      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no, date, due: date, party: c, lines: calc.per,
          net: calc.net, disc: 0, tax: calc.tax, total: calc.total,
          bank: DATA.banks[0], note, zatcaOk: false,
        }} />
      )}
    </AppShell>
  )
}
