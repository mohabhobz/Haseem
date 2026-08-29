import { useState } from 'react'
import { SettingsShell } from '../components/settingsshell.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import { toast } from '../components/feedback.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   إعدادات المستندات.

   تلات حاجات بتأثر على كل مستند في السيستم: اللي بيتعبّى لوحده،
   وشكل الأرقام، وطريقة الترقيم.

   المعاينة في «تنسيق الأرقام» **حية** — بتتغيّر مع اختيارك بدل
   ما تكون صورة ثابتة، عشان تشوف النتيجة قبل ما تحفظ.
   ============================================================ */

const LANGS = [
  { id: 'ar', ar: 'العربية' },
  { id: 'en', ar: 'الإنجليزية' },
]
const CUST_KINDS = [
  { id: 'b2b', ar: 'أعمال لأعمال (B2B) — فواتير ضريبية' },
  { id: 'b2c', ar: 'أعمال لأفراد (B2C) — فواتير مبسّطة' },
]
const NUM_FORMATS = [
  { id: 'comma', ar: '10,000.00', g: ',', d: '.' },
  { id: 'dot',   ar: '10.000,00', g: '.', d: ',' },
  { id: 'space', ar: '10 000.00', g: ' ', d: '.' },
  { id: 'none',  ar: '10000.00',  g: '',  d: '.' },
]

function fmtSample(n, fid, neg) {
  const f = NUM_FORMATS.find((x) => x.id === fid) || NUM_FORMATS[0]
  const s = Math.abs(n).toFixed(2)
  const [i, dec] = s.split('.')
  const grouped = f.g ? i.replace(/\B(?=(\d{3})+(?!\d))/g, f.g) : i
  const out = `${grouped}${f.d}${dec}`
  if (n >= 0) return out
  return neg === 'paren' ? `(${out})` : `−${out}`
}

export default function SetDocs() {
  const [lang, setLang] = useState('ar')
  const [kind, setKind] = useState('b2b')
  const [bank, setBank] = useState(DATA.banks[0].id)
  const [numF, setNumF] = useState('comma')
  const [neg, setNeg] = useState('paren')
  const [seq, setSeq] = useState('seq')
  const [tpl, setTpl] = useState('default')

  const save = () => toast.ok('إعدادات المستندات اتحفظت',
    { sub: 'بتسري على المستندات الجديدة بس' })

  return (
    <SettingsShell
      title="المستندات"
      sub="اللي بيتعبّى لوحده في كل مستند، وشكل الأرقام، وطريقة الترقيم"
      onSave={save}
      status={{ text: 'التغييرات تسري على المستندات الجديدة بس' }}>
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
      <section className="fcard">
        <h2 className="fcard__t">قالب الطباعة <em>شكل الورقة اللي بتخرج من الطابعة</em></h2>
        <label className="fld">
          <span className="fld__l">القالب الافتراضي</span>
          <select className="fld__i" value={tpl} onChange={(e) => setTpl(e.target.value)}>
            {DATA.printTemplates.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
          </select>
          <em className="fld__h">
            تقدر تغيّره وقت الطباعة لأي مستند — ده الافتراضي بس.
          </em>
        </label>
      </section>
    </SettingsShell>
  )
}
