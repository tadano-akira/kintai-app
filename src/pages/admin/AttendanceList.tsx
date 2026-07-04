import { useEffect, useState } from 'react';
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
  IconButton,
  MenuItem,
  TextField,
  CircularProgress,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { format, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import type { Attendance, User, WorkType } from '../../types';

const WORK_TYPE_LABEL: Record<WorkType, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  work:       { label: '出勤', color: 'success' },
  paid_leave: { label: '有給', color: 'warning' },
  absence:    { label: '欠勤', color: 'error' },
  holiday:    { label: '休日', color: 'default' },
};

function tsToTime(ts: { toDate: () => Date } | undefined | null): string {
  if (!ts) return '—';
  return format(ts.toDate(), 'HH:mm');
}

export function AdminAttendanceList() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUid, setSelectedUid] = useState<string>('all');
  const [records, setRecords] = useState<(Attendance & { userName: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const yearMonth = format(baseDate, 'yyyy-MM');
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  // ユーザー一覧を初回取得
  useEffect(() => {
    getDocs(collection(db, 'users')).then((snap) => {
      setUsers(snap.docs.map((d) => d.data() as User));
    });
  }, []);

  // 勤怠データを取得
  useEffect(() => {
    if (users.length === 0) return;
    setLoading(true);

    const userMap = new Map(users.map((u) => [u.uid, u.name]));

    const q = selectedUid === 'all'
      ? query(
          collection(db, 'attendance'),
          where('workDate', '>=', startDate),
          where('workDate', '<=', endDate),
        )
      : query(
          collection(db, 'attendance'),
          where('uid', '==', selectedUid),
          where('workDate', '>=', startDate),
          where('workDate', '<=', endDate),
        );

    getDocs(q)
      .then((snap) => {
        const data = snap.docs
          .map((d) => ({
            ...(d.data() as Attendance),
            userName: userMap.get(d.data().uid) ?? d.data().uid,
          }))
          .filter((r) => r.workDate >= startDate && r.workDate <= endDate)
          .sort((a, b) => {
            const dateComp = a.workDate.localeCompare(b.workDate);
            return dateComp !== 0 ? dateComp : a.userName.localeCompare(b.userName);
          });
        setRecords(data);
      })
      .finally(() => setLoading(false));
  }, [users, yearMonth, selectedUid]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>全社員勤怠一覧</Typography>

      {/* ツールバー */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => setBaseDate((d) => subMonths(d, 1))}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ minWidth: 120, textAlign: 'center' }}>
            {format(baseDate, 'yyyy年M月', { locale: ja })}
          </Typography>
          <IconButton onClick={() => setBaseDate((d) => addMonths(d, 1))}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <TextField
          select
          label="社員"
          size="small"
          value={selectedUid}
          onChange={(e) => setSelectedUid(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">全社員</MenuItem>
          {users.map((u) => (
            <MenuItem key={u.uid} value={u.uid}>{u.name}</MenuItem>
          ))}
        </TextField>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {records.length} 件
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['日付', '社員名', '区分', '出勤', '退勤', 'コメント'].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    この月の勤怠データはありません
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => {
                  const wt = WORK_TYPE_LABEL[r.workType] ?? { label: r.workType, color: 'default' as const };
                  return (
                    <TableRow key={`${r.uid}_${r.workDate}`} hover>
                      <TableCell>
                        {format(new Date(r.workDate + 'T00:00:00'), 'M/d(E)', { locale: ja })}
                      </TableCell>
                      <TableCell>{r.userName}</TableCell>
                      <TableCell>
                        <Chip label={wt.label} color={wt.color} size="small" />
                      </TableCell>
                      <TableCell>{tsToTime(r.clockIn as any)}</TableCell>
                      <TableCell>{tsToTime(r.clockOut as any)}</TableCell>
                      <TableCell>{r.comment || '—'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
