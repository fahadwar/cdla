import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderBy, query, where } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDateTime } from '../utils/date.js';

const ArticlesPage = () => {
  const [category, setCategory] = useState('all');

  const articlesState = useFirestoreCollection('articles', {
    queryBuilder: useMemo(
      () =>
        (ref) =>
          category === 'all'
            ? query(ref, orderBy('publishedAt', 'desc'))
            : query(ref, where('category', '==', category), orderBy('publishedAt', 'desc')),
      [category]
    ),
  });

  const categoryOptions = useMemo(() => {
    const categories = new Set();
    articlesState.data.forEach((article) => article.category && categories.add(article.category));
    return Array.from(categories);
  }, [articlesState.data]);

  return (
    <section className="section">
      <header className="section__header">
        <h1>المقالات</h1>
        <p>أحدث الأخبار، التقارير والتحليلات من كتاب CDL بالعربي.</p>
      </header>

      <div className="filters-bar">
        <label>
          التصنيف
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">كل الفئات</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      </div>

      {articlesState.isLoading ? (
        <DataState isLoading title="جارٍ تحميل المقالات" message="نحضر أحدث القصص لك." />
      ) : articlesState.error ? (
        <DataState tone="error" title="تعذّر تحميل المقالات" message={articlesState.error} />
      ) : articlesState.data.length === 0 ? (
        <div className="empty-state">لم يتم نشر مقالات في هذا التصنيف بعد.</div>
      ) : (
        <div className="card-grid">
          {articlesState.data.map((article) => (
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
                متابعة القراءة →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ArticlesPage;
