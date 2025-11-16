import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { limit, orderBy, query, where } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import useFirestorePing from '../hooks/useFirestorePing.js';
import DataState from '../components/common/DataState.jsx';
import { formatDateTime, formatRelative } from '../utils/date.js';

const HomePage = () => {
  const upcomingMatches = useFirestoreCollection('matches', {
    queryBuilder: useMemo(
      () =>
        (ref) => query(ref, where('status', '==', 'upcoming'), orderBy('date', 'asc'), limit(3)),
      []
    ),
  });

  const featuredArticles = useFirestoreCollection('articles', {
    queryBuilder: useMemo(
      () =>
        (ref) =>
          query(ref, where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(3)),
      []
    ),
  });

  const spotlightTeams = useFirestoreCollection('teams', {
    queryBuilder: useMemo(
      () => (ref) => query(ref, where('active', '==', true), orderBy('createdAt', 'desc'), limit(4)),
      []
    ),
  });
  const teamsState = useFirestoreCollection('teams');

  const eventsState = useFirestoreCollection('events', {
    queryBuilder: useMemo(
      () => (ref) => query(ref, orderBy('startDate', 'asc'), limit(4)),
      []
    ),
  });

  const ping = useFirestorePing();

  const teamsMap = useMemo(() => {
    const map = new Map();
    teamsState.data.forEach((team) => map.set(team.id, team));
    return map;
  }, [teamsState.data]);

  const eventsMap = useMemo(() => {
    const map = new Map();
    eventsState.data.forEach((event) => map.set(event.id, event));
    return map;
  }, [eventsState.data]);

  return (
    <div>
      <section className="section">
        <header className="section__header">
          <h1>CDL بالعربي</h1>
          <p>بوابة الرياضات الإلكترونية المخصصة للمجتمع العربي.</p>
        </header>
        <p className="page-intro">
          تصفح أحدث المباريات، تعرف على الفرق واللاعبين، وابق على اطلاع على المقالات والتحليلات من خلال لوحة
          تحكم واحدة.
        </p>
      </section>

      <section className="section">
        <header className="section__header">
          <h2>المباريات القادمة</h2>
          <p>لا تفوّت أي مباراة مهمة خلال الأيام المقبلة.</p>
        </header>
        {upcomingMatches.isLoading ? (
          <DataState
            isLoading
            title="جارٍ تحميل المباريات"
            message="نجهّز أبرز المواجهات القادمة لك."
          />
        ) : upcomingMatches.error ? (
          <DataState tone="error" title="تعذّر تحميل المباريات" message={upcomingMatches.error} />
        ) : upcomingMatches.data.length === 0 ? (
          <div className="empty-state">لا توجد مباريات مجدولة حاليًا.</div>
        ) : (
          <div className="card-grid">
            {upcomingMatches.data.map((match) => {
              const teamA = teamsMap.get(match.teamAId);
              const teamB = teamsMap.get(match.teamBId);
              const event = eventsMap.get(match.eventId);
              return (
                <article key={match.id} className="match-card">
                  <div className="match-card__meta">
                    <span className="pill">{event?.name || 'بطولة غير معروفة'}</span>
                    <span>{formatRelative(match.date)}</span>
                  </div>
                  <div className="match-card__teams">
                    <div className="match-card__team">
                      <strong>{teamA?.shortName || teamA?.name || 'فريق أ'}</strong>
                      <span>{teamA?.region || '—'}</span>
                    </div>
                    <div className="match-card__score">VS</div>
                    <div className="match-card__team">
                      <strong>{teamB?.shortName || teamB?.name || 'فريق ب'}</strong>
                      <span>{teamB?.region || '—'}</span>
                    </div>
                  </div>
                  <div className="match-card__meta">
                    <span>{formatDateTime(match.date)}</span>
                    <span className="pill pill--success">قادمة</span>
                  </div>
                  <Link className="link-arrow" to={`/matches/${match.id}`}>
                    تفاصيل المباراة →
                  </Link>
                </article>
              );
            })}
          </div>
        )}
     </section>

      <section className="section">
        <header className="section__header">
          <h2>أبرز الفرق</h2>
          <p>تابع أندية CDL بالعربي المعتمدة.</p>
        </header>
        {spotlightTeams.isLoading ? (
          <DataState isLoading title="جارٍ تحميل الفرق" message="يتم إحضار أحدث الأندية النشطة." />
        ) : spotlightTeams.error ? (
          <DataState tone="error" title="تعذّر تحميل الفرق" message={spotlightTeams.error} />
        ) : (
          <div className="card-grid">
            {spotlightTeams.data.map((team) => (
              <article key={team.id} className="team-card">
                <div className="team-card__header">
                  <div className="team-card__logo">
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt={team.name} />
                    ) : (
                      <span>{team.shortName || 'فريق'}</span>
                    )}
                  </div>
                  <div>
                    <h3>{team.name}</h3>
                    <div className="team-card__meta">
                      <span>{team.region || 'غير محدد'}</span>
                      <span>{team.game || 'اللعبة غير محددة'}</span>
                    </div>
                  </div>
                </div>
                <Link className="link-arrow" to={`/teams/${team.slug}`}>
                  صفحة الفريق →
                </Link>
              </article>
            ))}
          </div>
        )}
     </section>

      <section className="section">
        <header className="section__header">
          <h2>آخر المقالات</h2>
          <p>تحليلات، أخبار وتقارير مباشرة من استوديو CDL بالعربي.</p>
        </header>
        {featuredArticles.isLoading ? (
          <DataState isLoading title="جارٍ تحميل المقالات" message="نحضّر آخر الأخبار والتحليلات." />
        ) : featuredArticles.error ? (
          <DataState tone="error" title="تعذّر تحميل المقالات" message={featuredArticles.error} />
        ) : featuredArticles.data.length === 0 ? (
          <div className="empty-state">لم يتم نشر مقالات حتى الآن.</div>
        ) : (
          <div className="card-grid">
            {featuredArticles.data.map((article) => (
              <article key={article.id} className="article-card">
                {article.coverImageUrl && (
                  <img className="article-card__cover" src={article.coverImageUrl} alt={article.title} />
                )}
                <div className="article-card__tags">
                  <span className="pill">{article.category || 'أخبار'}</span>
                  <span>{formatDateTime(article.publishedAt)}</span>
                </div>
                <h3>{article.title}</h3>
                <p className="article-card__meta">بواسطة {article.authorName || 'فريق التحرير'}</p>
                <Link className="link-arrow" to={`/articles/${article.slug}`}>
                  قراءة المزيد →
                </Link>
              </article>
            ))}
          </div>
        )}
     </section>

      <section className="section">
        <header className="section__header">
          <h2>تحديثات النظام</h2>
          <p>راقب اتصال Firestore من هنا.</p>
        </header>
        <div className={`firestore-status firestore-status--${ping.status}`}>
          <h2>اتصال Firestore</h2>
          <p>{ping.message}</p>
          {ping.status === 'success' && ping.data && (
            <pre className="firestore-status__payload">{JSON.stringify(ping.data, null, 2)}</pre>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
