import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderBy, query, where } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDate, formatDateTime } from '../utils/date.js';

const EventDetailPage = () => {
  const { slug } = useParams();

  const eventState = useFirestoreCollection('events', {
    enabled: Boolean(slug),
    queryBuilder: useMemo(
      () => (ref) => query(ref, where('slug', '==', slug), orderBy('startDate', 'desc')),
      [slug]
    ),
  });

  const event = eventState.data[0];

  const matchesState = useFirestoreCollection('matches', {
    enabled: Boolean(event?.id),
    queryBuilder: useMemo(
      () => (ref) => query(ref, where('eventId', '==', event.id), orderBy('date', 'asc')),
      [event?.id]
    ),
  });

  const teamsState = useFirestoreCollection('teams');

  const resolveTeamName = (teamId) => teamsState.data.find((team) => team.id === teamId)?.name || '—';

  if (eventState.isLoading) {
    return (
      <section className="section">
        <DataState isLoading title="جارٍ تحميل تفاصيل البطولة" message="نحضّر جدول البطولة بالكامل." />
      </section>
    );
  }

  if (eventState.error) {
    return (
      <section className="section">
        <DataState tone="error" title="تعذّر تحميل البطولة" message={eventState.error} />
      </section>
    );
  }

  if (!event) {
    return (
      <section className="section">
        <DataState tone="warning" title="غير متوفر" message="لم يتم العثور على البطولة." />
      </section>
    );
  }

  return (
    <section className="section detail-layout">
      <div className="detail-panel">
        <header className="section__header">
          <h1>{event.name}</h1>
          <p>{event.type || 'بطولة'}</p>
        </header>
        <div className="detail-grid">
          <div className="detail-list">
            <div className="detail-list__item">
              <span>الفترة</span>
              <strong>
                {formatDate(event.startDate)} — {formatDate(event.endDate)}
              </strong>
            </div>
            <div className="detail-list__item">
              <span>الموقع</span>
              <strong>{event.location || 'غير محدد'}</strong>
            </div>
            <div className="detail-list__item">
              <span>الحالة</span>
              <strong>{event.active ? 'نشط' : 'مغلق'}</strong>
            </div>
          </div>
        </div>
        <p className="article-body">{event.description || 'سيتم تحديث وصف البطولة قريبًا.'}</p>
      </div>

      <div className="detail-panel">
        <h2>مباريات البطولة</h2>
        {matchesState.data.length === 0 ? (
          <p className="empty-state">لم يتم ربط مباريات بهذه البطولة بعد.</p>
        ) : (
          <ul className="detail-list">
            {matchesState.data.map((match) => (
              <li key={match.id} className="detail-list__item">
                <span>
                  {resolveTeamName(match.teamAId)} ضد {resolveTeamName(match.teamBId)}
                </span>
                <span>
                  {formatDateTime(match.date)} • <Link to={`/matches/${match.id}`}>التفاصيل</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default EventDetailPage;
