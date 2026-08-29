import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SettingsShell } from '../components/settingsshell.jsx'
import { Ico } from '../components/icons.jsx'
import { Modal } from '../components/modal.jsx'
import { toast } from '../components/feedback.jsx'
import { fmtDate, daysFrom } from '../lib/format.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   الهيئة والفوترة الإلكترونية.

   ده كان **كارت واحد** فيه بادچ «مربوط» وزرار مزامنة. والحقيقة إن
   الربط مش حالة واحدة — هو تلات حاجات ممكن أي واحدة فيهم تقع
   لوحدها:

   ١) **الجهاز مربوط؟** — الربط بيحصل بكود OTP من بوابة فاتورة.
   ٢) **الشهادة سارية؟** — ليها تاريخ انتهاء، ولو خلصت الإرسال بيقف
      **من غير ما يبان إن فيه مشكلة**. عشان كده العدّاد هنا ظاهر
      قبل ما تقع المشكلة مش بعدها.
   ٣) **آخر إرسال نجح؟** — لأن الربط ممكن يبقى سليم والإرسال راجع
      برفض.

   والصفحة بتعرض التلاتة منفصلين، لأن العلاج مختلف في كل حالة.
   ============================================================ */

/* الشهادة بتتجدد كل سنة — التاريخ ده من بيانات المنشأة */
const CERT_END = '2026-11-14'

export default function SetZatca() {
  const nav = useNavigate()
  const [otp, setOtp] = useState(false)
  const ok = DATA.org.zatcaOk
  const left = daysFrom(CERT_END)
  const soon = left !== null && left <= 45

  const bad = DATA.invoices.filter((v) => v.zatca === 'bad')

  return (
    <SettingsShell
      title="الهيئة والفوترة الإلكترونية"
      sub="ربط المنشأة بمنصة فاتورة، وحالة الشهادة، وآخر إرسال"
      footer={null}>

      {/* ---------- ١) الربط ---------- */}
      <section className="fcard">
        <h2 className="fcard__t">ربط الجهاز <em>بوابة الهيئة للفوترة الإلكترونية</em></h2>

        <div className={`zint${ok ? ' is-ok' : ''}`}>
          <span className="zint__ic">
            {ok ? <Ico.check size={18} /> : <Ico.ban size={18} />}
          </span>
          <span className="zint__b">
            <b>{DATA.org.zatca}</b>
            <span>{DATA.org.zatcaSync}</span>
          </span>
          <button className="gbtn2"
            onClick={() => toast.ok('المزامنة تمّت', { sub: 'آخر مزامنة: دلوقتي' })}>
            <Ico.retry size={14} />مزامنة الآن
          </button>
        </div>

        <div className="frow frow--2" style={{ marginTop: 14 }}>
          <div className="fld">
            <span className="fld__l">الرقم الضريبي المربوط</span>
            <div className="fld__ro num">{DATA.org.vat}</div>
            <em className="fld__h">
              بيتغيّر من صفحة المنشأة — وتغييره بيحتاج ربط من جديد
            </em>
          </div>
          <div className="fld">
            <span className="fld__l">اسم الجهاز</span>
            <div className="fld__ro">حسيم — الفرع الرئيسي</div>
            <em className="fld__h">كل فرع بيتربط كجهاز مستقل عند الهيئة</em>
          </div>
        </div>

        <div className="fcard__h" style={{ marginTop: 14 }}>
          <button className="gbtn2" onClick={() => setOtp(true)}>
            <Ico.plus size={14} />ربط جهاز جديد بكود OTP
          </button>
          <button className="linkish" onClick={() => nav('/help/a/zatca-onboard')}>
            إزاي أجيب الكود؟
          </button>
        </div>

        <p className="fnote fnote--quiet">
          فكّ الربط بيوقف إصدار الفواتير الضريبية، وما بيتمش إلا من الهيئة نفسها.
        </p>
      </section>

      {/* ---------- ٢) الشهادة ---------- */}
      <section className="fcard">
        <h2 className="fcard__t">شهادة التوقيع <em>اللي بتوقّع بيها كل فاتورة</em></h2>

        <div className={`certbar${soon ? ' is-soon' : ''}`}>
          <span className="certbar__n">
            <b>سارية لحد {fmtDate(CERT_END)}</b>
            <em>
              {left > 0 ? `فاضل ${left} يوم` : 'انتهت — الإرسال متوقّف'}
            </em>
          </span>
          <span className="certbar__b" aria-hidden="true">
            <i style={{ width: `${Math.max(4, Math.min(100, (left / 365) * 100))}%` }} />
          </span>
          {/* التجديد نفسه بيحصل عند الهيئة — إحنا بنوصّله للخطوات
              بدل ما نقوله «روح البوابة» ونسيبه */}
          <button className="gbtn2" onClick={() => nav('/help/a/zatca-onboard')}>
            خطوات التجديد
          </button>
        </div>

        <p className={`fnote${soon ? ' fnote--warn' : ' fnote--quiet'}`}>
          {soon
            ? <>الشهادة قربت تخلص. لو انتهت، <b>الفواتير هتتحفظ مسودات ومش هتتصدر</b> —
                والمشكلة دي بتبان متأخر لأن السيستم بيفضل شغّال عادي.</>
            : 'لما تقرب على الانتهاء، هيبان تنبيه هنا وفي الرئيسية قبلها بشهر ونص.'}
        </p>
      </section>

      {/* ---------- ٣) آخر إرسال ---------- */}
      <section className="fcard">
        <h2 className="fcard__t">حالة الإرسال <em>الربط سليم مش معناه إن كل فاتورة اتقبلت</em></h2>

        {bad.length === 0 ? (
          <p className="fempty">كل الفواتير المرسلة اتقبلت. مفيش مرفوض.</p>
        ) : (
          <ul className="efflist">
            {bad.map((v) => (
              <li key={v.no}>
                <span className="efflist__k">
                  <button className="cell-doc cell-doc--link"
                    onClick={() => nav(`/sales/invoices/${v.no}`)}>{v.no}</button>
                </span>
                <span className="efflist__v">{v.zatcaReason || 'مرفوضة — السبب مش محدد'}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="fcard__h" style={{ marginTop: 12 }}>
          <button className="gbtn2" onClick={() => nav('/sales/invoices?zatca=bad')}>
            افتح الفواتير المرفوضة
          </button>
          <button className="linkish" onClick={() => nav('/help/a/zatca-rejected')}>
            إزاي أصلّح الرفض؟
          </button>
        </div>
      </section>

      {otp && <OtpModal onClose={() => setOtp(false)} />}
    </SettingsShell>
  )
}

/* ---------- ربط جهاز بكود OTP ---------- */
function OtpModal({ onClose }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const bad = code.replace(/\D/g, '').length !== 6

  return (
    <Modal title="ربط جهاز جديد"
      sub="الكود بتجيبه من بوابة فاتورة — بينتهي بسرعة، فاطلبه وإنت هنا"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary"
            onClick={() => {
              if (bad) { toast.bad('الكود ٦ أرقام'); return }
              /* API: POST /zatca/devices → { otp, name } */
              toast.ok('طلب الربط اتبعت للهيئة', { sub: 'التأكيد بيوصل في دقايق' })
              onClose()
            }}>ربط الجهاز</button>
        </>
      }>
      <label className="fld">
        <span className="fld__l">اسم الجهاز</span>
        <input className="fld__i" value={name} placeholder="حسيم — فرع جدة"
          onChange={(e) => setName(e.target.value)} />
        <em className="fld__h">بيساعدك تفرّق بين الأجهزة لو عندك فروع</em>
      </label>

      <label className="fld" style={{ marginTop: 12 }}>
        <span className="fld__l">كود OTP</span>
        <input className={`fld__i num ltr${code && bad ? ' is-bad' : ''}`} value={code}
          inputMode="numeric" maxLength={6} placeholder="••••••"
          onChange={(e) => setCode(e.target.value)} />
        {code && bad
          ? <em className="fld__e">الكود ٦ أرقام</em>
          : <em className="fld__h">من بوابة فاتورة ← إدارة الأجهزة ← تسجيل جهاز</em>}
      </label>

      <p className="fnote fnote--warn">
        <Ico.ban size={14} />
        الكود ده مفتاح ربط المنشأة كلها — <b>متبعتوش لحد</b> ومتكتبوش في أي مكان تاني.
      </p>
    </Modal>
  )
}
