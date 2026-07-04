import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { format, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import type { Attendance, WorkType } from '../../types';

const WORK_TYPE_LABEL: Record<WorkType, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  work: { label: '出勤', color: 'success' },
  paid_leave: { label: '有給', color: 'warning' },
  absence: { label: '欠勤', color: 'error' },
  holiday: { label: '休日', color: 'default' },
};

function tsToJST(ts: { toDate: () => Date } | undefined | null): string {
  if (!ts) return '—';
  return format(ts.toDate(), 'HH:mm');
}

export function MyAttendance() {
  const { firebaseUser } = useAuth();
  const [baseDate, setBaseDate] = useState(new Date());
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  const yearMonth = format(baseDate, 'yyyy-MM');
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  useEffect(() => {
    if (!firebaseUser) return;
    setLoading(true);

    const q = query(
      collection(db, 'attendance'),
      where('uid', '==', firebaseUser.uid),
    );

    getDocs(q)
      .then((snap) => {
        const data = snap.docs
          .map((d) => d.data() as Attendance)
          .filter((r) => r.workDate >= startDate && r.workDate <= endDate)
          .sort((a, b) => a.workDate.localeCompare(b.workDate));
        setRecords(data);
      })
      .finally(() => setLoading(false));
  }, [firebaseUser, yearMonth]);

  return (
    <Box sx={{ p: 3 }}>
      {/* 月ナビゲーション */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['日付', '区分', '出勤', '退勤', 'コメント'].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    この月の勤怠データはありません
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => {
                  const dayLabel = format(new Date(r.workDate + 'T00:00:00'), 'M/d(E)', { locale: ja });
                  const wt = WORK_TYPE_LABEL[r.workType] ?? { label: r.workType, color: 'default' };
                  return (
                    <TableRow key={r.workDate} hover>
                      <TableCell>{dayLabel}</TableCell>
                      <TableCell>
                        <Chip label={wt.label} color={wt.color} size="small" />
                      </TableCell>
                      <TableCell>{tsToJST(r.clockIn as any)}</TableCell>
                      <TableCell>{tsToJST(r.clockOut as any)}</TableCell>
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
