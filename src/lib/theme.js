/* ============================================================
   الثيم — فاتح / داكن
   القيمة بتتخزّن محليًا وبتتطبّق على <html data-theme>
   ============================================================ */
import { applyBrand } from './brand.js'

const KEY = 'haseem-theme'

export function getTheme() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme || 'light'
}

export function setTheme(t) {
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch (e) { /* تجاهل */ }
  /* لون المنشأة ليه سلّم مختلف في الداكن — يتعاد حسابه */
  applyBrand()
  window.dispatchEvent(new CustomEvent('haseem:theme', { detail: t }))
}
