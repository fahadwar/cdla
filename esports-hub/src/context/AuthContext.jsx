import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext({
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  error: null,
  isFirebaseReady: false,
  signIn: async () => {},
  signUp: async () => {},
  signOutUser: async () => {},
  updateDisplayName: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    profile: null,
    role: null,
    isLoading: true,
    error: null,
  });

  const isFirebaseReady = Boolean(isFirebaseConfigured && auth && db);

  const ensureUserDocument = useCallback(
    async (firebaseUser, overrides = {}) => {
      if (!db) {
        throw new Error('لم يتم تهيئة Firestore.');
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(userRef);

      const baseData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: overrides.displayName ?? firebaseUser.displayName ?? '',
        photoURL: firebaseUser.photoURL ?? '',
        role: overrides.role ?? 'user',
        favorites: overrides.favorites ?? { teams: [], players: [] },
      };

      if (!snapshot.exists()) {
        await setDoc(userRef, {
          ...baseData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const createdSnapshot = await getDoc(userRef);
        return createdSnapshot.data();
      }

      const existingData = snapshot.data();
      const updates = {};

      if (baseData.displayName && baseData.displayName !== existingData.displayName) {
        updates.displayName = baseData.displayName;
      }

      if (baseData.photoURL && baseData.photoURL !== existingData.photoURL) {
        updates.photoURL = baseData.photoURL;
      }

      if (baseData.email && baseData.email !== existingData.email) {
        updates.email = baseData.email;
      }

      if (!existingData.role) {
        updates.role = 'user';
      }

      if (!existingData.favorites) {
        updates.favorites = { teams: [], players: [] };
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(userRef, updates);
        return { ...existingData, ...updates };
      }

      return existingData;
    },
    [db]
  );

  useEffect(() => {
    if (!isFirebaseReady) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'لم يتم إعداد Firebase. أضف بيانات الاعتماد إلى ملف ‎.env‎ لتمكين المصادقة.',
      }));
      return undefined;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, profile: null, role: null, isLoading: false, error: null });
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const profile = await ensureUserDocument(firebaseUser);
        setState({
          user: firebaseUser,
          profile,
          role: profile?.role ?? null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState({
          user: firebaseUser,
          profile: null,
          role: null,
          isLoading: false,
          error: error.message ?? 'تعذّر تحميل ملف المستخدم.',
        });
      }
    });

    return () => unsubscribe();
  }, [ensureUserDocument, isFirebaseReady]);

  const signUp = useCallback(
    async (email, password, displayName) => {
      if (!isFirebaseReady) {
        throw new Error('لم يتم إعداد Firebase.');
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

      await ensureUserDocument(credential.user, { displayName });
      return credential.user;
    },
    [auth, ensureUserDocument, isFirebaseReady]
  );

  const signIn = useCallback(
    async (email, password) => {
      if (!isFirebaseReady) {
        throw new Error('لم يتم إعداد Firebase.');
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserDocument(credential.user);
      return credential.user;
    },
    [auth, ensureUserDocument, isFirebaseReady]
  );

  const signOutUser = useCallback(async () => {
    if (!isFirebaseReady) {
      return;
    }

    await signOut(auth);
  }, [auth, isFirebaseReady]);

  const updateDisplayName = useCallback(
    async (displayName) => {
      if (!isFirebaseReady || !auth?.currentUser) {
        throw new Error('لا يوجد مستخدم مسجّل دخول حاليًا.');
      }

      await updateProfile(auth.currentUser, { displayName });

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { displayName, updatedAt: serverTimestamp() });

      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, displayName } : prev.user,
        profile: prev.profile ? { ...prev.profile, displayName } : prev.profile,
      }));
    },
    [auth, db, isFirebaseReady]
  );

  const value = useMemo(
    () => ({
      ...state,
      isFirebaseReady,
      signIn,
      signUp,
      signOutUser,
      updateDisplayName,
    }),
    [state, isFirebaseReady, signIn, signUp, signOutUser, updateDisplayName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
