import useFirestorePing from '../hooks/useFirestorePing';

const HomePage = () => {
  const { status, message, data } = useFirestorePing();

  return (
    <section>
      <h1>Welcome to Esports Hub</h1>
      <p>This is the starting point for the public-facing experience.</p>

      <div className={`firestore-status firestore-status--${status}`}>
        <h2>Firestore Connectivity</h2>
        <p>{message}</p>
        {status === 'success' && data && (
          <pre className="firestore-status__payload">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </section>
  );
};

export default HomePage;
