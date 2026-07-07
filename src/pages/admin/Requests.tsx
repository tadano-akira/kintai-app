import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import {
  approveAttendanceRequest,
  rejectAttendanceRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
} from '../../lib/functions';
import type { AttendanceRequest, LeaveRequest, User } from '../../types';

const LEAVE_TYPE_LABEL: Record<string, string> = {
  paid_leave:         '有給休暇',
  absence:            '欠勤',
  special_leave:      '特別休暇',
  compensatory_leave: '振替休暇',
  substitute_holiday: '代休',
};

function dayLabel(dateStr: string) {
  return format(new Date(dateStr + 'T00:00:00'), 'M/d(E)', { locale: ja });
}

export function AdminRequests() {
  const [tab, setTab] = useState(0);
  const [attendanceReqs, setAttendanceReqs] = useState<(AttendanceRequest & { userName?: string })[]>([]);
  const [leaveReqs, setLeaveReqs] = useState<(LeaveRequest & { userName?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, aReqSnap, lReqSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'attendance_requests'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'leave_requests'), where('status', '==', 'pending'))),
      ]);

      const userMap = new Map(usersSnap.docs.map((d) => [d.id, d.data() as User]));

      setAttendanceReqs(
        aReqSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AttendanceRequest))
          .map((r) => ({ ...r, userName: userMap.get(r.uid)?.name ?? r.uid }))
          .sort((a, b) => ((a.createdAt as any)?.toMillis() ?? 0) - ((b.createdAt as any)?.toMillis() ?? 0))
      );

      setLeaveReqs(
        lReqSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as LeaveRequest))
          .map((r) => ({ ...r, userName: userMap.get(r.uid)?.name ?? r.uid }))
          .sort((a, b) => ((a.createdAt as any)?.toMillis() ?? 0) - ((b.createdAt as any)?.toMillis() ?? 0))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAttendance = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessing(requestId);
    try {
      if (action === 'approve') {
        await approveAttendanceRequest({ requestId });
      } else {
        await rejectAttendanceRequest({ requestId });
      }
      setMessage({ text: action === 'approve' ? '承認しました' : '却下しました', severity: 'success' });
      await fetchAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '処理に失敗しました';
      setMessage({ text: msg, severity: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const handleLeave = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessing(requestId);
    try {
      if (action === 'approve') {
        await approveLeaveRequest({ requestId });
      } else {
        await rejectLeaveRequest({ requestId });
      }
      setMessage({ text: action === 'approve' ? '承認しました' : '却下しました', severity: 'success' });
      await fetchAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '処理に失敗しました';
      setMessage({ text: msg, severity: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>申請承認</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`勤怠修正申請 ${attendanceReqs.length > 0 ? `(${attendanceReqs.length})` : ''}`} />
        <Tab label={`休暇申請 ${leaveReqs.length > 0 ? `(${leaveReqs.length})` : ''}`} />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 勤怠修正申請タブ */}
          {tab === 0 && (
            attendanceReqs.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>承認待ちの修正申請はありません</Typography>
            ) : (
              <TableContainer component={Paper} elevation={2}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      {['社員名', '対象日', '修正前', '修正後', '理由', '操作'].map((h) => (
                        <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceReqs.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.userName}</TableCell>
                        <TableCell>{dayLabel(r.targetDate)}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {r.beforeClockIn} / {r.beforeClockOut ?? '—'}
                        </TableCell>
                        <TableCell>
                          {r.afterClockIn} / {r.afterClockOut ?? '—'}
                        </TableCell>
                        <TableCell>{r.reason}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={processing === r.id}
                              onClick={() => handleAttendance(r.id!, 'approve')}
                            >
                              承認
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={processing === r.id}
                              onClick={() => handleAttendance(r.id!, 'reject')}
                            >
                              却下
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}

          {/* 休暇申請タブ */}
          {tab === 1 && (
            leaveReqs.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>承認待ちの休暇申請はありません</Typography>
            ) : (
              <TableContainer component={Paper} elevation={2}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      {['社員名', '対象日', '種別', 'コメント', '操作'].map((h) => (
                        <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaveReqs.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.userName}</TableCell>
                        <TableCell>{dayLabel(r.targetDate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={LEAVE_TYPE_LABEL[r.type] ?? r.type}
                            size="small"
                            color={r.type === 'paid_leave' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{r.comment || '—'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={processing === r.id}
                              onClick={() => handleLeave(r.id!, 'approve')}
                            >
                              承認
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={processing === r.id}
                              onClick={() => handleLeave(r.id!, 'reject')}
                            >
                              却下
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}
        </>
      )}

      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity} onClose={() => setMessage(null)}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
