import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  FileText, 
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  UserPlus,
  CreditCard,
  Calendar as CalendarIcon,
  BarChart3,
  Settings,
  BookOpen,
  Briefcase,
  Clock,
  School
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { styles as appStyles } from '../../styles';

const { width } = Dimensions.get('window');

interface StaffMember {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  joinDate: string;
  contact: string;
  email: string;
}

interface SchoolData {
  id: string;
  name: string;
  level: string;
  district: string;
}

interface HRProps {
  onNavigateToCreateSchool: () => void;
}

const HR: React.FC<HRProps> = ({ onNavigateToCreateSchool }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalSalary: 0,
    pendingLeaves: 0,
    activeRequests: 0
  });
  const [showSchoolModal, setShowSchoolModal] = useState(false);

  useEffect(() => {
    fetchSchoolData();
  }, []);

  useEffect(() => {
    if (school) {
      fetchHRData();
      setupRealtimeListener();
    }
  }, [school]);

  const fetchSchoolData = async () => {
    try {
      setSchoolLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        setSchoolLoading(false);
        setShowSchoolModal(true);
        return;
      }

      // Find user in users collection to get school ID
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setSchoolLoading(false);
        setShowSchoolModal(true);
        return;
      }

      const userData = querySnapshot.docs[0].data();
      const schoolId = userData.schoolId;

      if (!schoolId) {
        setSchoolLoading(false);
        setShowSchoolModal(true);
        return;
      }

      // Fetch school data
      const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
      if (schoolDoc.exists()) {
        setSchool({
          id: schoolDoc.id,
          ...schoolDoc.data()
        } as SchoolData);
      } else {
        setShowSchoolModal(true);
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
      setShowSchoolModal(true);
    } finally {
      setSchoolLoading(false);
    }
  };

  const fetchHRData = async () => {
    if (!school) return;
    
    try {
      setLoading(true);
      // Fetch staff from school's staff subcollection
      const staffRef = collection(db, 'schools', school.id, 'staff');
      const staffSnapshot = await getDocs(staffRef);
      
      const staffData: StaffMember[] = [];
      staffSnapshot.forEach((doc) => {
        staffData.push({ id: doc.id, ...doc.data() } as StaffMember);
      });
      
      setStaff(staffData);
      
      // Calculate statistics
      setStats({
        totalStaff: staffData.length,
        totalSalary: staffData.reduce((sum, member) => sum + (member.salary || 0), 0),
        pendingLeaves: 0, // You would fetch this from leaves collection
        activeRequests: 0 // You would fetch this from requests collection
      });
    } catch (error) {
      console.error('Error fetching HR data:', error);
      Alert.alert('Error', 'Failed to load HR data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = () => {
    if (!school) return;
    
    const staffRef = collection(db, 'schools', school.id, 'staff');
    const unsubscribe = onSnapshot(staffRef, (snapshot) => {
      const staffData: StaffMember[] = [];
      snapshot.forEach((doc) => {
        staffData.push({ id: doc.id, ...doc.data() } as StaffMember);
      });
      setStaff(staffData);
      setStats(prev => ({
        ...prev,
        totalStaff: staffData.length,
        totalSalary: staffData.reduce((sum, member) => sum + (member.salary || 0), 0)
      }));
    });

    return unsubscribe;
  };

  const handleAddStaff = () => {
    // Navigate to add staff screen
    Alert.alert('Info', 'This would navigate to Add Staff form');
  };

  const handleManageSalaries = () => {
    // Navigate to salary management
    Alert.alert('Info', 'This would navigate to Salary Management');
  };

  const handleManageLeaves = () => {
    // Navigate to leave management
    Alert.alert('Info', 'This would navigate to Leave Management');
  };

  const handleViewReports = () => {
    // Navigate to reports
    Alert.alert('Info', 'This would navigate to HR Reports');
  };

  const handleCreateSchool = () => {
    setShowSchoolModal(false);
    onNavigateToCreateSchool();
  };

  const renderStatsCards = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <LinearGradient
          colors={['#4f46e5', '#6366f1']}
          style={styles.statGradient}
        >
          <Users size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.statValue}>{stats.totalStaff}</Text>
        <Text style={styles.statLabel}>Total Staff</Text>
      </View>
      
      <View style={styles.statCard}>
        <LinearGradient
          colors={['#10b981', '#34d399']}
          style={styles.statGradient}
        >
          <DollarSign size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.statValue}>${(stats.totalSalary / 1000).toFixed(0)}K</Text>
        <Text style={styles.statLabel}>Monthly Payroll</Text>
      </View>
      
      <View style={styles.statCard}>
        <LinearGradient
          colors={['#f59e0b', '#fbbf24']}
          style={styles.statGradient}
        >
          <CalendarIcon size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.statValue}>{stats.pendingLeaves}</Text>
        <Text style={styles.statLabel}>Pending Leaves</Text>
      </View>
      
      <View style={styles.statCard}>
        <LinearGradient
          colors={['#ef4444', '#f87171']}
          style={styles.statGradient}
        >
          <FileText size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.statValue}>{stats.activeRequests}</Text>
        <Text style={styles.statLabel}>Active Requests</Text>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton} onPress={handleAddStaff}>
          <LinearGradient
            colors={['#4f46e5', '#6366f1']}
            style={styles.actionGradient}
          >
            <UserPlus size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.actionText}>Add Staff</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleManageSalaries}>
          <LinearGradient
            colors={['#10b981', '#34d399']}
            style={styles.actionGradient}
          >
            <CreditCard size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.actionText}>Salaries</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleManageLeaves}>
          <LinearGradient
            colors={['#f59e0b', '#fbbf24']}
            style={styles.actionGradient}
          >
            <CalendarIcon size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.actionText}>Leaves</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleViewReports}>
          <LinearGradient
            colors={['#ef4444', '#f87171']}
            style={styles.actionGradient}
          >
            <BarChart3 size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.actionText}>Reports</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecentStaff = () => (
    <View style={styles.recentSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Staff</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
      ) : staff.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={48} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No staff members yet</Text>
          <Text style={styles.emptyStateSubtext}>Add your first staff member to get started</Text>
          <TouchableOpacity style={styles.addFirstButton} onPress={handleAddStaff}>
            <Text style={styles.addFirstButtonText}>Add First Staff</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={staff.slice(0, 5)}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.staffItem}>
              <View style={styles.staffAvatar}>
                <Text style={styles.avatarText}>
                  {item.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={styles.staffPosition}>{item.position}</Text>
              </View>
              <View style={styles.staffDetails}>
                <Text style={styles.staffDepartment}>{item.department}</Text>
                <Text style={styles.staffSalary}>${item.salary?.toLocaleString()}</Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderSchoolModal = () => (
    <Modal visible={showSchoolModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>School Not Found</Text>
          </View>
          <View style={styles.modalBody}>
            <Briefcase size={48} color="#4f46e5" style={styles.modalIcon} />
            <Text style={styles.modalText}>
              You are not associated with any school. Would you like to create a new school?
            </Text>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setShowSchoolModal(false)}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonSecondaryText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={handleCreateSchool}
            >
              <School size={20} color="#fff" style={styles.modalButtonIcon} />
              <Text style={styles.modalButtonText}>Create School</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (schoolLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading HR Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={appStyles.container}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>HR Dashboard</Text>
            <Text style={styles.schoolName}>
              {school ? school.name : 'No School Assigned'}
            </Text>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        {renderStatsCards()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Recent Staff */}
        {renderRecentStaff()}

        {/* Additional Sections */}
        <View style={styles.additionalSections}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <View style={styles.eventItem}>
              <View style={styles.eventIcon}>
                <CalendarIcon size={16} color="#4f46e5" />
              </View>
              <Text style={styles.eventText}>Payroll processing - Tomorrow</Text>
            </View>
            <View style={styles.eventItem}>
              <View style={styles.eventIcon}>
                <Clock size={16} color="#10b981" />
              </View>
              <Text style={styles.eventText}>Staff meeting - Friday</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Links</Text>
            <TouchableOpacity style={styles.linkItem}>
              <BookOpen size={20} color="#4f46e5" />
              <Text style={styles.linkText}>Employee Handbook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkItem}>
              <FileText size={20} color="#10b981" />
              <Text style={styles.linkText}>Policies & Procedures</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* School Not Found Modal */}
      {renderSchoolModal()}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddStaff}>
        <LinearGradient
          colors={['#4f46e5', '#6366f1']}
          style={styles.fabGradient}
        >
          <Plus size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  schoolName: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 48) / 2 - 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    width: (width - 48) / 2 - 6,
    alignItems: 'center',
  },
  actionGradient: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#4f46e5',
    fontWeight: '500',
  },
  loader: {
    marginVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  addFirstButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  staffPosition: {
    fontSize: 14,
    color: '#6b7280',
  },
  staffDetails: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  staffDepartment: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  staffSalary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  additionalSections: {
    gap: 16,
    marginBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventText: {
    fontSize: 14,
    color: '#374151',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  linkText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondaryText: {
    color: '#374151',
  },
  modalButtonIcon: {
    marginRight: 4,
  },
});

export default HR;