import { callFunction } from './firebase';
import type {
  Attendance,
  LeaveGrant,
  LeaveBalance,
} from '../types';

export const clockIn = callFunction<void, { attendance: Attendance }>('clockIn');

export const clockOut = callFunction<void, { attendance: Attendance }>('clockOut');

export const approveAttendanceRequest = callFunction<
  { requestId: string },
  { success: boolean }
>('approveCorrection');

export const rejectAttendanceRequest = callFunction<
  { requestId: string },
  { success: boolean }
>('rejectAttendanceRequest');

export const approveLeaveRequest = callFunction<
  { requestId: string },
  { success: boolean }
>('approveLeaveRequest');

export const rejectLeaveRequest = callFunction<
  { requestId: string },
  { success: boolean }
>('rejectLeaveRequest');

export const grantLeave = callFunction<
  Omit<LeaveGrant, 'id' | 'createdAt' | 'createdBy'>,
  { id: string }
>('grantLeave');

export const getLeaveBalance = callFunction<
  { uid: string },
  LeaveBalance
>('getLeaveBalance');

export const closeMonthlyAttendance = callFunction<
  { yearMonth: string },
  { success: boolean }
>('closeMonthlyAttendance');

export const reopenMonthlyAttendance = callFunction<
  { yearMonth: string },
  { success: boolean }
>('reopenMonthlyAttendance');

export const exportAttendanceCsv = callFunction<
  { yearMonth: string },
  { csv: string }
>('exportAttendanceCsv');

export const updateUser = callFunction<
  { uid: string; name: string; employeeId?: string },
  { success: boolean }
>('updateUser');
