import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import { DateField } from '../components/datefield.jsx'
import { SelectField } from '../components/selectfield.jsx'
import { SAR } from '../components/data.jsx'
import { fmtMoney, TODAY } from '../lib/format.js'
import { PrintPreview } from '../components/printpreview.jsx'
import * as DATA from '../data/mock.js'
import { toast, confirmAction } from '../components/feedback.jsx'

/* ============================================================
   إنشاء فاتورة مبيعات — **منقولة من سيستم الكلاينت بالحرف**.
   المرجع: التصوير المباشر من app-staging.haseem.com (دوك ١٩).

   ★ الفكرة اللي الكلاينت متمسّك بيها، وهي سبب الشاشة دي كلها:

     «هما بيملوا الداتا وهي شبه الفاتورة وقريبة منها، فأماكن
      ظهور الحاجة عندهم معتبرينها أفضل.»

   يعني الفورم **مش فورم**. هو **الفاتورة نفسها وإنت بتكتب فيها**:
   ورقة بيضا واحدة، الرقم والتواريخ في ركنها اليمين زي ما هيتطبعوا،
   والمنشأة والشعار في ركنها الشمال زي ما هيتطبعوا، وجدول البنود في
   النص، والإجماليات تحت على الشمال. المستخدم بيشوف المستند وهو
   بيعمله، مش بيملا خانات وبعدين يتفاجئ بالشكل.

   ★ عشان كده اتشال اللي كان عندنا:
   • الكروت المنفصلة (بيانات المستند · البنود · العميل · الملاحظات)
     بقت **أقسام في ورقة واحدة** يفصلها خط، زي السيستم.
   • **الرَّيل الجانبي** اللي كان فيه الإجماليات والدفعة الأولى
     وحسن التنفيذ — اتشال. الإجماليات نزلت **تحت على الشمال**
     جوه الورقة، والدفعة وحسن التنفيذ بقوا زرارين بيتفتحوا من
     تحت الإجمالي (`+ إظهار حالة الدفع` · `+ إضافة حسن تنفيذ`)
     بالظبط زي السيستم.
   • **شريط الحفظ السفلي** اتشال — الأوامر فوق على الشمال:
     معاينة · حفظ كمسودة ▾ (وجواها: إصدار · جدولة). والرجوع سهم
     قبل اسم الشاشة — تنقّل مش أمر مستند.

   ★ واللي **ما اتشالش** رغم إن السيستم مش بيعمله: التحقق.
   الزرار لسه شغّال دايمًا وبيوَرّي الناقص جوّه الحقول (قاعدة
   البورد)، وكود إعفاء الهيئة `VATEX-SA-xx` لسه بيظهر على البند
   المعفي — من غيره الفاتورة بتترفض من الهيئة. دول مش شكل.
   ============================================================ */

const KINDS = [
  { id: 'inv',   label: 'فاتورة ضريبية', px: 'INV', go: 'إصدار وإرسال للهيئة', due: 'تاريخ الاستحقاق' },
  { id: 'prf',   label: 'فاتورة مبدئية', px: 'PRF', go: 'حفظ وإرسال للعميل',   due: 'صالحة حتى' },
  { id: 'quote', label: 'عرض سعر',       px: 'QUO', go: 'إرسال للعميل',        due: 'صالح حتى' },
]

/* شروط السداد بتعيش في ملف العميل — هنا بنقراها ونحوّلها أيام.
   المستخدم بيشوف تاريخ استحقاق حقيقي يقدر يعدّله، مش قايمة تانية يملاها. */
const termDays = (c) => {
  if (!c) return 30
  const m = String(c.terms).match(/\d+/)
  return m ? +m[0] : 0
}

const iso = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
  '-' + String(d.getDate()).padStart(2, '0')
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const num = (x) => Number(x) || 0
/* العربي مش بيعدّ زي الإنجليزي — مفرد ومثنى وجمع */
const countAr = (n) => (n === 1 ? 'حقل واحد' : n === 2 ? 'حقلان' : n + ' حقول')

const emptyLine = () => ({
  key: Math.random().toString(36).slice(2),
  code: '', ar: '', unit: 'وحدة', desc: '', qty: 1, price: 0,
  dpc: 0, tax: 'S', acct: '', cc: '',
})

/* ---------- «تعديل الحقول» — نفس القايمة اللي في السيستم بالحرف ----------
   الترتيب والافتراضيات منقولة زي ما هي: اسم الوحدة والمبلغ مفتوحين،
   والباقي مقفول. `بند الفاتورة` و`الوصف` و`الكمية` و`سعر الوحدة`
   و`الضريبة` أعمدة ثابتة — من غيرهم مفيش بند أصلًا. */
const COLS = [
  { id: 'dpc',  label: 'نسبة الخصم %' },
  { id: 'acct', label: 'الحساب'        },
  { id: 'unit', label: 'اسم الوحدة'    },
  { id: 'amt',  label: 'المبلغ'        },
  { id: 'img',  label: 'الصورة'        },
]
const COLS_DEFAULT = { dpc: false, acct: false, unit: true, amt: true, img: false }

/* ---------- «حقول إضافية» — نفس التلاتة اللي في السيستم ---------- */
const XTRA = [
  { id: 'rep', label: 'مندوب المبيعات' },
  { id: 'prj', label: 'المشروع'        },
  { id: 'ref', label: 'المرجع'         },
]

const RET_PC = [5, 10]

/* قايمة صغيرة بتتقفل لما تدوس بره — بتتكرر تلات مرات في الشاشة */
function useAway(open, close) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) close() }
    const esc = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open, close])
  return ref
}

export default function InvoiceNew() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const k0 = KINDS.some((k) => k.id === sp.get('kind')) ? sp.get('kind') : 'inv'
  const K = KINDS.find((k) => k.id === k0)

  const [kind] = useState(k0)
  const [no, setNo]         = useState(K.px + '-27123')
  const [editNo, setEditNo] = useState(false)
  const [noDraft, setNoDraft] = useState('')
  const [date, setDate]     = useState(iso(new Date(TODAY)))
  const [dueOv, setDueOv]   = useState('')
  const [editDate, setEditDate] = useState(false)
  const [editDue, setEditDue]   = useState(false)
  const [cust, setCust]     = useState('')
  const [wh, setWh]         = useState(DATA.warehouses[0].id)
  const [bank, setBank]     = useState(DATA.banks[0].id)
  const [bankOpen, setBankOpen] = useState(false)

  /* حقول إضافية — checkbox لكل واحد، واللي اتعلّم بيتزوّد سطر في الرأس */
  const [xtra, setXtra]     = useState({ rep: false, prj: false, ref: false })
  const [xtraOpen, setXtraOpen] = useState(false)
  const [rep, setRep]       = useState(DATA.reps[0].id)
  const [prj, setPrj]       = useState('')
  const [ref, setRef]       = useState('')

  const [cols, setCols]     = useState(COLS_DEFAULT)
  const [colsOpen, setColsOpen] = useState(false)
  /* الشعار مرفوع افتراضيًا — المنشأة عندها شعار في إعداداتها،
     فالفاتورة تبدأ بيه بدل ما تبدأ بمربّع فاضي كل مرة */
  const [logo, setLogo]     = useState(true)
  const [stamp, setStamp]   = useState(false)
  const [preview, setPreview] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)

  /* حسن التنفيذ — مبلغ بيتحجز لحد ما فترة الضمان تخلص */
  const [ret, setRet]         = useState(false)
  const [retMode, setRetMode] = useState('pc')
  const [retVal, setRetVal]   = useState(5)
  const [retBase, setRetBase] = useState('net')
  const [retDate, setRetDate] = useState('')
  const [retCond, setRetCond] = useState('')

  /* الدفعة الأولى — بتتسجّل مع الإصدار */
  const [showPay, setShowPay]   = useState(false)
  const [payState, setPayState] = useState('none')
  const [payAmt, setPayAmt]     = useState('')

  const [incl, setIncl]   = useState(false)
  const [taxOpen, setTaxOpen] = useState(false)
  const [whOpen, setWhOpen]   = useState(false)
  const [disc, setDisc]   = useState('')
  const [discPc, setDiscPc] = useState(false)
  const [editDisc, setEditDisc] = useState(false)
  const [note, setNote]   = useState('')
  const [editNote, setEditNote] = useState(false)
  const [files, setFiles] = useState([])
  const [lines, setLines] = useState([emptyLine()])
  const [tried, setTried] = useState(false)

  const colsRef = useAway(colsOpen, () => setColsOpen(false))
  const xtraRef = useAway(xtraOpen, () => setXtraOpen(false))
  const saveRef = useAway(saveOpen, () => setSaveOpen(false))
  const taxRef  = useAway(taxOpen,  () => setTaxOpen(false))
  const whRef   = useAway(whOpen,   () => setWhOpen(false))
  const bankRef = useAway(bankOpen, () => setBankOpen(false))

  const startEditNo = () => { setNoDraft(no); setEditNo(true) }
  const saveNo   = () => { setNo(noDraft.trim() || no); setEditNo(false) }
  const cancelNo = () => setEditNo(false)

  const c = DATA.customers.find((x) => x.id === cust)
  const autoDue = iso(addDays(date, termDays(c)))
  const due = dueOv || autoDue
  const bankObj = DATA.banks.find((b) => b.id === bank)
  const whObj = DATA.warehouses.find((w) => w.id === wh)

  /* ---------- الحساب: كل سطر بفئته الضريبية، والسعر ممكن يكون شامل ---------- */
  const calc = useMemo(() => {
    let net = 0, tax = 0, lineDisc = 0
    const per = lines.map((l) => {
      const gross = num(l.qty) * num(l.price)
      const rate  = DATA.rateOf(l.tax) / 100
      const base  = incl ? gross / (1 + rate) : gross
      const dAmt  = base * (num(l.dpc) / 100)
      const n     = Math.max(0, base - dAmt)
      const t     = n * rate
      net += n; tax += t; lineDisc += dAmt
      return { ...l, discAmt: +dAmt.toFixed(2), net: +n.toFixed(2),
               taxAmt: +t.toFixed(2), total: +(n + t).toFixed(2) }
    })
    const d = discPc ? net * (num(disc) / 100) : num(disc)
    const dNet  = Math.max(0, net - d)
    const ratio = net ? dNet / net : 0
    const dTax  = tax * ratio
    const total = dNet + dTax

    const rBase = retBase === 'net' ? dNet : total
    const rAmt  = !ret ? 0
      : retMode === 'pc' ? rBase * (num(retVal) / 100)
      : Math.min(num(retVal), total)

    const paid = payState === 'full' ? total - rAmt
               : payState === 'part' ? Math.min(num(payAmt), total - rAmt)
               : 0

    return {
      per,
      lineDisc: +lineDisc.toFixed(2),
      net:   +net.toFixed(2),
      disc:  +Math.min(d, net).toFixed(2),
      tax:   +dTax.toFixed(2),
      total: +total.toFixed(2),
      ret:   +rAmt.toFixed(2),
      netDue: +(total - rAmt).toFixed(2),
      paid:  +paid.toFixed(2),
      rest:  +(total - rAmt - paid).toFixed(2),
    }
  }, [lines, incl, disc, discPc, ret, retMode, retVal, retBase, payState, payAmt])

  /* ---------- الأخطاء: بتتحسب دايمًا، بتتعرض بعد أول محاولة بس ---------- */
  const errs = {}
  if (!cust) errs.cust = 'لازم تختار عميل'
  if (!no.trim()) errs.no = 'رقم المستند مطلوب'
  if (!lines.some((l) => l.ar || l.desc)) errs.lines = 'ضيف بند واحد على الأقل'
  else if (calc.total <= 0) errs.lines = 'المبلغ لازم يكون أكبر من صفر'
  const show = (k) => (tried ? errs[k] : null)
  const nErr = Object.keys(errs).length

  const setLine = (key, patch) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const addLine = () => setLines((ls) => [...ls, emptyLine()])
  const delLine = (key) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : [emptyLine()]))

  const pick = (key, code) => {
    const it = DATA.catalog.find((x) => x.code === code)
    if (!it) { setLine(key, { code: '', ar: '', unit: 'وحدة', price: 0 }); return }
    setLine(key, { code: it.code, ar: it.ar, unit: it.unit, price: it.price })
  }

  /* ---------- عرض أعمدة الجدول بيتبني من اللي ظاهر ----------
     لازم عدد الأعمدة هنا = عدد الخانات اللي بترتسم بالظبط، وإلا
     الخانة الأخيرة (زرار الشيل) بتنزل سطر تحت. */
  const lcols = [
    '18px',   /* رقم البند — خانتين بالكتير */                        /* # */
    cols.img  && '44px',
    'minmax(130px,1.1fr)',         /* بند الفاتورة */
    'minmax(130px,1.1fr)',         /* الوصف */
    /* الكمية + الوحدة في خانة واحدة **جنب بعض** — فالخانة بتتوسّع
       لما الوحدة تكون ظاهرة، وبترجع ضيّقة لما تتقفل. */
    cols.unit ? '176px' : '104px',
    '128px',                       /* سعر الوحدة */
    cols.dpc  && '96px',
    cols.acct && 'minmax(0,.85fr)',
    'minmax(150px,.95fr)',         /* الضريبة — أسماء الفئات طويلة */
    cols.amt  && '112px',
    '32px',                        /* زرار الشيل */
  ].filter(Boolean).join(' ')

  /* ★ الزرار شغّال دايمًا — بيوَرّي الناقص، مش بيمنعك.
     ولو الفورم سليم، الإصدار بيسأل الأول لأنه مالوش رجعة. */
  const submit = async () => {
    setTried(true)
    if (Object.keys(errs).length) {
      toast.bad('ناقص ' + countAr(nErr), { sub: 'موضّحة في المستند باللون الأحمر' })
      return
    }
    const ok = await confirmAction({
      title: 'إصدار الفاتورة ' + no + '؟',
      body: 'الإصدار مالوش رجعة.',
      tone: 'primary',
      confirm: 'إصدار وإرسال للهيئة',
      consequences: [
        'المستند بياخد رقمه النهائي ومينفعش يتعدّل بعدها',
        'بيتبعت لهيئة الزكاة والضريبة والجمارك فورًا',
        'التعديل بعد كده بيبقى بإشعار دائن أو مدين بس',
      ],
    })
    if (!ok) return
    toast.ok('الفاتورة ' + no + ' اتصدرت', { sub: 'الهيئة قبلتها' })
    nav('/sales/invoices')
  }

  /* الحفظ كمسودة ليه رجعة، فبيتنفّذ على طول */
  const saveDraft = () => {
    toast.ok('الفاتورة ' + no + ' اتحفظت كمسودة', { sub: 'تقدر تكمّلها وتصدرها بعدين' })
    nav('/sales/invoices')
  }

  const org = DATA.org

  return (
    <AppShell>
      {/* ---------- الرأس والأوامر — زي السيستم، مش شريط سفلي ---------- */}
      <div className="tophead">
        <PageHeader back="/sales/invoices"
          title="إنشاء فاتورة مبيعات" sub="إدارة الفواتير وتتبع المستحقات" />
        <div className="tophead__ctrl docact">
          <div className="splitb" ref={saveRef}>
            <button className="btn btn--primary" onClick={saveDraft}>حفظ كمسودة</button>
            <button className="splitb__t" aria-label="خيارات الحفظ" aria-expanded={saveOpen}
              onClick={() => setSaveOpen((v) => !v)}>
              <Ico.chevron size={14} />
            </button>
            {saveOpen && (
              <div className="splitb__p" role="menu">
                <button role="menuitem" onClick={() => { setSaveOpen(false); submit() }}>
                  <Ico.send size={15} />إصدار
                </button>
                <button role="menuitem" onClick={() => { setSaveOpen(false)
                  toast.info('جدولة الفاتورة', { sub: 'بتتكرر تلقائيًا كل فترة تحدّدها' }) }}>
                  <Ico.calendar size={15} />جدولة الفاتورة
                </button>
              </div>
            )}
          </div>
          <button className={'btn btn--sec' + (preview ? ' is-on' : '')}
            aria-pressed={preview} onClick={() => setPreview((v) => !v)}>
            {preview ? 'غلق المعاينة' : 'معاينة'}
          </button>
        </div>
      </div>

      {/* ============================================================
          الورقة — المستند كله قسم واحد، والأقسام جواه يفصلها خط.
          ده اللي بيخلّي الفورم «شبه الفاتورة».
          ============================================================ */}
      <div className="sheet" data-component="InvoiceSheet">

        {/* ---------- ١) الرأس: الأرقام يمين والمنشأة شمال ---------- */}
        <div className="sheet__sec sheet__head">
          <div className="sheet__meta">
            <p className="smeta">
              <span className="smeta__k">رقم الفاتورة</span>
              {editNo ? (
                <span className="smeta__edit">
                  <input className={'fld__i' + (show('no') ? ' is-bad' : '')} value={noDraft} autoFocus
                    onChange={(e) => setNoDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); saveNo() }
                      if (e.key === 'Escape') cancelNo()
                    }} />
                  <button className="lnk" onClick={saveNo}>حفظ</button>
                  <button className="lnk lnk--mute" onClick={cancelNo}>إلغاء</button>
                </span>
              ) : (
                <>
                  <b className={'smeta__v num ltr' + (show('no') ? ' is-bad' : '')}>{no}</b>
                  <button className="smeta__p" onClick={startEditNo}>تغيير</button>
                </>
              )}
            </p>
            <p className="smeta">
              <span className="smeta__k">تاريخ الإصدار</span>
              {editDate ? (
                <span className="smeta__edit">
                  <DateField value={date} onChange={(d) => { setDate(d); setEditDate(false) }} />
                </span>
              ) : (
                <>
                  <b className="smeta__v num ltr">{date}</b>
                  <button className="smeta__p" onClick={() => setEditDate(true)}>تغيير</button>
                </>
              )}
            </p>

            <p className="smeta">
              <span className="smeta__k">{K.due}</span>
              {editDue ? (
                <span className="smeta__edit">
                  <DateField value={due} min={date} onChange={(d) => { setDueOv(d); setEditDue(false) }} />
                </span>
              ) : (
                <>
                  <b className="smeta__v num ltr">{due}</b>
                  <button className="smeta__p" onClick={() => setEditDue(true)}>تغيير</button>
                </>
              )}
            </p>
            {/* شروط العميل بتشرح التاريخ اللي اتحسب لوحده */}
            {c && !dueOv && <p className="smeta__hint">شروط العميل: {c.terms}</p>}
            {dueOv && (
              <p className="smeta__hint">
                معدّل يدويًا ·{' '}
                <button className="lnk" onClick={() => setDueOv('')}>رجّع شروط العميل</button>
              </p>
            )}

            {/* الحقول اللي المستخدم فتحها بتتزوّد هنا كسطور زيادة */}
            {xtra.rep && (
              <p className="smeta">
                <span className="smeta__k">مندوب المبيعات</span>
                <SelectField className="smeta__sel" value={rep} onChange={setRep}
                  ariaLabel="مندوب المبيعات"
                  options={DATA.reps.map((r) => ({ id: r.id, label: r.ar }))} />
              </p>
            )}
            {xtra.prj && (
              <p className="smeta">
                <span className="smeta__k">المشروع</span>
                <input className="smeta__in" placeholder="—" value={prj}
                  onChange={(e) => setPrj(e.target.value)} />
              </p>
            )}
            {xtra.ref && (
              <p className="smeta">
                <span className="smeta__k">المرجع</span>
                <input className="smeta__in" placeholder="—" value={ref}
                  onChange={(e) => setRef(e.target.value)} />
              </p>
            )}

            <div className="xtra" ref={xtraRef}>
              {/* ★ بقى زرار له شكل زرار. كان نص سايب تحت سطور
                  البيانات — فبيتقرا كإنه **سطر رابع من المستند**
                  لِيبله مكتوب وقيمته ناقصة. وهو مش بيان أصلًا،
                  هو أمر بيزوّد بيانات. */}
              <button className={'xtra__b' + (xtraOpen ? ' on' : '')}
                aria-expanded={xtraOpen} onClick={() => setXtraOpen((v) => !v)}>
                <Ico.plus size={13} />حقول إضافية
              </button>
              {xtraOpen && (
                <div className="xtra__p">
                  {XTRA.map((x) => (
                    <label key={x.id} className="xtra__i">
                      <input type="checkbox" checked={!!xtra[x.id]}
                        onChange={() => setXtra((v) => ({ ...v, [x.id]: !v[x.id] }))} />
                      <span>{x.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* شمال: المنشأة والشعار — زي ما هيتطبعوا على الفاتورة */}
          <div className="sheet__org">
            <div className="sorg__tx">
              <b>
                {org.nameAr}
                {/* بتفتح دراور المنشآت اللي في القايمة — نفس
                    الدراور بالظبط، مش نسخة تانية منه. الحدث ده
                    أنضف من تمرير الحالة من الـShell للشاشة ورا
                    بعضه عشان زرار واحد. */}
                <button className="smeta__p"
                  onClick={() => window.dispatchEvent(new CustomEvent('haseem:orgs'))}>
                  تغيير
                </button>
              </b>
              <span>{DATA.branches[0].address}</span>
              <span>{DATA.branches[0].city}, {DATA.branches[0].zip}</span>
            </div>
            {/* الشعار مرفوع — الهوفر بيطلّع «إزالة الشعار» فوقه.
                المربّع بيقول حالته، والأمر بيظهر لما تقرّب بس. */}
            <div className={'logobox' + (logo ? ' is-set' : '')}>
              {logo ? (
                <>
                  <img src={org.logo} alt={org.nameAr} />
                  <button className="logobox__x" onClick={() => setLogo(false)}>
                    <Ico.trash size={14} />إزالة الشعار
                  </button>
                </>
              ) : (
                <button className="logobox__up" onClick={() => setLogo(true)}>
                  <Ico.plus size={16} /><em>رفع الشعار</em>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---------- ٢) العميل ----------
            دروب داون واحدة وخلاص: بيدوس عليها، بيدوّر بالاسم أو
            بالرقم الضريبي، بيختار. ومن غير أزرار «تغيير» و«تعديل»
            — التغيير هو نفس الدروب داون، والحقل اللي بيتعدّل من
            نفسه أبسط من حقل + زرارين بيعملوا حاجات مختلفة.
            وبيانات العميل بتتكتب في كارت على الشمال في الآخر
            خالص، فالقراية والتحكّم كل واحد في ناحية. */}
        <div className={'sheet__sec sheet__cust' + (show('cust') ? ' is-bad' : '')}>
          <div className="scust__pick">
            <span className="sheet__lbl">العميل</span>
            <SelectField className="scust__sel" value={cust} search
              placeholder="اختر عميل…" ariaLabel="العميل"
              onChange={(v) => { setCust(v); setDueOv('') }}
              options={DATA.customers.map((x) => ({ id: x.id, label: x.ar, sub: x.vat }))} />
            {show('cust') && <em className="fld__e">{errs.cust}</em>}
          </div>

          {/* بيانات العميل سطر جنب الحقل، مش كارت على الشمال —
              الاسم أصلًا مكتوب جوّه الحقل، فالكارت كان بيكرّره
              ويزوّد طول السيكشن عشان معلومتين */}
          {c && (
            <p className="scust__meta">
              السجل التجاري / الرقم الموحد: <span className="num ltr">{c.vat}</span>
              <i className="sep">·</i>{c.city}
            </p>
          )}
        </div>

        {/* ---------- ٣) البنود ---------- */}
        <div className="sheet__sec sheet__lines">
          {/* العنوان والأدوات في سطر واحد: العنوان يمين،
              الأدوات شمال، ومتوسّطين مع بعض رأسيًا */}
          <div className="slhead">
          <span className="sheet__lbl">بنود الفاتورة</span>
          <div className="sltools">
            <div className="colmenu" ref={colsRef}>
              <button className={'gbtn2' + (colsOpen ? ' on' : '')}
                aria-expanded={colsOpen} onClick={() => setColsOpen((v) => !v)}>
                تعديل الحقول
              </button>
              {colsOpen && (
                <div className="colmenu__p">
                  <span className="colmenu__t">إظهار في الجدول</span>
                  {COLS.map((x) => (
                    <label key={x.id} className="colmenu__i">
                      <span>{x.label}</span>
                      <input type="checkbox" checked={!!cols[x.id]}
                        onChange={() => setCols((v) => ({ ...v, [x.id]: !v[x.id] }))} />
                      <i className="sw" />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* المستودع وطريقة السعر — كبسولتين بسهم و«×» زي السيستم */}
            <div className="ptag" ref={whRef}>
              <button className="ptag__b" aria-expanded={whOpen} onClick={() => setWhOpen((v) => !v)}>
                <span className="ltr num">{whObj?.id}</span> — {whObj?.ar}
                <Ico.chevron size={13} />
              </button>
              {whOpen && (
                <div className="ptag__p">
                  {DATA.warehouses.map((w) => (
                    <button key={w.id} className={w.id === wh ? 'on' : ''}
                      onClick={() => { setWh(w.id); setWhOpen(false) }}>{w.ar}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="ptag" ref={taxRef}>
              <button className="ptag__b" aria-expanded={taxOpen} onClick={() => setTaxOpen((v) => !v)}>
                {incl ? 'السعر شامل الضريبة' : 'السعر خالي من الضريبة'}
                <Ico.chevron size={13} />
              </button>
              {taxOpen && (
                <div className="ptag__p">
                  <button className={!incl ? 'on' : ''}
                    onClick={() => { setIncl(false); setTaxOpen(false) }}>السعر خالي من الضريبة</button>
                  <button className={incl ? 'on' : ''}
                    onClick={() => { setIncl(true); setTaxOpen(false) }}>السعر شامل الضريبة</button>
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="ltable" style={{ '--lc': lcols }}>
            <div className="ltable__h">
              <span>#</span>
              {cols.img && <span />}
              <span>بند الفاتورة</span>
              <span>الوصف</span>
              <span>الكمية</span>
              <span>سعر الوحدة</span>
              {cols.dpc && <span>نسبة الخصم %</span>}
              {cols.acct && <span>الحساب</span>}
              <span>الضريبة</span>
              {cols.amt && <span className="is-n">المبلغ</span>}
              <span />
            </div>

            {calc.per.map((l, i) => (
              <div className="ltable__r" key={l.key}>
                <span className="ltable__i">{i + 1}</span>
                {cols.img && <span className="ltable__img" aria-hidden="true"><Ico.items size={15} /></span>}

                <SelectField value={l.code} onChange={(v) => pick(l.key, v)}
                  placeholder="اختر الصنف…" ariaLabel="بند الفاتورة"
                  options={DATA.catalog.map((x) => ({ id: x.code, label: x.ar, sub: x.code }))} />

                <input className="fld__i" placeholder="الوصف" value={l.desc}
                  onChange={(e) => setLine(l.key, { desc: e.target.value })} />

                {/* الكمية والوحدة في خانة واحدة — زي السيستم، الوحدة تحت الرقم */}
                <span className="qcell">
                  <input className="fld__i n" type="number" min="0" step="1" value={l.qty}
                    onChange={(e) => setLine(l.key, { qty: e.target.value })} />
                  {cols.unit && (
                    <SelectField className="qcell__u" value={l.unit}
                      ariaLabel="الوحدة" onChange={(v) => setLine(l.key, { unit: v })}
                      options={DATA.units.map((u) => ({ id: u.ar, label: u.ar, sub: u.code }))} />
                  )}
                </span>

                {/* سعر الوحدة + آخر بيع — السيستم بيحطهم تحت بعض في نفس الخانة،
                    عشان المستخدم يسعّر وهو شايف آخر سعر من غير ما يفتح شاشة تانية */}
                <span className="pcell">
                  <input className="fld__i n" type="number" min="0" step="0.01" value={l.price}
                    onChange={(e) => setLine(l.key, { price: e.target.value })} />
                  {l.code && (
                    <em className="pcell__h">
                      آخر بيع لهذا العميل: <span className="num ltr">{fmtMoney(l.price)}</span>
                    </em>
                  )}
                </span>

                {cols.dpc && (
                  <input className="fld__i n" type="number" min="0" max="100" step="1" value={l.dpc}
                    onChange={(e) => setLine(l.key, { dpc: e.target.value })} />
                )}
                {cols.acct && (
                  <SelectField value={l.acct} placeholder="—" ariaLabel="الحساب"
                    onChange={(v) => setLine(l.key, { acct: v })}
                    options={DATA.accountsOf('revenue').map((x) => ({ id: x.id, label: x.ar }))} />
                )}

                {/* ★ الفئة وكود الإعفاء في خانة واحدة. الهيئة بتطلب الاتنين
                    مع بعض على البند الصفري أو المعفي — ومن غير الكود الفاتورة
                    بتترفض. ده اللي بنزوّده على السيستم، لأنه مش شكل. */}
                <span className="taxcell">
                  <SelectField value={l.tax} ariaLabel="فئة الضريبة"
                    onChange={(v) => setLine(l.key, { tax: v, vatex: '' })}
                    options={DATA.taxRates.map((t) => ({ id: t.id, label: t.ar }))} />
                  {DATA.needsVatex(l.tax) && (
                    <SelectField className={'taxcell__x' + (!l.vatex ? ' is-bad' : '')}
                      value={l.vatex || ''} placeholder="كود الإعفاء مطلوب…"
                      ariaLabel="كود الإعفاء المطلوب من الهيئة"
                      onChange={(v) => setLine(l.key, { vatex: v })}
                      options={DATA.vatexFor(l.tax).map((x) => ({ id: x.id, label: x.id, sub: x.ar }))} />
                  )}
                </span>

                {cols.amt && (
                  <span className="ltable__t"><span className="num">{fmtMoney(l.total)}</span><Riyal /></span>
                )}
                <button className="ltable__x" aria-label="شيل السطر" onClick={() => delLine(l.key)}>
                  <Ico.close size={15} />
                </button>
              </div>
            ))}

            {/* ★ زرار البند الجديد جوّه الجدول، تحت آخر سطر —
                مش في شريط أدوات فوق. إضافة بند فعل بيحصل وانت
                بتكتب في آخر صف، فمكانه الطبيعي تحت الصف ده
                مباشرة مش على بُعد جدول كامل. */}
            <button className="ltable__add" onClick={addLine} aria-label="إضافة بند">
              <Ico.plus size={16} /><span>إضافة بند</span>
            </button>
          </div>
          {show('lines') && <em className="fld__e fld__e--blk">{errs.lines}</em>}
        </div>

        {/* ---------- ٤) السطر السفلي: بنك · ملاحظات وختم · إجماليات ---------- */}
        <div className="sheet__sec sheet__foot">

          {/* البنك والملاحظات تحت بعض في عمود واحد — والبنك الأول
              لأنه بيانات العميل محتاجها عشان يدفع، والملاحظات
              كلام إضافي بيتقرا بعده */}
          <div className="sfoot__side">

          <div className="sfoot__bank" ref={bankRef}>
            <span className="sheet__lbl">بيانات البنك</span>
            {/* الاسم و«تغيير» في صف واحد، والقايمة جوّه نفس
                الحاوية عشان تتحسب من الزرار مش من الكارت */}
            <div className="bankpick">
              {/* الشعار على اليمين، والاسم والآيبان تحت بعض
                  على شماله ومتمسّكين بنفس الخط من اليمين */}
              <span className="bankav">
                {bankObj?.logo
                  ? <img src={bankObj.logo} alt="" />
                  : <Ico.bank size={20} />}
              </span>
              <span className="bankpick__t">
                <span className="bankpick__n">
                  <b>{bankObj?.ar}</b>
                  <button className={'smeta__p' + (bankOpen ? ' on' : '')}
                    aria-expanded={bankOpen} onClick={() => setBankOpen((v) => !v)}>تغيير</button>
                </span>
                <span className="num ltr">{bankObj?.iban}</span>
              </span>
              {bankOpen && (
                <div className="ptag__p ptag__p--up">
                  {DATA.banks.map((b) => (
                    <button key={b.id} className={b.id === bank ? 'on' : ''}
                      onClick={() => { setBank(b.id); setBankOpen(false) }}>{b.ar}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* الملاحظات والختم جنب بعض — الختم على الشمال بنفس
              مقاس مربّع الشعار، وارتفاع التكست إريا مساوي ليه
              عشان الاتنين يقفوا على خط واحد فوق وتحت */}
          <div className="sfoot__notes">
            <div className="snote">
              <span className="sheet__lbl">ملاحظات</span>
              <textarea className="fld__i fld__i--area" value={note}
                placeholder="مثلًا: التحويل على حساب المنشأة، والرجاء ذكر رقم الفاتورة في التحويل."
                onChange={(e) => setNote(e.target.value)} />
            </div>

            <div className="sstamp">
              <span className="sheet__lbl">الختم</span>
              <button className={'updrop' + (stamp ? ' is-set' : '')}
                onClick={() => setStamp((v) => !v)}>
                {stamp ? <span className="stampmark">مُعتمد</span>
                       : <><Ico.plus size={16} /><em>رفع الختم</em></>}
              </button>
            </div>
          </div>

          {/* المرفقات تحت الملاحظات في نفس العمود — كانت كارت
              مستقل بره الورقة، والمستخدم لازم ينزل لآخر الصفحة
              عشان يرفق ملف مالوش علاقة بالمجاميع اللي جنبه.
              وجملة «لا توجد مرفقات» اتشالت: الكارت فاضي واضح
              إنه فاضي، والجملة كانت بتاخد سطر تقول حاجة العين
              شايفاها. */}
          <div className="sfoot__att">
            <div className="satt__h">
              <span className="sheet__lbl">المرفقات</span>
              <button className="sfoot__add"
                onClick={() => setFiles((f) => [...f, { n: 'مرفق-' + (f.length + 1) + '.pdf', s: '٢٤٠ ك.ب' }])}>
                + إرفاق ملف
              </button>
            </div>
            {files.length > 0 && (
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
          </div>
          </div>

          {/* شمال — الإجماليات */}
          {/* العمود الشمال: كرت المجاميع، وتحته كل إضافة اختيارية في
              كرت بذاته — مش سطر مدفون جوّه المجاميع */}
          <div className="sfoot__col">
          <div className="sfoot__tot">
            <div className="stot"><span>المجموع الفرعي</span>
              <b><span className="num">{fmtMoney(calc.net)}</span><Riyal /></b></div>

            {calc.lineDisc > 0 && (
              <div className="stot stot--q"><span>خصم البنود</span>
                <b className="is-minus">− <span className="num">{fmtMoney(calc.lineDisc)}</span><Riyal /></b></div>
            )}

            {/* «إضافة خصم» سطر بيتحوّل لحقل — مش حقل فاضي مستني */}
            <div className="stot stot--disc">
              {editDisc || disc ? (
                <>
                  <span>الخصم</span>
                  <span className="sdisc">
                    <input className="fld__i n" type="number" min="0" step="0.01" value={disc}
                      autoFocus={editDisc} placeholder="0"
                      onChange={(e) => setDisc(e.target.value)}
                      onBlur={() => setEditDisc(false)} />
                    <span className="segs segs--sm" role="group" aria-label="نوع الخصم">
                      <button className={!discPc ? 'on' : ''} onClick={() => setDiscPc(false)}>﷼</button>
                      <button className={discPc ? 'on' : ''} onClick={() => setDiscPc(true)}>٪</button>
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <button className="sfoot__add" onClick={() => setEditDisc(true)}>
                    إضافة خصم<Ico.edit size={12} />
                  </button>
                  <b className="is-dash">—</b>
                </>
              )}
            </div>

            <div className="stot"><span>الضريبة</span>
              <b><span className="num">{fmtMoney(calc.tax)}</span><Riyal /></b></div>

            {/* الإجمالي بنبرة السامري-ستريب: رقم كبير مونوسبيس واللِيبل فوقه */}
            <div className="sgrand">
              <span className="sgrand__l">الإجمالي</span>
              <b className="sgrand__v"><Riyal /><span className="num">{fmtMoney(calc.total)}</span></b>
            </div>

          </div>

          <div className="sfoot__opt">
            {/* ---------- حالة الدفع — زرار بيفتح قسم، زي السيستم ---------- */}
            {!showPay ? (
              <button className="sfoot__row" onClick={() => setShowPay(true)}>
                <Ico.card size={15} />إظهار حالة الدفع في الفاتورة<i>+</i>
              </button>
            ) : (
              <div className="sblock">
                <div className="sblock__h">
                  <b><Ico.card size={14} />حالة الدفع</b>
                  <button className="rcard__x"
                    onClick={() => { setShowPay(false); setPayState('none'); setPayAmt('') }}>
                    <Ico.close size={13} />إزالة
                  </button>
                </div>
                <p className="sblock__s">سجّل الدفعة اللي اتحصّلت وقت إصدار الفاتورة.</p>
                <SelectField value={payState} onChange={setPayState} ariaLabel="حالة الدفع"
                  options={[
                    { id: 'none', label: 'غير مدفوعة' },
                    { id: 'part', label: 'مدفوعة جزئيًا' },
                    { id: 'full', label: 'مدفوعة بالكامل' },
                  ]} />
                {payState === 'part' && (
                  <input className="fld__i n" type="number" min="0" step="0.01" placeholder="المبلغ المحصّل"
                    value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                )}
                {payState !== 'none' && (
                  <>
                    <div className="stot stot--q"><span>المحصّل</span>
                      <b className="is-minus">− <span className="num">{fmtMoney(calc.paid)}</span><Riyal /></b></div>
                    <div className="stot stot--q"><span>الباقي على العميل</span>
                      <b><span className="num">{fmtMoney(calc.rest)}</span><Riyal /></b></div>
                  </>
                )}
              </div>
            )}

          </div>

          <div className="sfoot__opt">
            {/* ---------- حسن التنفيذ ---------- */}
            {!ret ? (
              <button className="sfoot__row" onClick={() => setRet(true)}>
                <Ico.check size={15} />إضافة حسن تنفيذ<i>+</i>
              </button>
            ) : (
              <div className="sblock">
                <div className="sblock__h">
                  <b><Ico.check size={14} />حسن التنفيذ</b>
                  <button className="rcard__x" onClick={() => setRet(false)}>
                    <Ico.close size={13} />إزالة
                  </button>
                </div>
                <p className="sblock__s">المبلغ المحتجز حتى انتهاء فترة الضمان</p>

                <div className="segs segs--sm segs--full" role="group" aria-label="طريقة الاحتجاز">
                  <button className={retMode === 'pc' ? 'on' : ''} onClick={() => setRetMode('pc')}>نسبة</button>
                  <button className={retMode === 'amt' ? 'on' : ''} onClick={() => setRetMode('amt')}>مبلغ ثابت</button>
                </div>

                {retMode === 'pc' ? (
                  <div className="rcard__pc">
                    {RET_PC.map((p) => (
                      <button key={p} className={num(retVal) === p ? 'on' : ''}
                        onClick={() => setRetVal(p)}>{p}٪</button>
                    ))}
                    <input className="fld__i n" type="number" min="0" max="100" placeholder="٪"
                      value={RET_PC.includes(num(retVal)) ? '' : retVal}
                      onChange={(e) => setRetVal(e.target.value)} />
                  </div>
                ) : (
                  <input className="fld__i n" type="number" min="0" step="0.01" placeholder="0"
                    value={retVal} onChange={(e) => setRetVal(e.target.value)} />
                )}

                <div className="segs segs--sm segs--full" role="group" aria-label="أساس الاحتجاز">
                  <button className={retBase === 'net' ? 'on' : ''} onClick={() => setRetBase('net')}>قبل الضريبة</button>
                  <button className={retBase === 'gross' ? 'on' : ''} onClick={() => setRetBase('gross')}>شامل الضريبة</button>
                </div>

                <DateField label="تاريخ الإفراج المتوقع" value={retDate} onChange={setRetDate} />
                <input className="fld__i" placeholder="شرط الإفراج — مثال: بعد انتهاء فترة الضمان"
                  value={retCond} onChange={(e) => setRetCond(e.target.value)} />

                <div className="stot stot--q"><span>حسن التنفيذ</span>
                  <b className="is-minus">− <span className="num">{fmtMoney(calc.ret)}</span><Riyal /></b></div>
                <div className="stot stot--grand"><span>الصافي المستحق</span>
                  <b><span className="num">{fmtMoney(calc.netDue)}</span><Riyal /></b></div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* ★ سطر واحد تحت المستند بيقول الناقص — السيستم مالوش، بس
          قاعدة البورد «الزرار ميتقفلش» محتاجة مكان تقول فيه إيه اللي
          ناقص من غير ما تمنع الحفظ. */}
      {tried && nErr > 0 && (
        <p className="sheet__err">
          <Ico.close size={15} />ناقص {countAr(nErr)} — موضّحة في المستند باللون الأحمر
        </p>
      )}

      {preview && (
        <PrintPreview onClose={() => setPreview(false)} doc={{
          no, date, due,
          party: c,
          lines: calc.per,
          net: calc.net, disc: calc.disc, tax: calc.tax, total: calc.total,
          retention: calc.ret, netDue: calc.netDue,
          bank: bankObj, note, zatcaOk: false,
        }} />
      )}
    </AppShell>
  )
}
