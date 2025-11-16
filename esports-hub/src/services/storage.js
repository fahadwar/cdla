import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { isFirebaseConfigured, storage } from '../lib/firebase.js';

export const uploadMediaFile = async (file, folder = 'uploads') => {
  if (!file) {
    return null;
  }

  if (!isFirebaseConfigured || !storage) {
    throw new Error('لا يمكن رفع الملفات قبل تهيئة Firebase Storage.');
  }

  const sanitizedName = file.name.toLowerCase().replace(/[^a-z0-9.]+/gi, '-');
  const objectRef = ref(storage, `${folder}/${Date.now()}-${sanitizedName}`);
  await uploadBytes(objectRef, file);
  return getDownloadURL(objectRef);
};
