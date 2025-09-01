import { Student, FinanceItem, Exam, Module } from '../types';


export const sampleFinance: FinanceItem[] = [
  { id: '1', title: 'Tuition Fees', amount: '$12,500', due: '15 Aug 2023' },
  { id: '2', title: 'Library Fees', amount: '$150', due: '20 Aug 2023' },
  { id: '3', title: 'Activity Fees', amount: '$200', due: '25 Aug 2023' },
];

export const sampleExams: Exam[] = [
  { id: '1', subject: 'Mathematics', date: '25 Aug 2023', time: '9:00 AM' },
  { id: '2', subject: 'Science', date: '27 Aug 2023', time: '9:00 AM' },
  { id: '3', subject: 'English', date: '29 Aug 2023', time: '9:00 AM' },
];

export const modules: Module[] = [
  { id: '1', title: 'Dashboard', icon: 'home', color: '#4e54c8' },
  { id: '2', title: 'Students', icon: 'school', color: '#ff7c51' },
  { id: '3', title: 'Finance', icon: 'attach-money', color: '#2ecc71' },
  { id: '4', title: 'Exams', icon: 'edit-document', color: '#e74c3c' },
  { id: '5', title: 'Attendance', icon: 'check-circle', color: '#9b59b6' },
  { id: '6', title: 'HR', icon: 'people', color: '#f1c40f' },
  { id: '7', title: 'Timetable', icon: 'calendar', color: '#1abc9c' },
  { id: '8', title: 'Library', icon: 'book', color: '#d35400' },
  { id: '9', title: 'Settings', icon: 'settings', color: '#7f8c8d' },
];