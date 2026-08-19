/* ============================================================
   الثيم — فاتح / داكن
   القيمة بتتخزّن محليًا وبتتطبّق على <html data-theme>
   ============================================================ */
const KEY = 'haseem-theme'

export function getTheme() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme || 'light'
}

export function setTheme(t) {
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch (e) { /* تجاهل */ }
  window.dispatchEvent(new CustomEvent('haseem:theme', { detail: t }))
}
