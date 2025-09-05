import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './components/modules/Dashboard';
import Attendance from './components/modules/Attendance';
import Students from './components/modules/Students';
import HR from './components/modules/HR';
import AddStaff from './components/modules/hr/AddEditStaff';
import { modules } from './data';
import { styles as appStyles } from './styles';
import { LinearGradient } from 'expo-linear-gradient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { School, User, Lock, Eye, EyeOff, ArrowRight, X, AlertCircle, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
import AttendanceSettingsScreen from './components/modules/staffAttendance/AttendanceSettingsScreen';
import SignInInterface from './components/modules/staffAttendance/SignInInterface';
import TeacherAttendanceReport from './components/modules/staffAttendance/report';
import CreateSchool from './components/modules/CreateSchool';
import BudgetManagementSystem from './components/modules/budget';

const { width, height } = Dimensions.get('window');

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: any;
}

interface SchoolData {
  id: string;
  name: string;
  level: 'Primary' | 'Secondary' | 'Other';
  district: string;
  adminUids: string[];
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

interface FirebaseErrorDialogProps {
  visible: boolean;
  type: 'error' | 'success' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

const FirebaseErrorDialog: React.FC<FirebaseErrorDialogProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle size={48} color="#ef4444" />;
      case 'success':
        return <CheckCircle size={48} color="#10b981" />;
      case 'info':
        return <AlertCircle size={48} color="#3b82f6" />;
      default:
        return <AlertCircle size={48} color="#3b82f6" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return '#fef2f2';
      case 'success':
        return '#f0fdf4';
      case 'info':
        return '#eff6ff';
      default:
        return '#eff6ff';
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'error':
        return '#dc2626';
      case 'success':
        return '#059669';
      case 'info':
        return '#2563eb';
      default:
        return '#2563eb';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.errorDialog, { backgroundColor: getBackgroundColor() }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <View style={styles.errorIconContainer}>
            {getIcon()}
          </View>
          
          <Text style={[styles.errorDialogTitle, { color: getTitleColor() }]}>
            {title}
          </Text>
          
          <Text style={styles.errorDialogMessage}>
            {message}
          </Text>
          
          <TouchableOpacity
            style={[styles.errorDialogButton, { backgroundColor: getTitleColor() }]}
            onPress={onClose}
          >
            <Text style={styles.errorDialogButtonText}>Okay</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<string>('1');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [currentScreen, setCurrentScreen] = useState<
    'main' | 'TeacherAttendanceReport' |'budget' |'createSchool' |'addStaff' | 'salaryManagement' | 'leaveManagement'| 'AttendanceSettingsScreen' | 'hrReports'| 'SignInInterface'
  >('main');
  const [firebaseInitialized, setFirebaseInitialized] = useState<boolean>(false);
  const [firebaseDialog, setFirebaseDialog] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'info',
    title: '',
    message: '',
  });
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  const showFirebaseDialog = (type: 'error' | 'success' | 'info', title: string, message: string) => {
    setFirebaseDialog({
      visible: true,
      type,
      title,
      message,
    });
  };

  const hideFirebaseDialog = () => {
    setFirebaseDialog({
      ...firebaseDialog,
      visible: false,
    });
  };

  useEffect(() => {
    // Check if Firebase is properly initialized
    try {
      if (auth && db) {
        setFirebaseInitialized(true);
        console.log('Firebase initialized successfully');
        checkAuthStatus();
      } else {
        console.error('Firebase not initialized properly');
        showFirebaseDialog('error', 'Initialization Error', 'Firebase services are not properly initialized. Please try again later.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
      showFirebaseDialog('error', 'Initialization Error', 'Failed to initialize Firebase services. Please try again later.');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
    ]).start();
  }, [authScreen, isLoggedIn, currentScreen]);

  const checkAuthStatus = async () => {
    if (!firebaseInitialized) {
      console.error('Firebase not initialized');
      setIsLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
        
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            createdAt: serverTimestamp(),
          });
          
          // Automatically log in and go to dashboard
          setIsLoggedIn(true);
          
          // Try to fetch schools but don't wait for it
          fetchSchools(firebaseUser.uid).catch(error => {
            console.error('Error fetching schools:', error);
          });
        } else {
          setUser(null);
          setSchools([]);
          setIsLoggedIn(false);
          setAuthScreen('login');
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Auth check error:', error);
      showFirebaseDialog('error', 'Authentication Error', 'Failed to check authentication status. Please try again.');
      setIsLoggedIn(false);
      setIsLoading(false);
      setAuthScreen('login');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      showFirebaseDialog('error', 'Validation Error', 'Please fill in all fields');
      return;
    }

    if (!firebaseInitialized) {
      showFirebaseDialog('error', 'Service Unavailable', 'Authentication service is not available');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsLoggedIn(true);
      // No need to show success dialog, just proceed to dashboard
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Login error:', error);
      
      let errorMessage = 'Unable to sign in. Please try again.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is not valid.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This user account has been disabled.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No user found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      }
      
      showFirebaseDialog('error', 'Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!formData.email || !formData.password || !formData.displayName) {
      showFirebaseDialog('error', 'Validation Error', 'Please fill in all fields');
      return;
    }

    if (!firebaseInitialized) {
      showFirebaseDialog('error', 'Service Unavailable', 'Authentication service is not available');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        email: user.email,
        displayName: formData.displayName,
        createdAt: serverTimestamp(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showFirebaseDialog('success', 'Success', 'Account created successfully! You are now logged in.');
      // Automatically log in after signup
      setIsLoggedIn(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Signup error:', error);
      
      let errorMessage = 'Unable to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is not valid.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
      }
      
      showFirebaseDialog('error', 'Signup Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchools = async (uid: string) => {
    if (!firebaseInitialized) {
      console.error('Firebase not initialized');
      return;
    }

    try {
      const q = query(collection(db, 'schools'), where('adminUids', 'array-contains', uid));
      const querySnapshot = await getDocs(q);
      const schoolList: SchoolData[] = [];
      querySnapshot.forEach((doc) => {
        schoolList.push({ id: doc.id, ...doc.data() } as SchoolData);
      });
      setSchools(schoolList);
      
      // If user has schools, automatically select the first one
      if (schoolList.length > 0) {
        setSelectedSchool(schoolList[0]);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
    setIsLoggedIn(false);
    setSelectedSchool(null);
    setAuthScreen('login');
    setFormData({
      email: '',
      password: '',
      displayName: '',
    });
  };

    
    const handleNavigateToBudget = () => {
 
        setCurrentScreen('budget');
      };
  const handleNavigateToAddStaff = () => {
    setCurrentScreen('addStaff');
  };
  const handleNavigateToCreateSchool= () => {
    setCurrentScreen('createSchool');
  };

  const handleNavigateToSalaryManagement = () => {
    setCurrentScreen('salaryManagement');
  };

  const handleNavigateToLeaveManagement = () => {
    setCurrentScreen('leaveManagement');
  };

  const handleNavigateToHRReports = () => {
    setCurrentScreen('hrReports');
  };

  const handleNavigateBackToHR = () => {
    setCurrentScreen('main');
  };

  const handleNavigateToAttendanceSignIn = () => {
    setCurrentScreen('SignInInterface');
  };

  const handleNavigateToAttendanceSettings = () => {
    setCurrentScreen('AttendanceSettingsScreen');
  };

  const handleNavigateToAttendance = () => {
    setCurrentScreen('main');
  };
   
  const onNavigateToReports = () => {
    setCurrentScreen('TeacherAttendanceReport');
  };

  const handleStaffAdded = () => {
    setCurrentScreen('main');
    showFirebaseDialog('success', 'Success', 'Staff member added successfully!');
  };
  const handleSchoolCreated = () => {
    if (user) {
    
      setCurrentScreen('main');
      
    }
  };
  const renderAuthScreen = () => {
    if (!firebaseInitialized) {
      return (
        <View style={styles.authCard}>
          <View style={styles.authHeader}>
            <School size={48} color="#ef4444" />
            <Text style={styles.authTitle}>Service Unavailable</Text>
            <Text style={styles.authSubtitle}>Authentication service is not available</Text>
          </View>
          <Text style={styles.errorText}>
            Please check your internet connection and try again.
          </Text>
        </View>
      );
    }

    switch (authScreen) {
      case 'login':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.authCard}>
              <View style={styles.authHeader}>
                <School size={48} color="#3b82f6" />
                <Text style={styles.authTitle}>Welcome Back</Text>
                <Text style={styles.authSubtitle}>Sign in to your account</Text>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <User size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9ca3af"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.authButton, isLoading && styles.authButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.authButtonText}>Sign In</Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAuthScreen('signup')}
                style={styles.authSwitch}
              >
                <Text style={styles.authSwitchText}>
                  Don't have an account? <Text style={styles.authSwitchHighlight}>Sign up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );

      case 'signup':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.authCard}>
              <View style={styles.authHeader}>
                <School size={48} color="#3b82f6" />
                <Text style={styles.authTitle}>Create Account</Text>
                <Text style={styles.authSubtitle}>Join us today</Text>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <User size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#9ca3af"
                    value={formData.displayName}
                    onChangeText={(value) => handleInputChange('displayName', value)}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <User size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9ca3af"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.authButton, isLoading && styles.authButtonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.authButtonText}>Create Account</Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAuthScreen('login')}
                style={styles.authSwitch}
              >
                <Text style={styles.authSwitchText}>
                  Already have an account? <Text style={styles.authSwitchHighlight}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  const renderModule = () => {
    switch (currentScreen) {
      case 'SignInInterface':
        return (
          <SignInInterface
            onBack={handleNavigateBackToHR}
          />
        );
          case 'createSchool':
                    return (
                              <CreateSchool
                                          onBack={handleNavigateBackToHR}
                                                      onSchoolCreated={handleSchoolCreated}
                                                                />
                                                                        );
      case 'AttendanceSettingsScreen':
        return (
          <AttendanceSettingsScreen
            onBack={handleNavigateBackToHR}
          />
        );
      case 'TeacherAttendanceReport':
        return (
          <TeacherAttendanceReport 
            onBack={handleNavigateBackToHR}
          />
        );
      case 'addStaff':
        return (
          <AddStaff
            onBack={handleNavigateBackToHR}
            onSave={handleStaffAdded}
            onCancel={handleNavigateBackToHR}
            schoolId={selectedSchool?.id || ''}
          />
        );
      case 'salaryManagement':
        return (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Salary Management Module (Placeholder)</Text>
            <TouchableOpacity onPress={handleNavigateBackToHR} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to HR Dashboard</Text>
            </TouchableOpacity>
          </View>
        );
      case 'leaveManagement':
        return (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Leave Management Module (Placeholder)</Text>
            <TouchableOpacity onPress={handleNavigateBackToHR} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to HR Dashboard</Text>
            </TouchableOpacity>
          </View>
        );
      case 'hrReports':
        return (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>HR Reports Module (Placeholder)</Text>
            <TouchableOpacity onPress={handleNavigateBackToHR} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to HR Dashboard</Text>
            </TouchableOpacity>
          </View>
        );
      case 'main':
      default:
        switch (activeModule) {
          case '1':
            return <Dashboard onNavigateToCreateSchool={handleNavigateToCreateSchool}/>;
          case '2':
            return <Students />;
          case '3':
            return <Attendance onBack={handleNavigateToAttendance} onNavigateToSignIn={handleNavigateToAttendanceSignIn}
              onNavigateToSettings={handleNavigateToAttendanceSettings} onNavigateToReports={onNavigateToReports} />;
          case '4':
            return <BudgetManagementSystem />;
          case '5':
            return <Students />;
          case '6':
            return (
              <HR
                onNavigateToStaffList={() => showFirebaseDialog('info', 'Coming Soon', 'Staff List feature will be available soon.')}
                onNavigateToAddStaff={handleNavigateToAddStaff}
                onNavigateToSalaryManagement={handleNavigateToSalaryManagement}
                onNavigateToLeaveManagement={handleNavigateToLeaveManagement}
                onNavigateToCreateSchool={handleNavigateToCreateSchool} onNavigateToHRReports={function (): void {
                  
                } }              />
            );
          case '7':
            return <Students />;
          case '8':
            return <Students />;
          case '9':
            return <Students />;
          default:
            return <Students />;
        }
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.85)', 'rgba(37, 99, 235, 0.90)']}
        style={styles.gradientOverlay}
      >
        <SafeAreaView style={[appStyles.container, isDarkMode && appStyles.darkContainer]}>
          <StatusBar barStyle="light-content" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!isLoggedIn) {
    return (
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.85)', 'rgba(37, 99, 235, 0.90)']}
        style={styles.gradientOverlay}
      >
        <SafeAreaView style={[appStyles.container, isDarkMode && appStyles.darkContainer]}>
          <StatusBar barStyle="light-content" />
          <ScrollView contentContainerStyle={styles.authContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              {renderAuthScreen()}
            </KeyboardAvoidingView>
          </ScrollView>
          <FirebaseErrorDialog
            visible={firebaseDialog.visible}
            type={firebaseDialog.type}
            title={firebaseDialog.title}
            message={firebaseDialog.message}
            onClose={hideFirebaseDialog}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={[appStyles.container, isDarkMode && appStyles.darkContainer]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Header
        title={selectedSchool?.name || 'EduConnect'}
        isDarkMode={isDarkMode}
        user={user}
        onLogout={handleLogout}
        isLoggedIn={isLoggedIn}
        showLogout={true}
      />
      <View style={appStyles.content}>
        <Sidebar
          modules={modules}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          isDarkMode={isDarkMode}
        />
        <View style={appStyles.mainContent}>{renderModule()}</View>
      </View>
      <FirebaseErrorDialog
        visible={firebaseDialog.visible}
        type={firebaseDialog.type}
        title={firebaseDialog.title}
        message={firebaseDialog.message}
        onClose={hideFirebaseDialog}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  gradientOverlay: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  inputContainer: {
    gap: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  authButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authSwitch: {
    alignItems: 'center',
    marginTop: 24,
  },
  authSwitchText: {
    color: '#6b7280',
    fontSize: 14,
  },
  authSwitchHighlight: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  schoolsList: {
    maxHeight: 300,
    marginBottom: 24,
  },
  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  schoolDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  noSchoolsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  noSchoolsText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  noSchoolsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  logoutButton: {
    alignItems: 'center',
    padding: 16,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorDialog: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorDialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDialogMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorDialogButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
  },
  errorDialogButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default App;