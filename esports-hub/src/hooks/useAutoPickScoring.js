import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.js';
import { calculatePickScore, determineMatchWinner } from '../utils/pickem.js';

const useAutoPickScoring = ({ round, matches = [], picks = [] }) => {
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    if (!round || !Array.isArray(matches) || matches.length === 0) return;
    if (!Array.isArray(picks) || picks.length === 0) return;

    const finalMatches = matches.filter((match) => determineMatchWinner(match));
    if (finalMatches.length === 0) return;

    let isCancelled = false;

    const runScoring = async () => {
      for (const pick of picks) {
        const { score, totalEvaluated } = calculatePickScore(matches, pick);
        if (totalEvaluated === 0) continue;
        if ((pick.score ?? 0) === score) continue;
        try {
          await updateDoc(doc(db, 'picks', pick.id), {
            score,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Failed to auto-update pick score', error);
          }
        }
        if (isCancelled) {
          break;
        }
      }
    };

    runScoring();

    return () => {
      isCancelled = true;
    };
  }, [round?.id, matches, picks]);
};

export default useAutoPickScoring;
