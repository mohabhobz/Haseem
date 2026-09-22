import { Modal } from '../components/modal.jsx'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader, CurrencyNote } from '../components/layout.jsx'
import { Button } from '../components/primitives.jsx'
import { Ico } from '../components/icons.jsx'
import { SAR } from '../components/data.jsx'
import { toast, confirmAction } from '../components/feedback.jsx'
import * as DATA from '../data/mock.js'
import { Select } from '../components/selectfield.jsx'

/* ============================================================
   المستودعات.

   في سيستم العميل الصف بيقول الاسم والفرع وبس — يعني مستودع
   فاضي ومستودع فيه بضاعة بمليون ريال شكلهم واحد.

   هنا كل مستودع بيقول **كام صنف جواه وبكام**، عشان الشاشة تجاوب
   السؤال اللي بيتسأل فعلًا: أنزّل الشحنة الجديدة فين، ومين اللي
   محتاج جرد.
   ============================================================ */

/* رقم المستودع الجديد — نفس نمط سيستم العميل WH-xxxxxx */
const nextCode = () => `WH-${Math.floor(100000 + Math.random() * 900000)}`

function Form({ init, onClose }) {
  const editing = !!init
  const [ar, setAr] = useState(init?.ar || '')
  const [en, setEn] = useState(init?.en || '')
  const [showEn, setShowEn] = useState(!!init?.en)
  const [code, setCode] = useState(init?.id || nextCode())
  const [branch, setBranch] = useState(init?.branch || DATA.branches[0].id)
  const [main, setMain] = useState(!!init?.main)
  const [tried, setTried] = useState(false)

  const bad = !ar.trim()

  const save = () => {
    setTried(true)
    if (bad) return
    toast.ok(`${ar} ${editing ? 'اتحفظ' : 'اتضاف'}`,
      { sub: main ? 'بقى الافتراضي للفرع ده' : 'جاهز لاستقبال المخزون' })
    onClose()
  }

  return (
    <Modal title={editing ? 'تعديل مستودع' : 'مستودع جديد'} sub="المستودع هو المكان اللي الرصيد بيتحسب فيه." onClose={onClose}
      footer={<>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn--primary" onClick={save}>
            <Ico.check size={16} />حفظ
          </button>
      </>}>

        <label className="fld">
          <span className="fld__l">اسم المستودع</span>
          <input className={`fld__i${tried && bad ? ' is-bad' : ''}`} value={ar} autoFocus
            onChange={(e) => setAr(e.target.value)} placeholder="مستودع الرياض — العليا" />
          {tried && bad && <em className="fld__e">اسم المستودع مطلوب</em>}
        </label>

        {showEn ? (
          <label className="fld" style={{ marginTop: 12 }}>
            <span className="fld__l">الاسم بالإنجليزية <span className="fld__opt">— اختياري</span></span>
            <input className="fld__i ltr" value={en} onChange={(e) => setEn(e.target.value)}
              placeholder="Riyadh Warehouse" />
          </label>
        ) : (
          <button className="lnk lnk--mute" style={{ marginTop: 8 }}
            onClick={() => setShowEn(true)}>＋ أضف الاسم بالإنجليزية</button>
        )}

        <div className="frow frow--2" style={{ marginTop: 14 }}>
          <label className="fld">
            <span className="fld__l">الرمز</span>
            <input className="fld__i num" value={code} onChange={(e) => setCode(e.target.value)} />
            <em className="fld__h">بيتولّد لوحده — عدّله لو عندك ترقيم خاص.</em>
          </label>
          <label className="fld">
            <span className="fld__l">الفرع</span>
            <Select className="fld__i" value={branch} onChange={(e) => setBranch(e.target.value)}>
              {DATA.branches.map((b) => <option key={b.id} value={b.id}>{b.ar}</option>)}
            </Select>
            <em className="fld__h">الفرع اللي المستودع تابع له في التقارير.</em>
          </label>
        </div>

        <label className="chk" style={{ marginTop: 16 }}>
          <input type="checkbox" checked={main} onChange={(e) => setMain(e.target.checked)} />
          <span className="chk__b">
            <b>الافتراضي لهذا الفرع</b>
            <em>بيتعبّى لوحده في فواتير وتسويات الفرع ده.</em>
          </span>
        </label>

    </Modal>
  )
}

export default function Warehouses() {
  const nav = useNavigate()
  const [form, setForm] = useState(null)   // null | {} | store

  /* كل مستودع بيقول كام صنف جواه وبكام — ده اللي ناقص في سيستمه */
  const rows = DATA.stores.map((s) => {
    const items = DATA.items.filter((i) => i.kind === 'product' && DATA.stockAt(i.sku, s.id) > 0)
    return {
      s,
      items: items.length,
      qty: items.reduce((a, i) => a + DATA.stockAt(i.sku, s.id), 0),
      value: items.reduce((a, i) => a + DATA.stockAt(i.sku, s.id) * (i.cost || 0), 0),
      low: items.filter(DATA.isLow).length,
    }
  })

  const del = async (s) => {
    const r = rows.find((x) => x.s.id === s.id)
    if (r.items > 0) {
      toast.bad(`${s.ar} فيه ${r.items} صنف`, {
        sub: 'انقل الأصناف لمستودع تاني الأول — الحذف بيمسح رصيد.' })
      return
    }
    const ok = await confirmAction({
      title: `حذف ${s.ar}؟`,
      confirm: 'حذف المستودع',
      consequences: ['المستودع بيتشال من كل القوايم', 'الحركات القديمة عليه بتفضل في السجل'],
    })
    if (ok) toast.ok(`${s.ar} اتحذف`)
  }

  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title="المستودعات"
          sub={<>مواقع التخزين اللي الرصيد بيتحسب فيها<CurrencyNote /></>} />
        <div className="tophead__ctrl">
          <Button label="إنشاء مستودع" variant="primary" icon="＋" onClick={() => setForm({})} />
        </div>
      </div>

      <div className="whgrid">
        {rows.map(({ s, items, qty, value, low }) => (
          <article key={s.id} className="whcard" data-component="WarehouseCard">
            <header className="whcard__h">
              <span className="whcard__ic"><Ico.items size={17} /></span>
              <span className="whcard__t">
                <b>{s.ar}{s.main && <span className="whcard__def">افتراضي</span>}</b>
                <em>{DATA.branches.find((b) => b.id === s.branch)?.ar} · <span className="num">{s.id}</span></em>
              </span>
            </header>

            <div className="whcard__n">
              <div>
                <span className="whcard__l">أصناف</span>
                <span className="whcard__v num">{items}</span>
              </div>
              <div>
                <span className="whcard__l">إجمالي الكميات</span>
                <span className="whcard__v num">{qty}</span>
              </div>
              <div>
                <span className="whcard__l">قيمة المخزون</span>
                <span className="whcard__v"><SAR v={value} /></span>
              </div>
            </div>

            {low > 0 && (
              <p className="whcard__w">
                <Ico.bell size={14} />
                {low === 1 ? 'صنف واحد' : `${low} أصناف`} تحت حد التنبيه هنا
              </p>
            )}

            <footer className="whcard__f">
              <button className="lnk" onClick={() => nav(`/inventory/reports?store=${s.id}`)}>
                عرض الرصيد
              </button>
              <span className="whcard__a">
                <button className="iconbtn" aria-label="تعديل" onClick={() => setForm(s)}>
                  <Ico.edit size={16} />
                </button>
                <button className="iconbtn iconbtn--crit" aria-label="حذف" onClick={() => del(s)}>
                  <Ico.trash size={16} />
                </button>
              </span>
            </footer>
          </article>
        ))}
      </div>

      {form && <Form init={form.id ? form : null} onClose={() => setForm(null)} />}
    </AppShell>
  )
}
