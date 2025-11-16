import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { limit, query, where } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDateTime } from '../utils/date.js';

const ArticleDetailPage = () => {
  const { slug } = useParams();

  const articleState = useFirestoreCollection('articles', {
    enabled: Boolean(slug),
    queryBuilder: useMemo(() => (ref) => query(ref, where('slug', '==', slug), limit(1)), [slug]),
  });

  const article = articleState.data[0];

  if (articleState.isLoading) {
    return (
      <section className="section">
        <DataState isLoading title="جارٍ تحميل المقال" message="يتم تجهيز المحتوى كاملاً." />
      </section>
    );
  }

  if (articleState.error) {
    return (
      <section className="section">
        <DataState tone="error" title="تعذّر تحميل المقال" message={articleState.error} />
      </section>
    );
  }

  if (!article) {
    return (
      <section className="section">
        <DataState tone="warning" title="غير متوفر" message="لم يتم العثور على المقال." />
      </section>
    );
  }

  return (
    <article className="section detail-layout">
      <div className="detail-panel">
        <header className="section__header">
          <h1>{article.title}</h1>
          <p>
            {article.category || 'أخبار'} • {formatDateTime(article.publishedAt)}
          </p>
        </header>
        {article.coverImageUrl && (
          <img className="detail-cover" src={article.coverImageUrl} alt={article.title} />
        )}
        <p className="article-body">{article.body || 'سيتم تحديث محتوى المقال قريبًا.'}</p>
        <div className="article-card__tags">
          {article.tags?.map((tag) => (
            <span key={tag} className="pill">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="detail-panel">
        <h2>روابط إضافية</h2>
        <div className="detail-actions">
          <Link to="/articles">العودة إلى قائمة المقالات</Link>
        </div>
      </div>
    </article>
  );
};

export default ArticleDetailPage;
