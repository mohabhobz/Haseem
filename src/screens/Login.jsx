import { useNavigate } from 'react-router-dom'
import { toast } from '../components/feedback.jsx'
import { AuthLayout, GoogleButton, AuthDivider } from '../components/auth.jsx'
import { Button, Field } from '../components/primitives.jsx'

export default function Login() {
  const nav = useNavigate()
  return (
    <AuthLayout>
      <h1 className="auth__title">تسجيل الدخول</h1>

      <GoogleButton onClick={() => toast.info('الدخول بحساب Google',
        { sub: 'بيتفعّل لما الربط مع مزوّد الهوية يتعمل' })} />
      <AuthDivider label="أو بالبريد الإلكتروني" />

      <Field label="البريد الإلكتروني" type="email" placeholder="name@company.com"
        defaultValue="mohab@websquids.sa" />
      <Field label="كلمة المرور" type="password" placeholder="••••••••" defaultValue="password" />
      <div className="auth__forgot"><a className="link" href="#">نسيت كلمة المرور؟</a></div>

      <Button label="تسجيل الدخول" variant="primary" className="auth__submit"
        onClick={() => nav('/otp')} />

      <p className="auth__alt">
        ما عندك حساب؟ <a className="link" href="#">أنشئ حساب لمنشأتك</a>
      </p>
    </AuthLayout>
  )
}
