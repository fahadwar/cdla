import { Link, useParams } from 'react-router-dom';
import useFirestoreDocument from '../hooks/useFirestoreDocument.js';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDateTime } from '../utils/date.js';

const MatchDetailPage = () => {
  const { matchId } = useParams();
  const matchState = useFirestoreDocument('matches', matchId, { enabled: Boolean(matchId) });
  const teamsState = useFirestoreCollection('teams');
  const eventsState = useFirestoreCollection('events');

  if (matchState.isLoading) {
    return (
      <section className="section">
        <DataState isLoading title="جارٍ تحميل تفاصيل المباراة" message="نحضّر بيانات المواجهة." />
      </section>
    );
  }

  if (matchState.error) {
    return (
      <section className="section">
        <DataState tone="error" title="تعذّر تحميل المباراة" message={matchState.error} />
      </section>
    );
  }

  if (!matchState.data) {
    return (
      <section className="section">
        <DataState tone="warning" title="غير متوفر" message="لم يتم العثور على المباراة المطلوبة." />
      </section>
    );
  }

  const match = matchState.data;
  const teamA = teamsState.data.find((team) => team.id === match.teamAId);
  const teamB = teamsState.data.find((team) => team.id === match.teamBId);
  const event = eventsState.data.find((evt) => evt.id === match.eventId);

  return (
    <section className="section detail-layout">
      <div className="detail-panel">
        <header className="section__header">
          <h1>
            {teamA?.name || 'فريق أ'} ضد {teamB?.name || 'فريق ب'}
          </h1>
          <p>{event?.name || 'بطولة غير معروفة'}</p>
        </header>
        <div className="detail-grid">
          <div className="detail-list">
            <div className="detail-list__item">
              <span>التاريخ</span>
              <strong>{formatDateTime(match.date)}</strong>
            </div>
            <div className="detail-list__item">
              <span>الحالة</span>
              <strong>{match.status || 'غير محدد'}</strong>
            </div>
            <div className="detail-list__item">
              <span>النتيجة</span>
              <strong>
                {match.teamAScore ?? 0} - {match.teamBScore ?? 0}
              </strong>
            </div>
          </div>
          <div className="detail-actions">
            {match.vodUrl && (
              <a href={match.vodUrl} target="_blank" rel="noreferrer">
                مشاهدة الـ VOD
              </a>
            )}
            {match.streamUrl && (
              <a href={match.streamUrl} target="_blank" rel="noreferrer">
                البث المباشر
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="detail-panel">
        <h2>تفاصيل الخرائط</h2>
        {match.maps?.length ? (
          <ul className="detail-list">
            {match.maps.map((map, index) => (
              <li key={`${map.mapName}-${index}`} className="detail-list__item">
                <span>
                  {map.mapName || 'خريطة'} • {map.mode || 'الوضع غير محدد'}
                </span>
                <strong>
                  {map.teamAScore ?? 0} - {map.teamBScore ?? 0}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">لم يتم إدخال تفاصيل الخرائط بعد.</p>
        )}
      </div>

      <div className="detail-panel">
        <h2>روابط سريعة</h2>
        <div className="detail-actions">
          {teamA && (
            <Link to={`/teams/${teamA.slug}`}>فريق {teamA.name}</Link>
          )}
          {teamB && (
            <Link to={`/teams/${teamB.slug}`}>فريق {teamB.name}</Link>
          )}
          {event && <Link to={`/events/${event.slug}`}>بطولة {event.name}</Link>}
        </div>
      </div>
    </section>
  );
};

export default MatchDetailPage;
