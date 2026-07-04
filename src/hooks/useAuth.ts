import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (!firebaseUser) {
        setState({ firebaseUser: null, appUser: null, loading: false });
        return;
      }

      // onSnapshot でユーザードキュメントをリアルタイム監視
      // 初回ログイン時に Login.tsx が setDoc した瞬間に appUser が更新される
      unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
        const appUser = snap.exists() ? (snap.data() as User) : null;
        setState({ firebaseUser, appUser, loading: false });
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  return state;
}
