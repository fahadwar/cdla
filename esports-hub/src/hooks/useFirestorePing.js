import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';

const initialState = isFirebaseConfigured && db
  ? { status: 'idle', message: 'Preparing Firestore connectivity check.' }
  : {
      status: 'skipped',
      message: 'Firestore test skipped. Provide Firebase credentials in your .env file to enable the connectivity check.',
    };

const TEST_DOC_PATH = ['appMeta', 'connectivityTest'];

export default function useFirestorePing() {
  const [result, setResult] = useState(initialState);

  const testDocRef = useMemo(() => {
    if (!isFirebaseConfigured || !db) return null;
    return doc(db, ...TEST_DOC_PATH);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !testDocRef) return;

    let isCancelled = false;

    const runTest = async () => {
      setResult({ status: 'loading', message: 'Checking Firestore connectivity…' });

      try {
        await setDoc(
          testDocRef,
          {
            lastPingAt: serverTimestamp(),
            note: 'Connectivity test written by useFirestorePing hook.',
          },
          { merge: true }
        );

        const snapshot = await getDoc(testDocRef);

        if (!snapshot.exists()) {
          throw new Error('The connectivity test document could not be read after writing.');
        }

        if (!isCancelled) {
          setResult({
            status: 'success',
            message: 'Successfully connected to Firestore.',
            data: snapshot.data(),
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setResult({
            status: 'error',
            message: error.message ?? 'Unknown Firestore error occurred.',
          });
        }
      }
    };

    runTest();

    return () => {
      isCancelled = true;
    };
  }, [testDocRef]);

  return result;
}
