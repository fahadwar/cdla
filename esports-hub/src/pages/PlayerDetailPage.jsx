import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { limit, query, where } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDate } from '../utils/date.js';

const PlayerDetailPage = () => {
  const { slug } = useParams();

  const playerState = useFirestoreCollection('players', {
    enabled: Boolean(slug),
    queryBuilder: useMemo(() => (ref) => query(ref, where('slug', '==', slug), limit(1)), [slug]),
  });

  const player = playerState.data[0];
  const teamsState = useFirestoreCollection('teams');

  if (playerState.isLoading) {
    return (
      <section className="section">
        <DataState isLoading title="جارٍ تحميل بيانات اللاعب" message="نحضّر الملف الكامل." />
      </section>
    );
  }

  if (playerState.error) {
    return (
      <section className="section">
        <DataState tone="error" title="تعذّر تحميل اللاعب" message={playerState.error} />
      </section>
    );
  }

  if (!player) {
    return (
      <section className="section">
        <DataState tone="warning" title="غير متوفر" message="لم يتم العثور على هذا اللاعب." />
      </section>
    );
  }

  const team = teamsState.data.find((item) => item.id === player.teamId);

  return (
    <section className="section detail-layout">
      <div className="detail-panel">
        <header className="section__header">
          <h1>{player.nickname || player.name}</h1>
          <p>{player.role || 'دور غير محدد'}</p>
        </header>
        <div className="detail-grid">
          <div className="detail-list">
            <div className="detail-list__item">
              <span>الاسم الكامل</span>
              <strong>{player.name}</strong>
            </div>
            <div className="detail-list__item">
              <span>الدولة</span>
              <strong>{player.country || 'غير معروفة'}</strong>
            </div>
            <div className="detail-list__item">
              <span>تاريخ الميلاد</span>
              <strong>{formatDate(player.birthDate)}</strong>
            </div>
          </div>
          <div className="detail-actions">
            {player.socials?.twitter && (
              <a href={player.socials.twitter} target="_blank" rel="noreferrer">
                تويتر
              </a>
            )}
            {player.socials?.twitch && (
              <a href={player.socials.twitch} target="_blank" rel="noreferrer">
                تويتش
              </a>
            )}
            {player.socials?.youtube && (
              <a href={player.socials.youtube} target="_blank" rel="noreferrer">
                يوتيوب
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="detail-panel">
        <h2>الفريق الحالي</h2>
        {team ? (
          <div>
            <p>{team.name}</p>
            <Link className="link-arrow" to={`/teams/${team.slug}`}>
              زيارة صفحة الفريق →
            </Link>
          </div>
        ) : (
          <p className="empty-state">لم يتم ربط اللاعب بأي فريق.</p>
        )}
      </div>

      <div className="detail-panel">
        <h2>ملاحظات إضافية</h2>
        <p className="article-body">
          سنضيف إحصاءات تفصيلية ونتائج مباريات اللاعب في التحديثات القادمة. تأكد من إدخال البيانات من خلال لوحة
          التحكم لتظهر هنا تلقائيًا.
        </p>
      </div>
    </section>
  );
};

export default PlayerDetailPage;
