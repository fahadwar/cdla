import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.js';

const defaultState = { data: null, isLoading: true, error: null };

const useFirestoreDocument = (collectionPath, documentId, { enabled = true } = {}) => {
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    if (!enabled || !documentId) {
      setState({ data: null, isLoading: false, error: null });
      return undefined;
    }

    if (!isFirebaseConfigured || !db) {
      setState({ data: null, isLoading: false, error: 'Firebase غير مهيأ لقراءة هذا المستند.' });
      return undefined;
    }

    const docRef = doc(db, collectionPath, documentId);
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setState({ data: null, isLoading: false, error: 'لم يتم العثور على المستند المطلوب.' });
          return;
        }

        setState({ data: { id: snapshot.id, ...snapshot.data() }, isLoading: false, error: null });
      },
      (error) => {
        setState({ data: null, isLoading: false, error: error.message });
      }
    );

    return () => unsubscribe();
  }, [collectionPath, documentId, enabled]);

  return state;
};

export default useFirestoreDocument;
