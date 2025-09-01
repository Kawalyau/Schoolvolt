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