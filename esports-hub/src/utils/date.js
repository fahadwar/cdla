const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value?.seconds) {
    return new Date(value.seconds * 1000);
  }
  return null;
};

export const formatDate = (value, options = { dateStyle: 'medium' }) => {
  const date = normalizeDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('ar-EG', options).format(date);
};

export const formatDateTime = (
  value,
  options = { dateStyle: 'medium', timeStyle: 'short' }
) => {
  const date = normalizeDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('ar-EG', options).format(date);
};

export const formatRelative = (value) => {
  const date = normalizeDate(value);
  if (!date) return '—';
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'auto' });
  const minutes = Math.round(diff / 60000);

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute');
  }

  const hours = Math.round(diff / 3600000);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }

  const days = Math.round(diff / 86400000);
  return formatter.format(days, 'day');
};
