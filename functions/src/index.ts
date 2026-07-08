import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: 'asia-northeast1' });

// ── helpers ──────────────────────────────────────────────────────────────────

function assertAuth(auth: { uid: string; token: admin.auth.DecodedIdToken } | undefined) {
  if (!auth) throw new HttpsError('unauthenticated', '認証が必要です');
  return auth;
}

async function assertAdmin(auth: { uid: string }) {
  const snap = await db.collection('users').doc(auth.uid).get();
  if (!snap.exists || snap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', '管理者権限が必要です');
  }
}

function todayJST(): string {
  return format(toZonedTime(new Date(), 'Asia/Tokyo'), 'yyyy-MM-dd');
}

// "YYYY-MM-DD" + "HH:mm" → Firestore Timestamp (JST として解釈)
function timeToTimestamp(date: string, time: string): admin.firestore.Timestamp {
  if (!date || !time) {
    throw new HttpsError('invalid-argument', `日付または時刻が空です: date=${date}, time=${time}`);
  }
  const d = new Date(`${date}T${time}:00+09:00`);
  if (isNaN(d.getTime())) {
    throw new HttpsError('invalid-argument', `無効な日時フォーマットです: ${date}T${time}`);
  }
  return admin.firestore.Timestamp.fromDate(d);
}

// ── clockIn ───────────────────────────────────────────────────────────────────

export const clockIn = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  const uid = auth.uid;
  const workDate = todayJST();
  const ref = db.collection('attendance').doc(`${uid}_${workDate}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.clockIn) {
      throw new HttpsError('already-exists', '本日はすでに出勤済みです');
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    if (snap.exists) {
      tx.update(ref, { clockIn: now, updatedAt: now, updatedBy: uid });
    } else {
      tx.set(ref, {
        uid,
        workDate,
        clockIn: now,
        clockOut: null,
        workType: 'work',
        comment: '',
        status: 'none',
        createdAt: now,
        updatedAt: now,
        createdBy: uid,
        updatedBy: uid,
      });
    }
  });

  return { success: true };
});

// ── clockOut ──────────────────────────────────────────────────────────────────

export const clockOut = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  const uid = auth.uid;
  const workDate = todayJST();
  const ref = db.collection('attendance').doc(`${uid}_${workDate}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !snap.data()?.clockIn) {
      throw new HttpsError('failed-precondition', '出勤記録がありません');
    }
    if (snap.data()?.clockOut) {
      throw new HttpsError('already-exists', '本日はすでに退勤済みです');
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.update(ref, { clockOut: now, updatedAt: now, updatedBy: uid });
  });

  return { success: true };
});

// ── approveAttendanceRequest ──────────────────────────────────────────────────

export const approveAttendanceRequest = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const { requestId } = request.data as { requestId: string };

  const reqRef = db.collection('attendance_requests').doc(requestId);

  // ── バリデーションはトランザクション外で行う ────────────────────────────
  // HttpsError をトランザクション内でスローすると Firestore が internal に変換するため
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) throw new HttpsError('not-found', '申請が存在しません');
  const reqData = reqSnap.data()!;
  if (reqData.status !== 'pending') {
    throw new HttpsError('failed-precondition', '承認済みまたは却下済みの申請です');
  }
  if (!reqData.afterClockIn) {
    throw new HttpsError(
      'invalid-argument',
      '申請データに修正後の出勤時刻がありません。申請を削除して再申請してください。',
    );
  }

  // タイムスタンプ変換もトランザクション外で行い、エラーを HttpsError として返す
  const clockInTs  = timeToTimestamp(reqData.targetDate, reqData.afterClockIn);
  const clockOutTs = reqData.afterClockOut
    ? timeToTimestamp(reqData.targetDate, reqData.afterClockOut)
    : null;

  const attendanceRef = db
    .collection('attendance')
    .doc(`${reqData.uid}_${reqData.targetDate}`);

  // ── トランザクション: 読み書きのみ ──────────────────────────────────────
  await db.runTransaction(async (tx) => {
    const [snap, attendanceSnap] = await Promise.all([
      tx.get(reqRef),
      tx.get(attendanceRef),
    ]);

    // 二重承認を防ぐ再確認（通常ここには到達しない）
    if (!snap.exists || snap.data()?.status !== 'pending') return;

    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.update(reqRef, {
      status: 'approved',
      approvedBy: auth.uid,
      approvedAt: now,
      updatedAt: now,
      updatedBy: auth.uid,
    });

    if (attendanceSnap.exists) {
      tx.update(attendanceRef, {
        clockIn: clockInTs,
        clockOut: clockOutTs,
        updatedAt: now,
        updatedBy: auth.uid,
      });
    } else {
      tx.set(attendanceRef, {
        uid: reqData.uid,
        workDate: reqData.targetDate,
        clockIn: clockInTs,
        clockOut: clockOutTs,
        workType: 'work',
        comment: '',
        status: 'none',
        createdAt: now,
        updatedAt: now,
        createdBy: auth.uid,
        updatedBy: auth.uid,
      });
    }
  });

  return { success: true };
});

// ── rejectAttendanceRequest ───────────────────────────────────────────────────

export const rejectAttendanceRequest = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const { requestId } = request.data as { requestId: string };

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('attendance_requests').doc(requestId).update({
    status: 'rejected',
    approvedBy: auth.uid,
    approvedAt: now,
    updatedAt: now,
    updatedBy: auth.uid,
  });

  return { success: true };
});

// ── approveLeaveRequest ───────────────────────────────────────────────────────

export const approveLeaveRequest = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const { requestId } = request.data as { requestId: string };

  const reqRef = db.collection('leave_requests').doc(requestId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) throw new HttpsError('not-found', '申請が存在しません');
    const data = snap.data()!;
    if (data.status !== 'pending') {
      throw new HttpsError('failed-precondition', '承認済みまたは却下済みの申請です');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.update(reqRef, {
      status: 'approved',
      approvedBy: auth.uid,
      approvedAt: now,
      updatedAt: now,
      updatedBy: auth.uid,
    });

    if (data.type === 'paid_leave') {
      const usageRef = db.collection('leave_usage').doc();
      tx.set(usageRef, {
        uid: data.uid,
        leaveRequestId: requestId,
        targetDate: data.targetDate,
        usedDays: 1,
        createdAt: now,
        createdBy: auth.uid,
      });
    }
  });

  return { success: true };
});

// ── rejectLeaveRequest ────────────────────────────────────────────────────────

export const rejectLeaveRequest = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const { requestId } = request.data as { requestId: string };

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('leave_requests').doc(requestId).update({
    status: 'rejected',
    approvedBy: auth.uid,
    approvedAt: now,
    updatedAt: now,
    updatedBy: auth.uid,
  });

  return { success: true };
});

// ── grantLeave ────────────────────────────────────────────────────────────────

export const grantLeave = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);

  const data = request.data as {
    uid: string;
    grantDate: string;
    days: number;
    expireDate: string;
    grantType: string;
    comment: string;
  };

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await db.collection('leave_grants').add({
    ...data,
    createdAt: now,
    createdBy: auth.uid,
  });

  return { id: ref.id };
});

// ── getLeaveBalance ───────────────────────────────────────────────────────────

export const getLeaveBalance = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  const { uid } = request.data as { uid: string };

  if (auth.token['role'] !== 'admin' && auth.uid !== uid) {
    throw new HttpsError('permission-denied', '権限がありません');
  }

  const [grantsSnap, usageSnap] = await Promise.all([
    db.collection('leave_grants').where('uid', '==', uid).get(),
    db.collection('leave_usage').where('uid', '==', uid).get(),
  ]);

  const now = new Date();
  const totalGranted = grantsSnap.docs.reduce((sum, d) => {
    const expireDate = new Date(d.data().expireDate);
    return expireDate >= now ? sum + d.data().days : sum;
  }, 0);

  const totalUsed = usageSnap.docs.reduce(
    (sum, d) => sum + d.data().usedDays,
    0
  );

  return { totalGranted, totalUsed, remaining: totalGranted - totalUsed };
});

// ── closeMonthlyAttendance ────────────────────────────────────────────────────

export const closeMonthlyAttendance = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const { yearMonth } = request.data as { yearMonth: string };

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('monthly_closings').doc(yearMonth).set({
    yearMonth,
    closed: true,
    closedAt: now,
    closedBy: auth.uid,
  });

  return { success: true };
});

// ── reopenMonthlyAttendance ───────────────────────────────────────────────────

export const reopenMonthlyAttendance = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const { yearMonth } = request.data as { yearMonth: string };

  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('monthly_closings').doc(yearMonth).update({
    closed: false,
    updatedAt: now,
    updatedBy: auth.uid,
  });

  return { success: true };
});

// ── updateUser ────────────────────────────────────────────────────────────────

export const updateUser = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);

  const { uid, name, employeeId } = request.data as {
    uid: string;
    name: string;
    employeeId?: string;
  };

  if (!name?.trim()) throw new HttpsError('invalid-argument', '名前は必須です');

  await db.collection('users').doc(uid).update({
    name: name.trim(),
    employeeId: employeeId?.trim() || null,
  });

  return { success: true };
});

// ── exportAttendanceCsv ───────────────────────────────────────────────────────

export const exportAttendanceCsv = onCall(async (request) => {
  const auth = assertAuth(request.auth);
  await assertAdmin(auth);
  const { yearMonth } = request.data as { yearMonth: string };

  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

  const [attendanceSnap, usersSnap] = await Promise.all([
    db
      .collection('attendance')
      .where('workDate', '>=', startDate)
      .where('workDate', '<=', endDate)
      .get(),
    db.collection('users').get(),
  ]);

  const userMap = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));

  const JST = 'Asia/Tokyo';
  const tsToJST = (ts: admin.firestore.Timestamp | null): string => {
    if (!ts) return '';
    return format(toZonedTime(ts.toDate(), JST), 'HH:mm');
  };

  const rows = attendanceSnap.docs.map((d) => {
    const a = d.data();
    const user = userMap.get(a.uid) ?? {};
    return [
      a.uid,
      user['name'] ?? '',
      a.workDate,
      a.workType,
      tsToJST(a.clockIn),
      tsToJST(a.clockOut),
      a.comment ?? '',
    ].join(',');
  });

  const header = '社員ID,氏名,日付,区分,出勤時刻,退勤時刻,コメント';
  const csv = [header, ...rows].join('\r\n');

  // BOM付きUTF-8（Excelで開いた際の文字化け防止）
  const bom = '﻿';
  const base64 = Buffer.from(bom + csv, 'utf8').toString('base64');

  return { csv: base64, encoding: 'UTF-8-BOM' };
});
