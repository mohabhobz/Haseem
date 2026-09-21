import { useState } from 'react'
import { useNavigate , useParams } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { Alert } from '../components/ob.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   عميل جديد.

   في السيستم الحالي ده مودال اسمه «Add Client» — عمودين ضيقين،
   ٢٥ حقل، وسكرول جوّه المودال. المشكلة مش في الحقول، المشكلة إن
   المودال بيخلّي كل الحقول في مستوى واحد: الاسم والرمز البريدي
   والرقم الضريبي كلهم بنفس الوزن.

   هنا الشاشة مقسومة بالسؤال اللي كل قسم بيجاوبه:
   مين هو؟ · مسجّل في الضريبة ولا لأ؟ · نوصله إزاي؟ · فين؟ ·
   بنتعامل معاه بأي شروط؟

   والرَّيل بيجاوب السؤال اللي مفيش حقل بيجاوبه:
   **هل فواتيره هتعدّي من الهيئة؟** — الرقم الضريبي والعنوان الوطني
   مش «حقول اختيارية»، دول شرط قبول الفاتورة B2B عند الهيئة.
   ============================================================ */

const ID_TYPES = [
  { id: '',    ar: 'بدون' },
  { id: 'NAT', ar: 'الهوية الوطنية' },
  { id: 'IQA', ar: 'الإقامة' },
  { id: 'PAS', ar: 'جواز السفر' },
  { id: 'GCC', ar: 'بطاقة خليجية' },
  { id: 'TIN', ar: 'الرقم الضريبي (TIN)' },
  { id: 'CRN', ar: 'السجل التجاري (CRN)' },
]

const COUNTRIES = [
  { id: 'SA', ar: 'المملكة العربية السعودية' },
  { id: 'AE', ar: 'الإمارات العربية المتحدة' },
  { id: 'KW', ar: 'الكويت' },
  { id: 'BH', ar: 'البحرين' },
  { id: 'OM', ar: 'عُمان' },
  { id: 'QA', ar: 'قطر' },
  { id: 'EG', ar: 'مصر' },
  { id: 'JO', ar: 'الأردن' },
  { id: 'LB', ar: 'لبنان' },
  { id: 'OTHER', ar: 'أخرى' },
]

/* شروط السداد على كارت العميل — من البورد. الفاتورة بتقرأ منها
   تاريخ الاستحقاق بدل ما المستخدم يحسبه في كل مرة. */
const TERMS = [
  { id: '0',  ar: 'فوري — عند الاستلام' },
  { id: '15', ar: 'صافي ١٥ يومًا' },
  { id: '30', ar: 'صافي ٣٠ يومًا' },
  { id: '45', ar: 'صافي ٤٥ يومًا' },
  { id: '60', ar: 'صافي ٦٠ يومًا' },
]

const digits = (s) => (s || '').replace(/\D/g, '')
/* قاعدة الهيئة زي ما هي مكتوبة في شاشة إعدادات المنشأة في السيستم:
   ١٥ رقمًا تبدأ بـ٣ **وتنتهي بـ٣**. البورد كان كاتب النص الأول بس. */
const vatOk = (v) => /^3\d{13}3$/.test(digits(v))

const countAr = (n) => (n === 1 ? 'حقل واحد' : n === 2 ? 'حقلان' : `${n} حقول`)

export default function CustomerNew() {
  const { id: editId } = useParams()
  const isEdit = !!editId
  const nav = useNavigate()

  const [kind, setKind] = useState('biz')        /* شركة | فرد */
  const [code, setCode] = useState('CLI-939606')
  const [editCode, setEditCode] = useState(false)
  const [codeDraft, setCodeDraft] = useState('')

  const [ar, setAr] = useState('')
  const [en, setEn] = useState('')
  const [showEn, setShowEn] = useState(false)

  const [vatReg, setVatReg] = useState(true)
  const [vat, setVat] = useState('')
  const [crn, setCrn] = useState('')
  const [idType, setIdType] = useState('')
  const [idNo, setIdNo] = useState('')

  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [mobile, setMobile] = useState('')

  const [street, setStreet] = useState('')
  const [bldg, setBldg] = useState('')
  const [dist, setDist] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('SA')
  const [zip, setZip] = useState('')

  const [terms, setTerms] = useState('30')
  const [opening, setOpening] = useState('')

  const [people, setPeople] = useState([])
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)

  const startEditCode = () => { setCodeDraft(code); setEditCode(true) }
  const saveCode = () => { setCode(codeDraft.trim() || code); setEditCode(false) }

  const hasReach = !!(email || phone || mobile)
  /* العنوان الوطني: الشارع والحي والمدينة هم الحد الأدنى اللي الهيئة بتقراه */
  const addrOk = !!(street && dist && city)

  const errs = {}
  if (!ar.trim()) errs.ar = kind === 'biz' ? 'اسم الشركة مطلوب' : 'اسم العميل مطلوب'
  if (vatReg && !vatOk(vat)) errs.vat = 'الرقم الضريبي يجب أن يتكوّن من ١٥ رقمًا يبدأ بالرقم ٣ وينتهي به'
  if (!hasReach) errs.reach = 'أدخل وسيلة تواصل واحدة على الأقل — بريد أو هاتف'
  if (idType && !idNo.trim()) errs.idNo = 'أدخل رقم الهوية أو أعد النوع إلى «بدون»'

  const show = (k) => (tried ? errs[k] : null)
  const nErr = Object.keys(errs).length

  /* ★ قاعدة البورد: زرار الحفظ ميتقفلش أبدًا */
  const submit = () => setTried(true)

  const vatLen = digits(vat).length
  const zatcaReady = vatReg ? vatOk(vat) && addrOk : true

  return (
    <AppShell>
      <PageHeader back="/sales/customers" title={isEdit ? 'تعديل بيانات العميل' : 'عميل جديد'}
        actions={<>
          <button type="button" className="btn ob-hide-sm" onClick={submit}>حفظ وإنشاء فاتورة</button>
          <button type="button" className="btn btn--primary ob-hide-sm" onClick={submit}><Ico.check size={20} />حفظ العميل</button>
        </>} />
      {tried && nErr > 0 && <div style={{ marginBottom: 12 }}><Alert tone="err">ناقص {countAr(nErr)} — موضّحة في الحقول باللون الأحمر.</Alert></div>}

      <div className="docgrid">
        <div className="form">

          {/* ---------- ١) مين هو ---------- */}
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">بيانات العميل</h2>
              <div className="fcard__ctrl">
                <div className="segs segs--sm" role="group" aria-label="نوع العميل">
                  <button className={kind === 'biz' ? 'on' : ''} onClick={() => setKind('biz')}>شركة</button>
                  <button className={kind === 'ind' ? 'on' : ''} onClick={() => setKind('ind')}>فرد</button>
                </div>
              </div>
            </div>

            <div className="frow frow--2">
              <div className="fld">
                <span className="fld__l">
                  {kind === 'biz' ? 'اسم الشركة' : 'اسم العميل'} <em className="req">مطلوب</em>
                </span>
                <input className={`fld__i${show('ar') ? ' is-bad' : ''}`} value={ar}
                  placeholder={kind === 'biz' ? 'مثال: مؤسسة الخط المستقيم للتجارة' : 'مثال: عبدالله محمد الحربي'}
                  onChange={(e) => setAr(e.target.value)} />
                {show('ar') ? <em className="fld__e">{errs.ar}</em> : (
                  showEn ? null : (
                    <button type="button" className="lnk fld__add" onClick={() => setShowEn(true)}>
                      أضف الاسم بالإنجليزية
                    </button>
                  )
                )}
              </div>

              <div className="fld">
                <span className="fld__l">رمز العميل</span>
                {editCode ? (
                  <div className="fedit">
                    <input className="fld__i" value={codeDraft} autoFocus
                      onChange={(e) => setCodeDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveCode() }
                        if (e.key === 'Escape') setEditCode(false)
                      }} />
                    <span className="fedit__a">
                      <button type="button" className="lnk" onClick={saveCode}>حفظ</button>
                      <button type="button" className="lnk lnk--mute" onClick={() => setEditCode(false)}>إلغاء</button>
                    </span>
                  </div>
                ) : (
                  <div className="fld__ro fedit__ro">
                    <span className="fedit__v">{code}</span>
                    <button type="button" className="lnk" onClick={startEditCode}>تعديل</button>
                  </div>
                )}
                <em className="fld__h">يُولَّد تلقائيًا ويمكن تعديله</em>
              </div>
            </div>

            {showEn && (
              <div className="frow frow--2" style={{ marginTop: 14 }}>
                <div className="fld">
                  <span className="fld__l">الاسم بالإنجليزية <em className="fld__opt">يظهر في الفاتورة الإنجليزية</em></span>
                  <div className="fedit">
                    <input className="fld__i ltr" value={en} dir="ltr"
                      placeholder="Al Khat Al Mustaqeem Est."
                      onChange={(e) => setEn(e.target.value)} />
                    <span className="fedit__a">
                      <button type="button" className="lnk lnk--mute"
                        onClick={() => { setEn(''); setShowEn(false) }}>إزالة</button>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ---------- ٢) التسجيل الضريبي ---------- */}
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">التسجيل الضريبي</h2>
              <div className="fcard__ctrl">
                <div className="segs segs--sm" role="group" aria-label="حالة التسجيل الضريبي">
                  <button className={vatReg ? 'on' : ''} onClick={() => setVatReg(true)}>مسجَّل</button>
                  <button className={!vatReg ? 'on' : ''} onClick={() => setVatReg(false)}>غير مسجَّل</button>
                </div>
              </div>
            </div>

            {vatReg ? (
              <>
                <div className="frow frow--2">
                  <div className="fld">
                    <span className="fld__l">الرقم الضريبي <em className="req">مطلوب</em></span>
                    <input className={`fld__i ltr${show('vat') ? ' is-bad' : ''}`} value={vat} inputMode="numeric"
                      maxLength={15} placeholder="3XXXXXXXXXXXXX3"
                      onChange={(e) => setVat(digits(e.target.value).slice(0, 15))} />
                    {show('vat')
                      ? <em className="fld__e">{errs.vat}</em>
                      : <em className="fld__h">
                          ١٥ رقمًا تبدأ بـ٣ وتنتهي بـ٣ · <b className="num">{vatLen}/15</b>
                        </em>}
                  </div>
                  <label className="fld">
                    <span className="fld__l">السجل التجاري / الرقم الموحّد <em className="fld__opt">اختياري</em></span>
                    <input className="fld__i ltr" value={crn} inputMode="numeric"
                      onChange={(e) => setCrn(digits(e.target.value).slice(0, 10))} />
                  </label>
                </div>

                <div className="frow frow--2" style={{ marginTop: 14 }}>
                  <label className="fld">
                    <span className="fld__l">نوع الهوية الإضافية <em className="fld__opt">اختياري</em></span>
                    <Select className="fld__i" value={idType}
                      onChange={(e) => { setIdType(e.target.value); if (!e.target.value) setIdNo('') }}>
                      {ID_TYPES.map((t) => <option key={t.id || 'none'} value={t.id}>{t.ar}</option>)}
                    </Select>
                  </label>
                  <div className="fld">
                    <span className="fld__l">رقم الهوية الإضافية</span>
                    <input className={`fld__i${show('idNo') ? ' is-bad' : ''}`} value={idNo} disabled={!idType}
                      onChange={(e) => setIdNo(e.target.value)} />
                    {show('idNo')
                      ? <em className="fld__e">{errs.idNo}</em>
                      : <em className="fld__h">
                          {idType ? 'يُرسل مع بيانات المشتري للهيئة' : 'يُفعَّل بعد اختيار نوع الهوية'}
                        </em>}
                  </div>
                </div>
              </>
            ) : (
              <p className="fnote fnote--quiet">
                فواتير هذا العميل تُصدر كفاتورة مبسّطة (B2C) — لا تحتاج رقمًا ضريبيًا للمشتري.
              </p>
            )}
          </section>

          {/* ---------- ٣) نوصله إزاي ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">
              بيانات التواصل {!hasReach && <em>وسيلة واحدة على الأقل</em>}
            </h2>
            <div className="frow frow--2">
              <label className="fld">
                <span className="fld__l">اسم جهة الاتصال <em className="fld__opt">اختياري</em></span>
                <input className="fld__i" value={contact} placeholder="الشخص المسؤول عن الفواتير"
                  onChange={(e) => setContact(e.target.value)} />
              </label>
              <div className="fld">
                <span className="fld__l">البريد الإلكتروني</span>
                <input className={`fld__i ltr${show('reach') ? ' is-bad' : ''}`} type="email" dir="ltr" value={email}
                  placeholder="accounts@company.com.sa" onChange={(e) => setEmail(e.target.value)} />
                <em className="fld__h">تُرسل إليه الفواتير وروابط السداد</em>
              </div>
            </div>
            <div className="frow frow--2" style={{ marginTop: 14 }}>
              <label className="fld">
                <span className="fld__l">الجوال</span>
                <input className={`fld__i ltr${show('reach') ? ' is-bad' : ''}`} value={mobile} inputMode="tel"
                  placeholder="05XXXXXXXX" onChange={(e) => setMobile(e.target.value)} />
              </label>
              <label className="fld">
                <span className="fld__l">الهاتف <em className="fld__opt">اختياري</em></span>
                <input className="fld__i ltr" value={phone} inputMode="tel"
                  placeholder="011XXXXXXX" onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>
            {show('reach') && <em className="fld__e fld__e--blk">{errs.reach}</em>}
          </section>

          {/* ---------- ٤) العنوان الوطني ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">
              العنوان الوطني {vatReg && <em>تطلبه الهيئة في فواتير العملاء المسجَّلين</em>}
            </h2>
            <div className="frow frow--2">
              <label className="fld">
                <span className="fld__l">اسم الشارع</span>
                <input className="fld__i" value={street} onChange={(e) => setStreet(e.target.value)} />
              </label>
              <label className="fld">
                <span className="fld__l">رقم المبنى</span>
                <input className="fld__i ltr" value={bldg} inputMode="numeric" maxLength={4}
                  onChange={(e) => setBldg(digits(e.target.value).slice(0, 4))} />
              </label>
            </div>
            <div className="frow frow--2" style={{ marginTop: 14 }}>
              <label className="fld">
                <span className="fld__l">الحي</span>
                <input className="fld__i" value={dist} onChange={(e) => setDist(e.target.value)} />
              </label>
              <label className="fld">
                <span className="fld__l">المدينة</span>
                <input className="fld__i" value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
            </div>
            <div className="frow frow--3" style={{ marginTop: 14 }}>
              <label className="fld">
                <span className="fld__l">المنطقة</span>
                <input className="fld__i" value={region} onChange={(e) => setRegion(e.target.value)} />
              </label>
              <label className="fld">
                <span className="fld__l">البلد</span>
                <Select className="fld__i" value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRIES.map((x) => <option key={x.id} value={x.id}>{x.ar}</option>)}
                </Select>
              </label>
              <label className="fld">
                <span className="fld__l">الرمز البريدي</span>
                <input className="fld__i ltr" value={zip} inputMode="numeric" maxLength={5}
                  onChange={(e) => setZip(digits(e.target.value).slice(0, 5))} />
              </label>
            </div>
          </section>

          {/* ---------- ٥) شروط التعامل ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">شروط التعامل والرصيد</h2>
            <div className="frow frow--2">
              <label className="fld">
                <span className="fld__l">شروط السداد</span>
                <Select className="fld__i" value={terms} onChange={(e) => setTerms(e.target.value)}>
                  {TERMS.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
                </Select>
                <em className="fld__h">تُحسب منها تواريخ استحقاق فواتيره تلقائيًا</em>
              </label>
              <label className="fld">
                <span className="fld__l">الرصيد الافتتاحي <em className="fld__opt">اختياري</em></span>
                <input className="fld__i ltr" value={opening} inputMode="decimal" placeholder="0.00"
                  onChange={(e) => setOpening(e.target.value.replace(/[^\d.]/g, ''))} />
                <em className="fld__h">ما عليه من مستحقات قبل استخدام النظام</em>
              </label>
            </div>
          </section>

          {/* ---------- ٦) جهات اتصال إضافية ---------- */}
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">جهات اتصال إضافية</h2>
              <button className="gbtn2"
                onClick={() => setPeople((p) => [...p, { n: `جهة اتصال ${p.length + 2}`, r: 'الحسابات' }])}>
                <Ico.plus size={14} />إضافة جهة اتصال
              </button>
            </div>
            {people.length === 0
              ? <p className="fempty">لا توجد جهات اتصال إضافية — تكفي جهة الاتصال الرئيسية أعلاه.</p>
              : (
                <ul className="flist">
                  {people.map((p, i) => (
                    <li key={i}>
                      <Ico.user size={16} /><b>{p.n}</b><span>{p.r}</span>
                      <button aria-label="إزالة جهة الاتصال"
                        onClick={() => setPeople((x) => x.filter((_, j) => j !== i))}>
                        <Ico.close size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </section>

          {/* ---------- ٧) ملاحظات ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">ملاحظات <em>داخلية — لا تظهر للعميل</em></h2>
            <textarea className="fld__i fld__i--area" value={note}
              placeholder="مثال: التعامل عبر أمر شراء فقط، والسداد بعد اعتماد المشروع."
              onChange={(e) => setNote(e.target.value)} />
          </section>
        </div>

        {/* ---------- الملخّص ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">{kind === 'biz' ? 'شركة' : 'فرد'}</span>
            <span className="rail__v rail__v--ar">{ar.trim() || 'عميل بلا اسم'}</span>
            <dl className="rail__sum rail__sum--flat">
              <div><dt>رمز العميل</dt><dd className="num">{code}</dd></div>
              <div><dt>شروط السداد</dt><dd>{TERMS.find((t) => t.id === terms)?.ar}</dd></div>
              <div><dt>الرصيد الافتتاحي</dt><dd><SAR v={Number(opening) || 0} dec /></dd></div>
            </dl>
          </section>

          {/* السؤال اللي مفيش حقل بيجاوبه */}
          <section className={`rail__c${vatReg && !zatcaReady ? ' rail__c--warn' : ''}`}>
            <span className="rail__lbl">جاهزية فواتيره للهيئة</span>
            {vatReg ? (
              <>
                <ul className="rail__check">
                  <li className={vatOk(vat) ? 'is-ok' : ''}><Ico.check size={14} />رقم ضريبي صحيح</li>
                  <li className={addrOk ? 'is-ok' : ''}><Ico.check size={14} />عنوان وطني كامل</li>
                </ul>
                <p className="fnote fnote--quiet">
                  {zatcaReady
                    ? 'بياناته تكفي لإصدار فاتورة ضريبية بين منشأتين.'
                    : 'بدونهما لن تُقبل فواتيره كفاتورة ضريبية بين منشأتين — يمكنك الحفظ الآن وإكمالها لاحقًا.'}
                </p>
              </>
            ) : (
              <p className="fnote fnote--quiet">
                عميل غير مسجَّل — فواتيره مبسّطة، ولا تحتاج رقمًا ضريبيًا ولا عنوانًا وطنيًا.
              </p>
            )}
          </section>

          <section className="rail__c">
            <span className="rail__lbl">قبل الحفظ</span>
            <ul className="rail__check">
              <li className={ar.trim() ? 'is-ok' : ''}><Ico.check size={14} />الاسم</li>
              <li className={hasReach ? 'is-ok' : ''}><Ico.check size={14} />وسيلة تواصل</li>
              <li className={!vatReg || vatOk(vat) ? 'is-ok' : ''}><Ico.check size={14} />الرقم الضريبي</li>
              <li className={!idType || idNo.trim() ? 'is-ok' : ''}><Ico.check size={14} />رقم الهوية الإضافية</li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="ob-stickybar">
        <button type="button" className="btn" onClick={submit}>حفظ وإنشاء فاتورة</button>
        <button type="button" className="btn btn--primary" onClick={submit}>حفظ العميل</button>
      </div>
    </AppShell>
  )
}
