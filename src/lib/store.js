import { useSyncExternalStore } from 'react'
import * as DATA from '../data/mock.js'

/* ============================================================
   طبقة الحالة — «إيه اللي اتغيّر عن الداتا الأصلية».

   إحنا فرونت من غير باك اند. بس الزرار اللي بيقول «إلغاء الفاتورة»
   لازم يخلّي الفاتورة تبان ملغاة فعلًا، وإلا الكلاينت مش هيقدر
   يجرّب الفلو ولا يحكم على التصميم.

   الفكرة: مش بنعدّل mock.js. بنمسك **طبقة فوقها** فيها التغييرات
   اللي حصلت في الجلسة دي بس، ومفتاحها `النوع:الرقم`. الشاشة بتقرا
   الأصل + الطبقة مدموجين.

   ★ للمطوّر اللي هيستلم الكود:
   الملف ده هو اللي بيتشال. كل `patch()` هنا مكانها استدعاء API،
   وكل `useDocs()` مكانها الداتا الجاية من السيرفر. مفيش أي منطق
   شغل هنا — دي مجرد ذاكرة مؤقتة عشان الواجهة تبان حيّة.
   ============================================================ */

const KINDS = {
  invoices: (r) => r.no,
  quotations: (r) => r.no,
  creditNotes: (r) => r.no,
  debitNotes: (r) => r.no,
  customers: (r) => r.id,
  items: (r) => r.sku,
  transfers: (r) => r.no,
  adjustments: (r) => r.no,
  suppliers: (r) => r.id,
  bills: (r) => r.no,
  purchaseOrders: (r) => r.no,
  expenses: (r) => r.no,
  customs: (r) => r.no,
  supplierNotes: (r) => r.no,
  receiptVouchers: (r) => r.no,
  paymentVouchers: (r) => r.no,
  cashTransfers: (r) => r.no,
  journalEntries: (r) => r.no,
}

let overlay = {}          // { 'invoices:INV-027122': { status: 'cancelled' } }
const subs = new Set()

const emit = () => { overlay = { ...overlay }; subs.forEach((f) => f()) }
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
const snapshot = () => overlay

/* تعديل مستند واحد */
export function patch(kind, id, changes) {
  const k = `${kind}:${id}`
  overlay[k] = { ...(overlay[k] || {}), ...changes }
  emit()
}

/* تعديل مجموعة مستندات مرة واحدة — للأوامر الجماعية */
export function patchMany(kind, ids, changes) {
  ids.forEach((id) => {
    const k = `${kind}:${id}`
    overlay[k] = { ...(overlay[k] || {}), ...changes }
  })
  emit()
}

export function resetStore() { overlay = {}; emit() }

const raw = {
  invoices: () => DATA.invoices,
  quotations: () => DATA.quotations,
  creditNotes: () => DATA.creditNotes,
  debitNotes: () => DATA.debitNotes,
  customers: () => DATA.customers,
  items: () => DATA.items,
  transfers: () => DATA.transfers,
  adjustments: () => DATA.adjustments,
  suppliers: () => DATA.suppliers,
  bills: () => DATA.bills,
  purchaseOrders: () => DATA.purchaseOrders,
  expenses: () => DATA.expenses,
  customs: () => DATA.customs,
  supplierNotes: () => DATA.supplierNotes,
  receiptVouchers: () => DATA.receiptVouchers,
  paymentVouchers: () => DATA.paymentVouchers,
  cashTransfers: () => DATA.cashTransfers,
  journalEntries: () => DATA.journalEntries,
}

/* القراءة: الأصل + التغييرات. الترتيب محفوظ زي ما هو. */
export function useDocs(kind) {
  const ov = useSyncExternalStore(subscribe, snapshot, snapshot)
  const list = raw[kind]?.() || []
  const key = KINDS[kind]
  return list.map((r) => {
    const ch = ov[`${kind}:${key(r)}`]
    return ch ? { ...r, ...ch } : r
  })
}

/* مستند واحد بالرقم */
export function useDoc(kind, id) {
  return useDocs(kind).find((r) => KINDS[kind](r) === id)
}
