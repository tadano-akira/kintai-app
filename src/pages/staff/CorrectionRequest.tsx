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
  CircularProgress,
} from '@mui/material';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import type { Attendance, AttendanceRequest, RequestStatus } from '../../types';

const STATUS_LABEL: Record<RequestStatus, { label: string; color: 'warning' | 'success' | 'error' }> = {
  pending:  { label: '審査中', color: 'warning' },
  approved: { label: '承認済', color: 'success' },
  rejected: { label: '却下',   color: 'error' },
};

function tsToTime(ts: { toDate: () => Date } | undefined | null): string {
  if (!ts) return '—';
  return format(ts.toDate(), 'HH:mm');
}

function tsToInput(ts: { toDate: () => Date } | undefined | null): string {
  if (!ts) return '';
  try { return format(ts.toDate(), 'HH:mm'); } catch { return ''; }
}

export function CorrectionRequest() {
  const { firebaseUser } = useAuth();

  // フォーム状態
  const [targetDate, setTargetDate] = useState('');
  const [afterClockIn, setAfterClockIn] = useState('');
  const [afterClockOut, setAfterClockOut] = useState('');
  const [reason, setReason] = useState('');
  const [existing, setExisting] = useState<Attendance | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // 申請履歴
  const [history, setHistory] = useState<AttendanceRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // フィードバック
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 対象日が変わったら既存打刻を取得して入力欄に自動補完
  useEffect(() => {
    if (!firebaseUser || !targetDate) {
      setExisting(null);
      setAfterClockIn('');
      setAfterClockOut('');
      return;
    }
    setLoadingExisting(true);
    getDoc(doc(db, 'attendance', `${firebaseUser.uid}_${targetDate}`))
      .then((snap) => {
        const data = snap.exists() ? (snap.data() as Attendance) : null;
        setExisting(data);
        setAfterClockIn(tsToInput((data?.clockIn as any) ?? null));
        setAfterClockOut(tsToInput((data?.clockOut as any) ?? null));
      })
      .finally(() => setLoadingExisting(false));
  }, [firebaseUser, targetDate]);

  const fetchHistory = async () => {
    if (!firebaseUser) return;
    setLoadingHistory(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'attendance_requests'),
          where('uid', '==', firebaseUser.uid),
        )
      );
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AttendanceRequest))
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

  // 申請履歴を取得
  useEffect(() => {
    fetchHistory();
  }, [firebaseUser]);

  const handleSubmit = async () => {
    if (!firebaseUser) return;
    if (!targetDate) { setMessage({ text: '対象日を選択してください', severity: 'error' }); return; }
    if (!afterClockIn) { setMessage({ text: '修正後の出勤時刻を入力してください', severity: 'error' }); return; }
    if (!reason.trim()) { setMessage({ text: '修正理由を入力してください', severity: 'error' }); return; }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'attendance_requests'), {
        uid: firebaseUser.uid,
        targetDate,
        beforeClockIn: tsToTime(existing?.clockIn as any),
        afterClockIn,
        beforeClockOut: tsToTime(existing?.clockOut as any),
        afterClockOut: afterClockOut || null,
        reason: reason.trim(),
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        createdAt: serverTimestamp(),
      });

      setMessage({ text: '修正申請を送信しました', severity: 'success' });
      setTargetDate('');
      setAfterClockIn('');
      setAfterClockOut('');
      setReason('');
      setExisting(null);
      await fetchHistory();
    } catch {
      setMessage({ text: '送信に失敗しました', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>勤怠修正申請</Typography>

      {/* 申請フォーム */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>新規申請</Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
          <TextField
            label="対象日"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: format(new Date(), 'yyyy-MM-dd') } }}
          />

          {/* 既存打刻の表示 */}
          {loadingExisting && <CircularProgress size={20} />}
          {targetDate && !loadingExisting && (
            <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, p: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>現在の打刻</Typography>
              {existing ? (
                <Typography variant="body2">
                  出勤：{tsToTime(existing.clockIn as any)}　退勤：{tsToTime(existing.clockOut as any)}
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>この日の打刻記録がありません</Typography>
              )}
            </Box>
          )}

          <TextField
            label="修正後の出勤時刻"
            type="time"
            value={afterClockIn}
            onChange={(e) => setAfterClockIn(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="対象日の打刻がある場合は自動補完されます"
          />

          <TextField
            label="修正後の退勤時刻（変更しない場合は空欄）"
            type="time"
            value={afterClockOut}
            onChange={(e) => setAfterClockOut(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="修正理由"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例：打刻忘れ、システムエラー など"
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

      {/* 申請履歴 */}
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>申請履歴</Typography>

      {loadingHistory ? (
        <CircularProgress size={24} />
      ) : history.length === 0 ? (
        <Typography sx={{ color: 'text.secondary' }}>申請履歴はありません</Typography>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                {['対象日', '修正前', '修正後', '理由', 'ステータス'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((r) => {
                const st = STATUS_LABEL[r.status];
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      {format(new Date(r.targetDate + 'T00:00:00'), 'M/d(E)', { locale: ja })}
                    </TableCell>
                    <TableCell>{r.beforeClockIn} / {r.beforeClockOut ?? '—'}</TableCell>
                    <TableCell>{r.afterClockIn} / {r.afterClockOut ?? '—'}</TableCell>
                    <TableCell>{r.reason}</TableCell>
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
