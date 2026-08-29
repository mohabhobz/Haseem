import { useState, useEffect, useRef } from 'react'
import { Ico, Riyal } from '../components/icons.jsx'
import { toast } from '../components/feedback.jsx'
import { SilkBackdrop } from './auth.jsx'
import {
  FONTS_AR, FONTS_EN, SWATCHES, DEFAULT_BRAND,
  getBrand, saveBrand, resetBrand, applyBrand,
  hexToHsl, hslToHex, contrast,
} from '../lib/brand.js'

/* ============================================================
   هوية المنشأة — التاب الجديد.

   ده مش موجود في سيستم العميل. الفكرة: كل منشأة ليها هويتها،
   فبدل ما كل الحسابات تشوف نفس الأخضر، المنشأة بتختار **لونها
   الأساسي وخطّها**، والسيستم كله بيتلوّن بيهم.

   القاعدة اللي بتخلّي ده ممكن: مفيش لون مكتوب بإيده في app.css.
   كل حاجة بتقرا من متغيّرات، فتغيير المتغيّر بيوصل لكل شاشة —
   القوايم والأزرار والرسوم والقائمة الجانبية والطباعة.

   التغيير بيتشاف **لحظيًا وأنت واقف في الشاشة** (بريفيو حيّ على
   السيستم كله)، وبيتثبّت لما تدوس حفظ. لو خرجت من غير حفظ،
   بيرجع للمحفوظ.
   ============================================================ */

/* شرائح المعاينة الصغيرة — بتعرض اللون في مواضعه الحقيقية */
function Preview() {
  return (
    <div className="bprev" aria-hidden="true">
      {/* دي عيّنات شكل مش أزرار — عشان كده span مش button:
          الزرار اللي مبيعملش حاجة بيبقى فخ للمستخدم */}
      <div className="bprev__row">
        <span className="btn btn--primary bprev__btn">إصدار الفاتورة</span>
        <span className="btn btn--outline bprev__btn">معاينة</span>
        <span className="st st--positive">مدفوعة</span>
        <span className="lnk">عرض المستند</span>
      </div>

      <div className="bprev__row bprev__row--split">
        <span className="bprev__nav">
          <span className="bprev__navi is-on"><Ico.invoice size={15} />فواتير المبيعات</span>
          <span className="bprev__navi"><Ico.customers size={15} />العملاء</span>
        </span>

        <span className="bprev__tint"><Ico.check size={16} /></span>

        <span className="bprev__bars" aria-hidden="true">
          <i style={{ height: '70%', background: 'var(--chart-1)' }} />
          <i style={{ height: '46%', background: 'var(--chart-2)' }} />
          <i style={{ height: '28%', background: 'var(--chart-3)' }} />
        </span>
      </div>

      <div className="bprev__doc">
        <span className="bprev__docn num">INV-027122</span>
        <span className="bprev__docc">مؤسسة النخبة للتجارة</span>
        <span className="bprev__doca num">12,450<Riyal /></span>
      </div>
    </div>
  )
}

export function BrandTab() {
  const saved = getBrand()
  const [b, setB] = useState(saved)
  const [custom, setCustom] = useState(!SWATCHES.some((s) => s.hex.toLowerCase() === saved.color.toLowerCase()))
  const [done, setDone] = useState(false)

  const hsl = hexToHsl(b.color)
  const [h, setH] = useState(Math.round(hsl.h))
  const [s, setS] = useState(Math.round(hsl.s))
  const [l, setL] = useState(Math.round(hsl.l))

  /* بريفيو حيّ: كل تغيير بيتطبّق على السيستم كله على طول */
  useEffect(() => { applyBrand(b); setDone(false) }, [b])
  /* خرجت من غير حفظ؟ يرجع للمحفوظ */
  useEffect(() => () => applyBrand(getBrand()), [])

  const pick = (hex) => { setB((x) => ({ ...x, color: hex })); const c = hexToHsl(hex); setH(Math.round(c.h)); setS(Math.round(c.s)); setL(Math.round(c.l)) }
  const slide = (nh, ns, nl) => {
    setH(nh); setS(ns); setL(nl)
    setB((x) => ({ ...x, color: hslToHex(nh, ns, nl) }))
  }

  const save = () => { saveBrand(b); setDone(true) }
  const reset = () => { const d = resetBrand(); setB(d); setCustom(false); const c = hexToHsl(d.color); setH(Math.round(c.h)); setS(Math.round(c.s)); setL(Math.round(c.l)); setDone(true) }

  const cw = contrast(b.color, '#FFFFFF')
  const okWhite = cw >= 4.5

  return (
    <>
      <div className="docgrid">
        <div className="form">

          {/* ---------- الشعار ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">شعار المنشأة <em>يظهر في القائمة الجانبية وعلى المستندات</em></h2>
            <div className="brow">
              <button className={`updrop updrop--lg${b.logo ? ' is-set' : ''}`}
                onClick={() => setB((x) => ({ ...x, logo: x.logo ? '' : DEFAULT_BRAND.logo }))}>
                {b.logo ? <img src={b.logo} alt="" />
                        : <><Ico.plus size={20} /><em>رفع الشعار</em></>}
              </button>
              <div className="brow__b">
                <b>SVG أو PNG بخلفية شفافة</b>
                <span>
                  يُفضَّل مربّع ٥١٢×٥١٢ بكسل. الشعار بيتعرض بحجم صغير في القائمة،
                  فالتفاصيل الرفيعة بتضيع — استخدم النسخة المختصرة من علامتك.
                </span>
                {b.logo && (
                  <button className="lnk lnk--mute"
                    onClick={() => setB((x) => ({ ...x, logo: '' }))}>إزالة الشعار</button>
                )}
              </div>
            </div>
          </section>

          {/* ---------- خلفية صفحة الدخول ---------- */}
          <AuthBgCard value={b.authBg} onChange={(v) => setB((x) => ({ ...x, authBg: v }))} />

          {/* ---------- اللون الأساسي ---------- */}
          <section className="fcard">
            <div className="fcard__h">
              <h2 className="fcard__t">اللون الأساسي <em>لون الأوامر والعناصر النشطة في السيستم كله</em></h2>
              <button className={`gbtn2${custom ? ' on' : ''}`} onClick={() => setCustom((v) => !v)}>
                <Ico.edit size={14} />مخصّص
              </button>
            </div>

            <div className="swatches">
              {SWATCHES.map((sw) => (
                <button key={sw.id} className={`swatch${b.color.toLowerCase() === sw.hex.toLowerCase() ? ' is-on' : ''}`}
                  title={sw.ar} onClick={() => { pick(sw.hex); setCustom(false) }}>
                  <i style={{ background: sw.hex }} />
                  <span>{sw.ar}</span>
                </button>
              ))}
            </div>

            {custom && (
              <div className="picker">
                <div className="picker__top">
                  <span className="picker__chip" style={{ background: b.color }} />
                  <label className="fld picker__hex">
                    <span className="fld__l">الكود</span>
                    <input className="fld__i ltr" value={b.color.toUpperCase()} maxLength={7}
                      onChange={(e) => {
                        const v = e.target.value.trim()
                        setB((x) => ({ ...x, color: v }))
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) { const c = hexToHsl(v); setH(Math.round(c.h)); setS(Math.round(c.s)); setL(Math.round(c.l)) }
                      }} />
                  </label>
                </div>

                {/* مسطرة الألوان — درجة اللون ثم التشبّع ثم الإضاءة */}
                <label className="rng">
                  <span className="rng__l">درجة اللون<em className="num">{h}°</em></span>
                  <input type="range" min="0" max="360" value={h} className="rng__i rng__i--hue"
                    onChange={(e) => slide(+e.target.value, s, l)} />
                </label>
                <label className="rng">
                  <span className="rng__l">التشبّع<em className="num">{s}%</em></span>
                  <input type="range" min="0" max="100" value={s} className="rng__i"
                    style={{ '--a': hslToHex(h, 0, l), '--b': hslToHex(h, 100, l) }}
                    onChange={(e) => slide(h, +e.target.value, l)} />
                </label>
                <label className="rng">
                  <span className="rng__l">الإضاءة<em className="num">{l}%</em></span>
                  <input type="range" min="8" max="72" value={l} className="rng__i"
                    style={{ '--a': hslToHex(h, s, 12), '--b': hslToHex(h, s, 70) }}
                    onChange={(e) => slide(h, s, +e.target.value)} />
                </label>

                <p className={`fnote${okWhite ? '' : ' fnote--warn'}`}>
                  <Ico.check size={14} />
                  {okWhite
                    ? `تباين النص الأبيض فوق اللون ${cw.toFixed(1)}:1 — مقروء`
                    : `تباين النص الأبيض ${cw.toFixed(1)}:1 فقط — بنغمّق اللون تلقائيًا في الأزرار عشان يفضل مقروء`}
                </p>
              </div>
            )}
          </section>

          {/* ---------- الخط العربي ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">الخط العربي <em>الواجهة والمستندات والطباعة</em></h2>
            <div className="fonts">
              {FONTS_AR.map((f) => (
                <button key={f.id} className={`fontcard${b.fontAr === f.id ? ' is-on' : ''}`}
                  onClick={() => setB((x) => ({ ...x, fontAr: f.id }))}>
                  <span className="fontcard__s" style={{ fontFamily: `${f.css}, sans-serif` }}>
                    {f.sample}
                  </span>
                  <span className="fontcard__n">{f.name}</span>
                  <span className="fontcard__d">{f.note}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ---------- الخط اللاتيني ---------- */}
          <section className="fcard">
            <h2 className="fcard__t">
              الخط اللاتيني <em>الأرقام والحروف الإنجليزية داخل نفس الواجهة</em>
            </h2>
            <div className="fonts">
              {FONTS_EN.map((f) => (
                <button key={f.id} className={`fontcard${b.fontEn === f.id ? ' is-on' : ''}`}
                  onClick={() => setB((x) => ({ ...x, fontEn: f.id }))}>
                  <span className="fontcard__s ltr" style={{ fontFamily: `${f.css}, sans-serif` }}>
                    {f.sample}
                  </span>
                  <span className="fontcard__n">{f.name}</span>
                  <span className="fontcard__d">{f.note}</span>
                </button>
              ))}
            </div>
            <p className="fnote fnote--quiet">
              الأرقام في كل الجداول والمبالغ بتيجي من الخط اللاتيني — عشان كده
              اختياره بيأثر على شكل الفواتير أكتر ما تتخيّل.
            </p>
          </section>
        </div>

        {/* ---------- الرَّيل: المعاينة ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">معاينة حيّة</span>
            <Preview />
            <p className="fnote fnote--quiet">
              التغيير مطبَّق على السيستم كله دلوقتي — اتنقّل لأي شاشة وشوفه
              قبل ما تحفظ.
            </p>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">بيتأثر بالهوية</span>
            <ul className="rail__check">
              <li className="is-ok"><Ico.check size={14} />الأزرار والروابط</li>
              <li className="is-ok"><Ico.check size={14} />القائمة الجانبية</li>
              <li className="is-ok"><Ico.check size={14} />الرسوم والمؤشرات</li>
              <li className="is-ok"><Ico.check size={14} />خلفيات الأيقونات</li>
              <li className="is-ok"><Ico.check size={14} />الوضع الفاتح والداكن</li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="savebar" data-component="SaveBar">
        <span className={`savebar__s${done ? ' is-ok' : ''}`}>
          {done
            ? <><Ico.check size={15} />الهوية اتحفظت — سارية على المنشأة كلها</>
            : 'الهوية بتسري على كل مستخدمي المنشأة، مش على جهازك بس'}
        </span>
        <div className="savebar__b">
          <button className="btn btn--ghost" onClick={reset}>إعادة الضبط</button>
          <button className="btn btn--primary" onClick={save}>
            <Ico.check size={16} />حفظ الهوية
          </button>
        </div>
      </div>
    </>
  )
}

/* ============================================================
   خلفية صفحة الدخول.

   الافتراضي **مش صورة** — هو موجات بتتولّد من لون المنشأة نفسه
   وبتجري ببطء. ليه؟ لأن الصورة الجاهزة
   بتبقى مظبوطة مع لون واحد بس؛ أول ما العميل يغيّر لونه، الصورة
   بتبقى غلط وبتفضل غلط لحد ما حد يصمّم واحدة جديدة.

   والمنشأة تقدر ترفع صورتها. لو شالتها **بترجع المولّدة** —
   مفيش حالة «مفيش خلفية».

   ★ ملحوظة تنفيذية: الصورة بتتصغّر في المتصفح قبل ما تتحفظ
   (عرض ١٦٠٠ بكسل، JPEG) — لأن الصورة الأصلية من كاميرا ممكن
   تبقى ٨ ميجا، وده بيفجّر مساحة التخزين المحلي. في الباك إند
   دي هترفع كملف عادي والـURL بس اللي بيتخزّن.
   ============================================================ */
const BG_MAX_W = 1600
const BG_MAX_MB = 12

function AuthBgCard({ value, onChange }) {
  const inp = useRef(null)
  const [busy, setBusy] = useState(false)

  const take = (file) => {
    if (!file) return
    if (!/^image\//.test(file.type)) {
      toast.bad('ده مش ملف صورة', { sub: 'JPG أو PNG أو WebP' }); return
    }
    if (file.size > BG_MAX_MB * 1024 * 1024) {
      toast.bad('الصورة كبيرة أوي', { sub: `الحد ${BG_MAX_MB} ميجا` }); return
    }
    setBusy(true)
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        /* التصغير قبل الحفظ — الصورة بتتعرض في عمود واحد،
           فأكبر من ١٦٠٠ بكسل مالوش لازمة على الشاشة. */
        const sc = Math.min(1, BG_MAX_W / img.width)
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * sc)
        c.height = Math.round(img.height * sc)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        try {
          const url = c.toDataURL('image/jpeg', 0.82)
          onChange(url)
          toast.ok('الخلفية اتحدّثت', { sub: 'دوس حفظ عشان تثبت' })
        } catch (e) {
          toast.bad('ما قدرناش نقرا الصورة')
        }
        setBusy(false)
      }
      img.onerror = () => { toast.bad('الصورة مش سليمة'); setBusy(false) }
      img.src = fr.result
    }
    fr.onerror = () => { toast.bad('ما قدرناش نقرا الملف'); setBusy(false) }
    fr.readAsDataURL(file)
  }

  return (
    <section className="fcard">
      <h2 className="fcard__t">
        خلفية صفحة الدخول <em>العمود اللي جنب الفورم في الدخول وكود التحقق</em>
      </h2>

      <div className="brow">
        <button className={`updrop updrop--bg${value ? ' is-set' : ''}`}
          onClick={() => inp.current?.click()}
          style={value ? { backgroundImage: `url("${value}")` } : undefined}
          aria-label="رفع خلفية صفحة الدخول">
          {/* المعاينة **هي نفسها** خلفية صفحة الدخول — نفس
              الكمبوننت، مش تقريب ليها */}
          {value ? null : <span className="updrop__gen" aria-hidden="true"><SilkBackdrop /></span>}
          <span className="updrop__lbl">
            {busy ? 'بنجهّز الصورة…' : value ? 'غيّر الصورة' : 'ارفع خلفية'}
          </span>
        </button>

        <div className="brow__b">
          <b>{value ? 'خلفية المنشأة' : 'الخلفية المولّدة من لونك'}</b>
          <span>
            {value
              ? 'الصورة دي بتظهر في صفحة الدخول وصفحة كود التحقق. يُفضَّل صورة عمودية ١٦٠٠×٢٤٠٠ بكسل على الأقل، — الصورة بتغطّي الموجات المولّدة تمامًا.'
              : 'من غير صورة، الخلفية بتتبني من لونك الأساسي: موجات بتجري ببطء بدرجات لونك. لما تغيّر اللون، الخلفية بتتغيّر معاه لوحدها — من غير ما حد يصمّم صورة جديدة.'}
          </span>
          {value && (
            <button className="lnk lnk--mute" onClick={() => {
              onChange(null)
              toast.info('رجعنا للخلفية المولّدة', { sub: 'المبنية من لون المنشأة' })
            }}>شيل الصورة وارجع للمولّدة</button>
          )}
        </div>
      </div>

      <input ref={inp} type="file" accept="image/*" hidden
        onChange={(e) => { take(e.target.files?.[0]); e.target.value = '' }} />
    </section>
  )
}
