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
import { uploadMediaFile } from '../services/storage.js';

const defaultForm = {
  name: '',
  slug: '',
  nickname: '',
  teamId: '',
  country: '',
  role: '',
  twitter: '',
  twitch: '',
  youtube: '',
  birthDate: '',
  photoUrl: '',
};

const formatDateInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toISOString().split('T')[0];
  }
  return '';
};

const PlayersAdmin = () => {
  const { data: players, isLoading, error } = useFirestoreCollection('players', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('createdAt', 'desc')), []),
  });

  const { data: teams } = useFirestoreCollection('teams', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('name', 'asc')), []),
  });

  const [filters, setFilters] = useState({ teamId: 'all', role: 'all' });
  const [formState, setFormState] = useState(defaultForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ tone: 'neutral', message: '' });

  const roleOptions = useMemo(() => {
    const roles = new Set();
    players.forEach((player) => {
      if (player.role) roles.add(player.role);
    });
    return Array.from(roles);
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const teamMatch = filters.teamId === 'all' || player.teamId === filters.teamId;
      const roleMatch = filters.role === 'all' || player.role === filters.role;
      return teamMatch && roleMatch;
    });
  }, [players, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (player) => {
    setEditingId(player.id);
    setFormState({
      name: player.name ?? '',
      slug: player.slug ?? '',
      nickname: player.nickname ?? '',
      teamId: player.teamId ?? '',
      country: player.country ?? '',
      role: player.role ?? '',
      twitter: player.socials?.twitter ?? '',
      twitch: player.socials?.twitch ?? '',
      youtube: player.socials?.youtube ?? '',
      birthDate: formatDateInput(player.birthDate),
      photoUrl: player.photoUrl ?? '',
    });
    setPhotoFile(null);
    setStatus({ tone: 'neutral', message: '' });
  };

  const resetForm = () => {
    setEditingId(null);
    setPhotoFile(null);
    setFormState(defaultForm);
  };

  const handleDelete = async (playerId) => {
    if (!window.confirm('هل تريد حذف ملف اللاعب هذا؟')) return;
    try {
      await deleteDoc(doc(db, 'players', playerId));
      setStatus({ tone: 'success', message: 'تم حذف اللاعب.' });
      if (editingId === playerId) {
        resetForm();
      }
    } catch (deleteError) {
      setStatus({ tone: 'error', message: deleteError.message });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !db) {
      setStatus({ tone: 'error', message: 'قم بضبط Firebase قبل إدارة اللاعبين.' });
      return;
    }

    try {
      setStatus({ tone: 'neutral', message: 'جارٍ حفظ بيانات اللاعب…' });
      let photoUrl = formState.photoUrl;

      if (photoFile) {
        photoUrl = await uploadMediaFile(photoFile, `players/${formState.slug || 'player'}`);
      }

      const payload = {
        name: formState.name,
        slug: formState.slug,
        nickname: formState.nickname,
        teamId: formState.teamId,
        country: formState.country,
        role: formState.role,
        socials: {
          twitter: formState.twitter,
          twitch: formState.twitch,
          youtube: formState.youtube,
        },
        birthDate: formState.birthDate ? new Date(formState.birthDate) : null,
        photoUrl: photoUrl || '',
      };

      if (editingId) {
        await updateDoc(doc(db, 'players', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم تحديث بيانات اللاعب.' });
      } else {
        await addDoc(collection(db, 'players'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم إنشاء اللاعب.' });
      }

      resetForm();
    } catch (submitError) {
      setStatus({ tone: 'error', message: submitError.message });
    }
  };

  return (
    <div className="admin-collection">
      <div className="admin-collection__header">
        <h2>اللاعبين</h2>
        <p>أدر ملفات اللاعبين وروابطهم مع الفرق الحالية.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="admin-note">أكمل إعداد Firebase لتفعيل عمليات الحفظ والتحميل.</div>
      )}

      <div className="admin-filters">
        <label>
          الفريق
          <select name="teamId" value={filters.teamId} onChange={handleFilterChange}>
            <option value="all">جميع الفرق</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الدور
          <select name="role" value={filters.role} onChange={handleFilterChange}>
            <option value="all">كل الأدوار</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>الصورة</th>
              <th>الاسم</th>
              <th>اللقب</th>
              <th>الفريق</th>
              <th>الدور</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => {
              const teamName = teams.find((team) => team.id === player.teamId)?.name || '—';
              return (
                <tr key={player.id}>
                  <td>
                    {player.photoUrl ? (
                      <img src={player.photoUrl} alt={player.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{player.name}</td>
                  <td>{player.nickname}</td>
                  <td>{teamName}</td>
                  <td>{player.role}</td>
                  <td>
                    <div className="admin-table__actions">
                      <button type="button" className="edit" onClick={() => handleEdit(player)}>
                        تعديل
                      </button>
                      <button type="button" className="delete" onClick={() => handleDelete(player.id)}>
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && filteredPlayers.length === 0 && (
              <tr>
                <td colSpan="6">لا يوجد لاعبون مطابقة للمرشحات.</td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan="6">جارٍ تحميل اللاعبين…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan="6">حدث خطأ أثناء تحميل اللاعبين: {error}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'تعديل لاعب' : 'إضافة لاعب'}</h3>
        <div className="admin-form__grid">
          <label>
            الاسم الكامل
            <input name="name" value={formState.name} onChange={handleChange} required />
          </label>
          <label>
            المعرّف (slug)
            <input name="slug" value={formState.slug} onChange={handleChange} required />
          </label>
          <label>
            اللقب
            <input name="nickname" value={formState.nickname} onChange={handleChange} />
          </label>
          <label>
            الفريق الحالي
            <select name="teamId" value={formState.teamId} onChange={handleChange}>
              <option value="">بدون فريق</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الدولة
            <input name="country" value={formState.country} onChange={handleChange} placeholder="Saudi Arabia" />
          </label>
          <label>
            الدور داخل اللعبة
            <input name="role" value={formState.role} onChange={handleChange} placeholder="مثال: Support" />
          </label>
          <label>
            تاريخ الميلاد
            <input type="date" name="birthDate" value={formState.birthDate} onChange={handleChange} />
          </label>
          <label>
            رابط تويتر
            <input name="twitter" value={formState.twitter} onChange={handleChange} />
          </label>
          <label>
            رابط تويتش
            <input name="twitch" value={formState.twitch} onChange={handleChange} />
          </label>
          <label>
            رابط يوتيوب
            <input name="youtube" value={formState.youtube} onChange={handleChange} />
          </label>
          <label>
            صورة اللاعب
            <input type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{editingId ? 'تحديث اللاعب' : 'إضافة اللاعب'}</button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              إلغاء
            </button>
          )}
        </div>
        {status.message && <div className={`admin-status ${status.tone}`}>{status.message}</div>}
      </form>
    </div>
  );
};

export default PlayersAdmin;
