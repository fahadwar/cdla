const toneIcons = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '⛔️',
};

const DataState = ({ tone = 'info', title, message, action = null, isLoading = false }) => {
  const icon = toneIcons[tone] || toneIcons.info;

  return (
    <div className={`data-state data-state--${tone}`}>
      <div className="data-state__icon" aria-hidden="true">
        {isLoading ? <span className="data-state__spinner" /> : icon}
      </div>
      <div className="data-state__content">
        {title && <h3>{title}</h3>}
        {message && <p>{message}</p>}
        {action}
      </div>
    </div>
  );
};

export default DataState;
