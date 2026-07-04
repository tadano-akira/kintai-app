import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  Alert,
  Snackbar,
  Divider,
  Skeleton,
} from '@mui/material';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useLeaveBalance } from '../../hooks/useLeaveBalance';
import { clockIn, clockOut } from '../../lib/functions';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Attendance } from '../../types';

function tsToTime(ts: unknown): string {
  if (!ts) return '';
  try { return format((ts as { toDate(): Date }).toDate(), 'HH:mm'); } catch { return ''; }
}

export function StaffDashboard() {
  const { appUser } = useAuth();
  const { balance, loading: balanceLoading } = useLeaveBalance(appUser?.uid);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [todayRecord, setTodayRecord] = useState<Attendance | null | undefined>(undefined);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy年M月d日(E)', { locale: ja });

  // 今日の出勤記録をリアルタイム監視
  useEffect(() => {
    if (!appUser?.uid) return;
    const ref = doc(db, 'attendance', `${appUser.uid}_${todayStr}`);
    const unsub = onSnapshot(ref, (snap) => {
      setTodayRecord(snap.exists() ? (snap.data() as Attendance) : null);
    });
    return unsub;
  }, [appUser?.uid, todayStr]);

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
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        こんにちは、{appUser?.name} さん
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {today}
      </Typography>

      {/* 打刻 */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
          打刻
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color="primary" size="large" onClick={handleClockIn}>
            出勤
          </Button>
          <Button variant="outlined" color="secondary" size="large" onClick={handleClockOut}>
            退勤
          </Button>
        </Box>
      </Paper>

      {/* 本日のステータス */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
          本日のステータス
        </Typography>
        {todayRecord === undefined ? (
          <Skeleton variant="rounded" width={80} height={24} />
        ) : todayRecord === null ? (
          <Chip label="未打刻" color="default" />
        ) : todayRecord.clockOut ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip label="退勤済み" color="success" />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tsToTime(todayRecord.clockIn)} 〜 {tsToTime(todayRecord.clockOut)}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip label="出勤中" color="primary" />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tsToTime(todayRecord.clockIn)} 〜
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 有給残数 */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BeachAccessIcon color="success" />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            有給残数
          </Typography>
        </Box>

        {balanceLoading ? (
          <Skeleton variant="text" width={200} height={40} />
        ) : balance === null ? (
          <Typography sx={{ color: 'text.secondary' }}>データなし</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {balance.remaining}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>日</Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>付与</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{balance.totalGranted} 日</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>使用</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{balance.totalUsed} 日</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>残数</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  {balance.remaining} 日
                </Typography>
              </Box>
            </Box>
            {balance.remaining === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                有給残数がありません
              </Alert>
            )}
          </>
        )}
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
