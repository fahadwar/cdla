import { useMemo, useState } from 'react';
import { deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.js';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';

const roleOptions = [
  { value: 'admin', label: 'مسؤول' },
  { value: 'editor', label: 'محرر' },
  { value: 'user', label: 'مستخدم' },
];

const UsersAdmin = () => {
  const { data: users, isLoading, error } = useFirestoreCollection('users', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('createdAt', 'desc')), []),
  });

  const [filters, setFilters] = useState({ role: 'all' });
  const [roleDrafts, setRoleDrafts] = useState({});
  const [status, setStatus] = useState({ tone: 'neutral', message: '' });

  const filteredUsers = useMemo(() => {
    return users.filter((user) => filters.role === 'all' || user.role === filters.role);
  }, [users, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleDraftChange = (userId, value) => {
    setRoleDrafts((prev) => ({ ...prev, [userId]: value }));
  };

  const handleRoleSave = async (userId) => {
    if (!isFirebaseConfigured || !db) {
      setStatus({ tone: 'error', message: 'قم بإعداد Firebase لإدارة المستخدمين.' });
      return;
    }

    const nextRole = roleDrafts[userId];
    if (!nextRole) {
      setStatus({ tone: 'error', message: 'اختر دورًا جديدًا قبل الحفظ.' });
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: nextRole,
        updatedAt: serverTimestamp(),
      });
      setStatus({ tone: 'success', message: 'تم تحديث دور المستخدم.' });
      setRoleDrafts((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (updateError) {
      setStatus({ tone: 'error', message: updateError.message });
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('سيؤدي ذلك إلى حذف سجل المستخدم من قاعدة البيانات. المتابعة؟')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setStatus({ tone: 'success', message: 'تم حذف المستخدم من Firestore. (لن يتم حذف حساب Firebase Auth تلقائيًا.)' });
    } catch (deleteError) {
      setStatus({ tone: 'error', message: deleteError.message });
    }
  };

  return (
    <div className="admin-collection">
      <div className="admin-collection__header">
        <h2>المستخدمين</h2>
        <p>راجع الحسابات المسجلة وحدّث الأدوار أو احذف الوصول عند الحاجة.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="admin-note">لن تعمل تعديلات الأدوار قبل ربط Firebase.</div>
      )}

      <div className="admin-filters">
        <label>
          الدور
          <select name="role" value={filters.role} onChange={handleFilterChange}>
            <option value="all">جميع الأدوار</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>الدور الحالي</th>
              <th>تعديل الدور</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.uid ?? user.id}>
                <td>{user.displayName || '—'}</td>
                <td>{user.email}</td>
                <td>{roleOptions.find((role) => role.value === user.role)?.label ?? 'غير محدد'}</td>
                <td>
                  <select
                    className="admin-inline-select"
                    value={roleDrafts[user.uid ?? user.id] ?? user.role}
                    onChange={(event) => handleRoleDraftChange(user.uid ?? user.id, event.target.value)}
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="admin-table__actions">
                    <button type="button" className="edit" onClick={() => handleRoleSave(user.uid ?? user.id)}>
                      حفظ الدور
                    </button>
                    <button type="button" className="delete" onClick={() => handleDelete(user.uid ?? user.id)}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan="5">لا يوجد مستخدمون بهذا الدور.</td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan="5">جارٍ تحميل المستخدمين…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan="5">حدث خطأ أثناء تحميل المستخدمين: {error}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {status.message && <div className={`admin-status ${status.tone}`}>{status.message}</div>}
    </div>
  );
};

export default UsersAdmin;
