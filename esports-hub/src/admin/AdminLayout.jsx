import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './AdminLayout.css';

const adminLinks = [
  { to: '/admin', label: 'نظرة عامة', end: true },
  { to: '/admin/teams', label: 'الفرق' },
  { to: '/admin/players', label: 'اللاعبين' },
  { to: '/admin/events', label: 'البطولات' },
  { to: '/admin/matches', label: 'المباريات' },
  { to: '/admin/articles', label: 'المقالات' },
  { to: '/admin/users', label: 'المستخدمين' },
  { to: '/admin/pickem', label: 'تحديات التوقعات' },
];

const AdminLayout = () => {
  const { profile, signOutUser } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">إدارة CDL بالعربي</div>
        <nav className="admin-nav">
          {adminLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="admin-nav__link">
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <span className="admin-sidebar__user-name">{profile?.displayName || 'مسؤول'}</span>
            <span className="admin-sidebar__user-email">{profile?.email}</span>
          </div>
          <button type="button" className="admin-sidebar__logout" onClick={signOutUser}>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-content__header">
          <h1>لوحة تحكم CDL بالعربي</h1>
          <p>كل ما تحتاجه لإدارة محتوى ودورات CDL بالعربي من واجهة واحدة.</p>
        </header>
        <section className="admin-content__body">
          <Outlet />
        </section>
      </div>
    </div>
  );
};

export default AdminLayout;
