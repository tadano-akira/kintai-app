import { useCallback, useEffect, useState } from 'react';
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
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { grantLeave } from '../../lib/functions';
import type { GrantType, LeaveGrant, User } from '../../types';

const GRANT_TYPE_OPTIONS: { value: GrantType; label: string }[] = [
  { value: 'annual',     label: '年次有給' },
  { value: 'special',    label: '特別休暇' },
  { value: 'adjustment', label: '調整' },
];

export function AdminLeaveGrants() {
  const [users, setUsers] = useState<User[]>([]);
  const [grants, setGrants] = useState<(LeaveGrant & { userName?: string })[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);

  // フォーム
  const [selectedUid, setSelectedUid] = useState('');
  const [grantDate, setGrantDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [days, setDays] = useState('10');
  const [expireDate, setExpireDate] = useState('');
  const [grantType, setGrantType] = useState<GrantType>('annual');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  // ユーザー一覧取得
  useEffect(() => {
    getDocs(collection(db, 'users')).then((snap) => {
      const list = snap.docs.map((d) => d.data() as User);
      setUsers(list);
      if (list.length > 0) setSelectedUid(list[0].uid);
    });
  }, []);

  const fetchGrants = useCallback(async () => {
    if (users.length === 0) return;
    setLoadingGrants(true);
    try {
      const userMap = new Map(users.map((u) => [u.uid, u.name]));
      const snap = await getDocs(
        query(collection(db, 'leave_grants'), orderBy('grantDate', 'desc'))
      );
      setGrants(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as LeaveGrant),
          userName: userMap.get(d.data().uid) ?? d.data().uid,
        }))
      );
    } catch {
      setGrants([]);
    } finally {
      setLoadingGrants(false);
    }
  }, [users]);

  useEffect(() => { fetchGrants(); }, [fetchGrants]);

  const handleSubmit = async () => {
    if (!selectedUid) { setMessage({ text: '社員を選択してください', severity: 'error' }); return; }
    if (!grantDate)   { setMessage({ text: '付与日を入力してください', severity: 'error' }); return; }
    if (!expireDate)  { setMessage({ text: '有効期限を入力してください', severity: 'error' }); return; }
    const daysNum = Number(days);
    if (!daysNum || daysNum <= 0) { setMessage({ text: '付与日数は1以上で入力してください', severity: 'error' }); return; }

    setSubmitting(true);
    try {
      await grantLeave({
        uid: selectedUid,
        grantDate,
        days: daysNum,
        expireDate,
        grantType,
        comment: comment.trim(),
      });
      setMessage({ text: '有給を付与しました', severity: 'success' });
      setComment('');
      await fetchGrants();
    } catch {
      setMessage({ text: '付与に失敗しました', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" mb={3}>有給付与管理</Typography>

      {/* 付与フォーム */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2}>有給を付与する</Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
          <TextField
            select
            label="対象社員"
            value={selectedUid}
            onChange={(e) => setSelectedUid(e.target.value)}
          >
            {users.map((u) => (
              <MenuItem key={u.uid} value={u.uid}>{u.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="付与種別"
            value={grantType}
            onChange={(e) => setGrantType(e.target.value as GrantType)}
          >
            {GRANT_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="付与日"
              type="date"
              value={grantDate}
              onChange={(e) => setGrantDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="付与日数"
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              inputProps={{ min: 1, max: 40 }}
              fullWidth
            />
          </Box>

          <TextField
            label="有効期限"
            type="date"
            value={expireDate}
            onChange={(e) => setExpireDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="通常は付与日から2年後"
          />

          <TextField
            label="コメント（任意）"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例：法定付与、入社6ヶ月"
          />

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{ alignSelf: 'flex-start' }}
          >
            {submitting ? '付与中…' : '付与する'}
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      {/* 付与履歴 */}
      <Typography variant="subtitle1" fontWeight="bold" mb={2}>付与履歴</Typography>

      {loadingGrants ? (
        <CircularProgress size={24} />
      ) : grants.length === 0 ? (
        <Typography color="text.secondary">付与履歴はありません</Typography>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                {['社員名', '種別', '付与日', '日数', '有効期限', 'コメント'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {grants.map((g) => {
                const gtLabel = GRANT_TYPE_OPTIONS.find((o) => o.value === g.grantType)?.label ?? g.grantType;
                const isExpired = new Date(g.expireDate) < new Date();
                return (
                  <TableRow key={g.id} hover>
                    <TableCell>{g.userName}</TableCell>
                    <TableCell>{gtLabel}</TableCell>
                    <TableCell>{g.grantDate}</TableCell>
                    <TableCell>{g.days} 日</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {g.expireDate}
                        {isExpired && <Chip label="失効" size="small" color="error" />}
                      </Box>
                    </TableCell>
                    <TableCell>{g.comment || '—'}</TableCell>
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
