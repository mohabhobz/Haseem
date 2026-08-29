import * as DATA from '../data/mock.js'

/* ============================================================
   تحويل أي سطر مستند لشكل معاينة الطباعة.

   ليه موجود: معاينة الطباعة عندها شكل بيانات واحد، والمستندات
   جاية من تلات قوايم بأسماء حقول مختلفة. بدل ما كل شاشة تبني
   الكائن ده بإيدها، بنبنيه هنا مرة واحدة.

   والنوع بيتبعت للمعاينة كمان: إشعار دائن مش «فاتورة»، ولازم
   يبان عليه **مرجع الفاتورة الأصلية** — دي متطلّب هيئة مش تزويقة.
   ============================================================ */

const VAT = 0.15

export function previewOf(row, kind) {
  const lines = DATA.linesOf ? DATA.linesOf(row) : []
  const net = lines.reduce((a, l) => a + (l.total || 0), 0)
  const tax = +(net * VAT).toFixed(2)
  return {
    no: row.no,
    date: row.date,
    due: row.due || row.valid,
    party: row.c,
    lines,
    net,
    disc: 0,
    tax,
    total: row.total ?? net + tax,
    netDue: row.total ?? net + tax,
    zatcaOk: row.zatca === 'ok',
    kind,
    ref: row.src || undefined,
    note: row.reason || undefined,
  }
}
