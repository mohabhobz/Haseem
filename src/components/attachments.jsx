import { useState } from 'react'
import { Ico } from './icons.jsx'
import { toast } from './feedback.jsx'
import * as ACT from '../lib/actions.js'

/* ============================================================
   المرفقات.

   موجودة في سيستم العميل على فاتورة المشتريات وأمر الشراء، ومكانتش
   عندنا خالص. وهي مش تفصيلة: فاتورة المورد الورقية أو صورة سند
   الاستلام هي **الإثبات** وقت المراجعة الضريبية.

   اللي زوّدناه على سيستمه: بيقول **إيه اللي يترفع** بدل «إرفاق ملف»
   جافة، وبيمنع الملف الكبير قبل الرفع مش بعده.
   ============================================================ */

const MAX_MB = 10
const OK = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'xlsx', 'csv']

const ICON = { pdf: Ico.invoice, xlsx: Ico.reports, csv: Ico.reports }
const extOf = (n) => String(n).split('.').pop().toLowerCase()

export function Attachments({ docNo, hint }) {
  const [files, setFiles] = useState([])

  const add = (list) => {
    const next = []
    ;[...list].forEach((f) => {
      const ext = extOf(f.name)
      if (!OK.includes(ext)) {
        toast.bad(`${f.name} — نوع ملف مش مدعوم`, { sub: `المدعوم: ${OK.join(' · ')}` })
        return
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        toast.bad(`${f.name} أكبر من ${MAX_MB} ميجا`, { sub: 'صغّره وجرّب تاني' })
        return
      }
      next.push({ id: `${Date.now()}-${f.name}`, name: f.name, ext,
        size: f.size, date: new Date().toISOString().slice(0, 10) })
    })
    if (!next.length) return
    setFiles((p) => [...next, ...p])
    ACT.attachFiles(docNo, next.length)
  }

  const del = async (f) => {
    const ok = await ACT.removeAttachment(f.name)
    if (ok) setFiles((p) => p.filter((x) => x.id !== f.id))
  }

  return (
    <section className="fcard" data-component="Attachments">
      <div className="fcard__h">
        <h2 className="fcard__t">
          المرفقات <em>{hint || 'فاتورة المورد الورقية · سند الاستلام · إذن الصرف'}</em>
        </h2>
        <label className="gbtn2" style={{ cursor: 'pointer' }}>
          <Ico.plus size={14} />إرفاق ملف
          <input type="file" multiple hidden accept={OK.map((e) => '.' + e).join(',')}
            onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        </label>
      </div>

      {files.length === 0 ? (
        <label className="dropz">
          <Ico.download size={20} />
          <b>اسحب الملفات هنا أو اضغط للاختيار</b>
          <span>{OK.join(' · ')} — بحد أقصى {MAX_MB} ميجا للملف</span>
          <input type="file" multiple hidden accept={OK.map((e) => '.' + e).join(',')}
            onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        </label>
      ) : (
        <ul className="atlist">
          {files.map((f) => {
            const Ic = ICON[f.ext] || Ico.items
            return (
              <li key={f.id}>
                <span className="atlist__ic"><Ic size={16} /></span>
                <span className="atlist__n">
                  <b>{f.name}</b>
                  <em>{(f.size / 1024).toFixed(0)} ك.ب · {f.date}</em>
                </span>
                <button className="atlist__b" onClick={() => ACT.downloadAttachment(f.name)}
                  aria-label={`تحميل ${f.name}`}><Ico.download size={15} /></button>
                <button className="atlist__b atlist__b--crit" onClick={() => del(f)}
                  aria-label={`حذف ${f.name}`}><Ico.trash size={15} /></button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
