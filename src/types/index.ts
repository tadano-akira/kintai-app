import { Timestamp } from 'firebase/firestore';

export type Role = 'staff' | 'admin';

export type WorkType = 'work' | 'paid_leave' | 'absence' | 'holiday';

export type LeaveType =
  | 'paid_leave'
  | 'absence'
  | 'special_leave'
  | 'compensatory_leave'
  | 'substitute_holiday';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type GrantType = 'annual' | 'special' | 'adjustment';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Timestamp;
}

export interface Attendance {
  uid: string;
  workDate: string; // YYYY-MM-DD
  clockIn?: Timestamp;
  clockOut?: Timestamp;
  workType: WorkType;
  comment: string;
  status: RequestStatus | 'none';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AttendanceRequest {
  id?: string;
  uid: string;
  targetDate: string;
  beforeClockIn: string;
  afterClockIn: string;
  beforeClockOut?: string;
  afterClockOut?: string;
  reason: string;
  status: RequestStatus;
  approvedBy: string | null;
  approvedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface LeaveRequest {
  id?: string;
  uid: string;
  type: LeaveType;
  targetDate: string;
  comment: string;
  status: RequestStatus;
  approvedBy: string | null;
  approvedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface LeaveGrant {
  id?: string;
  uid: string;
  grantDate: string;
  days: number;
  expireDate: string;
  grantType: GrantType;
  comment: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface LeaveUsage {
  id?: string;
  uid: string;
  leaveRequestId: string;
  targetDate: string;
  usedDays: number;
  createdAt: Timestamp;
}

export interface MonthlyClosing {
  yearMonth: string; // YYYY-MM
  closed: boolean;
  closedAt: Timestamp | null;
  closedBy: string | null;
}

export interface LeaveBalance {
  totalGranted: number;
  totalUsed: number;
  remaining: number;
}
