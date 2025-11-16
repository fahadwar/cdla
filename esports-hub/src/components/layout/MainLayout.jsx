import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './MainLayout.css';

const MainLayout = () => {
  const { user, profile, role, isLoading, signOutUser } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">CDL بالعربي</div>
        <nav className="main-nav">
          <NavLink to="/" end>
            الرئيسية
          </NavLink>
          <NavLink to="/matches">المباريات</NavLink>
          <NavLink to="/teams">الفرق</NavLink>
          <NavLink to="/players">اللاعبين</NavLink>
          <NavLink to="/events">البطولات</NavLink>
          <NavLink to="/articles">المقالات</NavLink>
          <NavLink to="/pickem">توقعاتك</NavLink>
          <NavLink to="/leaderboard">لوحة الصدارة</NavLink>
          {role === 'admin' && (
            <NavLink to="/admin" className="main-nav__admin">
              لوحة التحكم
            </NavLink>
          )}
          {isLoading ? (
            <span className="main-nav__status">جارٍ التحميل…</span>
          ) : user ? (
            <>
              <NavLink to="/profile">{profile?.displayName || 'الملف الشخصي'}</NavLink>
              <button type="button" className="main-nav__button" onClick={signOutUser}>
                تسجيل الخروج
              </button>
            </>
          ) : (
            <NavLink to="/login">تسجيل الدخول</NavLink>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">© {new Date().getFullYear()} CDL بالعربي</footer>
    </div>
  );
};

export default MainLayout;
