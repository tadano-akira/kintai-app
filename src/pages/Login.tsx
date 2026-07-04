import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper, Chip } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BadgeIcon from '@mui/icons-material/Badge';
import { auth, db, googleProvider } from '../lib/firebase';

interface Props {
  /** ログイン後の遷移先。未指定の場合は role に応じて自動判定 */
  redirectTo?: string;
  /** ログイン画面上部に表示するロールラベル */
  roleLabel?: 'staff' | 'admin';
}

export function Login({ redirectTo, roleLabel }: Props) {
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

    if (redirectTo) {
      navigate(redirectTo);
    } else {
      navigate(userData.role === 'admin' ? '/admin' : '/staff');
    }
  };

  const roleConfig = {
    staff: { label: 'スタッフ', icon: <BadgeIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} /> },
    admin: { label: '管理者',   icon: <AdminPanelSettingsIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} /> },
  };
  const cfg = roleLabel ? roleConfig[roleLabel] : null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Paper elevation={3} sx={{ p: 6, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        {cfg && (
          <Box sx={{ mb: 1 }}>
            {cfg.icon}
          </Box>
        )}
        <Typography variant="h5" fontWeight="bold" mb={1}>
          勤怠管理システム
        </Typography>
        {cfg && (
          <Chip label={cfg.label + 'ログイン'} size="small" sx={{ mb: 2 }} />
        )}
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
