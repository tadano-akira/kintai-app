import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface LeaveBalance {
  totalGranted: number;
  totalUsed: number;
  remaining: number;
}

export function useLeaveBalance(uid: string | undefined) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      getDocs(query(collection(db, 'leave_grants'), where('uid', '==', uid))),
      getDocs(query(collection(db, 'leave_usage'), where('uid', '==', uid))),
    ])
      .then(([grantsSnap, usageSnap]) => {
        const totalGranted = grantsSnap.docs.reduce((sum, d) => {
          const data = d.data();
          return data.expireDate >= today ? sum + data.days : sum;
        }, 0);
        const totalUsed = usageSnap.docs.reduce(
          (sum, d) => sum + d.data().usedDays,
          0
        );
        setBalance({ totalGranted, totalUsed, remaining: totalGranted - totalUsed });
      })
      .catch(() => setBalance({ totalGranted: 0, totalUsed: 0, remaining: 0 }))
      .finally(() => setLoading(false));
  }, [uid]);

  return { balance, loading };
}
