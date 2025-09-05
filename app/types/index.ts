// types.ts
import { Timestamp } from 'firebase/firestore';

export type AppTimestamp = Timestamp | Date | string | null;

export interface Student {
  id: string; // The Firestore document ID
  schoolId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: AppTimestamp;
  classId: string; // Reference to a document in /schools/{schoolId}/schoolClasses
  studentRegistrationNumber: string;
  guardianPhone?: string | null;
  photoUrl?: string | null;
  status: 'Active' | 'Inactive' | 'Graduated' | 'Withdrawn';
  feeBalance?: number; // Handled by the fees module
  createdAt: AppTimestamp;
  updatedAt: AppTimestamp;
  createdBy: string; // UID of the admin who created the student
}

// app/types/index.ts
export interface SchoolClass {
  id: string;
  class: string; // Changed from 'name' to 'class'
  code?: string | null; // Added the optional code field
  createdAt?: AppTimestamp;
  updatedAt?: AppTimestamp;
}

export interface AttendanceRecord {
  staffName: any;
  staffId: string;
  photo: any;
  checkInTime(checkInTime: any): import("react").ReactNode;
  checkOutTime(checkOutTime: any): import("react").ReactNode;
  id: string;
  studentId: string;
  classId: string;
  date: AppTimestamp;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  markedBy: string; // UID of the admin who marked attendance
  markedAt: AppTimestamp;
  notes?: string | null;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: AppTimestamp;
  isOpen: boolean; // Whether attendance can still be marked for this session
  createdBy: string;
  createdAt: AppTimestamp;
}
export interface FinanceItem {
  id: string;
  title: string;
  amount: string;
  due: string;
}

export interface Exam {
  id: string;
  subject: string;
  date: string;
  time: string;
}

export interface Module {
  id: string;
  title: string;
  icon: string;
  color: string;
}

export interface SettingsProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

export interface StudentFormData {
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: Date;
  classId: string;
  studentRegistrationNumber: string;
  guardianPhone: string | null;
  status: 'Active' | 'Inactive' | 'Graduated' | 'Withdrawn';
}

export interface StudentFilters {
  searchQuery: string;
  selectedClassFilter: string;
}
export interface StaffMember {
    id: string;
      name: string;
        position: string;
          department: string;
            salary: number;
              joinDate: string;
                contact: string;
                  email: string;
                  }

                  export interface SchoolData {
                    id: string;
                      name: string;
                        level: string;
                          district: string;
                          }

                          export interface HRStats {
                            totalStaff: number;
                              totalSalary: number;
                                pendingLeaves: number;
                                  activeRequests: number;
                                  }
export interface StaffMember {
    id: string;
      name: string;
        position: string;
          department: string;
            salary: number;
              joinDate: string;
                contact: string;
                  email: string;
                    ninNumber?: string;
                      photo?: string;
                        idAttachment?: string;
                          createdAt?: any;
                            updatedAt?: any;
                            }
                            // types/index.ts

// Base types
export interface BaseEntity {
  id: string;
  createdAt?: any; // Firestore timestamp
  updatedAt?: any; // Firestore timestamp
}

// User types
export interface User extends BaseEntity {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  schoolId: string;
  isActive: boolean;
  lastLogin?: any;
}

// Staff types
export interface StaffMember extends BaseEntity {
  name: string;
  position: string;
  department: string;
  salary: number;
  joinDate: string;
  contact: string;
  email: string;
  isActive: boolean;
  schoolId: string;
  userId?: string; // Reference to user account if exists
}

// Attendance types
export interface AttendanceRecord extends BaseEntity {
  staffId: string;
  staffName: string;
  schoolId: string;// Firestore timestamp
  status: 'present' | 'absent' | 'late' | 'early-departure' | 'leave';
  photo?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  notes?: string;
  hoursWorked?: number;
  autoCheckedOut?: boolean; // If system automatically checked out employee
}

// Leave types
export interface LeaveRequest extends BaseEntity {
  staffId: string;
  staffName: string;
  schoolId: string;
  type: 'sick' | 'vacation' | 'personal' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: any;
  notes?: string;
}

// Report types
export interface AttendanceReport extends BaseEntity {
  schoolId: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
  generatedBy: string;
  data: {
    staffId: string;
    staffName: string;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    leaveDays: number;
    totalWorkingDays: number;
    attendancePercentage: number;
  }[];
}

// Settings types
export interface AttendanceSettings extends BaseEntity {
  schoolId: string;
  workStartTime: string; // HH:MM format
  workEndTime: string; // HH:MM format
  lateThreshold: number; // Minutes after start time considered late
  autoCheckout: boolean;
  autoCheckoutTime: string; // HH:MM format
  locationTracking: boolean;
  requiredLocation?: {
    latitude: number;
    longitude: number;
    radius: number; // Meters
  };
  notifyManagers: boolean;
  notificationEmails: string[];
}

// Notification types
export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: 'attendance' | 'leave' | 'report' | 'system';
  read: boolean;
  actionUrl?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface AttendanceFormData {
  staffId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  notes?: string;
}

export interface LeaveRequestFormData {
  staffId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}

// Filter types
export interface AttendanceFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  department?: string;
  status?: string;
  staffId?: string;
}

// Chart data types
export interface AttendanceChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: (opacity: number) => string;
  }[];
}

// Dashboard stats
export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  averageAttendance: number;
}
