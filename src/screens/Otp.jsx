import { useNavigate } from 'react-router-dom'
import { AuthLayout, OtpInput } from '../components/auth.jsx'
import { Button } from '../components/primitives.jsx'

export default function Otp() {
  const nav = useNavigate()
  return (
    <AuthLayout center>
      <h1 className="auth__title">أدخل رمز التحقق</h1>
      <p className="auth__sub">
        أرسلنا رمزًا من 6 أرقام إلى <b>mohab@websquids.sa</b>
      </p>

      <OtpInput />

      <div className="otp__timer">تقدر تطلب رمز جديد خلال <span className="num">00:42</span></div>

      <Button label="تأكيد ودخول" variant="primary" className="auth__submit"
        onClick={() => nav('/dashboard')} />

      <p className="auth__alt">
        الإيميل غلط؟ <a className="link" href="#" onClick={() => nav('/login')}>غيّر البريد الإلكتروني</a>
      </p>
    </AuthLayout>
  )
}
