import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderBy, query } from 'firebase/firestore';
import useFirestoreCollection from '../hooks/useFirestoreCollection.js';
import DataState from '../components/common/DataState.jsx';
import { formatDate } from '../utils/date.js';

const EventsPage = () => {
  const eventsState = useFirestoreCollection('events', {
    queryBuilder: useMemo(() => (ref) => query(ref, orderBy('startDate', 'desc')), []),
  });

  const [filters, setFilters] = useState({ type: 'all', status: 'all' });

  const typeOptions = useMemo(() => {
    const values = new Set();
    eventsState.data.forEach((event) => event.type && values.add(event.type));
    return Array.from(values);
  }, [eventsState.data]);

  const filteredEvents = useMemo(() => {
    return eventsState.data.filter((event) => {
      const typeMatch = filters.type === 'all' || event.type === filters.type;
      const statusMatch = filters.status === 'all' || String(event.active) === filters.status;
      return typeMatch && statusMatch;
    });
  }, [eventsState.data, filters]);

  return (
    <section className="section">
      <header className="section__header">
        <h1>البطولات</h1>
        <p>كل الأحداث والبطولات التي تغطيها CDL بالعربي.</p>
      </header>

      <div className="filters-bar">
        <label>
          النوع
          <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}>
            <option value="all">كل الأنواع</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          الحالة
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="all">الكل</option>
            <option value="true">نشط</option>
            <option value="false">منتهي</option>
          </select>
        </label>
      </div>

      {eventsState.isLoading ? (
        <DataState isLoading title="جارٍ تحميل البطولات" message="يجري تحضير قائمة الفعاليات." />
      ) : eventsState.error ? (
        <DataState tone="error" title="تعذّر تحميل البطولات" message={eventsState.error} />
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state">لا توجد بطولات بهذه المعايير.</div>
      ) : (
        <div className="card-grid">
          {filteredEvents.map((event) => (
            <article key={event.id} className="event-card">
              <div className="event-card__meta">
                <span className="pill">{event.type || 'بطولة'}</span>
                <span>
                  {formatDate(event.startDate)} — {formatDate(event.endDate)}
                </span>
              </div>
              <h3>{event.name}</h3>
              <p>{event.location || 'الموقع غير محدد'}</p>
              <div className="event-card__meta">
                <span>{event.description?.slice(0, 120) || 'وصف قادم قريبًا.'}</span>
              </div>
              <Link className="link-arrow" to={`/events/${event.slug}`}>
                صفحة البطولة →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default EventsPage;
