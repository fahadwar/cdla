import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderBy, query } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDateTime } from '../utils/date.js';

const statusLabels = {
  all: 'الكل',
  upcoming: 'قادمة',
  live: 'مباشرة',
  final: 'منتهية',
};

const MatchesPage = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');

  const matchesState = useFirestoreCollection('matches', {
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('date', 'desc')), []),
  });
  const teamsState = useFirestoreCollection('teams');
  const eventsState = useFirestoreCollection('events', {
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('startDate', 'desc')), []),
  });

  const teamsMap = useMemo(() => {
    const map = new Map();
    teamsState.data.forEach((team) => map.set(team.id, team));
    return map;
  }, [teamsState.data]);

  const filteredMatches = useMemo(() => {
    return matchesState.data.filter((match) => {
      const statusOk = statusFilter === 'all' || match.status === statusFilter;
      const eventOk = eventFilter === 'all' || match.eventId === eventFilter;
      return statusOk && eventOk;
    });
  }, [matchesState.data, statusFilter, eventFilter]);

  return (
    <section className="section">
      <header className="section__header">
        <h1>المباريات</h1>
        <p>تابع كل المباريات في مكان واحد مع إمكانية تصفية الحالة والبطولة.</p>
      </header>

      <div className="status-tabs">
        {Object.entries(statusLabels).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={value === statusFilter ? 'active' : ''}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <label>
          اختر البطولة
          <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
            <option value="all">كل البطولات</option>
            {eventsState.data.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {matchesState.isLoading ? (
        <DataState isLoading title="جارٍ تحميل المباريات" message="نقوم بتحميل الجدول الكامل." />
      ) : matchesState.error ? (
        <DataState tone="error" title="تعذّر تحميل المباريات" message={matchesState.error} />
      ) : filteredMatches.length === 0 ? (
        <div className="empty-state">لا توجد مباريات مطابقة للمعايير الحالية.</div>
      ) : (
        <div className="card-grid">
          {filteredMatches.map((match) => {
            const teamA = teamsMap.get(match.teamAId);
            const teamB = teamsMap.get(match.teamBId);
            const event = eventsState.data.find((evt) => evt.id === match.eventId);
            return (
              <article key={match.id} className="match-card">
                <div className="match-card__meta">
                  <span className="pill">{event?.name || 'بطولة غير معروفة'}</span>
                  <span>{formatDateTime(match.date)}</span>
                </div>
                <div className="match-card__teams">
                  <div className="match-card__team">
                    <strong>{teamA?.name || '—'}</strong>
                    <span>{teamA?.region || '—'}</span>
                  </div>
                  <div className="match-card__score">
                    {match.status === 'final' ? `${match.teamAScore} - ${match.teamBScore}` : 'VS'}
                  </div>
                  <div className="match-card__team">
                    <strong>{teamB?.name || '—'}</strong>
                    <span>{teamB?.region || '—'}</span>
                  </div>
                </div>
                <div className="match-card__meta">
                  <span className="pill">{statusLabels[match.status] || '—'}</span>
                  {match.vodUrl && <span>VOD متاح</span>}
                </div>
                <Link className="link-arrow" to={`/matches/${match.id}`}>
                  صفحة المباراة →
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MatchesPage;
