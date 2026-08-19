/* شريط شرح المصطلح — لأن «إشعار دائن/مدين» مصطلح محاسبي
   صاحب المنشأة مش لازم يعرفه (من أوديت المصطلحات) */
export default function NoteBanner({ strong, text, link }) {
  return (
    <div data-component="NoteBanner" className="notebanner">
      <span className="notebanner__q">؟</span>
      <div>
        <b>{strong}</b> {text} {link}
      </div>
    </div>
  )
}
