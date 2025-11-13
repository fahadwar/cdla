import { Routes, Route } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import MatchesPage from '../pages/MatchesPage.jsx';
import TeamsPage from '../pages/TeamsPage.jsx';
import PlayersPage from '../pages/PlayersPage.jsx';
import EventsPage from '../pages/EventsPage.jsx';
import ArticlesPage from '../pages/ArticlesPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import AdminDashboard from '../admin/AdminDashboard.jsx';

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
      </Route>
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
};

export default AppRouter;
