import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderBy, query } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';

const PlayersPage = () => {
  const playersState = useFirestoreCollection('players', {
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('name', 'asc')), []),
  });
  const teamsState = useFirestoreCollection('teams', {
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('name', 'asc')), []),
  });

  const [filters, setFilters] = useState({ teamId: 'all', role: 'all', search: '' });

  const roleOptions = useMemo(() => {
    const roles = new Set();
    playersState.data.forEach((player) => player.role && roles.add(player.role));
    return Array.from(roles);
  }, [playersState.data]);

  const filteredPlayers = useMemo(() => {
    return playersState.data.filter((player) => {
      const teamMatch = filters.teamId === 'all' || player.teamId === filters.teamId;
      const roleMatch = filters.role === 'all' || player.role === filters.role;
      const searchMatch =
        !filters.search ||
        player.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        player.nickname?.toLowerCase().includes(filters.search.toLowerCase());
      return teamMatch && roleMatch && searchMatch;
    });
  }, [playersState.data, filters]);

  const resolveTeamName = (teamId) => teamsState.data.find((team) => team.id === teamId)?.name || '—';

  return (
    <section className="section">
      <header className="section__header">
        <h1>اللاعبين</h1>
        <p>استعرض محترفي CDL بالعربي، أدوارهم وفرقهم الحالية.</p>
      </header>

      <div className="filters-bar">
        <label>
          الفريق
          <select value={filters.teamId} onChange={(event) => setFilters((prev) => ({ ...prev, teamId: event.target.value }))}>
            <option value="all">كل الفرق</option>
            {teamsState.data.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الدور
          <select value={filters.role} onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}>
            <option value="all">كل الأدوار</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          البحث
          <input
            type="search"
            placeholder="اسم اللاعب أو اللقب"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </label>
      </div>

      {playersState.isLoading ? (
        <DataState isLoading title="جارٍ تحميل اللاعبين" message="يتم تجهيز قائمة المحترفين." />
      ) : playersState.error ? (
        <DataState tone="error" title="تعذّر تحميل اللاعبين" message={playersState.error} />
      ) : filteredPlayers.length === 0 ? (
        <div className="empty-state">لم يتم العثور على لاعبين بهذه المعايير.</div>
      ) : (
        <div className="card-grid">
          {filteredPlayers.map((player) => (
            <article key={player.id} className="player-card">
              <div className="player-card__header">
                <div className="player-card__photo">
                  {player.photoUrl ? <img src={player.photoUrl} alt={player.nickname || player.name} /> : <span>🎮</span>}
                </div>
                <div>
                  <h3>{player.nickname || player.name}</h3>
                  <div className="player-card__meta">
                    <span>{player.name}</span>
                    <span>{player.country || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="player-card__meta">
                <span>الدور: {player.role || 'غير محدد'}</span>
                <span>الفريق: {resolveTeamName(player.teamId)}</span>
              </div>
              <Link className="link-arrow" to={`/players/${player.slug}`}>
                عرض الملف →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default PlayersPage;
