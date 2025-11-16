import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.js';

const defaultState = { data: [], isLoading: true, error: null };

const useFirestoreCollection = (collectionPath, { enabled = true, queryBuilder = null } = {}) => {
  const [state, setState] = useState(defaultState);

  const memoizedBuilder = useMemo(() => queryBuilder, [queryBuilder]);

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return undefined;
    }

    if (!isFirebaseConfigured || !db) {
      setState({ data: [], isLoading: false, error: 'Firebase غير مهيأ للقراءة من هذه المجموعة.' });
      return undefined;
    }

    const collectionRef = collection(db, collectionPath);
    const target = typeof memoizedBuilder === 'function' ? memoizedBuilder(collectionRef) : collectionRef;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const unsubscribe = onSnapshot(
      target,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setState({ data: docs, isLoading: false, error: null });
      },
      (error) => {
        setState({ data: [], isLoading: false, error: error.message });
      }
    );

    return () => unsubscribe();
  }, [collectionPath, enabled, memoizedBuilder]);

  return state;
};

export default useFirestoreCollection;
