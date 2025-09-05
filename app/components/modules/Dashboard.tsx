import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  BarChart3,
  Bell,
  Clock,
  TrendingUp,
  Award,
  GraduationCap,
  Bookmark,
  ChevronRight,
  Eye,
  MessageSquare,
  FileText,
  PieChart,
  AlertCircle,
  Plus,
  School
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth, getSchoolId  } from '../../config/firebase';
import { styles as appStyles } from '../../styles';

const { width } = Dimensions.get('window');

interface StatsData {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceRate: number;
  upcomingEvents: number;
  pendingTasks: number;
}

interface RecentActivity {
  id: string;
  type: 'attendance' | 'grade' | 'event' | 'message';
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
  color: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'exam' | 'holiday' | 'event';
}

interface DashboardProps {
  onNavigateToCreateSchool: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToCreateSchool }) => {
  const [stats, setStats] = useState<StatsData>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    attendanceRate: 0,
    upcomingEvents: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [school, setSchool] = useState<any>(null);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Memoized data to prevent unnecessary re-renders
  const recentActivities: RecentActivity[] = React.useMemo(() => [
    {
      id: '1',
      type: 'attendance',
      title: 'Attendance Submitted',
      description: 'Class 10A attendance marked for today',
      time: '2 hours ago',
      icon: <Calendar size={16} color="#10b981" />,
      color: '#10b981'
    },
    {
      id: '2',
      type: 'grade',
      title: 'Grades Updated',
      description: 'Math test results added for Class 9B',
      time: '4 hours ago',
      icon: <Award size={16} color="#f59e0b" />,
      color: '#f59e0b'
    },
    {
      id: '3',
      type: 'event',
      title: 'New Event Created',
      description: 'Annual Sports Day scheduled for next month',
      time: '1 day ago',
      icon: <Calendar size={16} color="#ef4444" />,
      color: '#ef4444'
    },
    {
      id: '4',
      type: 'message',
      title: 'New Message',
      description: 'Parent meeting request from John Doe',
      time: '2 days ago',
      icon: <MessageSquare size={16} color="#3b82f6" />,
      color: '#3b82f6'
    }
  ], []);

  const upcomingEvents: UpcomingEvent[] = React.useMemo(() => [
    {
      id: '1',
      title: 'Staff Meeting',
      date: 'Tomorrow',
      time: '10:00 AM',
      type: 'meeting'
    },
    {
      id: '2',
      title: 'Science Fair',
      date: 'Oct 15, 2023',
      time: '9:00 AM',
      type: 'event'
    },
    {
      id: '3',
      title: 'Mid-Term Exams',
      date: 'Oct 20, 2023',
      time: 'All Day',
      type: 'exam'
    }
  ], []);

  const quickActions = React.useMemo(() => [
    { id: '1', icon: <Users size={24} color="#4f46e5" />, title: 'Students', color: '#4f46e5' },
    { id: '2', icon: <BookOpen size={24} color="#10b981" />, title: 'Classes', color: '#10b981' },
    { id: '3', icon: <Calendar size={24} color="#f59e0b" />, title: 'Attendance', color: '#f59e0b' },
    { id: '4', icon: <DollarSign size={24} color="#ef4444" />, title: 'Finance', color: '#ef4444' }
  ], []);

  const checkSchoolAndFetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
  
      const schoolId = await getSchoolId();
  
      if (!schoolId) {
        throw new Error('No school associated');
      }
  
      const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
  
      if (!schoolDoc.exists()) {
        throw new Error('School not found');
      }
  
      const schoolData = { id: schoolDoc.id, ...schoolDoc.data() };
      setSchool(schoolData);
  
      // Load dashboard stats
      await fetchDashboardData(schoolId);
  
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Failed to load dashboard');
      setShowSchoolModal(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  

  const fetchDashboardData = async (schoolId: string) => {
    try {
      // Use mock data for now to prevent loading issues
      setStats({
        totalStudents: 1250,
        totalTeachers: 45,
        totalClasses: 32,
        attendanceRate: 92,
        upcomingEvents: 3,
        pendingTasks: 5
      });
      
      setDataLoaded(true);
      
      // Optional: Real data fetching in background
      setTimeout(async () => {
        try {
          const [studentsSnapshot, teachersSnapshot, classesSnapshot] = await Promise.all([
            getDocs(collection(db, 'schools', schoolId, 'students')),
            getDocs(collection(db, 'schools', schoolId, 'teachers')),
            getDocs(collection(db, 'schools', schoolId, 'classes'))
          ]);

          setStats({
            totalStudents: studentsSnapshot.size,
            totalTeachers: teachersSnapshot.size,
            totalClasses: classesSnapshot.size,
            attendanceRate: 92,
            upcomingEvents: 3,
            pendingTasks: 5
          });
        } catch (err) {
          console.log('Background data refresh failed, using mock data');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep mock data even if real fetch fails
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    checkSchoolAndFetchData();
  }, [checkSchoolAndFetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    checkSchoolAndFetchData();
  }, [checkSchoolAndFetchData]);

  const handleCreateSchool = () => {
    setShowSchoolModal(false);
    onNavigateToCreateSchool();
  };

  const renderStatsCards = () => (
    <View style={styles.statsGrid}>
      <LinearGradient
        colors={['#4f46e5', '#6366f1']}
        style={styles.statCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statIcon}>
          <GraduationCap size={24} color="#fff" />
        </View>
        <Text style={styles.statValue}>{stats.totalStudents}</Text>
        <Text style={styles.statLabel}>Students</Text>
        <TrendingUp size={16} color="#a5b4fc" style={styles.trendIcon} />
      </LinearGradient>

      <LinearGradient
        colors={['#10b981', '#34d399']}
        style={styles.statCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statIcon}>
          <Users size={24} color="#fff" />
        </View>
        <Text style={styles.statValue}>{stats.totalTeachers}</Text>
        <Text style={styles.statLabel}>Teachers</Text>
        <TrendingUp size={16} color="#86efac" style={styles.trendIcon} />
      </LinearGradient>

      <LinearGradient
        colors={['#f59e0b', '#fbbf24']}
        style={styles.statCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statIcon}>
          <BookOpen size={24} color="#fff" />
        </View>
        <Text style={styles.statValue}>{stats.totalClasses}</Text>
        <Text style={styles.statLabel}>Classes</Text>
        <TrendingUp size={16} color="#fde68a" style={styles.trendIcon} />
      </LinearGradient>

      <LinearGradient
        colors={['#ef4444', '#f87171']}
        style={styles.statCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statIcon}>
          <BarChart3 size={24} color="#fff" />
        </View>
        <Text style={styles.statValue}>{stats.attendanceRate}%</Text>
        <Text style={styles.statLabel}>Attendance</Text>
        <TrendingUp size={16} color="#fca5a5" style={styles.trendIcon} />
      </LinearGradient>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity key={action.id} style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
              {action.icon}
            </View>
            <Text style={styles.actionText}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecentActivity = () => (
    <View style={styles.recentActivity}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={recentActivities}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: `${item.color}20` }]}>
              {item.icon}
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityDescription}>{item.description}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderUpcomingEvents = () => (
    <View style={styles.upcomingEvents}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View Calendar</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={upcomingEvents}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.eventItem}>
            <View style={styles.eventDot} />
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <View style={styles.eventDetails}>
                <Text style={styles.eventDate}>{item.date}</Text>
                <Text style={styles.eventTime}>{item.time}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );

  const renderSchoolModal = () => (
    <Modal visible={showSchoolModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>School Required</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.modalIconContainer}>
              <AlertCircle size={48} color="#ef4444" />
            </View>
            <Text style={styles.modalText}>
              {error || 'You need to be associated with a school to access the dashboard.'}
            </Text>
            <Text style={styles.modalSubtext}>
              Please create a new school or contact your administrator to be added to an existing one.
            </Text>
            
            <TouchableOpacity 
              style={styles.createSchoolButton}
              onPress={handleCreateSchool}
            >
              <LinearGradient
                colors={['#4f46e5', '#6366f1']}
                style={styles.createSchoolGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <School size={20} color="#fff" />
                <Text style={styles.createSchoolText}>Create New School</Text>
                <Plus size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactAdminButton}
              onPress={() => Alert.alert('Contact Administrator', 'Please reach out to your system administrator to be added to an existing school.')}
            >
              <Text style={styles.contactAdminText}>Contact Administrator</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && !dataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
        <Text style={styles.loadingSubtext}>This should only take a moment</Text>
      </View>
    );
  }

  return (
    <View style={appStyles.container}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back!</Text>
            <Text style={styles.subtitle}>
              {school ? school.name : 'EduConnect Dashboard'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#4f46e5" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        {renderStatsCards()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Main Content Grid */}
        <View style={styles.contentGrid}>
          <View style={styles.column}>
            {renderRecentActivity()}
          </View>
          <View style={styles.column}>
            {renderUpcomingEvents()}
            
            {/* Additional Stats Card */}
            <View style={styles.additionalStats}>
              <View style={styles.additionalStat}>
                <View style={styles.additionalStatIcon}>
                  <Clock size={20} color="#8b5cf6" />
                </View>
                <View>
                  <Text style={styles.additionalStatValue}>{stats.upcomingEvents}</Text>
                  <Text style={styles.additionalStatLabel}>Upcoming Events</Text>
                </View>
              </View>
              
              <View style={styles.additionalStat}>
                <View style={styles.additionalStatIcon}>
                  <FileText size={20} color="#ec4899" />
                </View>
                <View>
                  <Text style={styles.additionalStatValue}>{stats.pendingTasks}</Text>
                  <Text style={styles.additionalStatLabel}>Pending Tasks</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Performance Section */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <PieChart size={24} color="#4f46e5" />
              <Text style={styles.performanceValue}>92%</Text>
              <Text style={styles.performanceLabel}>Overall Performance</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <TrendingUp size={24} color="#10b981" />
              <Text style={styles.performanceValue}>+15%</Text>
              <Text style={styles.performanceLabel}>This Month</Text>
            </View>
            
            <View style={styles.performanceCard}>
              <Award size={24} color="#f59e0b" />
              <Text style={styles.performanceValue}>87%</Text>
              <Text style={styles.performanceLabel}>Student Satisfaction</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* School Required Modal with Create School Button */}
      {renderSchoolModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4f46e5',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  notificationButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
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
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  trendIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
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
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  contentGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  column: {
    flex: 1,
    gap: 16,
  },
  recentActivity: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 14,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  upcomingEvents: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4f46e5',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  eventTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  additionalStats: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  additionalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  additionalStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  additionalStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  additionalStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  performanceSection: {
    marginBottom: 32,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createSchoolButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  createSchoolGradient: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createSchoolText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactAdminButton: {
    padding: 12,
  },
  contactAdminText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Dashboard;