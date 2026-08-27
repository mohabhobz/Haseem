import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, CurrencyNote } from '../components/layout.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { fmtMoney, fmtDate, TODAY } from '../lib/format.js'
import { PrintPreview } from '../components/printpreview.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   إشعار دائن جديد — خطوتين.

   الإشعار الدائن مالوش وجود لوحده: هو تصحيح لفاتورة صدرت خلاص
   واتبعتت للهيئة. عشان كده الشاشة بتبدأ بسؤال واحد — أنهي فاتورة —
   وبعدها كل حاجة بتتعبّى منها. ومحدش بيكتب عميل ولا بنود من الصفر.

   القاعدة اللي بتحكم الشاشة: **مينفعش نخصم أكتر من المتبقّي على
   الفاتورة**. الرقم ده ظاهر في المُنتقي وفي الملخّص، والإشعار
   بيتقفل عليه.
   ============================================================ */

const REASONS = [
  'إرجاع البضائع',
  'خصم تجاري لاحق',
  'تسوية كمية',
  'خطأ في السعر',
  'إلغاء جزئي للخدمة',
]

const iso = (d) => d.toISOString().slice(0, 10)
const num = (x) => Number(x) || 0

/* الفواتير المؤهّلة: اللي اتصدرت فعلًا. المسودة مالهاش إشعار. */
const eligible = DATA.invoices.filter((v) => !['draft'].includes(v.status))
/* المبلغ اللي لسه ينفع يتخصم — الإجمالي ناقص اللي اتخصم قبل كده */
const creditedOf = (no) =>
  DATA.creditNotes.filter((n) => n.src === no && n.status !== 'void')
    .reduce((a, n) => a + n.total, 0)
const leftOf = (v) => Math.max(0, v.total - creditedOf(v.no))

/* ---------------- الخطوة ١: اختيار الفاتورة ----------------
   الاختيار من البحث بيملا الحقل ويعرض ملخّص الفاتورة — مش بيقفز
   للشاشة اللي بعدها. الانتقال بيحصل بأمر صريح، عشان المستخدم
   يراجع اللي اختاره قبل ما يبني عليه مستند مالوش رجعة. */
function PickInvoice({ onPick }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(null)
  const [tried, setTried] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const hits = useMemo(() => {
    const t = q.trim()
    const list = eligible.filter((v) => leftOf(v) > 0)
    if (!t) return list
    return list.filter((v) => v.no.includes(t) || v.c.ar.includes(t) || v.c.en?.includes(t))
  }, [q])

  const choose = (v) => { setSel(v); setQ(v.no); setOpen(false) }
  const clear  = () => { setSel(null); setQ(''); setOpen(false) }
  /* ★ الزرار شغّال دايمًا — بيوَرّي الناقص مش بيمنعك */
  const go = () => { if (sel) onPick(sel); else setTried(true) }

  return (
    <section className="fcard pick">
      <h2 className="fcard__t">اختر فاتورة</h2>
      <p className="pick__s">
        الإشعار الدائن بيتبني على فاتورة صادرة — اختارها وهنسحب العميل والبنود والضريبة منها.
      </p>

      <div className="pick__row">
        <div className="pick__box" ref={ref}>
          <label className="fld">
            <span className="fld__l">الفاتورة</span>
            <span className="pick__in">
              <Ico.search size={16} />
              <input className={`fld__i${tried && !sel ? ' is-bad' : ''}`}
                placeholder="ابحث برقم الفاتورة أو اسم العميل…"
                value={q} onFocus={() => setOpen(true)}
                onChange={(e) => { setQ(e.target.value); setSel(null); setOpen(true) }} />
              {sel && (
                <button className="pick__x" aria-label="امسح الاختيار" onClick={clear}>
                  <Ico.close size={14} />
                </button>
              )}
            </span>
            {tried && !sel && <em className="fld__e">اختر فاتورة من القايمة الأول</em>}
          </label>

          {open && (
            <div className="pick__p" role="listbox">
              {hits.length === 0 ? (
                <p className="pick__none">ما فيه فاتورة مطابقة ولسه فيها مبلغ ينفع يتخصم.</p>
              ) : hits.map((v) => (
                <button key={v.no} className={`pick__i${sel?.no === v.no ? ' is-sel' : ''}`}
                  role="option" onClick={() => choose(v)}>
                  <span className="pick__no">{v.no}</span>
                  <span className="pick__c">{v.c.ar}</span>
                  <span className="pick__left">
                    المتبقّي للخصم <b>{fmtMoney(leftOf(v)).split('.')[0]}</b>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn--primary pick__go" onClick={go}>
          متابعة<Ico.back size={16} className="is-flip" />
        </button>
      </div>

      {/* ملخّص اللي اتختار — مراجعة قبل الانتقال */}
      {sel ? (
        <div className="picked">
          <header className="picked__h">
            <b>{sel.no}</b>
            <span>{sel.c.ar}</span>
            <button className="lnk" onClick={clear}>اختر فاتورة تانية</button>
          </header>
          <dl className="picked__f">
            <div><dt>تاريخ الإصدار</dt><dd>{fmtDate(sel.date)}</dd></div>
            <div><dt>إجمالي الفاتورة</dt><dd><SAR v={sel.total} dec /></dd></div>
            <div><dt>اتخصم قبل كده</dt><dd><SAR v={creditedOf(sel.no)} dec /></dd></div>
            <div className="is-tot"><dt>المتبقّي للخصم</dt><dd><SAR v={leftOf(sel)} dec /></dd></div>
            <div><dt>البنود</dt><dd>{DATA.linesOf(sel).length} بنود هتتسحب</dd></div>
            <div><dt>حالة الهيئة</dt><dd>{sel.zatca === 'ok' ? 'مقبولة' : sel.zatca === 'bad' ? 'مرفوضة' : 'عند الهيئة'}</dd></div>
          </dl>
        </div>
      ) : (
        <p className="fnote fnote--quiet">
          المسودات مش في القايمة — الفاتورة لازم تكون اتصدرت الأول عشان يبقى ليها إشعار.
        </p>
      )}
    </section>
  )
}

/* ---------------- الشاشة ---------------- */
export default function CreditNoteNew() {
  const nav = useNavigate()
  const [src, setSrc] = useState(null)          /* الفاتورة الأصلية */
  const [no, setNo] = useState('CN-000319')
  const [editNo, setEditNo] = useState(false)
  const [noDraft, setNoDraft] = useState('')
  const [date, setDate] = useState(iso(new Date(TODAY)))
  const [supply, setSupply] = useState('')
  const [pay, setPay] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [stamp, setStamp] = useState(false)
  const [logo, setLogo] = useState(false)
  const [disc, setDisc] = useState('')
  const [lines, setLines] = useState([])
  const [files, setFiles] = useState([])
  const [tried, setTried] = useState(false)
  const [preview, setPreview] = useState(false)

  /* اختيار الفاتورة بيعبّي كل حاجة — دي فايدة الخطوة الأولى */
  const pick = (v) => {
    setSrc(v)
    setSupply(v.date)
    setLines(DATA.linesOf(v).map((l, i) => ({
      key: `l${i}`, ar: l.ar, unit: l.unit || 'وحدة',
      qty: l.qty, price: l.price, tax: 'S', on: true,
    })))
  }

  const startEditNo = () => { setNoDraft(no); setEditNo(true) }
  const saveNo = () => { setNo(noDraft.trim() || no); setEditNo(false) }

  const setLine = (key, patch) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const delLine = (key) => setLines((ls) => ls.filter((l) => l.key !== key))
  const addLine = () => setLines((ls) => [...ls, {
    key: Math.random().toString(36).slice(2), ar: '', unit: 'وحدة',
    qty: 1, price: 0, tax: 'S', on: true,
  }])

  const calc = useMemo(() => {
    let net = 0, tax = 0
    const per = lines.map((l) => {
      const base = num(l.qty) * num(l.price)
      const rate = DATA.rateOf(l.tax) / 100
      const t = base * rate
      net += base; tax += t
      return { ...l, net: +base.toFixed(2), taxAmt: +t.toFixed(2), total: +(base + t).toFixed(2) }
    })
    const d = Math.min(num(disc), net)
    const dNet = net - d
    const dTax = net ? tax * (dNet / net) : 0
    return { per, net: +net.toFixed(2), disc: +d.toFixed(2),
             tax: +dTax.toFixed(2), total: +(dNet + dTax).toFixed(2) }
  }, [lines, disc])

  const left = src ? leftOf(src) : 0
  const over = src && calc.total > left + 0.01

  const errs = {}
  if (!reason) errs.reason = 'لازم تختار سبب — بيتبعت للهيئة مع الإشعار'
  if (!lines.some((l) => l.ar)) errs.lines = 'الإشعار لازم يكون فيه بند واحد على الأقل'
  else if (calc.total <= 0) errs.lines = 'المبلغ لازم يكون أكبر من صفر'
  if (over) errs.over = `المبلغ أكبر من المتبقّي على الفاتورة (${fmtMoney(left)})`
  const show = (k) => (tried ? errs[k] : null)
  const nErr = Object.keys(errs).length

  /* ★ نفس قاعدة البورد: الزرار شغّال دايمًا */
  const submit = () => setTried(true)

  if (!src) {
    return (
      <AppShell>
        <div className="dochead">
          <button className="dochead__back" onClick={() => nav('/sales/credit-notes')}>
            <Ico.back size={16} />الإشعارات الدائنة
          </button>
          <div className="dochead__row">
            <div className="dochead__id"><h1 className="dochead__no dochead__no--ar">إشعار دائن جديد</h1></div>
          </div>
        </div>
        <div className="form form--solo"><PickInvoice onPick={pick} /></div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/sales/credit-notes')}>
          <Ico.back size={16} />الإشعارات الدائنة
        </button>
        <CurrencyNote />
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no dochead__no--ar">إشعار دائن جديد</h1>
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
          {/* ---------- ١) المستند ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">بيانات الإشعار</h2>

            {/* المرجع أول حاجة، لأنه سبب وجود المستند */}
            <div className="srcbar">
              <span className="srcbar__l">ضد فاتورة</span>
              <b>{src.no}</b>
              <span className="srcbar__c">{src.c.ar}</span>
              <span className="srcbar__left">المتبقّي للخصم <SAR v={left} dec /></span>
              <button className="lnk" onClick={() => setSrc(null)}>غيّر الفاتورة</button>
            </div>

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
                    <span className="fld__l">تاريخ التوريد</span>
                    <input className="fld__i" type="date" value={supply}
                      onChange={(e) => setSupply(e.target.value)} />
                    <em className="fld__h">من الفاتورة الأصلية</em>
                  </label>
                </div>

                <label className="fld" style={{ marginTop: 14 }}>
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

              <div className="fld fld--logo">
                <span className="fld__l">الشعار</span>
                <button className={`updrop${logo ? ' is-set' : ''}`} onClick={() => setLogo((v) => !v)}>
                  {logo ? <img src={DATA.org.logo} alt="" />
                        : <><Ico.plus size={18} /><em>رفع الشعار</em></>}
                </button>
              </div>
            </div>
          </section>

          {/* ---------- ٢) العميل — بيتقرا، مش بيتكتب ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">العميل <em>من الفاتورة الأصلية</em></h2>
            <div className="party">
              <b>{src.c.ar}</b>
              <span>{src.c.en}</span>
              <span>الرقم الضريبي: {src.c.vat}</span>
              <span>{src.c.city}</span>
            </div>
          </section>

          {/* ---------- ٣) البنود ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">بنود الإشعار <em>اشطب اللي مش راجع</em></h2>

            <div className="lines">
              <div className="lines__h cnlines">
                <span>#</span>
                <span>بند الفاتورة</span>
                <span>الكمية</span>
                <span>سعر الوحدة</span>
                <span>الضريبة</span>
                <span>المبلغ</span>
                <span />
              </div>
              {calc.per.map((l, i) => (
                <div className="lines__r cnlines" key={l.key}>
                  <span className="lines__i">{i + 1}</span>
                  <input className="fld__i" value={l.ar} placeholder="وصف البند"
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
                  placeholder="مثال: تم استلام المرتجع بالكامل بتاريخ…"
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

          {/* ---------- ٥) مرفقات الفاتورة الأصلية ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">مرفقات الفاتورة الأصلية <em>للعرض والتنزيل فقط</em></h2>
            <p className="fempty">ما فيه مرفقات على {src.no}.</p>
          </section>

          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">مرفقات الإشعار</h2>
              <button className="gbtn2"
                onClick={() => setFiles((f) => [...f, { n: `مرتجع-${f.length + 1}.pdf`, s: '١٨٠ ك.ب' }])}>
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
              {calc.disc > 0 && (
                <div><dt>الخصم</dt><dd className="is-minus">− <SAR v={calc.disc} dec /></dd></div>
              )}
              <div><dt>ضريبة القيمة المضافة</dt><dd><SAR v={calc.tax} dec /></dd></div>
            </dl>
            <span className="fld__l" style={{ marginTop: 14, display: 'block' }}>خصم على الإشعار</span>
            <input className="fld__i n" type="number" min="0" step="0.01" placeholder="0"
              value={disc} onChange={(e) => setDisc(e.target.value)} />
          </section>

          {/* الحد الأقصى — القاعدة اللي بتحكم المستند */}
          <section className={`rail__c cap${over ? ' cap--over' : ''}`}>
            <span className="rail__lbl">الحد الأقصى للخصم</span>
            <dl className="rail__sum rail__sum--flat">
              <div><dt>إجمالي الفاتورة</dt><dd><SAR v={src.total} dec /></dd></div>
              <div><dt>اتخصم قبل كده</dt><dd><SAR v={creditedOf(src.no)} dec /></dd></div>
              <div className="is-tot"><dt>المتبقّي للخصم</dt><dd><SAR v={left} dec /></dd></div>
            </dl>
            {over && (
              <p className="cap__bad">
                <Ico.close size={14} />
                المبلغ أكبر من المتبقّي بـ<SAR v={calc.total - left} dec />
              </p>
            )}
          </section>

          {/* السبب مطلوب — بيتبعت للهيئة */}
          <section className="rail__c">
            <span className="rail__lbl">السبب <em className="req">مطلوب</em></span>
            <select className={`fld__i${show('reason') ? ' is-bad' : ''}`} value={reason}
              onChange={(e) => setReason(e.target.value)}>
              <option value="">اختر سبب…</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {show('reason') && <em className="fld__e">{errs.reason}</em>}
            <p className="fnote fnote--quiet">بيتكتب في XML الإشعار وبيتبعت للهيئة.</p>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">قبل ما تصدر</span>
            <ul className="rail__check">
              <li className={reason ? 'is-ok' : ''}><Ico.check size={14} />سبب الإشعار</li>
              <li className={lines.some((l) => l.ar) ? 'is-ok' : ''}><Ico.check size={14} />بند واحد على الأقل</li>
              <li className={calc.total > 0 ? 'is-ok' : ''}><Ico.check size={14} />مبلغ أكبر من صفر</li>
              <li className={!over ? 'is-ok' : ''}><Ico.check size={14} />داخل حدود الفاتورة</li>
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
          <button className="btn btn--ghost" onClick={() => nav('/sales/credit-notes')}>إلغاء</button>
          <button className="btn btn--soft">حفظ كمسودة</button>
          <button className="btn btn--primary" onClick={submit}>
            <Ico.send size={16} />إصدار وإرسال للهيئة
          </button>
        </div>
      </div>

      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no, date, due: supply, party: src.c, lines: calc.per,
          net: calc.net, disc: calc.disc, tax: calc.tax, total: calc.total,
          bank: DATA.banks[0], note, zatcaOk: false,
        }} />
      )}
    </AppShell>
  )
}
