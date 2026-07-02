import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User } from '../types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  appUser: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    appUser: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ firebaseUser: null, appUser: null, loading: false });
        return;
      }
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      const appUser = snap.exists() ? (snap.data() as User) : null;
      setState({ firebaseUser, appUser, loading: false });
    });
    return unsubscribe;
  }, []);

  return state;
}
