import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.js';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDateTime } from '../utils/date.js';
import { getRoundStatus } from '../utils/pickem.js';
import useAutoPickScoring from '../hooks/useAutoPickScoring.js';

const defaultRoundForm = {
  name: '',
  slug: '',
  startDate: '',
  endDate: '',
  matchIds: [],
  active: true,
};

const formatDateTimeInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toISOString().slice(0, 16);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 16);
  }
  return '';
};

const PickemAdmin = () => {
  const roundsState = useFirestoreCollection('pickRounds', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('startDate', 'desc')), []),
  });
  const matchesState = useFirestoreCollection('matches', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('date', 'desc')), []),
  });
  const teamsState = useFirestoreCollection('teams', { enabled: isFirebaseConfigured });
  const usersState = useFirestoreCollection('users', { enabled: isFirebaseConfigured });

  const [formState, setFormState] = useState(defaultRoundForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ tone: 'neutral', message: '' });
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [scoreStatus, setScoreStatus] = useState({ tone: 'neutral', message: '' });
  const [scoreDrafts, setScoreDrafts] = useState({});

  useEffect(() => {
    if (!selectedRoundId && roundsState.data.length > 0) {
      const activeRound = roundsState.data.find((round) => round.active);
      setSelectedRoundId((activeRound || roundsState.data[0]).id);
    }
  }, [roundsState.data, selectedRoundId]);

  const picksState = useFirestoreCollection('picks', {
    enabled: isFirebaseConfigured && Boolean(selectedRoundId),
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
  const roundStatus = getRoundStatus(selectedRound);
  const selectedRoundMatches = useMemo(() => {
    if (!selectedRound) return [];
    return (selectedRound.matchIds || []).map((matchId) => matchesMap.get(matchId)).filter(Boolean);
  }, [selectedRound, matchesMap]);

  useAutoPickScoring({ round: selectedRound, matches: selectedRoundMatches, picks: picksState.data });

  useEffect(() => {
    setScoreDrafts({});
    setScoreStatus({ tone: 'neutral', message: '' });
  }, [selectedRoundId]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleMatchToggle = (matchId) => {
    setFormState((prev) => {
      const exists = prev.matchIds.includes(matchId);
      const matchIds = exists ? prev.matchIds.filter((id) => id !== matchId) : [...prev.matchIds, matchId];
      return { ...prev, matchIds };
    });
  };

  const handleEdit = (round) => {
    setEditingId(round.id);
    setFormState({
      name: round.name ?? '',
      slug: round.slug ?? '',
      startDate: formatDateTimeInput(round.startDate),
      endDate: formatDateTimeInput(round.endDate),
      matchIds: round.matchIds ?? [],
      active: round.active ?? true,
    });
    setSelectedRoundId(round.id);
    setStatus({ tone: 'neutral', message: '' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormState(defaultRoundForm);
  };

  const handleDelete = async (roundId) => {
    if (!window.confirm('سيتم حذف هذه الجولة مع جميع إعداداتها، هل أنت متأكد؟')) return;
    try {
      await deleteDoc(doc(db, 'pickRounds', roundId));
      setStatus({ tone: 'success', message: 'تم حذف الجولة.' });
      if (editingId === roundId) {
        resetForm();
      }
      if (selectedRoundId === roundId) {
        setSelectedRoundId(null);
      }
    } catch (error) {
      setStatus({ tone: 'error', message: error.message });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !db) {
      setStatus({ tone: 'error', message: 'يرجى ربط Firebase لإدارة جولات التوقعات.' });
      return;
    }

    try {
      setStatus({ tone: 'neutral', message: 'جارٍ حفظ بيانات الجولة…' });
      const payload = {
        name: formState.name,
        slug: formState.slug,
        startDate: formState.startDate ? new Date(formState.startDate) : null,
        endDate: formState.endDate ? new Date(formState.endDate) : null,
        matchIds: formState.matchIds,
        active: formState.active,
      };

      if (editingId) {
        await updateDoc(doc(db, 'pickRounds', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم تحديث الجولة.' });
      } else {
        await addDoc(collection(db, 'pickRounds'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم إنشاء الجولة.' });
      }

      resetForm();
    } catch (error) {
      setStatus({ tone: 'error', message: error.message });
    }
  };

  const handleScoreDraftChange = (pickId, value) => {
    setScoreDrafts((prev) => ({ ...prev, [pickId]: value }));
  };

  const handleScoreSave = async (pick) => {
    if (!isFirebaseConfigured || !db) return;
    const rawValue = scoreDrafts[pick.id];
    const nextScore = rawValue === undefined ? pick.score ?? 0 : Number(rawValue);

    if (Number.isNaN(nextScore)) {
      setScoreStatus({ tone: 'error', message: 'يرجى إدخال قيمة رقمية صحيحة للنقاط.' });
      return;
    }

    try {
      await updateDoc(doc(db, 'picks', pick.id), {
        score: nextScore,
        updatedAt: serverTimestamp(),
      });
      setScoreStatus({ tone: 'success', message: 'تم تحديث نقاط المتسابق.' });
    } catch (error) {
      setScoreStatus({ tone: 'error', message: error.message });
    }
  };

  const describeMatch = (match) => {
    const teamA = teamsMap.get(match.teamAId);
    const teamB = teamsMap.get(match.teamBId);
    const teamAName = teamA?.shortName || teamA?.name || 'فريق أ';
    const teamBName = teamB?.shortName || teamB?.name || 'فريق ب';
    return `${teamAName} ضد ${teamBName}`;
  };

  return (
    <div className="admin-collection">
      <div className="admin-collection__header">
        <h2>تحديات التوقعات ولوحة الصدارة</h2>
        <p>أنشئ جولات جديدة، اربطها بالمباريات، وتابع نتائج المتسابقين لحظة بلحظة.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="admin-note">أضف مفاتيح Firebase قبل إدارة تحديات التوقعات.</div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>اسم الجولة</th>
              <th>الفترة الزمنية</th>
              <th>عدد المباريات</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {roundsState.data.map((round) => {
              const statusBadge = getRoundStatus(round);
              return (
                <tr key={round.id}>
                  <td>{round.name}</td>
                  <td>
                    {round.startDate ? formatDateTime(round.startDate) : '—'}
                    <br />
                    {round.endDate ? formatDateTime(round.endDate) : '—'}
                  </td>
                  <td>{round.matchIds?.length || 0}</td>
                  <td>
                    <span className={`pill ${statusBadge.pill}`}>{statusBadge.label}</span>
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button type="button" className="edit" onClick={() => handleEdit(round)}>
                        تعديل
                      </button>
                      <button type="button" className="delete" onClick={() => handleDelete(round.id)}>
                        حذف
                      </button>
                      <button
                        type="button"
                        className="edit"
                        onClick={() => setSelectedRoundId(round.id)}
                      >
                        عرض النتائج
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!roundsState.isLoading && roundsState.data.length === 0 && (
              <tr>
                <td colSpan="5">لم يتم إنشاء أي جولات حتى الآن.</td>
              </tr>
            )}
            {roundsState.isLoading && (
              <tr>
                <td colSpan="5">جارٍ تحميل الجولات…</td>
              </tr>
            )}
            {roundsState.error && (
              <tr>
                <td colSpan="5">تعذّر تحميل الجولات: {roundsState.error}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'تعديل الجولة' : 'إضافة جولة جديدة'}</h3>
        <div className="admin-form__grid">
          <label>
            اسم الجولة
            <input name="name" value={formState.name} onChange={handleChange} required />
          </label>
          <label>
            المعرّف (slug)
            <input name="slug" value={formState.slug} onChange={handleChange} required />
          </label>
          <label>
            وقت البداية
            <input
              type="datetime-local"
              name="startDate"
              value={formState.startDate}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            وقت النهاية
            <input
              type="datetime-local"
              name="endDate"
              value={formState.endDate}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>الحالة</span>
            <input type="checkbox" name="active" checked={formState.active} onChange={handleChange} />
          </label>
        </div>

        <div>
          <h4>اختر المباريات المشاركة</h4>
          <div className="admin-multi-select">
            {matchesState.data.map((match) => (
              <label key={match.id} className="admin-multi-option">
                <input
                  type="checkbox"
                  checked={formState.matchIds.includes(match.id)}
                  onChange={() => handleMatchToggle(match.id)}
                />
                <div>
                  <strong>{describeMatch(match)}</strong>
                  <div className="admin-multi-option__meta">{formatDateTime(match.date)}</div>
                </div>
              </label>
            ))}
            {!matchesState.isLoading && matchesState.data.length === 0 && (
              <p>لا توجد مباريات متاحة حاليًا.</p>
            )}
          </div>
        </div>

        <div className="admin-form__actions">
          <button type="submit">{editingId ? 'تحديث الجولة' : 'إضافة الجولة'}</button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              إلغاء
            </button>
          )}
        </div>

        {status.message && <div className={`admin-status ${status.tone}`}>{status.message}</div>}
      </form>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h3>نتائج الجولة المحددة</h3>
            <p>اختر جولة من الجدول لاستعراض تفاصيلها ولوحة الصدارة.</p>
          </div>
          {selectedRound && <span className={`pill ${roundStatus.pill}`}>{roundStatus.label}</span>}
        </div>

        {!selectedRound && (
          <p>لم يتم اختيار جولة بعد. استخدم زر "عرض النتائج" في الجدول أعلاه.</p>
        )}

        {selectedRound && (
          <>
            <div className="admin-panel__meta-grid">
              <div>
                <span className="admin-panel__label">الفترة الزمنية</span>
                <p>
                  {formatDateTime(selectedRound.startDate)}
                  <br />
                  {formatDateTime(selectedRound.endDate)}
                </p>
              </div>
              <div>
                <span className="admin-panel__label">عدد المباريات</span>
                <p>{selectedRoundMatches.length} مباراة</p>
              </div>
              <div>
                <span className="admin-panel__label">آخر تحديث</span>
                <p>{formatDateTime(selectedRound.updatedAt || selectedRound.createdAt)}</p>
              </div>
            </div>

            <div>
              <h4>مباريات الجولة</h4>
              <ul className="admin-matches-list">
                {selectedRoundMatches.length === 0 && (
                  <li>لم يتم اختيار مباريات لهذه الجولة.</li>
                )}
                {selectedRoundMatches.map((match) => (
                  <li key={match.id}>
                    <div>
                      <strong>{describeMatch(match)}</strong>
                      <div className="admin-multi-option__meta">{formatDateTime(match.date)}</div>
                    </div>
                  </li>
                ))}
                {(selectedRound.matchIds || []).map((matchId) =>
                  matchesMap.has(matchId) ? null : (
                    <li key={matchId}>
                      <div>
                        <strong>مباراة غير معروفة</strong>
                        <span className="admin-multi-option__meta">المعرف: {matchId}</span>
                      </div>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h4>لوحة صدارة الجولة</h4>
              {picksState.isLoading ? (
                <DataState isLoading tone="info" title="جارٍ تحميل التوقعات" message="نقوم بجلب نتائج المتسابقين." />
              ) : picksState.error ? (
                <DataState tone="error" title="تعذّر تحميل التوقعات" message={picksState.error} />
              ) : picksState.data.length === 0 ? (
                <DataState tone="warning" title="لا توجد مشاركات" message="لم يقم أي مستخدم بإرسال توقعاته لهذه الجولة بعد." />
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table admin-table--compact">
                    <thead>
                      <tr>
                        <th>الترتيب</th>
                        <th>المستخدم</th>
                        <th>عدد التوقعات</th>
                        <th>النقاط</th>
                        <th>تحديث النقاط</th>
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
                                <strong>{user?.displayName || 'مستخدم مجهول'}</strong>
                                <span className="admin-multi-option__meta">{user?.email || pick.userId}</span>
                              </div>
                            </td>
                            <td>{pick.selections?.length || 0}</td>
                            <td>{pick.score ?? 0}</td>
                            <td>
                              <div className="score-editor">
                                <input
                                  type="number"
                                  className="admin-inline-input"
                                  value={scoreDrafts[pick.id] ?? ''}
                                  placeholder={`${pick.score ?? 0}`}
                                  onChange={(event) => handleScoreDraftChange(pick.id, event.target.value)}
                                />
                                <button type="button" className="edit" onClick={() => handleScoreSave(pick)}>
                                  حفظ
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {scoreStatus.message && (
                <div className={`admin-status ${scoreStatus.tone}`}>{scoreStatus.message}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PickemAdmin;
