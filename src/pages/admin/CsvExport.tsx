import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Snackbar,
  IconButton,
  CircularProgress,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/Download';
import { format, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Attendance, User } from '../../types';

const WORK_TYPE_LABEL: Record<string, string> = {
  work: '出勤',
  paid_leave: '有給',
  absence: '欠勤',
  holiday: '休日',
};

function tsToTime(ts: unknown): string {
  if (!ts) return '';
  try {
    return format((ts as { toDate(): Date }).toDate(), 'HH:mm');
  } catch {
    return typeof ts === 'string' ? ts : '';
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function AdminCsvExport() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  const yearMonth = format(baseDate, 'yyyy-MM');
  const monthLabel = format(baseDate, 'yyyy年M月', { locale: ja });

  const handleExport = async () => {
    setLoading(true);
    try {
      const startDate = `${yearMonth}-01`;
      const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
      const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

      const [attendanceSnap, usersSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'attendance'),
            where('workDate', '>=', startDate),
            where('workDate', '<=', endDate),
          )
        ),
        getDocs(collection(db, 'users')),
      ]);

      const userMap = new Map(
        usersSnap.docs.map((d) => {
          const u = d.data() as User;
          return [d.id, { name: u.name, employeeId: u.employeeId ?? '' }];
        })
      );

      const rows = attendanceSnap.docs
        .map((d) => d.data() as Attendance)
        .sort((a, b) => {
          const dc = a.workDate.localeCompare(b.workDate);
          return dc !== 0 ? dc : a.uid.localeCompare(b.uid);
        })
        .map((a) => {
          const u = userMap.get(a.uid);
          return [
            u?.employeeId || a.uid,  // 社員ID未設定時は UID で代替
            u?.name ?? '',
            a.workDate,
            WORK_TYPE_LABEL[a.workType] ?? a.workType,
            tsToTime(a.clockIn),
            tsToTime(a.clockOut),
            a.comment ?? '',
          ]
            .map(escapeCsv)
            .join(',');
        });

      const header = '社員ID,氏名,日付,区分,出勤時刻,退勤時刻,コメント';
      const csv = [header, ...rows].join('\r\n');

      // BOM付きUTF-8 - Excelで開いても文字化けしない
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kintai_${yearMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ text: `${monthLabel}のCSVをダウンロードしました`, severity: 'success' });
    } catch (err) {
      console.error('CSV export error:', err);
      setMessage({ text: 'CSVの出力に失敗しました', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>CSV出力</Typography>

      <Paper elevation={2} sx={{ p: 4, maxWidth: 480 }}>
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

        <Alert severity="info" sx={{ mb: 3 }}>
          出力形式：BOM付きUTF-8（Excel対応）<br />
          項目：社員ID・氏名・日付・区分・出勤時刻・退勤時刻・コメント
        </Alert>

        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
          disabled={loading}
          onClick={handleExport}
        >
          {loading ? '出力中…' : `${monthLabel} をダウンロード`}
        </Button>
      </Paper>

      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity} onClose={() => setMessage(null)}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
