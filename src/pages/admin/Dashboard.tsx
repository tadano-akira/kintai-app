import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Skeleton } from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';

interface Counts {
  pendingAttendance: number;
  pendingLeave: number;
  monthlyWorkers: number;
}

export function AdminDashboard() {
  const { appUser } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      const today = new Date();
      const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(today), 'yyyy-MM-dd');

      const [attendanceReqSnap, leaveReqSnap, attendanceSnap] = await Promise.all([
        getDocs(query(collection(db, 'attendance_requests'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'leave_requests'), where('status', '==', 'pending'))),
        getDocs(
          query(
            collection(db, 'attendance'),
            where('workDate', '>=', startDate),
            where('workDate', '<=', endDate),
          ),
        ),
      ]);

      const uniqueUids = new Set(attendanceSnap.docs.map((d) => d.data().uid as string));

      setCounts({
        pendingAttendance: attendanceReqSnap.size,
        pendingLeave: leaveReqSnap.size,
        monthlyWorkers: uniqueUids.size,
      });
    };

    fetchCounts();
  }, []);

  const items = [
    { label: '承認待ち（勤怠修正）', value: counts?.pendingAttendance },
    { label: '承認待ち（休暇申請）',  value: counts?.pendingLeave },
    { label: '今月の出勤者数',        value: counts?.monthlyWorkers },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        管理者ダッシュボード — {appUser?.name}
      </Typography>

      <Grid container spacing={2}>
        {items.map((item) => (
          <Grid size={{ xs: 12, sm: 4 }} key={item.label}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              {counts === null ? (
                <Skeleton variant="text" height={56} sx={{ mx: 'auto', width: 60 }} />
              ) : (
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    color: item.value ? 'warning.main' : 'text.primary',
                  }}
                >
                  {item.value}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {item.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
