import { NavLink, Outlet } from 'react-router-dom';
import './MainLayout.css';

const MainLayout = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">Esports Hub</div>
        <nav className="main-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/matches">Matches</NavLink>
          <NavLink to="/teams">Teams</NavLink>
          <NavLink to="/players">Players</NavLink>
          <NavLink to="/events">Events</NavLink>
          <NavLink to="/articles">Articles</NavLink>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">© {new Date().getFullYear()} Esports Hub</footer>
    </div>
  );
};

export default MainLayout;
