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
  region: '',
  game: '',
  shortName: '',
  twitter: '',
  twitch: '',
  youtube: '',
  active: true,
  logoUrl: '',
};

const TeamsAdmin = () => {
  const { data: teams, isLoading, error } = useFirestoreCollection('teams', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (collectionRef) => query(collectionRef, orderBy('createdAt', 'desc')), []),
  });

  const [filters, setFilters] = useState({ region: 'all', game: 'all', active: 'all' });
  const [formState, setFormState] = useState(defaultForm);
  const [logoFile, setLogoFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ tone: 'neutral', message: '' });

  const regionOptions = useMemo(() => {
    const regions = new Set();
    teams.forEach((team) => {
      if (team.region) regions.add(team.region);
    });
    return Array.from(regions);
  }, [teams]);

  const gameOptions = useMemo(() => {
    const games = new Set();
    teams.forEach((team) => {
      if (team.game) games.add(team.game);
    });
    return Array.from(games);
  }, [teams]);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const regionMatch = filters.region === 'all' || team.region === filters.region;
      const gameMatch = filters.game === 'all' || team.game === filters.game;
      const activeMatch = filters.active === 'all' || String(team.active) === filters.active;
      return regionMatch && gameMatch && activeMatch;
    });
  }, [teams, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEdit = (team) => {
    setEditingId(team.id);
    setFormState({
      name: team.name ?? '',
      slug: team.slug ?? '',
      region: team.region ?? '',
      game: team.game ?? '',
      shortName: team.shortName ?? '',
      twitter: team.socials?.twitter ?? '',
      twitch: team.socials?.twitch ?? '',
      youtube: team.socials?.youtube ?? '',
      active: team.active ?? true,
      logoUrl: team.logoUrl ?? '',
    });
    setLogoFile(null);
    setStatus({ tone: 'neutral', message: '' });
  };

  const resetForm = () => {
    setEditingId(null);
    setLogoFile(null);
    setFormState(defaultForm);
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفريق؟')) return;
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      setStatus({ tone: 'success', message: 'تم حذف الفريق.' });
      if (editingId === teamId) {
        resetForm();
      }
    } catch (deleteError) {
      setStatus({ tone: 'error', message: deleteError.message });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !db) {
      setStatus({ tone: 'error', message: 'يرجى إعداد Firebase لإدارة البيانات.' });
      return;
    }

    try {
      setStatus({ tone: 'neutral', message: 'جارٍ حفظ بيانات الفريق…' });
      let logoUrl = formState.logoUrl;

      if (logoFile) {
        logoUrl = await uploadMediaFile(logoFile, `teams/${formState.slug || 'team'}`);
      }

      const payload = {
        name: formState.name,
        slug: formState.slug,
        region: formState.region,
        game: formState.game,
        shortName: formState.shortName,
        socials: {
          twitter: formState.twitter,
          twitch: formState.twitch,
          youtube: formState.youtube,
        },
        active: formState.active,
        logoUrl: logoUrl || '',
      };

      if (editingId) {
        await updateDoc(doc(db, 'teams', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم تحديث بيانات الفريق.' });
      } else {
        await addDoc(collection(db, 'teams'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم إنشاء الفريق بنجاح.' });
      }

      resetForm();
    } catch (submitError) {
      setStatus({ tone: 'error', message: submitError.message });
    }
  };

  return (
    <div className="admin-collection">
      <div className="admin-collection__header">
        <h2>الفرق</h2>
        <p>أنشئ وعدّل فرقك المحترفة، واربطها بالمباريات واللاعبين.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="admin-note">أكمل إعداد Firebase للبدء في إدارة البيانات.</div>
      )}

      <div className="admin-filters">
        <label>
          المنطقة
          <select name="region" value={filters.region} onChange={handleFilterChange}>
            <option value="all">جميع المناطق</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>

        <label>
          اللعبة
          <select name="game" value={filters.game} onChange={handleFilterChange}>
            <option value="all">كل الألعاب</option>
            {gameOptions.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>
        </label>

        <label>
          حالة التفعيل
          <select name="active" value={filters.active} onChange={handleFilterChange}>
            <option value="all">الكل</option>
            <option value="true">مفعّل</option>
            <option value="false">غير مفعّل</option>
          </select>
        </label>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>الشعار</th>
              <th>الاسم</th>
              <th>اللعبة</th>
              <th>المنطقة</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team) => (
              <tr key={team.id}>
                <td>
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                  ) : (
                    '—'
                  )}
                </td>
                <td>{team.name}</td>
                <td>{team.game}</td>
                <td>{team.region}</td>
                <td>{team.active ? 'مفعّل' : 'متوقف'}</td>
                <td>
                  <div className="admin-table__actions">
                    <button type="button" className="edit" onClick={() => handleEdit(team)}>
                      تعديل
                    </button>
                    <button type="button" className="delete" onClick={() => handleDelete(team.id)}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredTeams.length === 0 && (
              <tr>
                <td colSpan="6">لا توجد بيانات مطابقة للمعايير الحالية.</td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan="6">جارٍ تحميل الفرق…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan="6">حدث خطأ أثناء تحميل الفرق: {error}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'تحديث بيانات الفريق' : 'إضافة فريق جديد'}</h3>
        <div className="admin-form__grid">
          <label>
            اسم الفريق
            <input name="name" value={formState.name} onChange={handleChange} required />
          </label>
          <label>
            المعرّف (slug)
            <input name="slug" value={formState.slug} onChange={handleChange} required />
          </label>
          <label>
            المنطقة
            <input name="region" value={formState.region} onChange={handleChange} placeholder="مثال: MENA" />
          </label>
          <label>
            اللعبة
            <input name="game" value={formState.game} onChange={handleChange} placeholder="Valorant" />
          </label>
          <label>
            الاسم المختصر
            <input name="shortName" value={formState.shortName} onChange={handleChange} />
          </label>
          <label>
            رابط تويتر
            <input name="twitter" value={formState.twitter} onChange={handleChange} placeholder="https://twitter.com/team" />
          </label>
          <label>
            رابط تويتش
            <input name="twitch" value={formState.twitch} onChange={handleChange} placeholder="https://twitch.tv/team" />
          </label>
          <label>
            رابط يوتيوب
            <input name="youtube" value={formState.youtube} onChange={handleChange} placeholder="https://youtube.com/team" />
          </label>
          <label>
            الشعار (صورة)
            <input type="file" accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
          </label>
          <label>
            <span>نشط</span>
            <input type="checkbox" name="active" checked={formState.active} onChange={handleChange} />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{editingId ? 'تحديث الفريق' : 'إضافة الفريق'}</button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              إلغاء التعديل
            </button>
          )}
        </div>
        {status.message && (
          <div className={`admin-status ${status.tone}`}>
            {status.message}
          </div>
        )}
      </form>
    </div>
  );
};

export default TeamsAdmin;
