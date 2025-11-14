import useFirestorePing from '../hooks/useFirestorePing';

const HomePage = () => {
  const { status, message, data } = useFirestorePing();

  return (
    <section>
      <h1>مرحبًا بكم في منصة الرياضات الإلكترونية</h1>
      <p>هذه هي نقطة البداية للتجربة العامة على الموقع.</p>

      <div className={`firestore-status firestore-status--${status}`}>
        <h2>اتصال Firestore</h2>
        <p>{message}</p>
        {status === 'success' && data && (
          <pre className="firestore-status__payload">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </section>
  );
};

export default HomePage;
