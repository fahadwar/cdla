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
  name: '',
  slug: '',
  type: '',
  location: '',
  startDate: '',
  endDate: '',
  description: '',
  active: true,
};

const formatDateInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toISOString().split('T')[0];
  }
  return '';
};

const EventsAdmin = () => {
  const { data: events, isLoading, error } = useFirestoreCollection('events', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('startDate', 'desc')), []),
  });

  const [filters, setFilters] = useState({ type: 'all', active: 'all' });
  const [formState, setFormState] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ tone: 'neutral', message: '' });

  const typeOptions = useMemo(() => {
    const types = new Set();
    events.forEach((event) => {
      if (event.type) types.add(event.type);
    });
    return Array.from(types);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const typeMatch = filters.type === 'all' || event.type === filters.type;
      const activeMatch = filters.active === 'all' || String(event.active) === filters.active;
      return typeMatch && activeMatch;
    });
  }, [events, filters]);

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

  const handleEdit = (eventDoc) => {
    setEditingId(eventDoc.id);
    setFormState({
      name: eventDoc.name ?? '',
      slug: eventDoc.slug ?? '',
      type: eventDoc.type ?? '',
      location: eventDoc.location ?? '',
      startDate: formatDateInput(eventDoc.startDate),
      endDate: formatDateInput(eventDoc.endDate),
      description: eventDoc.description ?? '',
      active: eventDoc.active ?? true,
    });
    setStatus({ tone: 'neutral', message: '' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormState(defaultForm);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('سيتم حذف هذه البطولة، هل أنت متأكد؟')) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setStatus({ tone: 'success', message: 'تم حذف البطولة.' });
      if (editingId === eventId) {
        resetForm();
      }
    } catch (deleteError) {
      setStatus({ tone: 'error', message: deleteError.message });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !db) {
      setStatus({ tone: 'error', message: 'يرجى إعداد Firebase لإدارة البطولات.' });
      return;
    }

    try {
      setStatus({ tone: 'neutral', message: 'جارٍ حفظ البطولة…' });
      const payload = {
        name: formState.name,
        slug: formState.slug,
        type: formState.type,
        location: formState.location,
        startDate: formState.startDate ? new Date(formState.startDate) : null,
        endDate: formState.endDate ? new Date(formState.endDate) : null,
        description: formState.description,
        active: formState.active,
      };

      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم تحديث البطولة.' });
      } else {
        await addDoc(collection(db, 'events'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatus({ tone: 'success', message: 'تم إنشاء البطولة.' });
      }

      resetForm();
    } catch (submitError) {
      setStatus({ tone: 'error', message: submitError.message });
    }
  };

  return (
    <div className="admin-collection">
      <div className="admin-collection__header">
        <h2>البطولات</h2>
        <p>نظّم البطولات الرئيسية والدوريات مع تحديد المواعيد والمواقع.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="admin-note">لا يمكن حفظ أو تحميل البيانات قبل ضبط إعدادات Firebase.</div>
      )}

      <div className="admin-filters">
        <label>
          النوع
          <select name="type" value={filters.type} onChange={handleFilterChange}>
            <option value="all">كل الأنواع</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          حالة التفعيل
          <select name="active" value={filters.active} onChange={handleFilterChange}>
            <option value="all">الكل</option>
            <option value="true">مفعّل</option>
            <option value="false">متوقف</option>
          </select>
        </label>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>النوع</th>
              <th>الموقع</th>
              <th>تاريخ البداية</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((eventDoc) => (
              <tr key={eventDoc.id}>
                <td>{eventDoc.name}</td>
                <td>{eventDoc.type}</td>
                <td>{eventDoc.location}</td>
                <td>
                  {eventDoc.startDate?.seconds
                    ? new Date(eventDoc.startDate.seconds * 1000).toLocaleDateString('ar-EG')
                    : '—'}
                </td>
                <td>{eventDoc.active ? 'مفعل' : 'متوقف'}</td>
                <td>
                  <div className="admin-table__actions">
                    <button type="button" className="edit" onClick={() => handleEdit(eventDoc)}>
                      تعديل
                    </button>
                    <button type="button" className="delete" onClick={() => handleDelete(eventDoc.id)}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredEvents.length === 0 && (
              <tr>
                <td colSpan="6">لا توجد بطولات مطابقة.</td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan="6">جارٍ تحميل البطولات…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan="6">تعذّر تحميل البطولات: {error}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'تعديل البطولة' : 'إضافة بطولة'}</h3>
        <div className="admin-form__grid">
          <label>
            اسم البطولة
            <input name="name" value={formState.name} onChange={handleChange} required />
          </label>
          <label>
            المعرّف (slug)
            <input name="slug" value={formState.slug} onChange={handleChange} required />
          </label>
          <label>
            النوع
            <input name="type" value={formState.type} onChange={handleChange} placeholder="Major" />
          </label>
          <label>
            الموقع
            <input name="location" value={formState.location} onChange={handleChange} />
          </label>
          <label>
            تاريخ البداية
            <input type="date" name="startDate" value={formState.startDate} onChange={handleChange} />
          </label>
          <label>
            تاريخ النهاية
            <input type="date" name="endDate" value={formState.endDate} onChange={handleChange} />
          </label>
          <label>
            وصف مختصر
            <textarea name="description" value={formState.description} onChange={handleChange} />
          </label>
          <label>
            <span>نشط</span>
            <input type="checkbox" name="active" checked={formState.active} onChange={handleChange} />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{editingId ? 'تحديث' : 'إضافة'}</button>
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

export default EventsAdmin;
