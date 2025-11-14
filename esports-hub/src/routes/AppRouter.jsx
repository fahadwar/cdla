import { Routes, Route } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import MatchesPage from '../pages/MatchesPage.jsx';
import TeamsPage from '../pages/TeamsPage.jsx';
import PlayersPage from '../pages/PlayersPage.jsx';
import EventsPage from '../pages/EventsPage.jsx';
import ArticlesPage from '../pages/ArticlesPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminLayout from '../admin/AdminLayout.jsx';
import AdminDashboard from '../admin/AdminDashboard.jsx';
import TeamsAdmin from '../admin/TeamsAdmin.jsx';
import PlayersAdmin from '../admin/PlayersAdmin.jsx';
import EventsAdmin from '../admin/EventsAdmin.jsx';
import MatchesAdmin from '../admin/MatchesAdmin.jsx';
import ArticlesAdmin from '../admin/ArticlesAdmin.jsx';
import UsersAdmin from '../admin/UsersAdmin.jsx';
import PickemAdmin from '../admin/PickemAdmin.jsx';

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute requiredRole="admin" />}> 
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="teams" element={<TeamsAdmin />} />
          <Route path="players" element={<PlayersAdmin />} />
          <Route path="events" element={<EventsAdmin />} />
          <Route path="matches" element={<MatchesAdmin />} />
          <Route path="articles" element={<ArticlesAdmin />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="pickem" element={<PickemAdmin />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRouter;
