import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, error, isFirebaseReady } = useAuth();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', displayName: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/profile', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModeToggle = (nextMode) => {
    setMode(nextMode);
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFirebaseReady) {
      setFormError('لم يتم إعداد Firebase. حدّث ملف ‎.env‎ لتمكين تسجيل الدخول.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await signIn(formData.email, formData.password);
      } else {
        await signUp(formData.email, formData.password, formData.displayName);
      }

      navigate('/profile', { replace: true });
    } catch (submitError) {
      setFormError(submitError.message ?? 'تعذّر إكمال عملية المصادقة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <h1>
        {mode === 'login'
          ? 'سجّل دخولك إلى منصة الرياضات الإلكترونية'
          : 'أنشئ حسابك في منصة الرياضات الإلكترونية'}
      </h1>
      <p>
        {mode === 'login'
          ? 'أدخل بريدك الإلكتروني وكلمة المرور للمتابعة.'
          : 'أكمل البيانات التالية للبدء.'}
      </p>

      {!isFirebaseReady && (
        <div className="auth-card__notice">
          يرجى إضافة إعدادات Firebase في ملف ‎.env‎ لتفعيل خصائص المصادقة.
        </div>
      )}

      {formError && <div className="auth-card__error">{formError}</div>}
      {error && !formError && <div className="auth-card__error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-form__field">
          <span>البريد الإلكتروني</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </label>

        {mode === 'register' && (
          <label className="auth-form__field">
            <span>اسم العرض</span>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="مثال: CoachAlex"
              required
            />
          </label>
        )}

        <label className="auth-form__field">
          <span>كلمة المرور</span>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength={6}
            required
          />
        </label>

        <button className="auth-form__submit" type="submit" disabled={isSubmitting || !isFirebaseReady}>
          {isSubmitting ? 'يرجى الانتظار…' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
        </button>
      </form>

      <div className="auth-form__switch">
        {mode === 'login' ? (
          <>
            <span>لا تملك حسابًا؟</span>
            <button type="button" onClick={() => handleModeToggle('register')}>
              إنشاء حساب
            </button>
          </>
        ) : (
          <>
            <span>لديك حساب مسبقًا؟</span>
            <button type="button" onClick={() => handleModeToggle('login')}>
              تسجيل الدخول
            </button>
          </>
        )}
      </div>

      <p className="auth-card__backlink">
        <Link to="/">العودة إلى الرئيسية</Link>
      </p>
    </section>
  );
};

export default LoginPage;
