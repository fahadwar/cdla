import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDateTime } from '../utils/date.js';
import { describeRoundWindow, getRoundStatus, isRoundOpenForPicks } from '../utils/pickem.js';

const PickemPage = () => {
  const { user, isLoading: authLoading, isFirebaseReady } = useAuth();

  const roundsState = useFirestoreCollection('pickRounds', {
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('startDate', 'desc')), []),
  });
  const matchesState = useFirestoreCollection('matches');
  const teamsState = useFirestoreCollection('teams');

  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [selections, setSelections] = useState({});
  const [status, setStatus] = useState({ tone: 'neutral', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedRoundId && roundsState.data.length > 0) {
      const openRound = roundsState.data.find((round) => isRoundOpenForPicks(round));
      setSelectedRoundId((openRound || roundsState.data[0]).id);
    }
  }, [roundsState.data, selectedRoundId]);

  const selectedRound = roundsState.data.find((round) => round.id === selectedRoundId) || null;
  const roundStatus = selectedRound ? getRoundStatus(selectedRound) : null;
  const selectedMatchIds = selectedRound?.matchIds || [];

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

  const roundMatches = selectedMatchIds
    .map((matchId) => matchesMap.get(matchId))
    .filter(Boolean);

  const picksState = useFirestoreCollection('picks', {
    enabled: Boolean(user && selectedRoundId),
    queryBuilder: useMemo(() => {
      if (!user || !selectedRoundId) return null;
      return (ref) =>
        query(ref, where('roundId', '==', selectedRoundId), where('userId', '==', user.uid), limit(1));
    }, [user?.uid, selectedRoundId]),
  });

  const userPick = picksState.data[0] || null;

  useEffect(() => {
    if (!selectedRound) {
      setSelections({});
      return;
    }

    if (userPick?.selections?.length) {
      const map = {};
      userPick.selections.forEach((selection) => {
        if (selection.matchId) {
          map[selection.matchId] = selection.predictedWinnerTeamId;
        }
      });
      setSelections(map);
    } else {
      setSelections({});
    }

    setStatus({ tone: 'neutral', message: '' });
  }, [selectedRoundId, userPick, selectedRound]);

  const handleSelection = (matchId, teamId) => {
    setSelections((prev) => ({ ...prev, [matchId]: teamId }));
    setStatus({ tone: 'neutral', message: '' });
  };

  const describeTeam = (teamId) => {
    const team = teamsMap.get(teamId);
    if (!team) return 'فريق غير معروف';
    return team.shortName || team.name || 'فريق غير معروف';
  };

  const isEditable = Boolean(user && selectedRound && isRoundOpenForPicks(selectedRound));
  const isComplete = roundMatches.length > 0 && roundMatches.every((match) => selections[match.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !db || !isFirebaseReady) {
      setStatus({ tone: 'error', message: 'أضف إعدادات Firebase لإرسال التوقعات.' });
      return;
    }

    if (!user) {
      setStatus({ tone: 'error', message: 'سجّل الدخول قبل مشاركة توقعاتك.' });
      return;
    }

    if (!isEditable) {
      setStatus({ tone: 'warning', message: 'تم إغلاق هذه الجولة ولا يمكن تعديل التوقعات.' });
      return;
    }

    if (!isComplete) {
      setStatus({ tone: 'warning', message: 'اختر الفائز في كل مباراة قبل الإرسال.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        userId: user.uid,
        roundId: selectedRoundId,
        selections: roundMatches.map((match) => ({
          matchId: match.id,
          predictedWinnerTeamId: selections[match.id],
        })),
        updatedAt: serverTimestamp(),
      };

      if (userPick) {
        await updateDoc(doc(db, 'picks', userPick.id), payload);
        setStatus({ tone: 'success', message: 'تم تحديث توقعاتك لهذه الجولة.' });
      } else {
        await addDoc(collection(db, 'picks'), {
          ...payload,
          score: 0,
          createdAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم تسجيل توقعاتك بنجاح.' });
      }
    } catch (error) {
      setStatus({ tone: 'error', message: error.message || 'تعذّر حفظ التوقعات.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section pickem-section">
      <header className="section__header">
        <h1>تحدي التوقعات من CDL بالعربي</h1>
        <p>اختر الفائزين في كل مباراة خلال الجولة واحصل على نقاط لتتصدر لوحة الصدارة.</p>
      </header>

      {!isFirebaseConfigured && (
        <DataState
          tone="warning"
          title="يرجى إعداد Firebase"
          message="لن تعمل تحديات التوقعات بدون إعدادات Firebase الصحيحة في ملف ‎.env‎."
        />
      )}

      {roundsState.isLoading ? (
        <DataState isLoading title="جارٍ تحميل الجولات" message="نحضر تفاصيل التحديات." />
      ) : roundsState.error ? (
        <DataState tone="error" title="تعذّر تحميل الجولات" message={roundsState.error} />
      ) : roundsState.data.length === 0 ? (
        <DataState tone="warning" title="لا توجد جولات" message="انتظر حتى يتم نشر أول تحدي." />
      ) : (
        <>
          <div className="round-tabs">
            {roundsState.data.map((round) => {
              const statusMeta = getRoundStatus(round);
              return (
                <button
                  key={round.id}
                  type="button"
                  className={round.id === selectedRoundId ? 'active' : ''}
                  onClick={() => setSelectedRoundId(round.id)}
                >
                  <strong>{round.name}</strong>
                  <span className={`pill ${statusMeta?.pill}`}>{statusMeta?.label}</span>
                  <span className="round-tabs__date">
                    {describeRoundWindow(round, (value) => formatDateTime(value))}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedRound && (
            <article className="info-card">
              <h2>ملخص الجولة</h2>
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
          )}

          {!user && !authLoading && (
            <DataState
              tone="info"
              title="سجّل الدخول للمشاركة"
              message="يلزم تسجيل الدخول حتى نستطيع حفظ توقعاتك ومتابعة نقاطك."
              action={
                <Link className="cta-link" to="/login">
                  الانتقال إلى تسجيل الدخول →
                </Link>
              }
            />
          )}

          {user && (
            <div className="pickem-panel">
              <div className="pickem-panel__header">
                <div>
                  <h2>اختياراتك</h2>
                  <p>
                    {isEditable
                      ? 'اختر الفائز لكل مباراة قبل انتهاء الوقت المحدد للجولة.'
                      : 'تم إغلاق هذه الجولة ولا يمكن تعديل التوقعات.'}
                  </p>
                </div>
                {picksState.isLoading && (
                  <span className="pill pill--info">جارٍ تحميل توقعاتك السابقة…</span>
                )}
                {picksState.error && (
                  <span className="pill pill--warning">{picksState.error}</span>
                )}
              </div>

              {roundMatches.length === 0 ? (
                <DataState tone="warning" title="لا توجد مباريات" message="لم يتم ربط مباريات بهذه الجولة." />
              ) : (
                <form className="pickem-form" onSubmit={handleSubmit}>
                  <div className="pickem-grid">
                    {roundMatches.map((match) => {
                      const teamAName = describeTeam(match.teamAId);
                      const teamBName = describeTeam(match.teamBId);
                      const selectedTeam = selections[match.id];
                      return (
                        <article key={match.id} className="pick-card">
                          <div className="pick-card__meta">
                            <span>{formatDateTime(match.date)}</span>
                            <span className="pill">{match.status === 'final' ? 'منتهية' : 'قادمة'}</span>
                          </div>
                          <h3>{teamAName} ضد {teamBName}</h3>
                          <div className="pick-card__options">
                            {[{ id: match.teamAId, label: teamAName }, { id: match.teamBId, label: teamBName }].map(
                              (team) => (
                                <label
                                  key={team.id}
                                  className={`pick-option ${selectedTeam === team.id ? 'selected' : ''}`}
                                >
                                  <input
                                    type="radio"
                                    name={`pick-${match.id}`}
                                    value={team.id}
                                    checked={selectedTeam === team.id}
                                    onChange={() => handleSelection(match.id, team.id)}
                                    disabled={!isEditable}
                                  />
                                  <span>{team.label}</span>
                                </label>
                              )
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {status.message && (
                    <p className={`pickem-status pickem-status--${status.tone}`}>{status.message}</p>
                  )}

                  <button
                    className="pickem-submit"
                    type="submit"
                    disabled={!isEditable || isSubmitting || !isComplete}
                  >
                    {isSubmitting
                      ? 'جارٍ الحفظ…'
                      : userPick
                      ? 'تحديث التوقعات'
                      : 'إرسال التوقعات'}
                  </button>

                  {!isComplete && isEditable && (
                    <p className="pickem-hint">اختر الفائز في كل مباراة لتفعيل زر الحفظ.</p>
                  )}
                </form>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default PickemPage;
