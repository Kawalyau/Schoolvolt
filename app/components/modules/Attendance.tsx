import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Platform
} from 'react-native';
import { 
  doc, 
  setDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { auth, db,  getSchoolId } from '../../config/firebase';
import { StaffMember, AttendanceRecord } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Clock, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Filter,
  UserPlus,
  BarChart3,
  CalendarIcon,
  CreditCard,
  MoreVertical,
  ChevronDown,
  Check,
  X,
  AlertCircle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from "firebase/firestore";
import QuickActionButton from './hr/components/QuickActionButton';
import { useState, useCallback, useEffect } from 'react';

const safeTimestamp = (value: any) => {
  if (value instanceof Timestamp) return value;
  if (value && typeof value.toDate === "function") return value;
  return serverTimestamp();
};

interface AttendanceManagementProps {
  onBack: () => void;
  onNavigateToSignIn: () => void;
  onNavigateToSettings: () => void;
  onNavigateToReports: () => void;
}

const checkSchoolId = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No authenticated user');
      return null;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No user document found');
      return null;
    }

    const userData = querySnapshot.docs[0].data();
    const schoolId = userData.schoolId || null;
    
    if (!schoolId) {
      console.log('No school ID found in user document');
    }
    
    return schoolId;
    
  } catch (error) {
    console.error('Error checking school ID:', error);
    return null;
  }
};

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  onBack,
  onNavigateToSignIn,
  onNavigateToSettings,
  onNavigateToReports
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    Present: 0,
    absent: 0,
    Late: 0,
    total: 0
  });
  const [activeTab, setActiveTab] = useState<'staff' | 'attendance'>('staff');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const showErrorDialog = useCallback((message: string) => {
    setError(message);
    setShowErrorModal(true);
  }, []);
  const fetchSchoolId = useCallback(async (): Promise<string | null> => {
    try {
      const id = await getSchoolId();
      if (id) {
        setSchoolId(id);
        return id;
      }
      return null;
    } catch (error) {
      console.error('Error fetching school ID:', error);
      return null;
    }
  }, []);
  

  const fetchStaffMembers = useCallback(async () => {
    try {
      if (!schoolId) {
        const id = await fetchSchoolId();
        if (!id) return;
      }

      const staffQuery = query(
        collection(db, 'schools', schoolId!, 'staff')
      );
      
      const querySnapshot = await getDocs(staffQuery);
      
      if (querySnapshot.empty) {
        setStaffMembers([]);
        setStats(prev => ({ ...prev, total: 0 }));
        return;
      }

      const staffData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown Staff',
          position: data.position || 'No Position',
          photo: data.photo || null,
          createdAt: safeTimestamp(data.createdAt),
          updatedAt: safeTimestamp(data.updatedAt),
        };
      }) as StaffMember[];
      
      staffData.sort((a, b) => 
        (a.name || '').toString().localeCompare((b.name || '').toString())
      );
      
      setStaffMembers(staffData);
      setStats(prev => ({ ...prev, total: staffData.length }));
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }, [schoolId, fetchSchoolId]);

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      if (!schoolId) {
        const id = await fetchSchoolId();
        if (!id) return;
      }

      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const attendanceQuery = query(
        collection(db, 'schools', schoolId!, 'attendance'),
        where('date', '==', dateStr)
      );
      
      const querySnapshot = await getDocs(attendanceQuery);
      const attendanceData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          staffId: data.staffId || 'unknown',
          staffName: data.staffName || 'Unknown Staff',
          date: data.date || dateStr,
          checkInTime: data.checkInTime instanceof Timestamp ? data.checkInTime : null,
          checkOutTime: data.checkOutTime instanceof Timestamp ? data.checkOutTime : null,
          status: data.status || 'absent',
          photo: data.photo || null,
          createdAt: safeTimestamp(data.createdAt),
          updatedAt: safeTimestamp(data.updatedAt),
        };
      }) as unknown as AttendanceRecord[];
      
      attendanceData.sort((a, b) => {
        if (!a.checkInTime || !b.checkInTime) return 0;
        try {
          const aTime = a.checkInTime.toDate ? a.checkInTime.toDate() : new Date(a.checkInTime);
          const bTime = b.checkInTime.toDate ? b.checkInTime.toDate() : new Date(b.checkInTime);
          return aTime.getTime() - bTime.getTime();
        } catch (error) {
          return 0;
        }
      });
      
      setAttendanceRecords(attendanceData);
      
      const currentStaffCount = staffMembers.length;
      const PresentCount = attendanceData.filter(record => record.status === 'Present').length;
      const absentCount = currentStaffCount - PresentCount;
      const LateCount = attendanceData.filter(record => record.status === 'Late').length;
      
      setStats({
        Present: PresentCount,
        absent: absentCount,
        Late: LateCount,
        total: currentStaffCount
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, selectedDate, staffMembers.length, fetchSchoolId]);

  useEffect(() => {
    if (!schoolId) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const attendanceQuery = query(
      collection(db, 'schools', schoolId, 'attendance'),
      where('date', '==', dateStr)
    );
    
    const unsubscribe = onSnapshot(
      attendanceQuery, 
      (snapshot) => {
        try {
          const updatedRecords = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              staffId: data.staffId || 'unknown',
              staffName: data.staffName || 'Unknown Staff',
              date: data.date || dateStr,
              checkInTime: data.checkInTime instanceof Timestamp ? data.checkInTime : null,
              checkOutTime: data.checkOutTime instanceof Timestamp ? data.checkOutTime : null,
              status: data.status || 'absent',
              photo: data.photo || null,
              createdAt: safeTimestamp(data.createdAt),
              updatedAt: safeTimestamp(data.updatedAt),
            };
          }) as unknown as AttendanceRecord[];
          
          setAttendanceRecords(updatedRecords);
          
          const currentStaffCount = staffMembers.length;
          const PresentCount = updatedRecords.filter(record => record.status === 'Present').length;
          const absentCount = currentStaffCount - PresentCount;
          const LateCount = updatedRecords.filter(record => record.status === 'Late').length;
          
          setStats({
            Present: PresentCount,
            absent: absentCount,
            Late: LateCount,
            total: currentStaffCount
          });
        } catch (error) {
          console.error('Error processing real-time update:', error);
        }
      },
      (error) => {
        console.error('Error in real-time listener:', error);
      }
    );
    
    return () => unsubscribe();
  }, [schoolId, selectedDate, staffMembers.length]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const id = await fetchSchoolId();
        if (id) {
          await fetchStaffMembers();
          await fetchAttendanceRecords();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in initial data load:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [fetchSchoolId, fetchStaffMembers, fetchAttendanceRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStaffMembers();
    fetchAttendanceRecords();
  }, [fetchStaffMembers, fetchAttendanceRecords]);

  const handleCheckIn = async (staff: StaffMember) => {
    try {
      if (!schoolId) {
        const id = await fetchSchoolId();
        if (!id) return;
      }

      setLoading(true);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      
      const existingRecordQuery = query(
        collection(db, 'schools', schoolId!, 'attendance'),
        where('staffId', '==', staff.id),
        where('date', '==', dateStr)
      );
      
      const existingRecordSnapshot = await getDocs(existingRecordQuery);
      
      if (!existingRecordSnapshot.empty) {
        Alert.alert('Already Checked In', 'This staff member has already checked in today.');
        setLoading(false);
        return;
      }
      
      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
      const status = isLate ? 'Late' : 'Present';
      
      const attendanceData = {
        staffId: staff.id,
        staffName: staff.name,
        date: dateStr,
        checkInTime: serverTimestamp(),
        status: status,
        photo: staff.photo || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'schools', schoolId!, 'attendance'), attendanceData);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `${staff.name} has been checked in successfully.`);
    } catch (error) {
      console.error('Error checking in:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setShowActionsModal(false);
    }
  };

  const handleCheckOut = async (record: AttendanceRecord) => {
    try {
      if (!schoolId) {
        const id = await fetchSchoolId();
        if (!id) return;
      }

      setLoading(true);
      
      if (!record.id) {
        return;
      }
      
      await updateDoc(doc(db, 'schools', schoolId!, 'attendance', record.id), {
        checkOutTime: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `${record.staffName} has been checked out successfully.`);
    } catch (error) {
      console.error('Error checking out:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setShowActionsModal(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '--:--';
    
    try {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      return '--:--';
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return '#10b981';
      case 'absent': return '#ef4444';
      case 'Late': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Present': return <CheckCircle size={16} color="#10b981" />;
      case 'absent': return <XCircle size={16} color="#ef4444" />;
      case 'Late': return <Clock size={16} color="#f59e0b" />;
      default: return <Clock size={16} color="#6b7280" />;
    }
  };

  const filteredStaffMembers = filterStatus === 'all' 
    ? staffMembers 
    : staffMembers.filter(staff => {
        const record = attendanceRecords.find(r => r.staffId === staff.id);
        return record?.status === filterStatus;
      });

  const renderStaffItem = ({ item }: { item: StaffMember }) => {
    const attendanceRecord = attendanceRecords.find(record => record.staffId === item.id);
    const status = attendanceRecord?.status || 'absent';
    
    return (
      <TouchableOpacity 
        style={[styles.staffItem, styles.card]}
        onPress={() => {
          setSelectedStaff(item);
          setShowActionsModal(true);
        }}
        disabled={loading}
      >
        <View style={styles.staffInfo}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.staffPhoto} />
          ) : (
            <View style={[styles.staffPhoto, styles.placeholderPhoto]}>
              <User size={24} color="#6b7280" />
            </View>
          )}
          <View style={styles.staffDetails}>
            <Text style={styles.staffName}>{item.name}</Text>
            <Text style={styles.staffPosition}>{item.position}</Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(status)}15` }]}>
          {getStatusIcon(status)}
          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAttendanceItem = ({ item }: { item: AttendanceRecord }) => (
    <View style={[styles.attendanceItem, styles.card]}>
      <View style={styles.attendanceInfo}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.attendancePhoto} />
        ) : (
          <View style={[styles.attendancePhoto, styles.placeholderPhoto]}>
            <User size={20} color="#6b7280" />
          </View>
        )}
        <View>
          <Text style={styles.attendanceName}>{item.staffName}</Text>
          <View style={[styles.statusBadgeSmall, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
            <Text style={[styles.statusTextSmall, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.timeSection}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeLabel}>Check-in</Text>
          <Text style={styles.timeText}>{formatTime(item.checkInTime)}</Text>
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={styles.timeLabel}>Check-out</Text>
          <Text style={styles.timeText}>{formatTime(item.checkOutTime)}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.actionButton, item.checkOutTime && styles.disabledButton]}
          onPress={() => handleCheckOut(item)}
          disabled={!!item.checkOutTime || loading}
        >
          <Text style={styles.actionButtonText}>
            {item.checkOutTime ? 'Checked Out' : 'Check Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll}>
        <View style={styles.actionsGrid}>
          <QuickActionButton
            icon={UserPlus}
            label="Add Staff"
            onPress={onNavigateToSignIn}
            colors={['#4f46e5', '#6366f1']}
          />
          
          <QuickActionButton
            icon={CreditCard}
            label="Settings"
            onPress={onNavigateToSettings}
            colors={['#10b981', '#34d399']}
          />
          
          <QuickActionButton
            icon={BarChart3}
            label="Reports"
            onPress={ onNavigateToReports}
            colors={['#f59e0b', '#fbbf24']}
          />
          
          <QuickActionButton
            icon={CalendarIcon}
            label="Schedule"
            onPress={() => {}}
            colors={['#ec4899', '#f472b6']}
          />
        </View>
      </ScrollView>
    </View>
  );

  const renderFilterMenu = () => (
    <Modal
      visible={showFilterMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterMenu(false)}
    >
      <TouchableOpacity 
        style={styles.filterOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterMenu(false)}
      >
        <View style={styles.filterMenu}>
          <Text style={styles.filterTitle}>Filter by Status</Text>
          {['all', 'Present', 'absent', 'Late'].map(status => (
            <TouchableOpacity
              key={status}
              style={styles.filterOption}
              onPress={() => {
                setFilterStatus(status);
                setShowFilterMenu(false);
              }}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === status && styles.filterOptionTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              {filterStatus === status && <Check size={16} color="#4f46e5" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#4f46e5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance Management</Text>
          <View style={styles.placeholderHeaderButton} />
        </View>
        <View style={styles.centeredMessage}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.messageText}>Loading attendance data...</Text>
        </View>
      </View>
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
        <Text style={styles.headerTitle}>Staff Attendance</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setShowFilterMenu(true)}
        >
          <Filter size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Date Selector */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color="#4f46e5" />
            <Text style={styles.dateText}>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
            <ChevronDown size={16} color="#4f46e5" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  setSelectedDate(date);
                }
              }}
            />
          )}
        </View>

        {/* Stats Overview */}
        <View style={[styles.statsContainer, styles.card]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#10b98115' }]}>
              <CheckCircle size={20} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{stats.Present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b15' }]}>
              <Clock size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.Late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#ef444415' }]}>
              <XCircle size={20} color="#ef4444" />
            </View>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: '#4f46e515' }]}>
              <User size={20} color="#4f46e5" />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'staff' && styles.tabActive]}
            onPress={() => setActiveTab('staff')}
          >
            <Text style={[styles.tabText, activeTab === 'staff' && styles.tabTextActive]}>
              Staff List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'attendance' && styles.tabActive]}
            onPress={() => setActiveTab('attendance')}
          >
            <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>
              Attendance Log
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'staff' ? (
          filteredStaffMembers.length === 0 ? (
            <View style={styles.centeredMessage}>
              <User size={48} color="#9ca3af" />
              <Text style={styles.messageText}>No staff members found</Text>
              <Text style={styles.subMessageText}>
                {filterStatus !== 'all' ? `No staff with ${filterStatus} status` : 'Add staff members to start tracking attendance'}
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredStaffMembers.map((item) => (
                <View key={item.id}>
                  {renderStaffItem({ item })}
                </View>
              ))}
            </View>
          )
        ) : (
          attendanceRecords.length === 0 ? (
            <View style={styles.centeredMessage}>
              <Clock size={48} color="#9ca3af" />
              <Text style={styles.messageText}>No attendance records</Text>
              <Text style={styles.subMessageText}>
                No attendance records found for selected date
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {attendanceRecords.map((item) => (
                <View key={item.id}>
                  {renderAttendanceItem({ item })}
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>

      {/* Filter Menu */}
      {renderFilterMenu()}

      {/* Actions Modal */}
      <Modal
        visible={showActionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendance Action</Text>
              <TouchableOpacity onPress={() => setShowActionsModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.staffModalInfo}>
                {selectedStaff?.photo ? (
                  <Image source={{ uri: selectedStaff.photo }} style={styles.modalStaffPhoto} />
                ) : (
                  <View style={[styles.modalStaffPhoto, styles.placeholderPhoto]}>
                    <User size={32} color="#6b7280" />
                  </View>
                )}
                <View>
                  <Text style={styles.modalStaffName}>{selectedStaff?.name}</Text>
                  <Text style={styles.modalStaffPosition}>{selectedStaff?.position}</Text>
                </View>
              </View>
              
              <Text style={styles.modalText}>
                Select action for {selectedDate.toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowActionsModal(false)}
                disabled={loading}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => selectedStaff && handleCheckIn(selectedStaff)}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#4f46e5', '#6366f1']}
                  
                >
                  <Clock size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Check In</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <AlertCircle size={48} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: '#ef4444', textAlign: 'center' }]}>Error</Text>
            <Text style={[styles.modalText, { textAlign: 'center' }]}>{error}</Text>
            
            <TouchableOpacity
              style={[styles.modalButton, { marginTop: 16 }]}
              onPress={() => setShowErrorModal(false)}
            >
              <LinearGradient
                colors={['#4f46e5', '#6366f1']}
                
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
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
    zIndex: 10,
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
  section: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  quickActions: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  actionsScroll: {
    marginHorizontal: -16,
  },
  actionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4f46e5',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  modalStaffPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  placeholderPhoto: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffDetails: {
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  attendanceItem: {
    padding: 16,
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendancePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  attendanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    alignItems: 'center',
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  actionButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  centeredMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  subMessageText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  filterOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  filterOptionTextActive: {
    fontWeight: '700',
    color: '#4f46e5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalBody: {
    marginBottom: 16,
  },
  staffModalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalStaffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalStaffPosition: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalButtonSecondary: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
});

export default AttendanceManagement;
