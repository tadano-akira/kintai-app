import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useLeaveBalance } from '../../hooks/useLeaveBalance';
import type { LeaveRequest, LeaveType, RequestStatus } from '../../types';

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'paid_leave',         label: '有給休暇' },
  { value: 'absence',            label: '欠勤' },
  { value: 'special_leave',      label: '特別休暇' },
  { value: 'compensatory_leave', label: '振替休暇' },
  { value: 'substitute_holiday', label: '代休' },
];

const STATUS_LABEL: Record<RequestStatus, { label: string; color: 'warning' | 'success' | 'error' }> = {
  pending:  { label: '審査中', color: 'warning' },
  approved: { label: '承認済', color: 'success' },
  rejected: { label: '却下',   color: 'error' },
};

export function LeaveRequest() {
  const { firebaseUser } = useAuth();
  const { balance } = useLeaveBalance(firebaseUser?.uid);

  const [targetDate, setTargetDate] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('paid_leave');
  const [comment, setComment] = useState('');

  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  const fetchHistory = async () => {
    if (!firebaseUser) return;
    setLoadingHistory(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'leave_requests'),
          where('uid', '==', firebaseUser.uid),
        )
      );
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as LeaveRequest))
        .sort((a, b) => {
          const aTime = (a.createdAt as any)?.toMillis?.() ?? 0;
          const bTime = (b.createdAt as any)?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [firebaseUser]);

  const handleSubmit = async () => {
    if (!firebaseUser) return;
    if (!targetDate) { setMessage({ text: '対象日を選択してください', severity: 'error' }); return; }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'leave_requests'), {
        uid: firebaseUser.uid,
        type: leaveType,
        targetDate,
        comment: comment.trim(),
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        createdAt: serverTimestamp(),
      });

      setMessage({ text: '休暇申請を送信しました', severity: 'success' });
      setTargetDate('');
      setLeaveType('paid_leave');
      setComment('');
      await fetchHistory();
    } catch {
      setMessage({ text: '送信に失敗しました', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" mb={3}>休暇申請</Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>新規申請</Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
          <TextField
            label="対象日"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            label="種別"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveType)}
          >
            {LEAVE_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>

          {/* 有給選択時に残数を表示 */}
          {leaveType === 'paid_leave' && balance !== null && (
            <Alert
              severity={balance.remaining > 0 ? 'info' : 'warning'}
              sx={{ py: 0.5 }}
            >
              有給残数：<strong>{balance.remaining} 日</strong>
              （付与 {balance.totalGranted} 日 / 使用 {balance.totalUsed} 日）
            </Alert>
          )}

          <TextField
            label="コメント（任意）"
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例：私用、通院 など"
          />

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{ alignSelf: 'flex-start' }}
          >
            {submitting ? '送信中…' : '申請する'}
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle1" fontWeight="bold" mb={2}>申請履歴</Typography>

      {loadingHistory ? (
        <CircularProgress size={24} />
      ) : history.length === 0 ? (
        <Typography color="text.secondary">申請履歴はありません</Typography>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                {['対象日', '種別', 'コメント', 'ステータス'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((r) => {
                const st = STATUS_LABEL[r.status];
                const lt = LEAVE_TYPE_OPTIONS.find((o) => o.value === r.type)?.label ?? r.type;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      {format(new Date(r.targetDate + 'T00:00:00'), 'M/d(E)', { locale: ja })}
                    </TableCell>
                    <TableCell>{lt}</TableCell>
                    <TableCell>{r.comment || '—'}</TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity} onClose={() => setMessage(null)}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
