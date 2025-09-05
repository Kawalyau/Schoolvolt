import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  FlatList,
  Image
} from 'react-native';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp, 
  getDoc,
  doc
} from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  Printer, 
  Mail,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface TeacherAttendanceReportProps {
  onBack: () => void;
}

interface StaffMember {
  id: string;
  name: string;
  position: string;
  staffNumber?: string;
  photo?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  checkInTime: any;
  checkOutTime: any;
  remarks: string;
}

interface AttendanceSummary {
  totalWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  leavesTaken: number;
}

const TeacherAttendanceReport: React.FC<TeacherAttendanceReportProps> = ({
  onBack
}) => {
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<StaffMember | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalWorkingDays: 0,
    daysPresent: 0,
    daysAbsent: 0,
    daysLate: 0,
    leavesTaken: 0
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [schoolName, setSchoolName] = useState('School Name');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    employeeInfo: true,
    attendanceSummary: true,
    monthlyTotals: true
  });
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [staffLoading, setStaffLoading] = useState(true);

  useEffect(() => {
    fetchSchoolInfo();
    fetchStaffMembers();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      fetchAttendanceData();
    }
  }, [selectedTeacher, selectedMonth]);

  const fetchSchoolInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
  
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const schoolId = userData.schoolId;
        
        if (schoolId) {
          // FIX: Use doc() instead of collection() to get a document reference
          const schoolDocRef = doc(db, 'schools', schoolId);
          const schoolDoc = await getDoc(schoolDocRef);
          
          if (schoolDoc.exists()) {
            const schoolData = schoolDoc.data();
            setSchoolName(schoolData.name || 'School Name');
            setSchoolLogo(schoolData.logo || null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      setStaffLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return;
      
      const userData = querySnapshot.docs[0].data();
      const schoolId = userData.schoolId;
      
      if (!schoolId) return;

      const staffQuery = query(collection(db, 'schools', schoolId, 'staff'));
      const staffSnapshot = await getDocs(staffQuery);
      
      const staffData: StaffMember[] = [];
      staffSnapshot.forEach(doc => {
        const data = doc.data();
        staffData.push({
          id: doc.id,
          name: data.name || 'Unknown Staff',
          position: data.position || 'No Position',
          staffNumber: data.staffNumber || '',
          photo: data.photo || null
        });
      });
      
      // Sort alphabetically by name
      staffData.sort((a, b) => a.name.localeCompare(b.name));
      
      setStaffMembers(staffData);
      
      // Select the first staff member by default
      if (staffData.length > 0 && !selectedTeacher) {
        setSelectedTeacher(staffData[0]);
      }
      
    } catch (error) {
      console.error('Error fetching staff members:', error);
    } finally {
      setStaffLoading(false);
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      if (!selectedTeacher) return;
      
      setLoading(true);
      
      const user = auth.currentUser;
      if (!user) return;

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return;
      
      const userData = querySnapshot.docs[0].data();
      const schoolId = userData.schoolId;
      
      if (!schoolId) return;

      // Calculate date range for the selected month
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Fetch attendance records for the teacher in the selected month
      const attendanceRef = collection(db, 'schools', schoolId, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('staffId', '==', selectedTeacher.id),
        where('date', '>=', startDateStr),
        where('date', '<=', endDateStr),
        orderBy('date', 'desc')
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const records: AttendanceRecord[] = [];
      
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let leaveCount = 0;
      
      attendanceSnapshot.forEach(doc => {
        const data = doc.data();
        const record: AttendanceRecord = {
          id: doc.id,
          date: data.date,
          status: data.status || 'absent',
          checkInTime: data.checkInTime,
          checkOutTime: data.checkOutTime,
          remarks: data.remarks || '-'
        };
        
        records.push(record);
        
        // Update counts
        if (record.status === 'Present') presentCount++;
        if (record.status === 'absent') absentCount++;
        if (record.status === 'Late') lateCount++;
        if (record.remarks.toLowerCase().includes('leave')) leaveCount++;
      });
      
      setAttendanceRecords(records);
      
      // Calculate working days (excluding weekends)
      let workingDays = 0;
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sundays and Saturdays
          workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setSummary({
        totalWorkingDays: workingDays,
        daysPresent: presentCount,
        daysAbsent: absentCount,
        daysLate: lateCount,
        leavesTaken: leaveCount
      });
      
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '-';
    
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        return '-';
      }
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '-';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Present': return <CheckCircle size={16} color="#10b981" />;
      case 'absent': return <XCircle size={16} color="#ef4444" />;
      case 'Late': return <Clock size={16} color="#f59e0b" />;
      default: return <AlertCircle size={16} color="#6b7280" />;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateStr;
    }
  };

  const generatePDF = async () => {
    try {
      if (!selectedTeacher) return;
      
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .logo { max-width: 100px; margin-bottom: 10px; }
              .section { margin-bottom: 20px; }
              .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
              .summary-item { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${schoolName}</h1>
              <h2>Employee Attendance Report</h2>
              <p>Period: ${selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            
            <div class="section">
              <div class="section-title">Employee Information</div>
              <table>
                <tr><td><strong>Employee Name:</strong></td><td>${selectedTeacher.name}</td></tr>
                <tr><td><strong>Staff Number:</strong></td><td>${selectedTeacher.staffNumber || 'N/A'}</td></tr>
                <tr><td><strong>Position:</strong></td><td>${selectedTeacher.position}</td></tr>
              </table>
            </div>
            
            <div class="section">
              <div class="section-title">Attendance Summary</div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check-In Time</th>
                    <th>Check-Out Time</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendanceRecords.map(record => `
                    <tr>
                      <td>${formatDate(record.date)}</td>
                      <td>${record.status}</td>
                      <td>${formatTime(record.checkInTime)}</td>
                      <td>${formatTime(record.checkOutTime)}</td>
                      <td>${record.remarks}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="section">
              <div class="section-title">Monthly Totals</div>
              <div class="summary-grid">
                <div class="summary-item"><strong>Total Working Days:</strong> ${summary.totalWorkingDays}</div>
                <div class="summary-item"><strong>Days Present:</strong> ${summary.daysPresent}</div>
                <div class="summary-item"><strong>Days Absent:</strong> ${summary.daysAbsent}</div>
                <div class="summary-item"><strong>Days Late:</strong> ${summary.daysLate}</div>
                <div class="summary-item"><strong>Leaves Taken:</strong> ${summary.leavesTaken}</div>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Attendance Report',
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderStaffItem = ({ item }: { item: StaffMember }) => (
    <TouchableOpacity
      style={styles.staffItem}
      onPress={() => {
        setSelectedTeacher(item);
        setShowStaffDropdown(false);
      }}
    >
      {item.photo ? (
        <Image source={{ uri: item.photo }} style={styles.staffThumbnail} />
      ) : (
        <View style={[styles.staffThumbnail, styles.placeholderThumbnail]}>
          <User size={20} color="#6b7280" />
        </View>
      )}
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{item.name}</Text>
        <Text style={styles.staffPosition}>{item.position}</Text>
      </View>
      {selectedTeacher?.id === item.id && (
        <CheckCircle size={20} color="#4f46e5" />
      )}
    </TouchableOpacity>
  );

  if (staffLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#4f46e5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance Report</Text>
          <View style={styles.placeholderHeaderButton} />
        </View>
        <View style={styles.centeredMessage}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.messageText}>Loading staff members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Report</Text>
        <TouchableOpacity style={styles.headerButton} onPress={generatePDF}>
          <Download size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Staff Selector */}
        <View style={styles.staffSelectorContainer}>
          <Text style={styles.selectorLabel}>Select Staff Member</Text>
          <TouchableOpacity 
            style={styles.staffSelector}
            onPress={() => setShowStaffDropdown(true)}
          >
            <View style={styles.selectedStaffInfo}>
              {selectedTeacher?.photo ? (
                <Image source={{ uri: selectedTeacher.photo }} style={styles.selectedStaffThumbnail} />
              ) : (
                <View style={[styles.selectedStaffThumbnail, styles.placeholderThumbnail]}>
                  <User size={24} color="#6b7280" />
                </View>
              )}
              <View style={styles.selectedStaffDetails}>
                <Text style={styles.selectedStaffName}>{selectedTeacher?.name || 'Select a staff member'}</Text>
                <Text style={styles.selectedStaffPosition}>{selectedTeacher?.position || ''}</Text>
              </View>
            </View>
            <ChevronDown size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Report Header */}
        <View style={styles.reportHeader}>
          <View style={styles.schoolInfo}>
            {schoolLogo ? (
              <Image source={{ uri: schoolLogo }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>{schoolName.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.schoolName}>{schoolName}</Text>
          </View>
          <Text style={styles.reportTitle}>Employee Attendance Report</Text>
          
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={() => setShowMonthPicker(true)}
          >
            <Calendar size={18} color="#4f46e5" />
            <Text style={styles.dateText}>
              {selectedMonth.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </Text>
            <ChevronDown size={16} color="#4f46e5" />
          </TouchableOpacity>
          
          {showMonthPicker && (
            <DateTimePicker
              value={selectedMonth}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowMonthPicker(false);
                if (date) {
                  setSelectedMonth(date);
                }
              }}
            />
          )}
        </View>

        {loading ? (
          <View style={styles.centeredMessage}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.messageText}>Loading attendance data...</Text>
          </View>
        ) : selectedTeacher ? (
          <>
            {/* Employee Information Section */}
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => toggleSection('employeeInfo')}
              >
                <Text style={styles.sectionTitle}>Employee Information</Text>
                {expandedSections.employeeInfo ? (
                  <ChevronUp size={20} color="#4f46e5" />
                ) : (
                  <ChevronDown size={20} color="#4f46e5" />
                )}
              </TouchableOpacity>
              
              {expandedSections.employeeInfo && (
                <View style={styles.sectionContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Employee Name:</Text>
                    <Text style={styles.infoValue}>{selectedTeacher.name}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Staff Number:</Text>
                    <Text style={styles.infoValue}>{selectedTeacher.staffNumber || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Position:</Text>
                    <Text style={styles.infoValue}>{selectedTeacher.position}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Attendance Summary Section */}
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => toggleSection('attendanceSummary')}
              >
                <Text style={styles.sectionTitle}>Attendance Summary</Text>
                {expandedSections.attendanceSummary ? (
                  <ChevronUp size={20} color="#4f46e5" />
                ) : (
                  <ChevronDown size={20} color="#4f46e5" />
                )}
              </TouchableOpacity>
              
              {expandedSections.attendanceSummary && (
                <View style={styles.sectionContent}>
                  {attendanceRecords.length > 0 ? (
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.dateCell]}>Date</Text>
                        <Text style={[styles.tableHeaderCell, styles.statusCell]}>Status</Text>
                        <Text style={[styles.tableHeaderCell, styles.timeCell]}>Check-In</Text>
                        <Text style={[styles.tableHeaderCell, styles.timeCell]}>Check-Out</Text>
                        <Text style={[styles.tableHeaderCell, styles.remarksCell]}>Remarks</Text>
                      </View>
                      
                      {attendanceRecords.map(record => (
                        <View key={record.id} style={styles.tableRow}>
                          <Text style={[styles.tableCell, styles.dateCell]}>
                            {formatDate(record.date)}
                          </Text>
                          <View style={[styles.tableCell, styles.statusCell]}>
                            <View style={styles.statusContainer}>
                              {getStatusIcon(record.status)}
                              <Text style={styles.statusText}>{record.status}</Text>
                            </View>
                          </View>
                          <Text style={[styles.tableCell, styles.timeCell]}>
                            {formatTime(record.checkInTime)}
                          </Text>
                          <Text style={[styles.tableCell, styles.timeCell]}>
                            {formatTime(record.checkOutTime)}
                          </Text>
                          <Text style={[styles.tableCell, styles.remarksCell]}>
                            {record.remarks}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noDataText}>No attendance records found for this period.</Text>
                  )}
                </View>
              )}
            </View>

            {/* Monthly Totals Section */}
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => toggleSection('monthlyTotals')}
              >
                <Text style={styles.sectionTitle}>Monthly Totals</Text>
                {expandedSections.monthlyTotals ? (
                  <ChevronUp size={20} color="#4f46e5" />
                ) : (
                  <ChevronDown size={20} color="#4f46e5" />
                )}
              </TouchableOpacity>
              
              {expandedSections.monthlyTotals && (
                <View style={styles.sectionContent}>
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{summary.totalWorkingDays}</Text>
                      <Text style={styles.summaryLabel}>Total Working Days</Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, styles.presentValue]}>{summary.daysPresent}</Text>
                      <Text style={styles.summaryLabel}>Days Present</Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, styles.absentValue]}>{summary.daysAbsent}</Text>
                      <Text style={styles.summaryLabel}>Days Absent</Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, styles.lateValue]}>{summary.daysLate}</Text>
                      <Text style={styles.summaryLabel}>Days Late</Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, styles.leaveValue]}>{summary.leavesTaken}</Text>
                      <Text style={styles.summaryLabel}>Leaves Taken</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.centeredMessage}>
            <Users size={48} color="#9ca3af" />
            <Text style={styles.messageText}>Select a staff member to view their attendance report</Text>
          </View>
        )}
      </ScrollView>

      {/* Staff Dropdown Modal */}
      <Modal
        visible={showStaffDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStaffDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStaffDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Staff Member</Text>
              <TouchableOpacity onPress={() => setShowStaffDropdown(false)}>
                <ChevronDown size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={staffMembers}
              renderItem={renderStaffItem}
              keyExtractor={item => item.id}
              style={styles.staffList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  placeholderHeaderButton: {
    width: 40,
  },
  centeredMessage: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  staffSelectorContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  staffSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  selectedStaffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedStaffThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  staffThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  placeholderThumbnail: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedStaffDetails: {
    flex: 1,
  },
  selectedStaffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  selectedStaffPosition: {
    fontSize: 14,
    color: '#6b7280',
  },
  reportHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  sectionContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  infoValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  dateCell: {
    flex: 1.2,
  },
  statusCell: {
    flex: 1,
  },
  timeCell: {
    flex: 0.8,
  },
  remarksCell: {
    flex: 1.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noDataText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 4,
  },
  presentValue: {
    color: '#10b981',
  },
  absentValue: {
    color: '#ef4444',
  },
  lateValue: {
    color: '#f59e0b',
  },
  leaveValue: {
    color: '#8b5cf6',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  staffList: {
    padding: 16,
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  staffPosition: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default TeacherAttendanceReport;