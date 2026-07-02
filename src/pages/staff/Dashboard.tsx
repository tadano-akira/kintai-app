import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { clockIn, clockOut } from '../../lib/functions';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export function StaffDashboard() {
  const { appUser } = useAuth();
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  const today = format(new Date(), 'yyyy年M月d日(E)', { locale: ja });

  const handleClockIn = async () => {
    try {
      await clockIn();
      setMessage({ text: '出勤を記録しました', severity: 'success' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '出勤記録に失敗しました';
      setMessage({ text: msg, severity: 'error' });
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
      setMessage({ text: '退勤を記録しました', severity: 'success' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '退勤記録に失敗しました';
      setMessage({ text: msg, severity: 'error' });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" mb={1}>
        こんにちは、{appUser?.name} さん
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {today}
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          打刻
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="contained" color="primary" size="large" onClick={handleClockIn}>
            出勤
          </Button>
          <Button variant="outlined" color="secondary" size="large" onClick={handleClockOut}>
            退勤
          </Button>
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>
          本日のステータス
        </Typography>
        <Chip label="未打刻" color="default" />
      </Paper>

      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
      >
        <Alert severity={message?.severity} onClose={() => setMessage(null)}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
