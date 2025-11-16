import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { limit, orderBy, query, where } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDate } from '../utils/date.js';

const TeamDetailPage = () => {
  const { slug } = useParams();

  const teamState = useFirestoreCollection('teams', {
    enabled: Boolean(slug),
    queryBuilder: useMemo(() => (ref) => query(ref, where('slug', '==', slug), limit(1)), [slug]),
  });

  const team = teamState.data[0];

  const rosterState = useFirestoreCollection('players', {
    enabled: Boolean(team?.id),
    queryBuilder: useMemo(
      () => (ref) => query(ref, where('teamId', '==', team.id), orderBy('name', 'asc')),
      [team?.id]
    ),
  });

  const matchesAsA = useFirestoreCollection('matches', {
    enabled: Boolean(team?.id),
    queryBuilder: useMemo(
      () => (ref) => query(ref, where('teamAId', '==', team.id), orderBy('date', 'desc'), limit(5)),
      [team?.id]
    ),
  });

  const matchesAsB = useFirestoreCollection('matches', {
    enabled: Boolean(team?.id),
    queryBuilder: useMemo(
      () => (ref) => query(ref, where('teamBId', '==', team.id), orderBy('date', 'desc'), limit(5)),
      [team?.id]
    ),
  });

  const eventsState = useFirestoreCollection('events');
  const teamsState = useFirestoreCollection('teams');

  const toMillis = (value) => {
    if (!value) return 0;
    if (value.seconds) return value.seconds * 1000;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const recentMatches = useMemo(() => {
    const combined = [...matchesAsA.data, ...matchesAsB.data];
    return combined.sort((a, b) => toMillis(b.date) - toMillis(a.date)).slice(0, 5);
  }, [matchesAsA.data, matchesAsB.data]);

  if (teamState.isLoading) {
    return (
      <section className="section">
        <DataState isLoading title="جارٍ تحميل بيانات الفريق" message="نقوم بتحميل تفاصيل النادي." />
      </section>
    );
  }

  if (teamState.error) {
    return (
      <section className="section">
        <DataState tone="error" title="تعذّر تحميل الفريق" message={teamState.error} />
      </section>
    );
  }

  if (!team) {
    return (
      <section className="section">
        <DataState tone="warning" title="غير متوفر" message="لا يوجد فريق مطابق لهذا العنوان." />
      </section>
    );
  }

  const resolveTeamName = (teamId) => teamsState.data.find((item) => item.id === teamId)?.name || '—';
  const resolveEventName = (eventId) => eventsState.data.find((event) => event.id === eventId)?.name || '—';

  return (
    <section className="section detail-layout">
      <div className="detail-panel">
        <header className="section__header">
          <h1>{team.name}</h1>
          <p>{team.game || 'لعبة غير محددة'}</p>
        </header>
        <div className="detail-grid">
          <div className="detail-list">
            <div className="detail-list__item">
              <span>المنطقة</span>
              <strong>{team.region || 'غير معروف'}</strong>
            </div>
            <div className="detail-list__item">
              <span>الاسم المختصر</span>
              <strong>{team.shortName || '—'}</strong>
            </div>
            <div className="detail-list__item">
              <span>الحالة</span>
              <strong>{team.active ? 'نشط' : 'متوقف'}</strong>
            </div>
          </div>
          <div className="detail-actions">
            {team.socials?.twitter && (
              <a href={team.socials.twitter} target="_blank" rel="noreferrer">
                تويتر
              </a>
            )}
            {team.socials?.twitch && (
              <a href={team.socials.twitch} target="_blank" rel="noreferrer">
                تويتش
              </a>
            )}
            {team.socials?.youtube && (
              <a href={team.socials.youtube} target="_blank" rel="noreferrer">
                يوتيوب
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="detail-panel">
        <h2>التشكيلة الحالية</h2>
        {rosterState.data.length === 0 ? (
          <p className="empty-state">لم يتم ربط لاعبين بهذا الفريق بعد.</p>
        ) : (
          <ul className="detail-list">
            {rosterState.data.map((player) => (
              <li key={player.id} className="detail-list__item">
                <span>{player.nickname || player.name}</span>
                <span>
                  {player.role || '—'} • <Link to={`/players/${player.slug}`}>عرض</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-panel">
        <h2>أحدث المباريات</h2>
        {recentMatches.length === 0 ? (
          <p className="empty-state">لا توجد مباريات مسجلة لهذا الفريق.</p>
        ) : (
          <ul className="detail-list">
            {recentMatches.map((match) => (
              <li key={match.id} className="detail-list__item">
                <span>
                  {resolveTeamName(match.teamAId)} ضد {resolveTeamName(match.teamBId)}
                </span>
                <span>
                  {resolveEventName(match.eventId)} • {formatDate(match.date)} •
                  <Link to={`/matches/${match.id}`}> التفاصيل</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default TeamDetailPage;
