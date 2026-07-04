import { Box, Typography, Paper } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useAuth } from '../../hooks/useAuth';

export function AdminDashboard() {
  const { appUser } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        管理者ダッシュボード — {appUser?.name}
      </Typography>

      <Grid container spacing={2}>
        {[
          { label: '承認待ち（勤怠修正）', value: '-' },
          { label: '承認待ち（休暇申請）', value: '-' },
          { label: '今月の出勤者数', value: '-' },
        ].map((item) => (
          <Grid size={{ xs: 12, sm: 4 }} key={item.label}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {item.value}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {item.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
