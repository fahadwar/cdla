import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderBy, query } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';

const TeamsPage = () => {
  const teamsState = useFirestoreCollection('teams', {
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('name', 'asc')), []),
  });

  const [filters, setFilters] = useState({ region: 'all', game: 'all', search: '' });

  const regionOptions = useMemo(() => {
    const values = new Set();
    teamsState.data.forEach((team) => team.region && values.add(team.region));
    return Array.from(values);
  }, [teamsState.data]);

  const gameOptions = useMemo(() => {
    const values = new Set();
    teamsState.data.forEach((team) => team.game && values.add(team.game));
    return Array.from(values);
  }, [teamsState.data]);

  const filteredTeams = useMemo(() => {
    return teamsState.data.filter((team) => {
      const matchesRegion = filters.region === 'all' || team.region === filters.region;
      const matchesGame = filters.game === 'all' || team.game === filters.game;
      const matchesSearch =
        !filters.search || team.name?.toLowerCase().includes(filters.search.toLowerCase());
      return matchesRegion && matchesGame && matchesSearch;
    });
  }, [teamsState.data, filters]);

  return (
    <section className="section">
      <header className="section__header">
        <h1>الفرق</h1>
        <p>قوائم الفرق الرسمية المشاركة في بطولات CDL بالعربي.</p>
      </header>

      <div className="filters-bar">
        <label>
          المنطقة
          <select value={filters.region} onChange={(event) => setFilters((prev) => ({ ...prev, region: event.target.value }))}>
            <option value="all">جميع المناطق</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label>
          اللعبة
          <select value={filters.game} onChange={(event) => setFilters((prev) => ({ ...prev, game: event.target.value }))}>
            <option value="all">كل الألعاب</option>
            {gameOptions.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>
        </label>
        <label>
          البحث بالاسم
          <input
            type="search"
            placeholder="اسم الفريق"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </label>
      </div>

      {teamsState.isLoading ? (
        <DataState isLoading title="جارٍ تحميل الفرق" message="يتم جلب جميع الفرق المسجلة." />
      ) : teamsState.error ? (
        <DataState tone="error" title="تعذّر تحميل الفرق" message={teamsState.error} />
      ) : filteredTeams.length === 0 ? (
        <div className="empty-state">لم يتم العثور على فرق مطابقة للبحث.</div>
      ) : (
        <div className="card-grid">
          {filteredTeams.map((team) => (
            <article key={team.id} className="team-card">
              <div className="team-card__header">
                <div className="team-card__logo">
                  {team.logoUrl ? <img src={team.logoUrl} alt={team.name} /> : <span>{team.shortName || 'فريق'}</span>}
                </div>
                <div>
                  <h3>{team.name}</h3>
                  <div className="team-card__meta">
                    <span>{team.region || 'غير معروف'}</span>
                    <span>{team.game || 'غير محدد'}</span>
                  </div>
                </div>
              </div>
              <Link className="link-arrow" to={`/teams/${team.slug}`}>
                تفاصيل الفريق →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default TeamsPage;
