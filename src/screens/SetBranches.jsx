import { useState } from 'react'
import { SettingsShell } from '../components/settingsshell.jsx'
import { Ico } from '../components/icons.jsx'
import { Modal } from '../components/modal.jsx'
import { toast, confirmAction } from '../components/feedback.jsx'
import * as DATA from '../data/mock.js'

/* ============================================================
   الفروع.

   الفرع مش سطر عنوان — هو **بُعد على المستند وبيروح للهيئة**:
   كود الفرع `BR-` بيتكتب في رأس الفاتورة، وكل فرع بيتربط بمنصة
   فاتورة كجهاز مستقل.

   عشان كده الصفحة بتقول على كل فرع تلات حاجات مش اسمه بس:
   • **الكود** — اللي بيروح للهيئة
   • **مربوط بالمنصة ولا لأ** — الفرع غير المربوط ما بيصدرش فواتير
   • **الافتراضي** — اللي بيتعبّى لوحده في المستند الجديد

   ★ والحذف ليه تلات حالات مختلفة، مش «ينفع/مينفعش»:
   ١) عليه مستندات → **ممنوع**، والرسالة بتقول عليه كام مستند،
      لأن المستندات بتشير لكوده وما ينفعش الكود يختفي.
   ٢) هو الفرع الوحيد → **ممنوع**، لازم يفضل فرع واحد.
   ٣) غير كده → بيتحذف فعلًا بعد تأكيد بيقول إيه اللي هيحصل،
      ولو كان الافتراضي، الافتراضي بيتنقل لأول فرع تاني.
   ============================================================ */

export default function SetBranches() {
  const [rows, setRows] = useState(DATA.branches)
  const [form, setForm] = useState(null)   // null | 'new' | branch
  const [def, setDef] = useState(DATA.branches[0].id)

  /* عدد المستندات على كل فرع — مشتق، عشان الحذف يعرف يقول لأ */
  const docsOf = (id) => DATA.invoices.filter((v) => (v.branch || DATA.branches[0].id) === id).length

  /* ---------- حفظ فرع جديد أو تعديل ---------- */
  const save = (b, isNew) => {
    /* API: POST/PUT /settings/branches */
    if (isNew) {
      setRows((p) => [...p, b])
      toast.ok(`${b.ar} اتضاف`, { sub: 'محتاج ربط بمنصة فاتورة قبل الإصدار منه' })
    } else {
      setRows((p) => p.map((x) => (x.id === b.id ? b : x)))
      toast.ok(`${b.ar} اتعدّل`, { sub: 'التغيير بيسري على المستندات الجديدة' })
    }
    setForm(null)
  }

  /* ---------- حذف ---------- */
  const remove = async (b) => {
    const n = docsOf(b.id)
    if (n > 0) {
      toast.bad(`${b.ar} عليه ${n} مستند`, {
        sub: 'الفرع اللي عليه مستندات ما بيتحذفش — لأن المستندات بتشير لكوده',
      })
      return
    }
    if (rows.length === 1) {
      toast.bad('ده الفرع الوحيد', { sub: 'لازم يفضل فرع واحد على الأقل' })
      return
    }
    const isDef = def === b.id
    const heir = rows.find((x) => x.id !== b.id)
    const ok = await confirmAction({
      title: `احذف ${b.ar}؟`,
      body: `الفرع ده مالوش مستندات، فحذفه ما بيأثرش على الدفتر.`,
      consequences: [
        `كود ${b.code} بيتشال ومش هيتكتب في أي فاتورة جديدة`,
        'ربطه بمنصة فاتورة بيتلغي — لو رجّعته هيحتاج ربط من جديد',
        ...(isDef ? [`«${heir?.ar}» هيبقى الفرع الافتراضي بدله`] : []),
      ],
      confirm: 'احذف الفرع',
    })
    if (!ok) return
    /* API: DELETE /settings/branches/:id */
    setRows((p) => p.filter((x) => x.id !== b.id))
    if (isDef && heir) setDef(heir.id)
    toast.ok(`${b.ar} اتحذف`, isDef ? { sub: `${heir?.ar} بقى الافتراضي` } : undefined)
  }

  return (
    <SettingsShell
      title="الفروع"
      sub="كود الفرع بيتكتب في رأس الفاتورة وبيروح للهيئة"
      footer={null}>

      <section className="fcard">
        <div className="fcard__h">
          <h2 className="fcard__t">فروع المنشأة <em>{rows.length} فروع</em></h2>
          <button className="gbtn2" onClick={() => setForm('new')}>
            <Ico.plus size={14} />فرع جديد
          </button>
        </div>

        <ul className="brlist">
          {rows.map((b) => {
            const n = docsOf(b.id)
            const isDef = def === b.id
            return (
              <li key={b.id}>
                <span className="brlist__n">
                  <b>{b.ar}</b>
                  <em><span className="num">{b.code}</span> · {b.city} · {b.address}</em>
                </span>

                <span className="brlist__t">
                  {isDef && <span className="st st--info">الافتراضي</span>}
                  <span className={`st st--${b.linked === false ? 'neutral' : 'positive'}`}>
                    {b.linked === false ? 'مش مربوط' : 'مربوط بالمنصة'}
                  </span>
                </span>

                <span className="brlist__d">{n} مستند</span>

                <span className="brlist__a">
                  {!isDef && (
                    <button className="linkish" onClick={() => {
                      setDef(b.id)
                      toast.ok(`${b.ar} بقى الفرع الافتراضي`, {
                        sub: 'بيتعبّى لوحده في المستند الجديد',
                      })
                    }}>خلّيه الافتراضي</button>
                  )}
                  <button className="gbtn2" onClick={() => setForm(b)}>تعديل</button>
                  <button className="lines__x" aria-label={`حذف ${b.ar}`}
                    onClick={() => remove(b)}>
                    <Ico.trash size={15} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>

        <p className="fnote fnote--quiet">
          كل فرع بيتربط بمنصة فاتورة <b>كجهاز مستقل</b>. الفرع اللي مش مربوط
          مستنداته بتتحفظ مسودات.
        </p>
      </section>

      {form && (
        <BranchForm branch={form === 'new' ? null : form}
          taken={rows.map((x) => x.code)} count={rows.length}
          onClose={() => setForm(null)}
          onSave={(b) => save(b, form === 'new')} />
      )}
    </SettingsShell>
  )
}

/* ---------- فرع جديد أو تعديل ---------- */
function BranchForm({ branch, taken, count, onClose, onSave }) {
  const [ar, setAr] = useState(branch?.ar || '')
  const [code, setCode] = useState(branch?.code || `BR-0${count + 1}`)
  const [city, setCity] = useState(branch?.city || '')
  const [address, setAddress] = useState(branch?.address || '')
  const [zip, setZip] = useState(branch?.zip || '')
  const [touched, setTouched] = useState(false)

  const shapeBad = !/^BR-\w{2,}$/.test(code.trim())
  /* الكود المتكرر بيبوّظ الربط عند الهيئة — فبيتمنع من هنا */
  const dupe = !shapeBad && taken.filter((c) => c === code.trim()).length > (branch ? 1 : 0)
  const codeBad = shapeBad || dupe
  const bad = !ar.trim() || codeBad

  const save = () => {
    setTouched(true)
    if (bad) {
      toast.bad('الفرع ناقص', {
        sub: dupe ? 'الكود ده مستخدم في فرع تاني'
          : shapeBad ? 'الكود لازم يبدأ بـBR-' : 'اكتب اسم الفرع',
      })
      return
    }
    onSave({
      id: branch?.id || 'b' + Date.now().toString(36),
      ar: ar.trim(), code: code.trim(), city: city.trim(),
      address: address.trim(), zip: zip.trim(),
      linked: branch ? branch.linked !== false : false,
    })
  }

  return (
    <Modal title={branch ? `تعديل ${branch.ar}` : 'فرع جديد'}
      sub="بيانات الفرع بتتطبع في رأس الفاتورة وبتروح للهيئة"
      onClose={onClose} wide
      footer={
        <>
          <button className="btn btn--quiet" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>
            {branch ? 'حفظ التعديل' : 'إضافة الفرع'}
          </button>
        </>
      }>
      <div className="frow frow--2">
        <label className="fld">
          <span className="fld__l">اسم الفرع</span>
          <input className={`fld__i${touched && !ar.trim() ? ' is-bad' : ''}`} value={ar}
            placeholder="فرع جدة" onChange={(e) => setAr(e.target.value)} />
        </label>
        <label className="fld">
          <span className="fld__l">كود الفرع</span>
          <input className={`fld__i ltr num${touched && codeBad ? ' is-bad' : ''}`} value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())} />
          {touched && codeBad
            ? <em className="fld__e">
                {dupe ? 'الكود ده مستخدم في فرع تاني — الهيئة بتفرّق بالكود'
                      : 'الكود لازم يبدأ بـBR- زي BR-02'}
              </em>
            : <em className="fld__h">بيتكتب في رأس الفاتورة وبيروح للهيئة</em>}
        </label>
      </div>

      <div className="frow frow--2" style={{ marginTop: 12 }}>
        <label className="fld">
          <span className="fld__l">المدينة</span>
          <input className="fld__i" value={city} placeholder="جدة"
            onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="fld">
          <span className="fld__l">الرمز البريدي</span>
          <input className="fld__i num" value={zip} placeholder="23433"
            onChange={(e) => setZip(e.target.value)} />
        </label>
      </div>

      <label className="fld" style={{ marginTop: 12 }}>
        <span className="fld__l">العنوان</span>
        <input className="fld__i" value={address} placeholder="طريق المدينة، حي الروضة"
          onChange={(e) => setAddress(e.target.value)} />
        <em className="fld__h">العنوان الوطني اللي بيتطبع على فواتير الفرع</em>
      </label>

      <p className="fnote fnote--quiet">
        الفرع الجديد <b>محتاج ربط بمنصة فاتورة</b> قبل ما يصدر فواتير ضريبية —
        من صفحة «الهيئة والفوترة».
      </p>
    </Modal>
  )
}
