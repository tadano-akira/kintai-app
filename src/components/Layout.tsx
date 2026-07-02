import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

const DRAWER_WIDTH = 220;

const staffNav = [
  { label: 'ダッシュボード', path: '/staff' },
  { label: '勤怠一覧', path: '/staff/attendance' },
  { label: '修正申請', path: '/staff/correction' },
  { label: '休暇申請', path: '/staff/leave' },
  { label: '有給残数', path: '/staff/balance' },
];

const adminNav = [
  { label: 'ダッシュボード', path: '/admin' },
  { label: '勤怠一覧', path: '/admin/attendance' },
  { label: '申請承認', path: '/admin/requests' },
  { label: 'CSV出力', path: '/admin/csv' },
  { label: '月次締め', path: '/admin/closing' },
  { label: '有給付与', path: '/admin/leave-grants' },
];

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { appUser } = useAuth();

  const nav = appUser?.role === 'admin' ? adminNav : staffNav;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <Box display="flex">
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" flexGrow={1}>
            勤怠管理
          </Typography>
          <Typography variant="body2" mr={2}>
            {appUser?.name}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            ログアウト
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {nav.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" flexGrow={1} ml={`${DRAWER_WIDTH}px`}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
