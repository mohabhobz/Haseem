import { useNavigate } from 'react-router-dom'
import { AppShell, PageHeader } from './layout.jsx'
import { Ico } from './icons.jsx'

/* ============================================================
   قشرة الإعدادات.

   ★ المشكلة اللي بتتحل هنا:

   الإعدادات كانت **صفحة واحدة فيها عشر أقسام** تحت بعض، وفي
   الرَّيل «أقسام الصفحة» — يعني فهرس بيسكرول بيك. الفهرس ده
   مش فيتشر، هو **عرض جانبي لصفحة أطول من اللازم**.

   دلوقتي كل قسم صفحته: بتحفظ اللي إنت فيه، والرابط بيتشير،
   والرجوع بيرجّعك لنفس القسم.

   ★ والتنقل بين أقسام الإعدادات **مكانه قايمة السايدبار زي أي
   موديول تاني في السيستم** — مش قايمة تانية جوه الصفحة. قايمتين
   بنفس السبع روابط على نفس الشاشة ده تكرار، مش توجيه.

   والحفظ بقى **لكل صفحة لوحدها** — كنت بتضغط «حفظ» فتحفظ عشر
   أقسام مع بعض من غير ما تعرف إيه اللي اتغيّر فيهم.
   ============================================================ */

export const SET_NAV = [
  { to: '/settings/organization', t: 'المنشأة',        d: 'الاسم والرقم الضريبي والعنوان' },
  { to: '/settings/branches',     t: 'الفروع',          d: 'فروع المنشأة وأكوادها' },
  { to: '/settings/team',         t: 'الفريق والصلاحيات', d: 'مين يدخل ومين يشوف إيه' },
  { to: '/settings/documents',    t: 'المستندات',       d: 'الافتراضيات والترقيم وشكل الأرقام' },
  { to: '/settings/currencies',   t: 'العملات',         d: 'أسعار التحويل مقابل الريال' },
  { to: '/settings/zatca',        t: 'الهيئة والفوترة', d: 'الربط بمنصة فاتورة' },
  { to: '/settings/brand',        t: 'الهوية البصرية',  d: 'الألوان والخطوط والشعار' },
]

export function SettingsShell({ title, sub, actions, children, footer, onSave, onCancel, status }) {
  const nav = useNavigate()
  /* ★ قاعدة الحفظ (قرار p7-210): الحفظ فوق على الشمال في رأس الصفحة،
     وعلى الموبايل شريط ثابت تحت — نفس مكانه في الدرج. */
  const saveBtns = footer !== null && (onSave || footer) ? (footer || (
    <>
      <button className="btn btn--quiet" onClick={onCancel || (() => nav('/dashboard'))}>إلغاء</button>
      <button className="btn btn--primary" onClick={onSave}>حفظ</button>
    </>
  )) : null
  return (
    <AppShell>
      <div className="tophead">
        <PageHeader title={title} sub={<>{sub}{status?.text && <span className={`setsave__s${status?.bad ? ' is-bad' : ''}`} style={{ display: 'block' }}>{status.text}</span>}</>} />
        <div className="tophead__ctrl" data-slot="set-acts">{actions}{saveBtns && <span className="ob-savegrp">{saveBtns}</span>}</div>
      </div>

      <div className="setmain">
        {children}
        {saveBtns && <div className="ob-mbar">{saveBtns}</div>}
      </div>
    </AppShell>
  )
}
