import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Snackbar,
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { doc, getDoc } from 'firebase/firestore';
import { format, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import { closeMonthlyAttendance, reopenMonthlyAttendance } from '../../lib/functions';
import type { MonthlyClosing } from '../../types';

export function AdminMonthlyClosing() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [closing, setClosing] = useState<MonthlyClosing | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'close' | 'reopen'>('close');
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  const yearMonth = format(baseDate, 'yyyy-MM');
  const monthLabel = format(baseDate, 'yyyy年M月', { locale: ja });

  const fetchClosing = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'monthly_closings', yearMonth));
      setClosing(snap.exists() ? (snap.data() as MonthlyClosing) : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClosing(); }, [yearMonth]);

  const isClosed = closing?.closed === true;

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setProcessing(true);
    try {
      if (confirmAction === 'close') {
        await closeMonthlyAttendance({ yearMonth });
        setMessage({ text: `${monthLabel}を締めました`, severity: 'success' });
      } else {
        await reopenMonthlyAttendance({ yearMonth });
        setMessage({ text: `${monthLabel}の締めを解除しました`, severity: 'success' });
      }
      await fetchClosing();
    } catch {
      setMessage({ text: '処理に失敗しました', severity: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" mb={3}>月次締め</Typography>

      {/* 月ナビゲーション */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
        <IconButton onClick={() => setBaseDate((d) => subMonths(d, 1))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 140, textAlign: 'center' }}>
          {monthLabel}
        </Typography>
        <IconButton onClick={() => setBaseDate((d) => addMonths(d, 1))}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* 締め状態 */}
      <Paper elevation={2} sx={{ p: 4, maxWidth: 480 }}>
        {loading ? (
          <Typography color="text.secondary">読み込み中…</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              {isClosed
                ? <LockIcon color="error" sx={{ fontSize: 40 }} />
                : <LockOpenIcon color="success" sx={{ fontSize: 40 }} />
              }
              <Box>
                <Typography variant="h6">{monthLabel}</Typography>
                <Chip
                  label={isClosed ? '締め済み' : '未締め'}
                  color={isClosed ? 'error' : 'success'}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            {isClosed && closing?.closedAt && (
              <Typography variant="body2" color="text.secondary" mb={3}>
                締め日時：{format((closing.closedAt as any).toDate(), 'yyyy/MM/dd HH:mm')}
              </Typography>
            )}

            <Divider sx={{ mb: 3 }} />

            {isClosed ? (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  締め済みのため、この月の勤怠データは編集できません。<br />
                  解除する場合は管理者が責任をもって確認してください。
                </Alert>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<LockOpenIcon />}
                  disabled={processing}
                  onClick={() => { setConfirmAction('reopen'); setConfirmOpen(true); }}
                >
                  締めを解除する
                </Button>
              </>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  締めを実行すると、この月の勤怠データへの書き込みが禁止されます。<br />
                  全員の勤怠が確定してから実行してください。
                </Alert>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<LockIcon />}
                  disabled={processing}
                  onClick={() => { setConfirmAction('close'); setConfirmOpen(true); }}
                >
                  {monthLabel}を締める
                </Button>
              </>
            )}
          </>
        )}
      </Paper>

      {/* 確認ダイアログ */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          {confirmAction === 'close' ? '月次締めの実行' : '締めの解除'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction === 'close'
              ? `${monthLabel}を締めます。締め後は勤怠データの編集ができなくなります。よろしいですか？`
              : `${monthLabel}の締めを解除します。解除中に承認された修正・申請は管理者が責任をもって確認してください。よろしいですか？`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleConfirm}
            color={confirmAction === 'close' ? 'primary' : 'warning'}
            variant="contained"
            autoFocus
          >
            実行する
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity} onClose={() => setMessage(null)}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
