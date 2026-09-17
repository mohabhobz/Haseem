import { useState } from 'react'
import { SettingsShell } from '../components/settingsshell.jsx'
import { Ico } from '../components/icons.jsx'
import { toast } from '../components/feedback.jsx'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   العملات.

   السعر اللي بيتكتب هنا هو المستخدم **وقت إصدار المستند**،
   وبيتخزّن جوّه المستند نفسه. يعني تغييره هنا ما بيمسّش فاتورة
   قديمة — ودي قاعدة صح، لأن الفاتورة لازم تفضل زي ما اتصدرت.

   والحقل بيعرض **المقلوب** تحته وإنت بتكتب، لأن أشهر غلطة في
   إدخال سعر الصرف إنك تكتبه بالمقلوب.
   ============================================================ */

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

export default function SetCurrencies() {
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
  const inverse = (r) => {
    const n = parseFloat(r)
    if (!n || n <= 0) return null
    return (1 / n).toFixed(6)
  }

  const save = () => toast.ok('أسعار الصرف اتحفظت',
    { sub: 'المستندات القديمة محتفظة بأسعارها' })

  return (
    <SettingsShell
      title="العملات"
      sub="أسعار التحويل مقابل الريال — للتعامل مع عملاء خارج المملكة"
      onSave={save}
      status={{ text: 'السعر بيتخزّن جوّه المستند وقت إصداره' }}>
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
                  <Select className="fld__i" value={c.code} aria-label="العملة"
                    onChange={(e) => pickCurr(i, e.target.value)}>
                    {CURRENCIES.map((x) => (
                      <option key={x.code} value={x.code}
                        disabled={x.code !== c.code && used.has(x.code)}>
                        {x.ar} — {x.code}
                      </option>
                    ))}
                  </Select>

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
    </SettingsShell>
  )
}
