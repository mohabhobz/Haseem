import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { Ico } from './icons.jsx'

/* ============================================================
   طبقة الرد على الأمر — تأكيد · توست · مهمة خلفية.

   ليه الملف ده أهم حاجة في تسليم فرونت من غير باك اند:
   الباك يقدر يبعت الإيميل، بس **مش هو اللي هيصمّم** الخطوة اللي
   بتسأل «متأكد؟» ولا الرسالة اللي بتقول «اتبعت» ولا شكل التقدّم
   لما المستخدم يحدّد ٤٠ فاتورة. دي كلها قرارات واجهة، ولو مش
   موجودة يبقى الأمر عند المستخدم = سكوت.

   القاعدة اللي ماشيين عليها:
   • أمر ليه رجعة  → نفّذ على طول + توست يقول إيه اللي حصل.
   • أمر مالوش رجعة → اسأل الأول، وقول في السؤال **إيه اللي هيحصل
     بالظبط**، مش «هل أنت متأكد؟» لوحدها.
   • أمر بياخد وقت → مؤشر تقدّم، والشاشة تفضل مفتوحة.
   ============================================================ */

/* ---------- ناقل بسيط: حالة واحدة + مشتركين ---------- */
function bus(initial) {
  let state = initial
  const subs = new Set()
  return {
    get: () => state,
    set: (v) => { state = v; subs.forEach((f) => f()) },
    sub: (f) => { subs.add(f); return () => subs.delete(f) },
  }
}

/* ============================================================
   ١ · التوست
   ============================================================ */
const toasts = bus([])
let tid = 0

function push(kind, text, opts = {}) {
  const id = ++tid
  toasts.set([...toasts.get(), { id, kind, text, ...opts }])
  if (kind !== 'work') {
    setTimeout(() => dismiss(id), opts.ms || 4200)
  }
  return id
}
function dismiss(id) { toasts.set(toasts.get().filter((t) => t.id !== id)) }
function update(id, changes) {
  toasts.set(toasts.get().map((t) => (t.id === id ? { ...t, ...changes } : t)))
}

export const toast = {
  ok:   (text, opts) => push('ok', text, opts),
  bad:  (text, opts) => push('bad', text, opts),
  info: (text, opts) => push('info', text, opts),
  dismiss,
}

export function Toaster() {
  const list = useSyncExternalStore(toasts.sub, toasts.get, toasts.get)
  if (!list.length) return null
  return (
    <div className="toasts" data-component="Toaster" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <span className="toast__ic">
            {t.kind === 'ok' ? <Ico.check size={15} />
              : t.kind === 'bad' ? <Ico.ban size={15} />
              : t.kind === 'work' ? <Ico.retry size={15} />
              : <Ico.bell size={15} />}
          </span>
          <div className="toast__b">
            <b>{t.text}</b>
            {t.sub && <span>{t.sub}</span>}
            {t.kind === 'work' && (
              <span className="toast__bar">
                <i style={{ width: `${Math.round((t.done / t.total) * 100)}%` }} />
              </span>
            )}
          </div>
          {t.action && (
            <button className="toast__a" onClick={() => { t.action.onClick(); dismiss(t.id) }}>
              {t.action.label}
            </button>
          )}
          {t.kind !== 'work' && (
            <button className="toast__x" aria-label="إغلاق" onClick={() => dismiss(t.id)}>
              <Ico.close size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   ٢ · المهمة الخلفية
   الأوامر الجماعية في السيستم بتشتغل على السيرفر وبتاخد وقت.
   الواجهة المطلوبة: تقدّم ظاهر، الشاشة ما تتقفلش، وخبر لما تخلص.
   ============================================================ */
export function runJob({ label, total, doneText, tick = 260 }) {
  const id = push('work', label, { total, done: 0, sub: `٠ من ${total}` })
  let done = 0
  const t = setInterval(() => {
    done += 1
    update(id, { done, sub: `${done} من ${total}` })
    if (done >= total) {
      clearInterval(t)
      dismiss(id)
      toast.ok(doneText || `تمّت ${label}`, { sub: `${total} مستند` })
    }
  }, tick)
  return id
}

/* ============================================================
   ٣ · التأكيد — للأوامر اللي مالهاش رجعة
   ============================================================ */
const dialog = bus(null)

/* بترجّع Promise<boolean> عشان الاستخدام يبقى سطر واحد */
export function confirmAction({ title, body, consequences, confirm = 'تأكيد', tone = 'danger', cancel = 'رجوع' }) {
  return new Promise((resolve) => {
    dialog.set({ title, body, consequences, confirm, tone, cancel, resolve })
  })
}

export function ConfirmHost() {
  const d = useSyncExternalStore(dialog.sub, dialog.get, dialog.get)
  const okRef = useRef(null)

  useEffect(() => {
    if (!d) return
    okRef.current?.focus()
    const esc = (e) => { if (e.key === 'Escape') close(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [d])

  if (!d) return null
  const close = (v) => { d.resolve(v); dialog.set(null) }

  return (
    <div className="cfm" data-component="ConfirmDialog" role="dialog" aria-modal="true">
      <div className="cfm__scrim" onClick={() => close(false)} />
      <div className={`cfm__box cfm__box--${d.tone}`}>
        <span className={`cfm__ic cfm__ic--${d.tone}`}>
          {d.tone === 'danger' ? <Ico.ban size={20} /> : <Ico.check size={20} />}
        </span>
        <h2 className="cfm__t">{d.title}</h2>
        {d.body && <p className="cfm__b">{d.body}</p>}

        {/* ★ «إيه اللي هيحصل» — ده اللي بيخلّي التأكيد مفيد بدل ما
            يبقى عقبة المستخدم بيدوس عليها من غير ما يقرا */}
        {d.consequences?.length > 0 && (
          <ul className="cfm__list">
            {d.consequences.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        )}

        <div className="cfm__acts">
          <button className="btn btn--ghost" onClick={() => close(false)}>{d.cancel}</button>
          <button ref={okRef}
            className={`btn ${d.tone === 'danger' ? 'btn--danger2' : 'btn--primary'}`}
            onClick={() => close(true)}>{d.confirm}</button>
        </div>
      </div>
    </div>
  )
}
