import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';

const initialState = isFirebaseConfigured && db
  ? { status: 'idle', message: 'جارٍ تحضير اختبار الاتصال بـ Firestore.' }
  : {
      status: 'skipped',
      message: 'تم تجاوز اختبار Firestore. يرجى توفير بيانات Firebase في ملف ‎.env‎ لتفعيل الاختبار.',
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
      setResult({ status: 'loading', message: 'جارٍ التحقق من الاتصال بـ Firestore…' });

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
          throw new Error('تعذّر قراءة مستند الاختبار بعد كتابته.');
        }

        if (!isCancelled) {
          setResult({
            status: 'success',
            message: 'تم الاتصال بـ Firestore بنجاح.',
            data: snapshot.data(),
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setResult({
            status: 'error',
            message: error.message ?? 'حدث خطأ غير معروف في Firestore.',
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
