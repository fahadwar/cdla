import { useEffect, useMemo, useState } from 'react';
import { orderBy, query, where } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDate, formatDateTime } from '../utils/date.js';
import { getRoundStatus, describeRoundWindow } from '../utils/pickem.js';
import useAutoPickScoring from '../hooks/useAutoPickScoring.js';

const LeaderboardPage = () => {
  const roundsState = useFirestoreCollection('pickRounds', {
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('startDate', 'desc')), []),
  });
  const matchesState = useFirestoreCollection('matches');
  const teamsState = useFirestoreCollection('teams');
  const usersState = useFirestoreCollection('users');

  const [selectedRoundId, setSelectedRoundId] = useState(null);

  useEffect(() => {
    if (!selectedRoundId && roundsState.data.length > 0) {
      const activeRound = roundsState.data.find((round) => round.active);
      setSelectedRoundId((activeRound || roundsState.data[0]).id);
    }
  }, [roundsState.data, selectedRoundId]);

  const picksState = useFirestoreCollection('picks', {
    enabled: Boolean(selectedRoundId),
    queryBuilder: useMemo(() => {
      if (!selectedRoundId) return null;
      return (ref) => query(ref, where('roundId', '==', selectedRoundId), orderBy('score', 'desc'));
    }, [selectedRoundId]),
  });

  const matchesMap = useMemo(() => {
    const map = new Map();
    matchesState.data.forEach((match) => map.set(match.id, match));
    return map;
  }, [matchesState.data]);

  const teamsMap = useMemo(() => {
    const map = new Map();
    teamsState.data.forEach((team) => map.set(team.id, team));
    return map;
  }, [teamsState.data]);

  const usersMap = useMemo(() => {
    const map = new Map();
    usersState.data.forEach((userDoc) => {
      const key = userDoc.id || userDoc.uid;
      map.set(key, userDoc);
    });
    return map;
  }, [usersState.data]);

  const selectedRound = roundsState.data.find((round) => round.id === selectedRoundId);
  const roundStatus = selectedRound ? getRoundStatus(selectedRound) : null;
  const selectedMatches = selectedRound
    ? (selectedRound.matchIds || []).map((matchId) => matchesMap.get(matchId)).filter(Boolean)
    : [];

  useAutoPickScoring({ round: selectedRound, matches: selectedMatches, picks: picksState.data });

  const describeMatch = (match) => {
    if (!match) return 'مباراة غير معروفة';
    const teamA = teamsMap.get(match.teamAId);
    const teamB = teamsMap.get(match.teamBId);
    const teamAName = teamA?.shortName || teamA?.name || 'فريق أ';
    const teamBName = teamB?.shortName || teamB?.name || 'فريق ب';
    return `${teamAName} ضد ${teamBName}`;
  };

  return (
    <section className="section">
      <header className="section__header">
        <h1>لوحة صدارة تحديات CDL بالعربي</h1>
        <p>
          اكتشف من يتصدر تحديات التوقعات في مجتمعنا، وتابع الجولات النشطة لمعرفة النتائج والمباريات
          المرتبطة بها.
        </p>
      </header>

      {roundsState.isLoading ? (
        <DataState isLoading tone="info" title="جارٍ تحميل الجولات" message="نحضر معلومات المنافسات." />
      ) : roundsState.error ? (
        <DataState tone="error" title="تعذّر تحميل الجولات" message={roundsState.error} />
      ) : roundsState.data.length === 0 ? (
        <DataState tone="warning" title="لا توجد جولات" message="سيتم نشر أول تحدي توقعات قريبًا." />
      ) : (
        <>
          <div className="round-tabs">
            {roundsState.data.map((round) => {
              const status = getRoundStatus(round);
              return (
                <button
                  key={round.id}
                  type="button"
                  className={round.id === selectedRoundId ? 'active' : ''}
                  onClick={() => setSelectedRoundId(round.id)}
                >
                  <strong>{round.name}</strong>
                  <span className={`pill ${status.pill}`}>{status.label}</span>
                  <span className="round-tabs__date">{formatDate(round.startDate)}</span>
                </button>
              );
            })}
          </div>

          {selectedRound && (
            <>
              <div className="round-summary-grid">
                <article className="info-card">
                  <h2>تفاصيل الجولة</h2>
                  <p className="round-summary__window">
                    {describeRoundWindow(selectedRound, (value) => formatDateTime(value))}
                  </p>
                  <div className="round-summary__stats">
                    <div>
                      <span>عدد المباريات</span>
                      <strong>{selectedRound.matchIds?.length || 0}</strong>
                    </div>
                    <div>
                      <span>الحالة</span>
                      <strong>{roundStatus?.label}</strong>
                    </div>
                    <div>
                      <span>آخر تحديث</span>
                      <strong>{formatDateTime(selectedRound.updatedAt || selectedRound.createdAt)}</strong>
                    </div>
                  </div>
                </article>

                <article className="info-card info-card--muted">
                  <h2>مباريات هذه الجولة</h2>
                  <ul className="round-matches">
                    {selectedMatches.length === 0 && <li>لم يتم تحديد مباريات لهذه الجولة.</li>}
                    {selectedMatches.map((match) => (
                      <li key={match.id}>
                        <div>
                          <strong>{describeMatch(match)}</strong>
                          <span>{formatDateTime(match.date)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>

              <div className="leaderboard-table-wrapper">
                <div className="leaderboard-table__header">
                  <div>
                    <h2>الترتيب</h2>
                    <p>ترتيب المشاركين في هذه الجولة بناءً على النقاط المجمعة.</p>
                  </div>
                  {roundStatus && <span className={`pill ${roundStatus.pill}`}>{roundStatus.label}</span>}
                </div>

                {picksState.isLoading ? (
                  <DataState isLoading tone="info" title="جارٍ تحميل المشاركات" message="نحسب نقاط المتسابقين." />
                ) : picksState.error ? (
                  <DataState tone="error" title="تعذّر تحميل المشاركات" message={picksState.error} />
                ) : picksState.data.length === 0 ? (
                  <DataState tone="warning" title="لا توجد مشاركات" message="كن أول من يشارك في هذه الجولة!" />
                ) : (
                  <div className="leaderboard-table__scroll">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>الترتيب</th>
                          <th>المشارك</th>
                          <th>عدد التوقعات</th>
                          <th>النقاط</th>
                          <th>آخر تحديث</th>
                        </tr>
                      </thead>
                      <tbody>
                        {picksState.data.map((pick, index) => {
                          const user = usersMap.get(pick.userId);
                          return (
                            <tr key={pick.id}>
                              <td>#{index + 1}</td>
                              <td>
                                <div className="leaderboard-user">
                                  <strong>{user?.displayName || 'مشارك مجهول'}</strong>
                                  <span>{user?.email || pick.userId}</span>
                                </div>
                              </td>
                              <td>{pick.selections?.length || 0}</td>
                              <td>{pick.score ?? 0}</td>
                              <td>{formatDateTime(pick.updatedAt || pick.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
};

export default LeaderboardPage;
