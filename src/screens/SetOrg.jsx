import { useState } from 'react'
import { SettingsShell } from '../components/settingsshell.jsx'
import { Ico } from '../components/icons.jsx'
import { toast } from '../components/feedback.jsx'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   إعدادات المنشأة — الهوية والتسجيل الضريبي والعنوان.

   الصفحة دي هي اللي كل مستند بيقرا منها: الشعار والختم اللي
   بيتطبعوا، والرقم الضريبي اللي بيروح للهيئة، والعنوان الوطني
   اللي بيتطبع على الفاتورة.

   كل حقل مكتوب تحته **بيأثر على إيه** — مش وصف للحقل، وصف
   لنتيجته.
   ============================================================ */

const ID_TYPES = [
  { id: '',    ar: 'بدون' },
  { id: 'MOM', ar: 'رخصة بلدية (MOMRA)' },
  { id: 'MLS', ar: 'رخصة عمل (MLSD)' },
  { id: 'SAG', ar: 'رخصة استثمار أجنبي (SAGIA)' },
  { id: 'GCC', ar: 'رقم خليجي موحّد' },
  { id: 'OTH', ar: 'أخرى' },
]

const digits = (s) => (s || '').replace(/\D/g, '')
/* قاعدة الهيئة زي ما هي: ١٥ رقمًا تبدأ بـ٣ وتنتهي بـ٣ */
const vatOk = (v) => /^3\d{13}3$/.test(digits(v))

export default function SetOrg() {
  const [logo, setLogo] = useState(true)
  const [stamp, setStamp] = useState(false)
  const [ar, setAr] = useState(DATA.org.nameAr)
  const [en, setEn] = useState(DATA.org.nameEn)
  const [vat, setVat] = useState(DATA.org.vat)
  const [idType, setIdType] = useState('')
  const [idNo, setIdNo] = useState('')
  const [cr, setCr] = useState(DATA.org.cr)
  const [street, setStreet] = useState('طريق الملك فهد')
  const [bldg, setBldg] = useState('1200')
  const [dist, setDist] = useState('حي العليا')
  const [city, setCity] = useState('الرياض')
  const [region, setRegion] = useState('منطقة الرياض')
  const [zip, setZip] = useState('12214')
  const [phone, setPhone] = useState('+966112345678')
  const [email, setEmail] = useState('info@websquids.sa')

  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState(false)

  const errs = {}
  if (!ar.trim()) errs.ar = 'اسم المنشأة بالعربية مطلوب — يظهر في كل مستند'
  if (!vatOk(vat)) errs.vat = 'الرقم الضريبي يجب أن يتكوّن من ١٥ رقمًا يبدأ بالرقم ٣ وينتهي به'
  if (idType && !idNo.trim()) errs.idNo = 'أدخل رقم الهوية أو أعد النوع إلى «بدون»'
  const show = (k) => (tried ? errs[k] : null)
  const nErr = Object.keys(errs).length

  const vatLen = digits(vat).length

  const save = () => {
    setTried(true)
    if (nErr) { toast.bad('فيه حقول ناقصة', { sub: 'موضّحة تحت الحقل' }); return }
    setSaved(true)
    toast.ok('بيانات المنشأة اتحفظت')
  }

  return (
    <SettingsShell
      title="المنشأة"
      sub="البيانات اللي بتتطبع على كل مستند وبتروح للهيئة"
      onSave={save}
      status={{
        bad: tried && nErr > 0,
        text: tried && nErr
          ? `فيه ${nErr === 1 ? 'حقل' : `${nErr} حقول`} ناقصة — موضّحة فوق`
          : saved ? 'اتحفظت' : 'التغييرات تسري على المستندات الجديدة بس',
      }}>
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
            <em className="fld__h">يُطبع في رأس الفاتورة تحت الرقم الضريبي</em>
          </label>
        </div>

        <div className="frow frow--2" style={{ marginTop: 14 }}>
          <label className="fld">
            <span className="fld__l">هوية بديلة للمنشأة <em className="fld__opt">اختياري</em></span>
            <Select className="fld__i" value={idType}
              onChange={(e) => { setIdType(e.target.value); if (!e.target.value) setIdNo('') }}>
              {ID_TYPES.map((t) => <option key={t.id || 'none'} value={t.id}>{t.ar}</option>)}
            </Select>
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

      {/* ---------- ٣) العنوان الوطني ---------- */}

      <section className="fcard" id="addr">
        <h2 className="fcard__t">
          العنوان والتواصل <em>العنوان الوطني للمنشأة — بيتطبع على الفاتورة</em>
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

        <p className="fnote fnote--quiet">
          ده عنوان المنشأة. كل فرع له عنوانه اللي بيتطبع على فواتيره —
          من صفحة <b>الفروع</b>.
        </p>
      </section>
      <section className="fcard">
        <h2 className="fcard__t">تأثير الإعدادات دي</h2>
        <ul className="rail__check rail__check--wide">
          <li className={logo ? 'is-ok' : ''}><Ico.check size={14} />الشعار على المستندات</li>
          <li className={stamp ? 'is-ok' : ''}><Ico.check size={14} />الختم على المستندات</li>
          <li className={vatOk(vat) ? 'is-ok' : ''}><Ico.check size={14} />رقم ضريبي صالح</li>
          <li className={DATA.org.zatcaOk ? 'is-ok' : ''}><Ico.check size={14} />مربوط بمنصة فاتورة</li>
        </ul>
        <p className="fnote fnote--quiet">
          من غير رقم ضريبي صالح وربط بالمنصة، الفواتير <b>تُحفظ مسودات ولا تُصدر</b>.
        </p>
      </section>
    </SettingsShell>
  )
}
