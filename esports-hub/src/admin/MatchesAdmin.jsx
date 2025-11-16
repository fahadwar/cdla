import { useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.js';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';

const defaultForm = {
  eventId: '',
  date: '',
  status: 'upcoming',
  teamAId: '',
  teamBId: '',
  teamAScore: 0,
  teamBScore: 0,
  mapsText: '[]',
  vodUrl: '',
  streamUrl: '',
};

const formatDateTimeInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toISOString().slice(0, 16);
  }
  return '';
};

const MatchesAdmin = () => {
  const { data: matches, isLoading, error } = useFirestoreCollection('matches', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('date', 'desc')), []),
  });

  const { data: events } = useFirestoreCollection('events', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('startDate', 'desc')), []),
  });

  const { data: teams } = useFirestoreCollection('teams', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('name', 'asc')), []),
  });

  const [filters, setFilters] = useState({ status: 'all', eventId: 'all' });
  const [formState, setFormState] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ tone: 'neutral', message: '' });

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const statusMatch = filters.status === 'all' || match.status === filters.status;
      const eventMatch = filters.eventId === 'all' || match.eventId === filters.eventId;
      return statusMatch && eventMatch;
    });
  }, [matches, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (match) => {
    setEditingId(match.id);
    setFormState({
      eventId: match.eventId ?? '',
      date: formatDateTimeInput(match.date),
      status: match.status ?? 'upcoming',
      teamAId: match.teamAId ?? '',
      teamBId: match.teamBId ?? '',
      teamAScore: match.teamAScore ?? 0,
      teamBScore: match.teamBScore ?? 0,
      mapsText: JSON.stringify(match.maps ?? [], null, 2),
      vodUrl: match.vodUrl ?? '',
      streamUrl: match.streamUrl ?? '',
    });
    setStatusMessage({ tone: 'neutral', message: '' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormState(defaultForm);
  };

  const handleDelete = async (matchId) => {
    if (!window.confirm('سيتم حذف هذه المباراة نهائيًا. متابعة؟')) return;
    try {
      await deleteDoc(doc(db, 'matches', matchId));
      setStatusMessage({ tone: 'success', message: 'تم حذف المباراة.' });
      if (editingId === matchId) {
        resetForm();
      }
    } catch (deleteError) {
      setStatusMessage({ tone: 'error', message: deleteError.message });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !db) {
      setStatusMessage({ tone: 'error', message: 'قم بإكمال إعداد Firebase لإدارة المباريات.' });
      return;
    }

    try {
      setStatusMessage({ tone: 'neutral', message: 'جارٍ حفظ المباراة…' });
      let maps = [];

      if (formState.mapsText.trim()) {
        try {
          maps = JSON.parse(formState.mapsText);
        } catch (parseError) {
          setStatusMessage({ tone: 'error', message: 'صيغة الخرائط غير صحيحة. يرجى استخدام JSON صالح.' });
          return;
        }
      }

      const payload = {
        eventId: formState.eventId,
        date: formState.date ? new Date(formState.date) : null,
        status: formState.status,
        teamAId: formState.teamAId,
        teamBId: formState.teamBId,
        teamAScore: Number(formState.teamAScore) || 0,
        teamBScore: Number(formState.teamBScore) || 0,
        maps,
        vodUrl: formState.vodUrl,
        streamUrl: formState.streamUrl,
      };

      if (editingId) {
        await updateDoc(doc(db, 'matches', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setStatusMessage({ tone: 'success', message: 'تم تحديث المباراة.' });
      } else {
        await addDoc(collection(db, 'matches'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatusMessage({ tone: 'success', message: 'تم إنشاء المباراة.' });
      }

      resetForm();
    } catch (submitError) {
      setStatusMessage({ tone: 'error', message: submitError.message });
    }
  };

  const resolveTeamName = (teamId) => teams.find((team) => team.id === teamId)?.name || '—';
  const resolveEventName = (eventId) => events.find((event) => event.id === eventId)?.name || '—';

  return (
    <div className="admin-collection">
      <div className="admin-collection__header">
        <h2>المباريات</h2>
        <p>قم بربط الفرق بالبطولات وجدولة كل مباراة مع حالة مباشرة.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="admin-note">قم بربط Firebase قبل إدارة المباريات والنتائج.</div>
      )}

      <div className="admin-filters">
        <label>
          حالة المباراة
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="all">الجميع</option>
            <option value="upcoming">قادمة</option>
            <option value="live">مباشرة</option>
            <option value="final">منتهية</option>
          </select>
        </label>
        <label>
          البطولة
          <select name="eventId" value={filters.eventId} onChange={handleFilterChange}>
            <option value="all">كل البطولات</option>
            {events.map((eventDoc) => (
              <option key={eventDoc.id} value={eventDoc.id}>
                {eventDoc.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>البطولة</th>
              <th>الفريق الأول</th>
              <th>الفريق الثاني</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.map((match) => (
              <tr key={match.id}>
                <td>{resolveEventName(match.eventId)}</td>
                <td>{resolveTeamName(match.teamAId)}</td>
                <td>{resolveTeamName(match.teamBId)}</td>
                <td>
                  {match.date?.seconds
                    ? new Date(match.date.seconds * 1000).toLocaleString('ar-EG')
                    : '—'}
                </td>
                <td>{match.status}</td>
                <td>
                  <div className="admin-table__actions">
                    <button type="button" className="edit" onClick={() => handleEdit(match)}>
                      تعديل
                    </button>
                    <button type="button" className="delete" onClick={() => handleDelete(match.id)}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredMatches.length === 0 && (
              <tr>
                <td colSpan="6">لا توجد مباريات مطابقة.</td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan="6">جارٍ تحميل المباريات…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan="6">حدث خطأ أثناء تحميل المباريات: {error}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'تعديل مباراة' : 'إضافة مباراة'}</h3>
        <div className="admin-form__grid">
          <label>
            البطولة
            <select name="eventId" value={formState.eventId} onChange={handleChange} required>
              <option value="">اختر البطولة</option>
              {events.map((eventDoc) => (
                <option key={eventDoc.id} value={eventDoc.id}>
                  {eventDoc.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            تاريخ ووقت المباراة
            <input type="datetime-local" name="date" value={formState.date} onChange={handleChange} required />
          </label>
          <label>
            الحالة
            <select name="status" value={formState.status} onChange={handleChange}>
              <option value="upcoming">قادمة</option>
              <option value="live">مباشرة</option>
              <option value="final">منتهية</option>
            </select>
          </label>
          <label>
            الفريق الأول
            <select name="teamAId" value={formState.teamAId} onChange={handleChange} required>
              <option value="">اختر الفريق</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الفريق الثاني
            <select name="teamBId" value={formState.teamBId} onChange={handleChange} required>
              <option value="">اختر الفريق</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            نتيجة الفريق الأول
            <input type="number" name="teamAScore" value={formState.teamAScore} onChange={handleChange} />
          </label>
          <label>
            نتيجة الفريق الثاني
            <input type="number" name="teamBScore" value={formState.teamBScore} onChange={handleChange} />
          </label>
          <label>
            رابط البث
            <input name="streamUrl" value={formState.streamUrl} onChange={handleChange} placeholder="https://twitch.tv/..." />
          </label>
          <label>
            رابط VOD
            <input name="vodUrl" value={formState.vodUrl} onChange={handleChange} placeholder="https://youtube.com/..." />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            تفاصيل الخرائط (JSON)
            <textarea
              name="mapsText"
              value={formState.mapsText}
              onChange={handleChange}
              placeholder={'[{\n  "mapName": "Ascent",\n  "mode": "Search",\n  "teamAScore": 13,\n  "teamBScore": 9\n}]'}
            />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{editingId ? 'تحديث المباراة' : 'إضافة المباراة'}</button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              إلغاء
            </button>
          )}
        </div>
        {statusMessage.message && (
          <div className={`admin-status ${statusMessage.tone}`}>{statusMessage.message}</div>
        )}
      </form>
    </div>
  );
};

export default MatchesAdmin;
