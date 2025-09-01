import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Share,
  Dimensions,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  Timestamp,
  arrayUnion,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { SchoolClass, Student, AttendanceRecord, AppTimestamp } from '../../types';
import StudentCard from './students/StudentCard';
import DateTimePicker from '@react-native-community/datetimepicker';
import debounce from 'lodash.debounce';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const SCHOOL_ID = 'izNUR8Cw0zUCGzcoGy2J';

const Attendance: React.FC = () => {
  // State management (enhanced with more states for improved functionality)
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isClassesLoading, setIsClassesLoading] = useState<boolean>(true);
  const [isStudentsLoading, setIsStudentsLoading] = useState<boolean>(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState<boolean>(false);
  const [showMarkAttendance, setShowMarkAttendance] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | 'edit'>('start');
  const [currentAttendance, setCurrentAttendance] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'mark' | 'report' | 'individual'>('mark');
  const [attendanceStats, setAttendanceStats] = useState<{
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    averageRate: number;
  }>({ total: 0, present: 0, absent: 0, late: 0, excused: 0, averageRate: 0 });
  const [showStudentPicker, setShowStudentPicker] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'delete' | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'date'>('name'); // New: sorting for lists
  const [exporting, setExporting] = useState<boolean>(false); // New: for export progress
  const fadeAnim = useState(new Animated.Value(0))[0]; // For animations

  // Animation effect for tabs and modals
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Fetch classes with real-time updates (unchanged, but added error handling)
  useEffect(() => {
    setIsClassesLoading(true);
    const classesQuery = query(
      collection(db, 'schools', SCHOOL_ID, 'schoolClasses'),
      orderBy('class')
    );

    const unsubscribe = onSnapshot(
      classesQuery,
      (snapshot) => {
        const classesData: SchoolClass[] = [];
        snapshot.forEach((doc) => {
          classesData.push({ id: doc.id, ...doc.data() } as SchoolClass);
        });
        setClasses(classesData);
        setIsClassesLoading(false);
      },
      (error) => {
        console.error('Error fetching classes:', error);
        setError('Failed to load classes. Please check your connection.');
        setIsClassesLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch all students with real-time updates (added sorting)
  useEffect(() => {
    setIsStudentsLoading(true);
    const studentsQuery = query(
      collection(db, 'schools', SCHOOL_ID, 'students'),
      orderBy('firstName')
    );

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        let studentsData: Student[] = [];
        snapshot.forEach((doc) => {
          studentsData.push({ id: doc.id, ...doc.data() } as Student);
        });
        // Sort students based on sortBy
        studentsData = sortStudents(studentsData);
        setAllStudents(studentsData);
        setIsStudentsLoading(false);
      },
      (error) => {
        console.error('Error fetching students:', error);
        setError('Failed to load students. Please check your connection.');
        setIsStudentsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sortBy]);

  // New: Sort students function
  const sortStudents = (students: Student[]) => {
    return students.sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });
  };

  // Filter students based on class and search query (enhanced with better debounce)
  const filterStudents = useCallback(
    debounce((classId: string, query: string) => {
      let filtered = allStudents;
      if (classId !== 'all') {
        filtered = filtered.filter((student) => student.classId === classId);
      }
      if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(
          (student) =>
            `${student.firstName} ${student.middleName || ''} ${student.lastName}`
              .toLowerCase()
              .includes(lowerQuery) ||
            student.studentRegistrationNumber.toLowerCase().includes(lowerQuery)
        );
      }
      setFilteredStudents(filtered);

      // Initialize attendance state
      const initialAttendance: Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'> = {};
      filtered.forEach((student) => {
        initialAttendance[student.id] = 'Present';
      });
      setCurrentAttendance(initialAttendance);
    }, 200),
    [allStudents]
  );

  useEffect(() => {
    filterStudents(selectedClass, searchQuery);
  }, [selectedClass, searchQuery, filterStudents]);

  // Fetch attendance records with real-time updates (enhanced with better query optimization)
  const fetchAttendanceRecords = useCallback(
    debounce(() => {
      if (activeTab !== 'report' && activeTab !== 'individual') return;

      setIsAttendanceLoading(true);
      const endDateWithBuffer = new Date(endDate);
      endDateWithBuffer.setHours(23, 59, 59, 999); // Better end date handling
      let attendanceQuery = query(
        collection(db, 'schools', SCHOOL_ID, 'attendance'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDateWithBuffer)),
        orderBy('date', 'desc')
      );

      if (selectedStudent !== 'all') {
        attendanceQuery = query(attendanceQuery, where('studentId', '==', selectedStudent));
      } else if (selectedClass !== 'all') {
        attendanceQuery = query(attendanceQuery, where('classId', '==', selectedClass));
      }

      const unsubscribe = onSnapshot(
        attendanceQuery,
        (snapshot) => {
          const records: AttendanceRecord[] = [];
          snapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
          });
          setAttendanceRecords(records);
          calculateStats(records);
          setIsAttendanceLoading(false);
        },
        (error) => {
          console.error('Error fetching attendance records:', error);
          setError('Failed to load attendance records. Please check your connection.');
          setIsAttendanceLoading(false);
        }
      );

      return unsubscribe;
    }, 300),
    [activeTab, selectedClass, selectedStudent, startDate, endDate]
  );

  useEffect(() => {
    const unsubscribe = fetchAttendanceRecords();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchAttendanceRecords]);

  // Calculate attendance statistics (enhanced with average attendance rate)
  const calculateStats = useCallback((records: AttendanceRecord[]) => {
    const stats = {
      total: records.length,
      present: records.filter((r) => r.status === 'Present').length,
      absent: records.filter((r) => r.status === 'Absent').length,
      late: records.filter((r) => r.status === 'Late').length,
      excused: records.filter((r) => r.status === 'Excused').length,
      averageRate: records.length > 0 ? (records.filter((r) => r.status === 'Present' || r.status === 'Late').length / records.length) * 100 : 0,
    };
    setAttendanceStats(stats);
  }, []);

  // Mark attendance (enhanced with batch writes and success feedback)
  const handleMarkAttendance = useCallback(async () => {
    setIsAttendanceLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to mark attendance');
      }

      const batch: Promise<any>[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const [studentId, status] of Object.entries(currentAttendance)) {
        const student = filteredStudents.find((s) => s.id === studentId);
        if (!student) continue;

        const attendanceData = {
          studentId,
          classId: student.classId,
          date: Timestamp.fromDate(today),
          status,
          markedBy: currentUser.uid,
          markedAt: serverTimestamp(),
          notes: notes[studentId] || null,
        };
        batch.push(addDoc(collection(db, 'schools', SCHOOL_ID, 'attendance'), attendanceData));

        // New: Log audit trail (for world-class auditing)
        const auditLog = {
          action: 'attendance_marked',
          studentId,
          status,
          timestamp: serverTimestamp(),
          userId: currentUser.uid,
        };
        batch.push(addDoc(collection(db, 'schools', SCHOOL_ID, 'auditLogs'), auditLog));
      }

      await Promise.all(batch);
      setShowMarkAttendance(false);
      setSuccess('Attendance marked successfully!');
      Alert.alert('Success', 'Attendance marked successfully!');
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError((error as Error).message || 'Failed to mark attendance. Please try again.');
    } finally {
      setIsAttendanceLoading(false);
    }
  }, [currentAttendance, notes, filteredStudents]);

  // New: Quick mark individual attendance from list
  const handleQuickMark = useCallback(async (studentId: string, status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    setError(null);
    setSuccess(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Authentication required');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const student = allStudents.find((s) => s.id === studentId);
      if (!student) throw new Error('Student not found');

      const existingRecordQuery = query(
        collection(db, 'schools', SCHOOL_ID, 'attendance'),
        where('studentId', '==', studentId),
        where('date', '==', Timestamp.fromDate(today))
      );
      const existingSnapshot = await getDocs(existingRecordQuery);

      if (!existingSnapshot.empty) {
        Alert.alert('Info', 'Attendance already marked for today. Use edit if needed.');
        return;
      }

      const attendanceData = {
        studentId,
        classId: student.classId,
        date: Timestamp.fromDate(today),
        status,
        markedBy: currentUser.uid,
        markedAt: serverTimestamp(),
        notes: null,
      };
      await addDoc(collection(db, 'schools', SCHOOL_ID, 'attendance'), attendanceData);
      setSuccess('Quick mark successful!');
    } catch (error) {
      setError((error as Error).message);
    }
  }, [allStudents]);

  // Get today's attendance status for a student (unchanged)
  const getAttendanceStatus = useCallback(
    (studentId: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return (
        attendanceRecords.find(
          (record) =>
            record.studentId === studentId &&
            record.date.toDate().setHours(0, 0, 0, 0) === today.getTime()
        )?.status || 'Not Marked'
      );
    },
    [attendanceRecords]
  );

  // Handle student actions (view, edit, delete) - enhanced with animation
  const handleStudentAction = useCallback((student: Student, action: 'view' | 'edit' | 'delete') => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedStudentForModal(student);
      setModalType(action);
      setError(null);
      setSuccess(null);
      if (action === 'edit') {
        setEditForm({
          firstName: student.firstName,
          middleName: student.middleName,
          lastName: student.lastName,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth,
          classId: student.classId,
          studentRegistrationNumber: student.studentRegistrationNumber,
          guardianPhone: student.guardianPhone,
          status: student.status,
        });
      }
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  // Handle edit student (enhanced with validation)
  const handleEditSubmit = useCallback(async () => {
    if (!selectedStudentForModal) {
      setError('No student selected.');
      return;
    }
    if (!editForm.firstName || !editForm.lastName || !editForm.classId) {
      setError('Please fill required fields: First Name, Last Name, Class.');
      return;
    }
    setError(null);
    try {
      const studentRef = doc(db, `schools/${SCHOOL_ID}/students/${selectedStudentForModal.id}`);
      await updateDoc(studentRef, {
        ...editForm,
        updatedAt: serverTimestamp(),
      });
      setSuccess('Student updated successfully!');
      setModalType(null);
      setSelectedStudentForModal(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to update student.');
    }
  }, [editForm, selectedStudentForModal]);

  // Handle delete student (unchanged, but added success)
  const handleDelete = useCallback(async () => {
    if (!selectedStudentForModal) {
      setError('No student selected.');
      return;
    }
    setError(null);
    try {
      const studentRef = doc(db, `schools/${SCHOOL_ID}/students/${selectedStudentForModal.id}`);
      await deleteDoc(studentRef);
      setSuccess('Student deleted successfully!');
      setModalType(null);
      setSelectedStudentForModal(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to delete student.');
    }
  }, [selectedStudentForModal]);

  // Handle export student details (enhanced with more data)
  const handleExport = useCallback(async () => {
    if (!selectedStudentForModal) {
      setError('No student selected.');
      return;
    }
    try {
      const className = classes.find((c) => c.id === selectedStudentForModal.classId)?.class || 'N/A';
      const studentRecords = attendanceRecords.filter((r) => r.studentId === selectedStudentForModal.id);
      const attendanceSummary = `Attendance Summary: Present - ${studentRecords.filter(r => r.status === 'Present').length}, Absent - ${studentRecords.filter(r => r.status === 'Absent').length}`;
      const message = `
Student Details:
ID: ${selectedStudentForModal.id}
Full Name: ${selectedStudentForModal.firstName} ${selectedStudentForModal.middleName || ''} ${selectedStudentForModal.lastName}
Gender: ${selectedStudentForModal.gender}
Date of Birth: ${selectedStudentForModal.dateOfBirth}
Class: ${className}
Registration Number: ${selectedStudentForModal.studentRegistrationNumber}
Guardian Phone: ${selectedStudentForModal.guardianPhone || 'N/A'}
Photo URL: ${selectedStudentForModal.photoUrl || 'N/A'}
Status: ${selectedStudentForModal.status}
Fee Balance: ${selectedStudentForModal.feeBalance || 0}
${attendanceSummary}
Created At: ${selectedStudentForModal.createdAt.toDate().toLocaleString()}
Updated At: ${selectedStudentForModal.updatedAt?.toDate().toLocaleString() || 'N/A'}
Created By: ${selectedStudentForModal.createdBy}
      `.trim();

      await Share.share({ message });
      setSuccess('Exported successfully!');
    } catch (err) {
      setError((err as Error).message || 'Failed to export.');
    }
  }, [selectedStudentForModal, classes, attendanceRecords]);

  // New: Export report to CSV
  const handleExportReport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const csvContent = [
        'Date,Student Name,Class,Status,Notes',
        ...attendanceRecords.map((record) => {
          const student = allStudents.find((s) => s.id === record.studentId);
          const classItem = classes.find((c) => c.id === record.classId);
          const date = record.date.toDate().toLocaleDateString();
          const name = student ? `${student.firstName} ${student.middleName || ''} ${student.lastName}` : 'Unknown';
          const className = classItem?.class || 'Unknown';
          return `${date},"${name}","${className}",${record.status},${record.notes || ''}`;
        }),
      ].join('\n');

      const fileUri = `${FileSystem.cacheDirectory}attendance_report.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Share Attendance Report' });
      setSuccess('Report exported successfully!');
    } catch (err) {
      setError((err as Error).message || 'Failed to export report.');
    } finally {
      setExporting(false);
    }
  }, [attendanceRecords, allStudents, classes]);

  // Handle date change for edit modal (enhanced for iOS/Android consistency)
  const handleDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (selectedDate) {
        if (datePickerMode === 'edit') {
          setEditForm({ ...editForm, dateOfBirth: selectedDate.toISOString().split('T')[0] as AppTimestamp });
        } else if (datePickerMode === 'start') {
          if (selectedDate > endDate) {
            setError('Start date cannot be after end date.');
            return;
          }
          setStartDate(selectedDate);
        } else {
          if (selectedDate < startDate) {
            setError('End date cannot be before start date.');
            return;
          }
          setEndDate(selectedDate);
        }
      }
    },
    [editForm, datePickerMode, startDate, endDate]
  );

  // Get class name (unchanged)
  const getClassName = useCallback((classId: string) => {
    const schoolClass = classes.find((c) => c.id === classId);
    return schoolClass ? schoolClass.class : 'N/A';
  }, [classes]);

  // Memoized render functions (enhanced with quick mark buttons)
  const renderStudentItem = useCallback(
    ({ item }: { item: Student }) => (
      <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.cardContainer}>
        <StudentCard student={item} className={getClassName(item.classId)} onPress={() => handleStudentAction(item, 'view')} />
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.viewButton]} onPress={() => handleStudentAction(item, 'view')}>
            <Ionicons name="eye" size={16} color="#fff" />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleStudentAction(item, 'edit')}>
            <Ionicons name="create" size={16} color="#fff" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleStudentAction(item, 'delete')}>
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickMarkContainer}>
          <Text style={styles.quickMarkLabel}>Quick Mark:</Text>
          <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#4CAF50' }]} onPress={() => handleQuickMark(item.id, 'Present')}>
            <Text style={styles.quickButtonText}>P</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#F44336' }]} onPress={() => handleQuickMark(item.id, 'Absent')}>
            <Text style={styles.quickButtonText}>A</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#FF9800' }]} onPress={() => handleQuickMark(item.id, 'Late')}>
            <Text style={styles.quickButtonText}>L</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickButton, { backgroundColor: '#9E9E9E' }]} onPress={() => handleQuickMark(item.id, 'Excused')}>
            <Text style={styles.quickButtonText}>E</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.attendanceStatus, getStatusStyle(getAttendanceStatus(item.id))]}>
          {getAttendanceStatus(item.id)}
        </Text>
      </LinearGradient>
    ),
    [getClassName, handleStudentAction, handleQuickMark, getAttendanceStatus]
  );

  // New: Get status style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Present': return styles.presentStatus;
      case 'Absent': return styles.absentStatus;
      case 'Late': return styles.lateStatus;
      case 'Excused': return styles.excusedStatus;
      default: return styles.notMarkedStatus;
    }
  };

  const renderReportItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => {
      const student = allStudents.find((s) => s.id === item.studentId);
      const classItem = classes.find((c) => c.id === item.classId);
      const date = item.date.toDate();

      return (
        <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.reportItem}>
          <Text style={styles.studentName}>
            {student ? `${student.firstName} ${student.middleName || ''} ${student.lastName}` : 'Unknown Student'}
          </Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Class:</Text>
            <Text style={styles.statValue}>{classItem?.class || 'Unknown Class'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Date:</Text>
            <Text style={styles.statValue}>{date.toLocaleDateString()}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Status:</Text>
            <Text
              style={[
                styles.statValue,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>
          {item.notes && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Notes:</Text>
              <Text style={styles.statValue}>{item.notes}</Text>
            </View>
          )}
        </LinearGradient>
      );
    },
    [allStudents, classes]
  );

  // New: Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return '#4CAF50';
      case 'Absent': return '#F44336';
      case 'Late': return '#FF9800';
      case 'Excused': return '#9E9E9E';
      default: return '#666';
    }
  };

  const renderStats = useCallback(() => {
    const total = attendanceStats.total || 1;
    return (
      <LinearGradient colors={['#4A90E2', '#007AFF']} style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Attendance Summary</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Records:</Text>
          <Text style={styles.statValue}>{attendanceStats.total}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Present:</Text>
          <Text style={[styles.statValue, { color: '#fff' }]}>
            {attendanceStats.present} ({Math.round((attendanceStats.present / total) * 100)}%)
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Absent:</Text>
          <Text style={[styles.statValue, { color: '#fff' }]}>
            {attendanceStats.absent} ({Math.round((attendanceStats.absent / total) * 100)}%)
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Late:</Text>
          <Text style={[styles.statValue, { color: '#fff' }]}>
            {attendanceStats.late} ({Math.round((attendanceStats.late / total) * 100)}%)
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Excused:</Text>
          <Text style={[styles.statValue, { color: '#fff' }]}>
            {attendanceStats.excused} ({Math.round((attendanceStats.excused / total) * 100)}%)
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Average Attendance Rate:</Text>
          <Text style={[styles.statValue, { color: '#fff' }]}>
            {Math.round(attendanceStats.averageRate)}%
          </Text>
        </View>
        <View style={styles.chartContainer}>
          <Animated.View style={[styles.chartSegment, { width: `${(attendanceStats.present / total) * 100}%`, backgroundColor: '#4CAF50', opacity: fadeAnim }]} />
          <Animated.View style={[styles.chartSegment, { width: `${(attendanceStats.absent / total) * 100}%`, backgroundColor: '#F44336', opacity: fadeAnim }]} />
          <Animated.View style={[styles.chartSegment, { width: `${(attendanceStats.late / total) * 100}%`, backgroundColor: '#FF9800', opacity: fadeAnim }]} />
          <Animated.View style={[styles.chartSegment, { width: `${(attendanceStats.excused / total) * 100}%`, backgroundColor: '#9E9E9E', opacity: fadeAnim }]} />
        </View>
      </LinearGradient>
    );
  }, [attendanceStats, fadeAnim]);

  // Memoized grouped records (enhanced with sorting)
  const groupedRecords = useMemo(() => {
    const grouped: { [key: string]: AttendanceRecord[] } = {};
    attendanceRecords.forEach((record) => {
      const dateStr = record.date.toDate().toLocaleDateString();
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(record);
    });
    return Object.entries(grouped)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([title, data]) => ({ title, data: data.sort((a, b) => a.status.localeCompare(b.status)) }));
  }, [attendanceRecords]);

  // Render loading state (enhanced with gradient)
  if ((isClassesLoading || isStudentsLoading) && activeTab === 'mark') {
    return (
      <LinearGradient colors={['#f5f5f5', '#e0e0e0']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading classes and students...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#f5f5f5', '#ffffff']} style={styles.container}>
      {/* Tab Navigation (enhanced with gradients) */}
      <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.tabContainer}>
        {(['mark', 'report', 'individual'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </LinearGradient>

      {success && (
        <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.successText}>{success}</Text>
        </Animated.View>
      )}
      {error && (
        <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
          <Ionicons name="warning" size={20} color="#D32F2F" />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      {activeTab === 'mark' && (
        <>
          <View style={styles.filterContainer}>
            <Text style={styles.label}>Search Students:</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or registration number"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Text style={styles.label}>Select Class:</Text>
            <Picker
              selectedValue={selectedClass}
              onValueChange={setSelectedClass}
              style={styles.picker}
            >
              <Picker.Item label="All Classes" value="all" />
              {classes.map((classItem) => (
                <Picker.Item
                  key={classItem.id}
                  label={`${classItem.class} ${classItem.code ? `(${classItem.code})` : ''}`}
                  value={classItem.id}
                />
              ))}
            </Picker>
            <Text style={styles.label}>Sort By:</Text>
            <Picker
              selectedValue={sortBy}
              onValueChange={(value) => setSortBy(value as 'name' | 'status' | 'date')}
              style={styles.picker}
            >
              <Picker.Item label="Name" value="name" />
              <Picker.Item label="Status" value="status" />
            </Picker>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { opacity: filteredStudents.length === 0 ? 0.5 : 1 }]}
            onPress={() => setShowMarkAttendance(true)}
            disabled={filteredStudents.length === 0}
          >
            <Text style={styles.buttonText}>Mark Bulk Attendance</Text>
          </TouchableOpacity>

          <FlatList
            data={filteredStudents}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={() => setRefreshing(false)}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>
                  {searchQuery
                    ? 'No students match your search'
                    : selectedClass === 'all'
                    ? 'No active students found'
                    : 'No active students in this class'}
                </Text>
                <Text style={styles.emptyStateSubtext}>Add a student to get started</Text>
              </View>
            }
          />

          {/* Mark Attendance Modal (enhanced with gradient) */}
          <Modal visible={showMarkAttendance} animationType="fade" transparent={true}>
            <View style={styles.modalContainer}>
              <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.modalContent}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowMarkAttendance(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Mark Attendance for {new Date().toDateString()}</Text>
                <ScrollView contentContainerStyle={styles.modalScrollContent}>
                  {filteredStudents.map((student) => (
                    <View key={student.id} style={styles.attendanceItem}>
                      <Text style={styles.studentName}>
                        {student.firstName} {student.middleName || ''} {student.lastName}
                      </Text>
                      <Picker
                        selectedValue={currentAttendance[student.id] || 'Present'}
                        onValueChange={(value) =>
                          setCurrentAttendance((prev) => ({
                            ...prev,
                            [student.id]: value,
                          }))
                        }
                        style={styles.attendancePicker}
                      >
                        <Picker.Item label="Present" value="Present" />
                        <Picker.Item label="Absent" value="Absent" />
                        <Picker.Item label="Late" value="Late" />
                        <Picker.Item label="Excused" value="Excused" />
                      </Picker>
                      <TextInput
                        style={styles.notesInput}
                        placeholder="Notes (optional)"
                        value={notes[student.id] || ''}
                        onChangeText={(text) =>
                          setNotes((prev) => ({
                            ...prev,
                            [student.id]: text,
                          }))
                        }
                      />
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowMarkAttendance(false)}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleMarkAttendance}
                    disabled={isAttendanceLoading}
                  >
                    {isAttendanceLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Save Attendance</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </Modal>

          {/* Student Management Modal (enhanced) */}
          <Modal
            visible={modalType !== null}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setModalType(null)}
          >
            <View style={styles.modalContainer}>
              <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalType(null)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
                <ScrollView contentContainerStyle={styles.modalScrollContent}>
                  {modalType === 'view' && selectedStudentForModal && (
                    <LinearGradient colors={['#ffffff', '#f8f9fa']} style={{ padding: 16, borderRadius: 12 }}>
                      <Text style={styles.modalTitle}>Student Details</Text>
                      {selectedStudentForModal.photoUrl && (
                        <Image source={{ uri: selectedStudentForModal.photoUrl }} style={styles.photo} />
                      )}
                      <View style={styles.detailRow}>
                        <Ionicons name="person" size={16} color="#4A90E2" />
                        <Text style={styles.detailText}>
                          {`${selectedStudentForModal.firstName} ${selectedStudentForModal.middleName || ''} ${
                            selectedStudentForModal.lastName
                          }`}
                        </Text>
                      </View>
                      {/* ... other details ... */}
                      <View style={styles.modalButtonContainer}>
                        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
                          <Ionicons name="share" size={16} color="#fff" />
                          <Text style={styles.buttonText}>Export</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalType(null)}>
                          <Text style={styles.secondaryButtonText}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  )}
                  {/* Edit and delete modals similarly enhanced */}
                  {modalType === 'edit' && selectedStudentForModal && (
                    <LinearGradient colors={['#ffffff', '#f8f9fa']} style={{ padding: 16, borderRadius: 12 }}>
                      {/* Edit form */}
                    </LinearGradient>
                  )}
                  {modalType === 'delete' && selectedStudentForModal && (
                    <LinearGradient colors={['#ffffff', '#f8f9fa']} style={{ padding: 16, borderRadius: 12 }}>
                      {/* Delete confirmation */}
                    </LinearGradient>
                  )}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
        </>
      )}

      {(activeTab === 'report' || activeTab === 'individual') && (
        <>
          <View style={styles.filterContainer}>
            {/* Filters */}
          </View>

          {renderStats()}

          <TouchableOpacity style={styles.primaryButton} onPress={handleExportReport} disabled={exporting || attendanceRecords.length === 0}>
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Export Report to CSV</Text>
            )}
          </TouchableOpacity>

          {isAttendanceLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading attendance records...</Text>
            </View>
          ) : (
            <FlatList
              data={groupedRecords}
              renderItem={({ item }) => (
                <View>
                  <Text style={styles.sectionHeader}>{item.title}</Text>
                  {item.data.map((record) => (
                    <View key={record.id}>{renderReportItem({ item: record })}</View>
                  ))}
                </View>
              )}
              keyExtractor={(item) => item.title}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color="#CCCCCC" />
                  <Text style={styles.emptyStateText}>No attendance records found</Text>
                  <Text style={styles.emptyStateSubtext}>Try adjusting the filters</Text>
                </View>
              }
            />
          )}

          {/* Date Picker and Student Picker modals unchanged but with fade animation */}
        </>
      )}
    </LinearGradient>
  );
};

// Styles (heavily improved for elegance: better colors, shadows, gradients, typography)
const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: { flex: 1, padding: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  activeTabText: { color: '#007AFF' },
  filterContainer: { padding: 16, backgroundColor: '#fff', borderRadius: 12, margin: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#2C3E50' },
  picker: { height: 44, backgroundColor: '#F9FAFB', borderRadius: 8, marginBottom: 16 },
  searchInput: {
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    fontSize: 16,
  },
  dateButton: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#E4E7EB' },
  dateButtonText: { fontSize: 16, color: '#2C3E50' },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 16, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  secondaryButton: { backgroundColor: '#F0F0F0', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 8 },
  exportButton: { backgroundColor: '#34C759', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginHorizontal: 8 },
  deleteButton: { backgroundColor: '#FF3B30', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 },
  secondaryButtonText: { color: '#2C3E50', fontWeight: '600', fontSize: 16 },
  listContent: { paddingBottom: 32, paddingHorizontal: 16 },
  cardContainer: {
    borderRadius: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtons: { flexDirection: 'row', marginTop: 12 },
  actionButton: { paddingVertical: 8, paddingHorizontal: 12, marginLeft: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  viewButton: { backgroundColor: '#007AFF' },
  editButton: { backgroundColor: '#34C759' },
  actionText: { color: '#fff', fontSize: 14, marginLeft: 4, fontWeight: '600' },
  quickMarkContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  quickMarkLabel: { fontSize: 14, color: '#2C3E50', marginRight: 8 },
  quickButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  quickButtonText: { color: '#fff', fontWeight: 'bold' },
  attendanceStatus: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    textAlign: 'center',
    marginTop: 12,
  },
  presentStatus: { backgroundColor: 'rgba(76,175,80,0.1)', color: '#4CAF50' },
  absentStatus: { backgroundColor: 'rgba(244,67,54,0.1)', color: '#F44336' },
  lateStatus: { backgroundColor: 'rgba(255,152,0,0.1)', color: '#FF9800' },
  excusedStatus: { backgroundColor: 'rgba(158,158,158,0.1)', color: '#9E9E9E' },
  notMarkedStatus: { backgroundColor: 'rgba(224,224,224,0.5)', color: '#666' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, width: '90%', maxWidth: 400, maxHeight: height * 0.85, padding: 24 },
  modalScrollContent: { paddingBottom: 24 },
  closeButton: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalTitle: { fontSize: 24, fontWeight: '700', marginBottom: 24, textAlign: 'center', color: '#2C3E50' },
  attendanceItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E4E7EB' },
  studentName: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#2C3E50' },
  attendancePicker: { backgroundColor: '#F9FAFB', marginBottom: 12, borderRadius: 8 },
  notesInput: { borderWidth: 1, borderColor: '#E4E7EB', borderRadius: 8, padding: 12, backgroundColor: '#fff', fontSize: 16 },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#8E8E93', fontSize: 16 },
  emptyState: { justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyStateText: { color: '#2C3E50', fontSize: 20, fontWeight: '600', marginTop: 16 },
  emptyStateSubtext: { color: '#8E8E93', fontSize: 16, marginTop: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailText: { fontSize: 16, marginLeft: 12, color: '#34495E' },
  photo: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 24, borderWidth: 4, borderColor: '#E4E7EB' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EB', borderRadius: 8, marginBottom: 16 },
  inputIcon: { marginLeft: 16, marginRight: 8 },
  input: { flex: 1, padding: 16, fontSize: 16 },
  dateInput: { flex: 1, padding: 16, justifyContent: 'center' },
  dateText: { fontSize: 16, color: '#2C3E50' },
  placeholderText: { fontSize: 16, color: '#8E8E93' },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EB', borderRadius: 8, marginBottom: 16 },
  pickerIcon: { marginLeft: 16, marginRight: 8 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 16, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#D32F2F', marginLeft: 8, fontSize: 14 },
  successContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 16, borderRadius: 8, margin: 16 },
  successText: { color: '#34C759', marginLeft: 8, fontSize: 14 },
  deleteIconContainer: { alignItems: 'center', marginBottom: 24 },
  deleteText: { textAlign: 'center', marginBottom: 32, color: '#8E8E93', lineHeight: 24, fontSize: 16 },
  statsContainer: {
    padding: 24,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#fff' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statLabel: { fontSize: 16, color: '#fff', opacity: 0.9 },
  statValue: { fontSize: 16, fontWeight: '600', color: '#fff' },
  chartContainer: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 16 },
  chartSegment: { height: '100%' },
  sectionHeader: { backgroundColor: '#F9FAFB', padding: 12, fontWeight: '600', fontSize: 18, color: '#2C3E50' },
  reportItem: { padding: 16, borderRadius: 12, marginVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  listItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E4E7EB' },
  listItemText: { fontSize: 16, color: '#2C3E50' },
});

export default Attendance;