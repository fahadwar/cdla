import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const GuardMessage = ({ message }) => (
  <div className="route-guard__message">
    <div className="route-guard__loader" aria-hidden="true" />
    <p>{message}</p>
  </div>
);

const ProtectedRoute = ({ requiredRole = null, redirectTo = '/login' }) => {
  const location = useLocation();
  const { user, role, isLoading, error, isFirebaseReady } = useAuth();

  if (!isFirebaseReady) {
    return (
      <GuardMessage message="لم يتم إعداد Firebase. حدّث ملف ‎.env‎ لتفعيل لوحة التحكم." />
    );
  }

  if (isLoading) {
    return <GuardMessage message="جارٍ التحقق من صلاحيات الإدارة…" />;
  }

  if (error) {
    return <GuardMessage message={error} />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
