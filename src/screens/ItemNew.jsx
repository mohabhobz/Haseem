import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell, PageHeader } from '../components/layout.jsx'
import { Ico, Riyal } from '../components/icons.jsx'
import { toast, confirmAction } from '../components/feedback.jsx'
import { fmtMoney } from '../lib/format.js'
import * as DATA from '../data/mock.js'

/* ============================================================
   صنف جديد / تعديل صنف.

   نفس حقول سيستم العميل الأربعتاشر بالظبط — مفيش حقل اتشال ولا
   اتخترع. اللي اتغيّر حاجتين:

   ١. **صفحة مش مودال.** الفورم ده فيه ١٤ حقل وقسم مخزون بيتغيّر
      مع نوع الصنف — المودال بيخلّيه سكرول جوّه سكرول.
   ٢. **مقسوم بالسؤال اللي كل قسم بيجاوبه** بدل ما يكون عمود واحد
      طويل: إيه الصنف · بكام · وحدته وضريبته · مخزونه.

   والقاعدة اللي في سيستمه واتمسكت زي ما هي: **المخزون بيظهر
   للمنتج بس**. الخدمة مالهاش رصيد ولا حد تنبيه.
   ============================================================ */

const nextSku = (kind) =>
  `${kind === 'product' ? 'PRD' : 'SRV'}-${Math.floor(100000 + Math.random() * 900000)}`

const blank = () => ({
  ar: '', en: '', sku: nextSku('service'), barcode: '', cat: '',
  expiry: '', kind: 'service', sell: '', cost: '',
  unitName: 'قطعة', unitCode: 'PCE', tax: '', reorder: '', desc: '',
  open: {},
})

export default function ItemNew() {
  const nav = useNavigate()
  const { sku } = useParams()
  const editing = !!sku
  const src = editing ? DATA.findItem(sku) : null

  const [f, setF] = useState(() =>
    src ? { ...blank(), ...src, sell: String(src.sell ?? ''), cost: String(src.cost ?? ''),
            reorder: String(src.reorder ?? ''), open: { ...(src.open || {}) } }
        : blank())
  const [showEn, setShowEn] = useState(!!src?.en)
  const [tried, setTried] = useState(false)
  const [editSku, setEditSku] = useState(false)

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const isProd = f.kind === 'product'

  /* تغيير النوع بيغيّر بادئة الرمز — إلا لو المستخدم كتبه بإيده،
     ساعتها الرمز بتاعه وإحنا مالناش دعوة بيه. */
  const setKind = (k) => setF((x) => ({
    ...x, kind: k,
    sku: editing || editSku || x.skuTouched ? x.sku : nextSku(k),
    /* الخدمة مالهاش رصيد ولا حد — بنمسحهم بدل ما يتحفظوا مستخبيين */
    open: k === 'service' ? {} : x.open,
    reorder: k === 'service' ? '' : x.reorder,
  }))

  /* المستودعات اللي المستخدم فتحها في المخزون الافتتاحي */
  const openStores = Object.keys(f.open)
  const freeStores = DATA.stores.filter((s) => !openStores.includes(s.id))

  const addStore = () => {
    const s = freeStores[0]
    if (s) setF((x) => ({ ...x, open: { ...x.open, [s.id]: '' } }))
  }
  const setOpenQty = (id, v) => setF((x) => ({ ...x, open: { ...x.open, [id]: v } }))
  const dropStore = (id) => setF((x) => {
    const o = { ...x.open }; delete o[id]; return { ...x, open: o }
  })

  /* الباركود — الزرار في سيستم العميل اسمه «إنشاء» */
  const genBarcode = () => {
    set('barcode', `628${Math.floor(1000000000 + Math.random() * 8999999999)}`)
    toast.ok('اتولّد باركود جديد', { sub: 'تقدر تعدّله أو تمسحه' })
  }

  const errs = {}
  if (!f.ar.trim()) errs.ar = 'اسم الصنف مطلوب — ده اللي بيظهر في الفاتورة'
  if (f.sell === '' || +f.sell < 0) errs.sell = 'سعر البيع مطلوب'
  if (!f.unitName.trim()) errs.unitName = 'اسم الوحدة مطلوب'
  const show = (k) => (tried ? errs[k] : null)
  const nErr = Object.keys(errs).length

  const margin = useMemo(() => {
    const s = +f.sell, c = +f.cost
    if (!s || !c) return null
    return Math.round(((s - c) / s) * 100)
  }, [f.sell, f.cost])

  const save = () => {
    setTried(true)
    if (nErr) return
    toast.ok(`${f.ar} ${editing ? 'اتحفظ' : 'اتضاف'}`,
      { sub: isProd ? 'جاهز للبيع والتتبّع في المخزون' : 'جاهز للاختيار في الفواتير' })
    nav('/inventory/items')
  }

  const countAr = (n) => (n === 1 ? 'حقل واحد' : n === 2 ? 'حقلين' : `${n} حقول`)

  return (
    <AppShell>
      <div className="dochead">
        <button className="dochead__back" onClick={() => nav('/inventory/items')}>
          <Ico.back size={16} />الأصناف
        </button>
        <div className="dochead__row">
          <div className="dochead__id">
            <h1 className="dochead__no dochead__no--ar">
              {editing ? 'تعديل صنف' : 'صنف جديد'}
            </h1>
            <span className="dochead__sub">
              {editing ? f.ar : 'الأصناف اللي بتظهر في قائمة اختيار بنود الفاتورة'}
            </span>
          </div>
        </div>
      </div>

      <div className="docgrid">
        <div className="form">

          {/* ---------- ١) الصنف ---------- */}
          <section className="fcard" id="ident">
            <h2 className="fcard__t">بيانات الصنف <em>الاسم ده بيظهر في كل فاتورة فيها الصنف</em></h2>

            <label className="fld">
              <span className="fld__l">اسم الصنف</span>
              <input className={`fld__i${show('ar') ? ' is-bad' : ''}`} value={f.ar}
                onChange={(e) => set('ar', e.target.value)} placeholder="أسمنت مقاوم — كيس ٥٠ كجم" />
              {show('ar') && <em className="fld__e">{show('ar')}</em>}
            </label>

            {showEn ? (
              <label className="fld" style={{ marginTop: 14 }}>
                <span className="fld__l">الاسم بالإنجليزية <span className="fld__opt">— اختياري</span></span>
                <input className="fld__i ltr" value={f.en} onChange={(e) => set('en', e.target.value)}
                  placeholder="Sulphate-Resistant Cement 50kg" />
                <em className="fld__h">بيتطبع على الفاتورة تحت الاسم العربي — الهيئة بتقبل الاتنين.</em>
              </label>
            ) : (
              <button className="lnk lnk--mute" style={{ marginTop: 10 }}
                onClick={() => setShowEn(true)}>＋ أضف الاسم بالإنجليزية</button>
            )}

            <div className="frow frow--2" style={{ marginTop: 14 }}>
              <div className="fld">
                <span className="fld__l">رمز الصنف</span>
                {editSku ? (
                  <input className="fld__i num" value={f.sku} autoFocus
                    onChange={(e) => setF((x) => ({ ...x, sku: e.target.value, skuTouched: true }))}
                    onBlur={() => setEditSku(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditSku(false) }} />
                ) : (
                  <div className="fld__ro fedit__ro">
                    <span className="fedit__v num">{f.sku}</span>
                    <button className="fedit__b" onClick={() => setEditSku(true)}>
                      <Ico.edit size={14} />تعديل
                    </button>
                  </div>
                )}
                <em className="fld__h">بيتولّد لوحده — عدّله لو عندك ترقيم خاص بيك.</em>
              </div>

              <label className="fld">
                <span className="fld__l">الفئة <span className="fld__opt">— اختياري</span></span>
                <input className="fld__i" value={f.cat} list="itemcats"
                  onChange={(e) => set('cat', e.target.value)} placeholder="مواد بناء" />
                <datalist id="itemcats">
                  {DATA.itemCats.map((c) => <option key={c} value={c} />)}
                </datalist>
                <em className="fld__h">بتستخدمها في فلترة قائمة الأصناف.</em>
              </label>
            </div>

            <div className="fld" style={{ marginTop: 14 }}>
              <span className="fld__l">الباركود <span className="fld__opt">— اختياري</span></span>
              <div className="bcrow">
                <input className="fld__i num" value={f.barcode}
                  onChange={(e) => set('barcode', e.target.value)}
                  placeholder="أدخل أو أنشئ باركود" />
                <button className="gbtn2" onClick={genBarcode}>
                  <Ico.retry size={14} />إنشاء
                </button>
              </div>
              <em className="fld__h">للمسح الضوئي عند البيع أو الجرد.</em>
            </div>
          </section>

          {/* ---------- ٢) النوع ---------- */}
          <section className="fcard" id="kind">
            <h2 className="fcard__t">
              نوع الصنف <em>ده اللي بيحدد إذا كان الصنف بيتتبع مخزون ولا لأ</em>
            </h2>
            <div className="segs segs--wide" role="group" aria-label="نوع الصنف">
              <button className={f.kind === 'product' ? 'on' : ''}
                onClick={() => setKind('product')}>
                <Ico.items size={16} />منتج
              </button>
              <button className={f.kind === 'service' ? 'on' : ''}
                onClick={() => setKind('service')}>
                <Ico.settings size={16} />خدمة
              </button>
            </div>
            <p className="fnote fnote--quiet">
              {isProd
                ? 'المنتج ليه رصيد في المستودعات، وبيتخصم لما تبيعه، وبيتحاسب في تقارير المخزون.'
                : 'الخدمة مالهاش رصيد — بتتباع من غير كمية في المخزن، فمفيش مستودع ولا حد تنبيه.'}
            </p>
          </section>

          {/* ---------- ٣) الأسعار ---------- */}
          <section className="fcard" id="price">
            <h2 className="fcard__t">الأسعار <em>سعر البيع بيتحط تلقائيًا في بند الفاتورة</em></h2>
            <div className="frow frow--2">
              <label className="fld">
                <span className="fld__l">سعر البيع</span>
                <div className={`amtin${show('sell') ? ' is-bad' : ''}`}>
                  <input className="amtin__i num" inputMode="decimal" value={f.sell}
                    onChange={(e) => set('sell', e.target.value)} placeholder="0.00" />
                  <span className="amtin__s"><Riyal /></span>
                </div>
                {show('sell') && <em className="fld__e">{show('sell')}</em>}
              </label>

              <label className="fld">
                <span className="fld__l">سعر الشراء <span className="fld__opt">— اختياري</span></span>
                <div className="amtin">
                  <input className="amtin__i num" inputMode="decimal" value={f.cost}
                    onChange={(e) => set('cost', e.target.value)} placeholder="0.00" />
                  <span className="amtin__s"><Riyal /></span>
                </div>
                <em className="fld__h">منه بتتحسب قيمة المخزون وهامش الربح.</em>
              </label>
            </div>

            {margin !== null && (
              <p className={`fnote${margin <= 0 ? ' fnote--warn' : ''}`}>
                <Ico.check size={14} />
                {margin > 0
                  ? `هامش الربح ${margin}٪ — يعني ${fmtMoney(+f.sell - +f.cost)} على كل ${f.unitName}.`
                  : 'سعر البيع أقل من سعر الشراء أو مساوي له — راجع الأرقام.'}
              </p>
            )}
          </section>

          {/* ---------- ٤) الوحدة والضريبة ---------- */}
          <section className="fcard" id="unit">
            <h2 className="fcard__t">
              الوحدة والضريبة <em>الاتنين بيروحوا للهيئة في XML الفاتورة</em>
            </h2>
            <div className="frow frow--2">
              <label className="fld">
                <span className="fld__l">اسم الوحدة</span>
                <input className={`fld__i${show('unitName') ? ' is-bad' : ''}`} value={f.unitName}
                  onChange={(e) => set('unitName', e.target.value)} placeholder="كيس" />
                {show('unitName')
                  ? <em className="fld__e">{show('unitName')}</em>
                  : <em className="fld__h">الاسم اللي بيتكتب على الفاتورة زي ما بتقوله للعميل.</em>}
              </label>

              <label className="fld">
                <span className="fld__l">رمز الوحدة</span>
                <select className="fld__i" value={f.unitCode}
                  onChange={(e) => set('unitCode', e.target.value)}>
                  {DATA.units.map((u) => (
                    <option key={u.code} value={u.code}>{u.ar} ({u.code})</option>
                  ))}
                </select>
                <em className="fld__h">كود قياسي عالمي (UN/ECE) — ده اللي بيتبعت للهيئة.</em>
              </label>
            </div>

            <label className="fld" style={{ marginTop: 14 }}>
              <span className="fld__l">فئة الضريبة</span>
              <select className="fld__i" value={f.tax} onChange={(e) => set('tax', e.target.value)}>
                <option value="">بدون ضريبة افتراضية</option>
                {DATA.taxRates.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
              </select>
              <em className="fld__h">
                بتتعبّى لوحدها في بند الفاتورة، وتقدر تغيّرها على البند لو الحالة اختلفت.
              </em>
            </label>

            <div style={{ marginTop: 14 }}>
              <DateField label="تاريخ انتهاء الصلاحية" optional value={f.expiry}
                onChange={(v) => set('expiry', v)}
                hint="بيظهر تنبيه غير مانع على الفاتورة قرب التاريخ ده أو بعده — البيع بيفضل شغّال." />
            </div>
          </section>

          {/* ---------- ٥) المخزون — للمنتج بس ---------- */}
          {isProd && (
            <section className="fcard" id="stock">
              <div className="fcard__h">
                <h2 className="fcard__t">
                  المخزون الافتتاحي <em>الرصيد اللي عندك دلوقتي قبل أول حركة</em>
                </h2>
                <button className="gbtn2" onClick={addStore} disabled={!freeStores.length}>
                  <Ico.plus size={14} />إضافة مستودع
                </button>
              </div>

              {openStores.length === 0 ? (
                <p className="fempty">
                  لا يوجد مخزون افتتاحي — الصنف هيبدأ من الصفر، وأول حركة هتيجي من فاتورة شراء
                  أو تسوية.
                </p>
              ) : (
                <div className="oplist">
                  {openStores.map((id) => {
                    const s = DATA.storeOf(id)
                    return (
                      <div className="oprow" key={id}>
                        <select className="fld__i" value={id}
                          onChange={(e) => { dropStore(id); setOpenQty(e.target.value, f.open[id]) }}>
                          {[s, ...freeStores].filter(Boolean).map((x) => (
                            <option key={x.id} value={x.id}>{x.ar}</option>
                          ))}
                        </select>
                        <div className="qtyin">
                          <input className="qtyin__i num" inputMode="decimal" value={f.open[id]}
                            onChange={(e) => setOpenQty(id, e.target.value)} placeholder="0" />
                          <span className="qtyin__s">{f.unitName}</span>
                        </div>
                        <button className="crow__x" aria-label={`إزالة ${s?.ar}`}
                          onClick={() => dropStore(id)}>
                          <Ico.close size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <label className="fld" style={{ marginTop: 16 }}>
                <span className="fld__l">حد التنبيه للمخزون <span className="fld__opt">— اختياري</span></span>
                <div className="qtyin qtyin--wide">
                  <input className="qtyin__i num" inputMode="decimal" value={f.reorder}
                    onChange={(e) => set('reorder', e.target.value)} placeholder="0" />
                  <span className="qtyin__s">{f.unitName}</span>
                </div>
                <em className="fld__h">
                  لما الرصيد ينزل للرقم ده أو تحته، الصنف بيتعلّم <b>«تحت الحد»</b> في القائمة
                  وبيظهر في تابة لوحده. سيبه فاضي لو الصنف ده مش محتاج مراقبة.
                </em>
              </label>
            </section>
          )}

          {/* ---------- ٦) الوصف والصورة ---------- */}
          <section className="fcard" id="more">
            <h2 className="fcard__t">وصف وصورة <em>للاستخدام الداخلي ولقوائم الأسعار</em></h2>
            <label className="fld">
              <span className="fld__l">الوصف <span className="fld__opt">— اختياري</span></span>
              <textarea className="fld__i fld__i--area" rows={3} value={f.desc}
                onChange={(e) => set('desc', e.target.value)}
                placeholder="تفاصيل تفرّق مع اللي بيختار الصنف من القائمة" />
            </label>

            <div className="fld" style={{ marginTop: 14 }}>
              <span className="fld__l">صورة الصنف <span className="fld__opt">— اختياري</span></span>
              <button className="updrop updrop--wide"
                onClick={() => toast.info('رفع الصور بيتربط مع تخزين الملفات',
                  { sub: 'PNG أو JPEG أو WebP · بحد أقصى ٢ ميجابايت' })}>
                <Ico.plus size={18} />
                <em>سحب وإفلات أو نقر للرفع<span>PNG · JPEG · WebP — بحد أقصى ٢MB</span></em>
              </button>
            </div>
          </section>
        </div>

        {/* ---------- الرَّيل ---------- */}
        <aside className="rail">
          <section className="rail__c">
            <span className="rail__lbl">معاينة البند</span>
            <p className="fnote fnote--quiet" style={{ marginBottom: 12 }}>
              كده الصنف هيبان في محرّر بنود الفاتورة:
            </p>
            <div className="lprev">
              <b>{f.ar || 'اسم الصنف'}</b>
              <span className="lprev__m num">{f.sku}</span>
              <span className="lprev__r">
                <span className="num">{f.sell ? fmtMoney(+f.sell) : '0.00'}</span>
                <Riyal /> / {f.unitName}
              </span>
            </div>
          </section>

          <section className="rail__c">
            <span className="rail__lbl">جاهزية الصنف</span>
            <ul className="rail__check">
              <li className={f.ar.trim() ? 'is-ok' : ''}>
                <Ico.check size={14} />اسم يظهر في الفاتورة
              </li>
              <li className={f.sell !== '' ? 'is-ok' : ''}>
                <Ico.check size={14} />سعر بيع
              </li>
              <li className={f.unitCode ? 'is-ok' : ''}>
                <Ico.check size={14} />رمز وحدة معتمد للهيئة
              </li>
              <li className={f.tax ? 'is-ok' : ''}>
                <Ico.check size={14} />فئة ضريبة افتراضية
              </li>
              {isProd && (
                <li className={openStores.length ? 'is-ok' : ''}>
                  <Ico.check size={14} />رصيد افتتاحي
                </li>
              )}
            </ul>
            <p className="fnote fnote--quiet">
              الحقول اللي من غير علامة مش مانعة للحفظ — بس اللي فيها علامة بيوفّر عليك خطوة
              في كل فاتورة جاية.
            </p>
          </section>
        </aside>
      </div>

      <div className="savebar" data-component="SaveBar">
        <span className={`savebar__s${tried && nErr ? ' is-bad' : ''}`}>
          {tried && nErr
            ? <><Ico.close size={15} />ناقص {countAr(nErr)} — موضّحة أعلاه باللون الأحمر</>
            : nErr === 0
              ? <><Ico.check size={15} />جاهز</>
              : 'أكمل الحقول ثم احفظ — سننبّهك إن كان هناك نقص'}
        </span>
        <div className="savebar__b">
          <button className="btn btn--ghost" onClick={() => nav('/inventory/items')}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>
            <Ico.check size={16} />{editing ? 'حفظ التعديلات' : 'حفظ الصنف'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
