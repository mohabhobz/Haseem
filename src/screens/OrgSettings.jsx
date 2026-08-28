import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import * as DATA from '../data/mock.js'
import {
  FONTS_AR, FONTS_EN, SWATCHES, DEFAULT_BRAND,
  getBrand, saveBrand, resetBrand, applyBrand,
  hexToHsl, hslToHex, contrast,
} from '../lib/brand.js'
import { BrandTab } from '../components/brandtab.jsx'

/* ============================================================
   إعدادات المنشأة.

   دي الشاشة اللي كل المستندات بتقرا منها: الشعار والختم اللي
   بيتطبعوا، والرقم الضريبي اللي بيروح للهيئة، والفرع والحساب
   البنكي اللي بيتعبّوا لوحدهم في كل فاتورة جديدة، وشكل الأرقام
   في كل التقارير. عشان كده كل حقل هنا مكتوب تحته **بيأثر على إيه**
   — مش وصف للحقل، وصف لنتيجته.

   المصدر: شاشة الإعدادات في السيستم الحقيقي، اتجردت حقل بحقل.
   الترتيب اتغيّر: القسم الواحد بقى بيجاوب سؤال واحد بدل ما تكون
   كل الحقول مرصوصة في كارت واحد طويل.
   ============================================================ */

const SECTIONS = [
  { id: 'ident',  t: 'هوية المنشأة' },
  { id: 'tax',    t: 'التسجيل الضريبي' },
  { id: 'branch', t: 'الفرع الافتراضي' },
  { id: 'addr',   t: 'العنوان والتواصل' },
  { id: 'defs',   t: 'افتراضيات المستندات' },
  { id: 'nums',   t: 'تنسيق الأرقام' },
  { id: 'seq',    t: 'ترقيم المستندات' },
  { id: 'curr',   t: 'العملات' },
  { id: 'zatca',  t: 'الربط بمنصة فاتورة' },
  { id: 'links',  t: 'روابط سريعة' },
]

/* العملات اللي ينفع تتضاف. السعر الافتراضي هو سعر اليوم التقريبي
   مقابل الريال — المستخدم بيقدر يعدّله، وده كل الفكرة: السعر بيتغيّر. */
const CURRENCIES = [
  { code: 'USD', ar: 'دولار أمريكي',    rate: '3.750000' },
  { code: 'AED', ar: 'درهم إماراتي',    rate: '1.021000' },
  { code: 'BHD', ar: 'دينار بحريني',    rate: '9.950000' },
  { code: 'KWD', ar: 'دينار كويتي',     rate: '12.240000' },
  { code: 'QAR', ar: 'ريال قطري',       rate: '1.030000' },
  { code: 'OMR', ar: 'ريال عُماني',      rate: '9.740000' },
  { code: 'EUR', ar: 'يورو',            rate: '4.310000' },
  { code: 'GBP', ar: 'جنيه إسترليني',   rate: '5.030000' },
  { code: 'JOD', ar: 'دينار أردني',     rate: '5.290000' },
  { code: 'EGP', ar: 'جنيه مصري',       rate: '0.077000' },
  { code: 'TRY', ar: 'ليرة تركية',      rate: '0.109000' },
  { code: 'CNY', ar: 'يوان صيني',       rate: '0.525000' },
  { code: 'INR', ar: 'روبية هندية',     rate: '0.045000' },
]

const ID_TYPES = [
  { id: '',    ar: 'بدون' },
  { id: 'MOM', ar: 'رخصة بلدية (MOMRA)' },
  { id: 'MLS', ar: 'رخصة عمل (MLSD)' },
  { id: 'SAG', ar: 'رخصة استثمار أجنبي (SAGIA)' },
  { id: 'GCC', ar: 'رقم خليجي موحّد' },
  { id: 'OTH', ar: 'أخرى' },
]

const LANGS = [
  { id: 'ar', ar: 'العربية' },
  { id: 'en', ar: 'الإنجليزية' },
]

const CUST_KINDS = [
  { id: 'b2b', ar: 'أعمال لأعمال (B2B) — فواتير ضريبية' },
  { id: 'b2c', ar: 'أعمال لأفراد (B2C) — فواتير مبسّطة' },
]

/* شكل الأرقام في كل التقارير والمستندات */
const NUM_FORMATS = [
  { id: 'comma', ar: '10,000.00', g: ',', d: '.' },
  { id: 'dot',   ar: '10.000,00', g: '.', d: ',' },
  { id: 'space', ar: '10 000.00', g: ' ', d: '.' },
  { id: 'none',  ar: '10000.00',  g: '',  d: '.' },
]

const digits = (s) => (s || '').replace(/\D/g, '')
/* قاعدة الهيئة زي ما هي مكتوبة في السيستم: ١٥ رقمًا تبدأ بـ٣ وتنتهي بـ٣ */
const vatOk = (v) => /^3\d{13}3$/.test(digits(v))

function fmtSample(n, fid, neg) {
  const f = NUM_FORMATS.find((x) => x.id === fid) || NUM_FORMATS[0]
  const s = Math.abs(n).toFixed(2)
  const [i, dec] = s.split('.')
  const grouped = f.g ? i.replace(/\B(?=(\d{3})+(?!\d))/g, f.g) : i
  const out = `${grouped}${f.d}${dec}`
  if (n >= 0) return out
  return neg === 'paren' ? `(${out})` : `−${out}`
}

const TABS = [
  { id: 'general', t: 'الإعدادات العامة' },
  { id: 'brand',   t: 'هوية المنشأة' },
]

export default function OrgSettings() {
  const nav = useNavigate()
  const [tab, setTab] = useState('general')

  /* الهوية */
  const [logo, setLogo] = useState(true)
  const [stamp, setStamp] = useState(false)
  const [ar, setAr] = useState(DATA.org.nameAr)
  const [en, setEn] = useState(DATA.org.nameEn)

  /* الضريبي */
  const [vat, setVat] = useState(DATA.org.vat)
  const [idType, setIdType] = useState('')
  const [idNo, setIdNo] = useState('')
  const [cr, setCr] = useState(DATA.org.cr)

  /* الفرع */
  const [branch, setBranch] = useState(DATA.branches[0].id)

  /* العنوان */
  const [street, setStreet] = useState('طريق الملك فهد')
  const [bldg, setBldg] = useState('1200')
  const [dist, setDist] = useState('حي العليا')
  const [city, setCity] = useState('الرياض')
  const [region, setRegion] = useState('منطقة الرياض')
  const [zip, setZip] = useState('12214')
  const [phone, setPhone] = useState('+966112345678')
  const [email, setEmail] = useState('info@websquids.sa')

  /* الافتراضيات */
  const [lang, setLang] = useState('ar')
  const [kind, setKind] = useState('b2b')
  const [bank, setBank] = useState(DATA.banks[0].id)

  /* الأرقام والترقيم */
  const [numF, setNumF] = useState('comma')
  const [neg, setNeg] = useState('paren')
  const [seq, setSeq] = useState('seq')

  /* العملات — الصف نفسه هو محرِّره: العملة والسعر بيتغيّروا في مكانهم */
  const [currs, setCurrs] = useState([{ id: 'C0', code: 'USD', rate: '3.750000' }])
  const used = new Set(currs.map((c) => c.code))
  const addCurr = () => {
    const free = CURRENCIES.find((x) => !used.has(x.code))
    if (!free) return
    setCurrs((c) => [...c, { id: `C${Date.now()}`, code: free.code, rate: free.rate }])
  }
  const setCurr = (i, patch) => setCurrs((x) => x.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const pickCurr = (i, code) => {
    const m = CURRENCIES.find((x) => x.code === code)
    setCurr(i, { code, rate: m ? m.rate : '1.000000' })
  }
  /* المقلوب: بيمنع أشهر غلطة في الإدخال — إن الواحد يكتب السعر بالمقلوب */
  const inverse = (r) => {
    const n = parseFloat(r)
    if (!n || n <= 0) return null
    return (1 / n).toFixed(6)
  }

  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState(false)

  const errs = {}
  if (!ar.trim()) errs.ar = 'اسم المنشأة بالعربية مطلوب — يظهر في كل مستند'
  if (!vatOk(vat)) errs.vat = 'الرقم الضريبي يجب أن يتكوّن من ١٥ رقمًا يبدأ بالرقم ٣ وينتهي به'
  if (idType && !idNo.trim()) errs.idNo = 'أدخل رقم الهوية أو أعد النوع إلى «بدون»'
  const show = (k) => (tried ? errs[k] : null)
  const nErr = Object.keys(errs).length

  const save = () => { setTried(true); if (!nErr) setSaved(true) }
  const goTo = (id) => document.getElementById(id)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const vatLen = digits(vat).length
  const b = DATA.branches.find((x) => x.id === branch)

  return (
    <AppShell>
      <div className="dochead">
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no dochead__no--ar">إعدادات المنشأة</h1>
            <span className="dochead__sub">بيانات الشركة والضرائب والتكاملات</span>
          </div>
        </div>
      </div>

      {/* تابات الإعدادات */}
      <div className="settabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={`settab${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}>{t.t}</button>
        ))}
      </div>

      {tab === 'brand' ? <BrandTab /> : (
      <>
      <div className="docgrid">
        <div className="form">

          {/* ---------- ١) الهوية ---------- */}
          <section className="fcard" id="ident">
            <h2 className="fcard__t">هوية المنشأة <em>تظهر في رأس كل مستند وفي الطباعة</em></h2>

            <div className="idrow">
              <div className="fld fld--logo">
                <span className="fld__l">الشعار</span>
                <button className={`updrop${logo ? ' is-set' : ''}`} onClick={() => setLogo((v) => !v)}>
                  {logo ? <img src={DATA.org.logo} alt="" />
                        : <><Ico.plus size={18} /><em>رفع الشعار</em></>}
                </button>
                <em className="fld__h">PNG · حتى ٢MB</em>
              </div>

              <div className="fld fld--logo">
                <span className="fld__l">الختم</span>
                <button className={`updrop${stamp ? ' is-set' : ''}`} onClick={() => setStamp((v) => !v)}>
                  {stamp ? <span className="stampmark">مُعتمد</span>
                         : <><Ico.plus size={18} /><em>رفع الختم</em></>}
                </button>
                <em className="fld__h">يُطبع على المستند</em>
              </div>

              <div className="idrow__f">
                <div className="fld">
                  <span className="fld__l">اسم المنشأة بالعربية <em className="req">مطلوب</em></span>
                  <input className={`fld__i${show('ar') ? ' is-bad' : ''}`} value={ar}
                    onChange={(e) => setAr(e.target.value)} />
                  {show('ar') && <em className="fld__e">{errs.ar}</em>}
                </div>
                <label className="fld">
                  <span className="fld__l">اسم المنشأة بالإنجليزية</span>
                  <input className="fld__i ltr" dir="ltr" value={en}
                    onChange={(e) => setEn(e.target.value)} />
                  <em className="fld__h">يظهر في النسخة الإنجليزية من الفاتورة</em>
                </label>
              </div>
            </div>
          </section>

          {/* ---------- ٢) التسجيل الضريبي ---------- */}
          <section className="fcard" id="tax">
            <h2 className="fcard__t">التسجيل الضريبي <em>يُرسل مع كل فاتورة للهيئة</em></h2>

            <div className="frow frow--2">
              <div className="fld">
                <span className="fld__l">الرقم الضريبي <em className="req">مطلوب</em></span>
                <input className={`fld__i ltr${show('vat') ? ' is-bad' : ''}`} value={vat}
                  inputMode="numeric" maxLength={15} placeholder="3XXXXXXXXXXXXX3"
                  onChange={(e) => setVat(digits(e.target.value).slice(0, 15))} />
                {show('vat')
                  ? <em className="fld__e">{errs.vat}</em>
                  : <em className="fld__h">١٥ رقمًا تبدأ بـ٣ وتنتهي بـ٣ · <b className="num">{vatLen}/15</b></em>}
              </div>
              <label className="fld">
                <span className="fld__l">رقم السجل التجاري / الرقم الموحّد</span>
                <input className="fld__i ltr" value={cr} inputMode="numeric"
                  onChange={(e) => setCr(digits(e.target.value).slice(0, 10))} />
                <em className="fld__h">{b?.ar}</em>
              </label>
            </div>

            <div className="frow frow--2" style={{ marginTop: 14 }}>
              <label className="fld">
                <span className="fld__l">هوية بديلة للمنشأة <em className="fld__opt">اختياري</em></span>
                <select className="fld__i" value={idType}
                  onChange={(e) => { setIdType(e.target.value); if (!e.target.value) setIdNo('') }}>
                  {ID_TYPES.map((t) => <option key={t.id || 'none'} value={t.id}>{t.ar}</option>)}
                </select>
                <em className="fld__h">تُستخدم فقط عند عدم وجود سجل تجاري</em>
              </label>
              <div className="fld">
                <span className="fld__l">رقم الهوية البديلة</span>
                <input className={`fld__i ltr${show('idNo') ? ' is-bad' : ''}`} value={idNo}
                  disabled={!idType} onChange={(e) => setIdNo(e.target.value)} />
                {show('idNo')
                  ? <em className="fld__e">{errs.idNo}</em>
                  : <em className="fld__h">{idType ? 'يُرسل ضمن بيانات البائع' : 'يُفعَّل بعد اختيار نوع الهوية'}</em>}
              </div>
            </div>
          </section>

          {/* ---------- ٣) الفرع الافتراضي ---------- */}
          <section className="fcard" id="branch">
            <div className="fcard__h">
              <h2 className="fcard__t">الفرع الافتراضي</h2>
              <div className="fcard__ctrl">
                <button className="gbtn2"><Ico.plus size={14} />أضف فرعًا</button>
                <button className="lnk lnk--mute">إدارة الفروع</button>
              </div>
            </div>
            <div className="frow frow--2">
              <label className="fld">
                <span className="fld__l">الفرع</span>
                <select className="fld__i" value={branch} onChange={(e) => setBranch(e.target.value)}>
                  {DATA.branches.map((x) => (
                    <option key={x.id} value={x.id}>{x.id} — {x.ar}</option>
                  ))}
                </select>
                <em className="fld__h">يُستخدم كقيمة افتراضية للمستندات الجديدة عند تفعيل الفروع</em>
              </label>
            </div>
          </section>

          {/* ---------- ٤) العنوان والتواصل ---------- */}
          <section className="fcard" id="addr">
            <h2 className="fcard__t">
              العنوان والتواصل <em>{b?.id} — العنوان الوطني المطبوع على الفاتورة</em>
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
                <span className="fld__l">الرمز البريدي</span>
                <input className="fld__i ltr" value={zip} inputMode="numeric" maxLength={5}
                  onChange={(e) => setZip(digits(e.target.value).slice(0, 5))} />
              </label>
              <div className="fld">
                <span className="fld__l">البلد</span>
                <div className="fld__ro fedit__ro">
                  <span>المملكة العربية السعودية</span>
                </div>
                <em className="fld__h">لا يمكن تغييره — المنشأة مسجّلة في السعودية</em>
              </div>
            </div>
            <div className="frow frow--2" style={{ marginTop: 14 }}>
              <label className="fld">
                <span className="fld__l">الهاتف</span>
                <input className="fld__i ltr" dir="ltr" value={phone} inputMode="tel"
                  onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="fld">
                <span className="fld__l">البريد الإلكتروني</span>
                <input className="fld__i ltr" dir="ltr" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
          </section>

          {/* ---------- ٥) افتراضيات المستندات ---------- */}
          <section className="fcard" id="defs">
            <h2 className="fcard__t">افتراضيات المستندات <em>تتعبّى تلقائيًا في كل مستند جديد</em></h2>

            <div className="frow frow--3">
              <div className="fld">
                <span className="fld__l">العملة</span>
                <div className="fld__ro fedit__ro">
                  <span className="fedit__v">SAR</span><Riyal />
                </div>
                <em className="fld__h">عملة المنشأة الأساسية</em>
              </div>
              <label className="fld">
                <span className="fld__l">اللغة الافتراضية</span>
                <select className="fld__i" value={lang} onChange={(e) => setLang(e.target.value)}>
                  {LANGS.map((l) => <option key={l.id} value={l.id}>{l.ar}</option>)}
                </select>
                <em className="fld__h">لغة الواجهة وقوالب الطباعة</em>
              </label>
              <label className="fld">
                <span className="fld__l">نوع العميل الأساسي</span>
                <select className="fld__i" value={kind} onChange={(e) => setKind(e.target.value)}>
                  {CUST_KINDS.map((k) => <option key={k.id} value={k.id}>{k.ar}</option>)}
                </select>
                <em className="fld__h">يحدد نوع الفاتورة المقترح</em>
              </label>
            </div>

            <label className="fld" style={{ marginTop: 14 }}>
              <span className="fld__l">الحساب البنكي الافتراضي للفواتير</span>
              <select className="fld__i" value={bank} onChange={(e) => setBank(e.target.value)}>
                {DATA.banks.map((k) => <option key={k.id} value={k.id}>{k.ar} — {k.holder}</option>)}
              </select>
              <em className="fld__h">
                يُطبع على الفاتورة مع الآيبان. تُضاف الحسابات وتُعدَّل من «النقد والبنوك».
              </em>
            </label>
          </section>

          {/* ---------- ٦) تنسيق الأرقام ---------- */}
          <section className="fcard" id="nums">
            <h2 className="fcard__t">تنسيق الأرقام <em>يسري على كل المستندات والتقارير</em></h2>

            <div className="frow frow--2">
              <label className="fld">
                <span className="fld__l">فاصل الآلاف والكسور</span>
                <select className="fld__i ltr" value={numF} onChange={(e) => setNumF(e.target.value)}>
                  {NUM_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.ar}</option>)}
                </select>
              </label>
              <label className="fld">
                <span className="fld__l">الأرقام السالبة</span>
                <select className="fld__i" value={neg} onChange={(e) => setNeg(e.target.value)}>
                  <option value="paren">بين قوسين — (101,600.00)</option>
                  <option value="minus">بإشارة سالب — −101,600.00</option>
                </select>
                <em className="fld__h">القوسان هما المتعارف عليه محاسبيًا</em>
              </label>
            </div>

            {/* المعاينة بتتغيّر مع الاختيار — مش صورة ثابتة */}
            <div className="numprev">
              <span className="numprev__l">معاينة</span>
              <div className="numprev__r">
                <b className="num">{fmtSample(101600, numF, neg)}</b>
                <b className="num is-neg">{fmtSample(-101600, numF, neg)}</b>
                <b className="num">{fmtSample(1234.5, numF, neg)}</b>
              </div>
            </div>
          </section>

          {/* ---------- ٧) ترقيم المستندات ---------- */}
          <section className="fcard" id="seq">
            <h2 className="fcard__t">ترقيم المستندات <em>يسري على المستندات الجديدة فقط</em></h2>

            <div className="optcards">
              <button className={`optcard${seq === 'seq' ? ' is-on' : ''}`} onClick={() => setSeq('seq')}>
                <i className="optcard__r" />
                <span className="optcard__t">
                  أرقام تسلسلية <em>الافتراضي</em>
                </span>
                <span className="optcard__s">
                  أرقام مرتبة بالتتابع — <span className="num">INV-000001</span>،
                  <span className="num"> INV-000002</span>. أسهل في المراجعة والتدقيق.
                </span>
              </button>

              <button className={`optcard${seq === 'rand' ? ' is-on' : ''}`} onClick={() => setSeq('rand')}>
                <i className="optcard__r" />
                <span className="optcard__t">أرقام عشوائية</span>
                <span className="optcard__s">
                  أرقام غير متسلسلة يصعب تخمينها — تمنع معرفة حجم مبيعاتك من رقم فاتورة واحدة.
                </span>
              </button>
            </div>

            <p className="fnote fnote--quiet">
              المستندات الحالية تحتفظ بأرقامها عند تغيير هذا الإعداد.
            </p>
          </section>

          {/* ---------- ٨) العملات ---------- */}
          <section className="fcard" id="curr">
            <div className="fcard__h">
              <h2 className="fcard__t">العملات <em>للتعامل مع عملاء خارج المملكة</em></h2>
              <button className="gbtn2" onClick={addCurr} disabled={used.size >= CURRENCIES.length}>
                <Ico.plus size={14} />إضافة عملة
              </button>
            </div>

            {currs.length === 0 ? (
              <p className="fempty">
                لا توجد عملات إضافية — كل المستندات بالريال السعودي.
              </p>
            ) : (
              <div className="crlist">
                <div className="crow crow--h">
                  <span>العملة</span>
                  <span>سعر التحويل مقابل الريال</span>
                  <span />
                </div>

                {currs.map((c, i) => {
                  const inv = inverse(c.rate)
                  return (
                    <div className="crow" key={c.id}>
                      <select className="fld__i" value={c.code} aria-label="العملة"
                        onChange={(e) => pickCurr(i, e.target.value)}>
                        {CURRENCIES.map((x) => (
                          <option key={x.code} value={x.code}
                            disabled={x.code !== c.code && used.has(x.code)}>
                            {x.ar} — {x.code}
                          </option>
                        ))}
                      </select>

                      <div className="crow__rate">
                        <div className={`crate${inv ? '' : ' is-bad'}`}>
                          <span className="crate__p num">1 {c.code} =</span>
                          <input className="crate__i num" inputMode="decimal" value={c.rate}
                            aria-label={`سعر ${c.code} مقابل الريال`}
                            onChange={(e) => setCurr(i, { rate: e.target.value })} />
                          <span className="crate__s">ريال</span>
                        </div>
                        <em className={`fld__h${inv ? '' : ' fld__h--err'}`}>
                          {inv
                            ? <>أي أن <span className="num">1</span> ريال = <span className="num">{inv}</span> {c.code}</>
                            : 'أدخل رقمًا أكبر من صفر'}
                        </em>
                      </div>

                      <button className="crow__x" aria-label={`إزالة ${c.code}`}
                        onClick={() => setCurrs((x) => x.filter((_, j) => j !== i))}>
                        <Ico.close size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <p className="fnote fnote--quiet">
              السعر ده هو المستخدم وقت إصدار المستند، وبيتخزّن جوّه المستند —
              فتغييره هنا مش بيمسّ فواتير قديمة. الفاتورة بعملة أجنبية بتتطبع
              بالمبلغ الأصلي وما يعادله بالريال، لأن الهيئة بتحسب الضريبة بالريال.
            </p>
          </section>

          {/* ---------- ٩) الربط بمنصة فاتورة ---------- */}
          <section className="fcard" id="zatca">
            <h2 className="fcard__t">الربط بمنصة فاتورة <em>بوابة الهيئة للفوترة الإلكترونية</em></h2>

            <div className={`zint${DATA.org.zatcaOk ? ' is-ok' : ''}`}>
              <span className="zint__ic">
                {DATA.org.zatcaOk ? <Ico.check size={18} /> : <Ico.ban size={18} />}
              </span>
              <span className="zint__b">
                <b>{DATA.org.zatca}</b>
                <span>{DATA.org.zatcaSync}</span>
              </span>
              <button className="gbtn2"><Ico.retry size={14} />مزامنة الآن</button>
            </div>

            <p className="fnote fnote--quiet">
              فكّ الربط يوقف إصدار الفواتير الضريبية — لا يتم إلا من الهيئة نفسها.
            </p>
          </section>

          {/* ---------- ١٠) روابط سريعة ---------- */}
          <section className="fcard" id="links">
            <h2 className="fcard__t">روابط سريعة</h2>
            <div className="qlinks">
              <button className="qlink">
                <span className="qlink__ic"><Ico.card size={17} /></span>
                <span className="qlink__b">
                  <b>الاشتراك والفوترة</b><span>خطة الاشتراك والفواتير المستحقة عليك لحسيم</span>
                </span>
                <Ico.back size={16} className="qlink__go" />
              </button>
              <button className="qlink">
                <span className="qlink__ic"><Ico.user size={17} /></span>
                <span className="qlink__b">
                  <b>الملف الشخصي</b><span>حسابك وكلمة المرور وبيانات الدخول</span>
                </span>
                <Ico.back size={16} className="qlink__go" />
              </button>
            </div>
          </section>
        </div>

        {/* ---------- الرَّيل: فهرس الأقسام ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">أقسام الصفحة</span>
            <nav className="setnav">
              {SECTIONS.map((s) => (
                <button key={s.id} onClick={() => goTo(s.id)}>{s.t}</button>
              ))}
            </nav>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">تأثير هذه الإعدادات</span>
            <ul className="rail__check">
              <li className={logo ? 'is-ok' : ''}><Ico.check size={14} />الشعار على المستندات</li>
              <li className={stamp ? 'is-ok' : ''}><Ico.check size={14} />الختم على المستندات</li>
              <li className={vatOk(vat) ? 'is-ok' : ''}><Ico.check size={14} />رقم ضريبي صالح</li>
              <li className={DATA.org.zatcaOk ? 'is-ok' : ''}><Ico.check size={14} />مربوط بمنصة فاتورة</li>
            </ul>
            <p className="fnote fnote--quiet">
              من غير رقم ضريبي صالح وربط بالمنصة، الفواتير تُحفظ مسودات ولا تُصدر.
            </p>
          </section>
        </aside>
      </div>

      <div className="savebar" data-component="SaveBar">
        <span className={`savebar__s${tried && nErr ? ' is-bad' : ''}`}>
          {tried && nErr
            ? <><Ico.close size={15} />فيه {nErr === 1 ? 'حقل' : `${nErr} حقول`} ناقصة — موضّحة أعلاه</>
            : saved
              ? <><Ico.check size={15} />تم حفظ الإعدادات</>
              : 'التغييرات تسري على المستندات الجديدة فقط'}
        </span>
        <div className="savebar__b">
          <button className="btn btn--ghost" onClick={() => nav('/dashboard')}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>
            <Ico.check size={16} />حفظ التغييرات
          </button>
        </div>
      </div>
      </>
      )}
    </AppShell>
  )
}
