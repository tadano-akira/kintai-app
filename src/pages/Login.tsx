import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper } from '@mui/material';
import { auth, db, googleProvider } from '../lib/firebase';

export function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const { uid, displayName, email } = result.user;

    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        name: displayName ?? '',
        email: email ?? '',
        role: 'staff',
        createdAt: serverTimestamp(),
      });
    }

    const userData = snap.exists() ? snap.data() : { role: 'staff' };
    navigate(userData.role === 'admin' ? '/admin' : '/staff');
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
    >
      <Paper elevation={3} sx={{ p: 6, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold" mb={1}>
          勤怠管理システム
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          Googleアカウントでログインしてください
        </Typography>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleGoogleLogin}
        >
          Googleでログイン
        </Button>
      </Paper>
    </Box>
  );
}
