import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, role, updateDisplayName, isFirebaseReady, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [status, setStatus] = useState({ message: '', tone: 'neutral' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleLabels = {
    admin: 'مسؤول',
    editor: 'محرر',
    user: 'مستخدم',
  };

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleDisplayNameChange = (event) => {
    setDisplayName(event.target.value);
    setStatus({ message: '', tone: 'neutral' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!displayName.trim()) {
      setStatus({ message: 'لا يمكن ترك اسم العرض فارغًا.', tone: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      await updateDisplayName(displayName.trim());
      setStatus({ message: 'تم تحديث الملف الشخصي بنجاح.', tone: 'success' });
    } catch (error) {
      setStatus({ message: error.message ?? 'تعذّر تحديث الملف الشخصي.', tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isFirebaseReady) {
    return (
      <section className="profile-card">
        <h1>ملفك الشخصي</h1>
        <p>قم بربط Firebase لتفعيل خصائص الملف الشخصي.</p>
        <Link to="/">العودة إلى الرئيسية</Link>
      </section>
    );
  }

  if (isLoading || !user) {
    return (
      <section className="profile-card">
        <h1>جاري تحميل الملف الشخصي…</h1>
      </section>
    );
  }

  return (
    <section className="profile-card">
      <h1>ملفك الشخصي</h1>
      <p className="profile-card__meta">الدور: {roleLabels[role] ?? roleLabels.user}</p>

      <div className="profile-card__details">
        <p>
          <strong>البريد الإلكتروني:</strong> {user.email}
        </p>
      </div>

      <form className="profile-card__form" onSubmit={handleSubmit}>
        <label>
          <span>اسم العرض</span>
          <input
            type="text"
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder="اسمك المعروض للجمهور"
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
        </button>
      </form>

      {status.message && (
        <p className={`profile-card__status profile-card__status--${status.tone}`}>
          {status.message}
        </p>
      )}

      <p className="profile-card__backlink">
        <Link to="/">العودة إلى الرئيسية</Link>
      </p>
    </section>
  );
};

export default ProfilePage;
