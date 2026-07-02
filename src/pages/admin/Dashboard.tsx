import { Box, Typography, Grid, Paper } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

export function AdminDashboard() {
  const { appUser } = useAuth();

  return (
    <Box p={3}>
      <Typography variant="h6" mb={3}>
        管理者ダッシュボード — {appUser?.name}
      </Typography>

      <Grid container spacing={2}>
        {[
          { label: '承認待ち（勤怠修正）', value: '-' },
          { label: '承認待ち（休暇申請）', value: '-' },
          { label: '今月の出勤者数', value: '-' },
        ].map((item) => (
          <Grid item xs={12} sm={4} key={item.label}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold">
                {item.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {item.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
