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
  TextField,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { updateUser } from '../../lib/functions';
import type { User } from '../../types';

interface EditState {
  uid: string;
  name: string;
  employeeId: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs
        .map((d) => d.data() as User)
        .sort((a, b) => (a.employeeId ?? '').localeCompare(b.employeeId ?? '') || a.name.localeCompare(b.name));
      setUsers(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const startEdit = (user: User) => {
    setEditing({
      uid: user.uid,
      name: user.name,
      employeeId: user.employeeId ?? '',
    });
  };

  const cancelEdit = () => setEditing(null);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setMessage({ text: '名前は必須です', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      await updateUser({
        uid: editing.uid,
        name: editing.name.trim(),
        employeeId: editing.employeeId.trim() || undefined,
      });
      setMessage({ text: '更新しました', severity: 'success' });
      setEditing(null);
    } catch {
      setMessage({ text: '更新に失敗しました', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>社員管理</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        名前・社員IDを編集できます。社員IDはCSV出力に使用されます。
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['社員ID', '名前', 'メール', 'ロール', '操作'].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const isEditing = editing?.uid === user.uid;
                return (
                  <TableRow key={user.uid} hover>
                    {/* 社員ID */}
                    <TableCell sx={{ minWidth: 120 }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editing.employeeId}
                          onChange={(e) => setEditing({ ...editing, employeeId: e.target.value })}
                          placeholder="例: EMP001"
                          sx={{ width: 120 }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {user.employeeId || <span style={{ color: '#aaa' }}>未設定</span>}
                        </Typography>
                      )}
                    </TableCell>

                    {/* 名前 */}
                    <TableCell sx={{ minWidth: 160 }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          sx={{ width: 160 }}
                        />
                      ) : (
                        user.name
                      )}
                    </TableCell>

                    {/* メール */}
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {user.email}
                      </Typography>
                    </TableCell>

                    {/* ロール */}
                    <TableCell>
                      <Chip
                        label={user.role === 'admin' ? '管理者' : 'スタッフ'}
                        color={user.role === 'admin' ? 'secondary' : 'default'}
                        size="small"
                      />
                    </TableCell>

                    {/* 操作 */}
                    <TableCell>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="保存">
                            <span>
                              <IconButton
                                color="primary"
                                onClick={handleSave}
                                disabled={saving}
                                size="small"
                              >
                                {saving ? <CircularProgress size={18} /> : <CheckIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="キャンセル">
                            <IconButton size="small" onClick={cancelEdit} disabled={saving}>
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Tooltip title="編集">
                          <IconButton size="small" onClick={() => startEdit(user)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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
