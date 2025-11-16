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
  title: '',
  slug: '',
  category: 'news',
  body: '',
  authorId: '',
  publishedAt: '',
  status: 'draft',
  tagsText: '',
  coverImageUrl: '',
};

const formatDateTimeInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.seconds) {
    return new Date(value.seconds * 1000).toISOString().slice(0, 16);
  }
  return '';
};

const ArticlesAdmin = () => {
  const { data: articles, isLoading, error } = useFirestoreCollection('articles', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('createdAt', 'desc')), []),
  });

  const { data: users } = useFirestoreCollection('users', {
    enabled: isFirebaseConfigured,
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('displayName', 'asc')), []),
  });

  const [filters, setFilters] = useState({ category: 'all', status: 'all' });
  const [formState, setFormState] = useState(defaultForm);
  const [coverFile, setCoverFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ tone: 'neutral', message: '' });

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const categoryMatch = filters.category === 'all' || article.category === filters.category;
      const statusMatch = filters.status === 'all' || article.status === filters.status;
      return categoryMatch && statusMatch;
    });
  }, [articles, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (article) => {
    setEditingId(article.id);
    setFormState({
      title: article.title ?? '',
      slug: article.slug ?? '',
      category: article.category ?? 'news',
      body: article.body ?? '',
      authorId: article.authorId ?? '',
      publishedAt: formatDateTimeInput(article.publishedAt),
      status: article.status ?? 'draft',
      tagsText: Array.isArray(article.tags) ? article.tags.join(',') : '',
      coverImageUrl: article.coverImageUrl ?? '',
    });
    setCoverFile(null);
    setStatusMessage({ tone: 'neutral', message: '' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormState(defaultForm);
    setCoverFile(null);
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm('هل تريد حذف هذه المقالة؟')) return;
    try {
      await deleteDoc(doc(db, 'articles', articleId));
      setStatusMessage({ tone: 'success', message: 'تم حذف المقالة.' });
      if (editingId === articleId) {
        resetForm();
      }
    } catch (deleteError) {
      setStatusMessage({ tone: 'error', message: deleteError.message });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFirebaseConfigured || !db) {
      setStatusMessage({ tone: 'error', message: 'يرجى تفعيل Firebase لإدارة المقالات.' });
      return;
    }

    try {
      setStatusMessage({ tone: 'neutral', message: 'جارٍ حفظ المقالة…' });
      let coverImageUrl = formState.coverImageUrl;

      if (coverFile) {
        coverImageUrl = await uploadMediaFile(coverFile, `articles/${formState.slug || 'article'}`);
      }

      const payload = {
        title: formState.title,
        slug: formState.slug,
        category: formState.category,
        body: formState.body,
        authorId: formState.authorId,
        publishedAt: formState.publishedAt ? new Date(formState.publishedAt) : null,
        status: formState.status,
        tags: formState.tagsText
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        coverImageUrl: coverImageUrl || '',
      };

      if (editingId) {
        await updateDoc(doc(db, 'articles', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setStatusMessage({ tone: 'success', message: 'تم تحديث المقالة.' });
      } else {
        await addDoc(collection(db, 'articles'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatusMessage({ tone: 'success', message: 'تم إنشاء المقالة.' });
      }

      resetForm();
    } catch (submitError) {
      setStatusMessage({ tone: 'error', message: submitError.message });
    }
  };

  return (
    <div className="admin-collection">
      <div className="admin-collection__header">
        <h2>المقالات</h2>
        <p>انشر الأخبار والتقارير والتحليلات مع التحكم في حالة النشر.</p>
      </div>

      {!isFirebaseConfigured && (
        <div className="admin-note">تأكد من إعداد Firebase لتفعيل النشر والرفع.</div>
      )}

      <div className="admin-filters">
        <label>
          الفئة
          <select name="category" value={filters.category} onChange={handleFilterChange}>
            <option value="all">جميع الفئات</option>
            <option value="news">أخبار</option>
            <option value="analysis">تحليل</option>
            <option value="transfer">انتقالات</option>
            <option value="recap">ملخص</option>
          </select>
        </label>
        <label>
          حالة المقالة
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="all">الكل</option>
            <option value="draft">مسودة</option>
            <option value="published">منشورة</option>
          </select>
        </label>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>العنوان</th>
              <th>الفئة</th>
              <th>الحالة</th>
              <th>المؤلف</th>
              <th>تاريخ النشر</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredArticles.map((article) => {
              const authorName = users.find((user) => user.uid === article.authorId)?.displayName || '—';
              return (
                <tr key={article.id}>
                  <td>{article.title}</td>
                  <td>{article.category}</td>
                  <td>{article.status === 'published' ? 'منشورة' : 'مسودة'}</td>
                  <td>{authorName}</td>
                  <td>
                    {article.publishedAt?.seconds
                      ? new Date(article.publishedAt.seconds * 1000).toLocaleDateString('ar-EG')
                      : '—'}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button type="button" className="edit" onClick={() => handleEdit(article)}>
                        تعديل
                      </button>
                      <button type="button" className="delete" onClick={() => handleDelete(article.id)}>
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && filteredArticles.length === 0 && (
              <tr>
                <td colSpan="6">لا توجد مقالات متاحة.</td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan="6">جارٍ تحميل المقالات…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan="6">حدث خطأ أثناء تحميل المقالات: {error}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'تعديل المقالة' : 'إضافة مقالة'}</h3>
        <div className="admin-form__grid">
          <label>
            العنوان
            <input name="title" value={formState.title} onChange={handleChange} required />
          </label>
          <label>
            المعرّف (slug)
            <input name="slug" value={formState.slug} onChange={handleChange} required />
          </label>
          <label>
            الفئة
            <select name="category" value={formState.category} onChange={handleChange}>
              <option value="news">أخبار</option>
              <option value="analysis">تحليل</option>
              <option value="transfer">انتقالات</option>
              <option value="recap">ملخص</option>
            </select>
          </label>
          <label>
            حالة النشر
            <select name="status" value={formState.status} onChange={handleChange}>
              <option value="draft">مسودة</option>
              <option value="published">منشورة</option>
            </select>
          </label>
          <label>
            المؤلف
            <select name="authorId" value={formState.authorId} onChange={handleChange}>
              <option value="">اختر المستخدم</option>
              {users.map((user) => (
                <option key={user.uid ?? user.id} value={user.uid ?? user.id}>
                  {user.displayName || user.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            موعد النشر
            <input type="datetime-local" name="publishedAt" value={formState.publishedAt} onChange={handleChange} />
          </label>
          <label>
            الوسوم (مفصولة بفاصلة)
            <input name="tagsText" value={formState.tagsText} onChange={handleChange} placeholder="بطولة, انتقالات" />
          </label>
          <label>
            صورة الغلاف
            <input type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            محتوى المقالة
            <textarea name="body" value={formState.body} onChange={handleChange} />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{editingId ? 'تحديث المقالة' : 'إضافة المقالة'}</button>
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

export default ArticlesAdmin;
