import { SettingsShell } from '../components/settingsshell.jsx'
import { BrandTab } from '../components/brandtab.jsx'

/* الهوية البصرية — الألوان والخطوط. المحتوى في `brandtab.jsx`
   لأنه بيتستخدم في المعاينة كمان، والصفحة دي بتحطّه في مكانه. */
export default function SetBrand() {
  return (
    <SettingsShell
      title="الهوية البصرية"
      sub="لون المنشأة والخطوط — بيسري على الواجهة والمستندات المطبوعة"
      footer={null}>
      <BrandTab />
    </SettingsShell>
  )
}
