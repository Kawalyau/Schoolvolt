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
} from 'react-native';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Dashboard from './components/modules/Dashboard';
import Attendance from './components/modules/Attendance';
import Students from './components/modules/Students';
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
import { School, User, Lock, Eye, EyeOff, ArrowRight, Home, BookOpen, Users, Calendar, Settings, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState, useEffect } from 'react';
import HR from './components/modules/HR';
import CreateSchool from './components/modules/CreateSchool';

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

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<string>('1');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'schools' | 'createSchool'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    schoolName: '',
    schoolLevel: 'Primary' as 'Primary' | 'Secondary' | 'Other',
    district: '',
  });
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'main' | 'createSchool'>('main');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  // Animation for screen transitions
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp)
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp)
      })
    ]).start();
  }, [authScreen, isLoggedIn]);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            createdAt: serverTimestamp(),
          });
          await fetchSchools(firebaseUser.uid);
          setIsLoggedIn(true);
          setAuthScreen('schools');
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
      setIsLoggedIn(false);
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!formData.email || !formData.password || !formData.displayName) {
      Alert.alert('Error', 'Please fill in all fields');
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

      // Create user profile in Firestore
      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        email: user.email,
        displayName: formData.displayName,
        createdAt: serverTimestamp(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Account created successfully!');
      setAuthScreen('createSchool');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Signup Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchool = async () => {
    if (!formData.schoolName || !formData.district || !user) {
      Alert.alert('Error', 'Please fill in all school fields');
      return;
    }
  
    setIsLoading(true);
    try {
      // Create the school document
      const schoolRef = await addDoc(collection(db, 'schools'), {
        name: formData.schoolName,
        level: formData.schoolLevel,
        district: formData.district,
        adminUids: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  
      // Add the user to the school's users subcollection
      await addDoc(collection(db, 'schools', schoolRef.id, 'users'), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || formData.displayName,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update user document with school ID
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('uid', '==', user.uid));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          schoolId: schoolRef.id,
          updatedAt: serverTimestamp(),
        });
      }
  
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'School created successfully!');
      await fetchSchools(user.uid);
      setAuthScreen('schools');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to create school');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchools = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'schools'),
        where('adminUids', 'array-contains', uid)
      );
      const querySnapshot = await getDocs(q);
      const schoolList: SchoolData[] = [];
      querySnapshot.forEach((doc) => {
        schoolList.push({ id: doc.id, ...doc.data() } as SchoolData);
      });
      setSchools(schoolList);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setIsLoggedIn(false);
    setSelectedSchool(null);
    setAuthScreen('login');
    setFormData({
      email: '',
      password: '',
      displayName: '',
      schoolName: '',
      schoolLevel: 'Primary',
      district: '',
    });
  };

  const handleSelectSchool = (school: SchoolData) => {
    setSelectedSchool(school);
    setIsLoggedIn(true);
    setActiveModule('1');
  };

  const handleNavigateToCreateSchool = () => {
    setCurrentScreen('createSchool');
  };

  const handleNavigateBackToHR = () => {
    setCurrentScreen('main');
  };

  const handleSchoolCreated = () => {
    if (user) {
      fetchSchools(user.uid);
      setCurrentScreen('main');
      // Refresh the HR data
      setSelectedSchool(null);
      setAuthScreen('schools');
    }
  };

  const renderModule = () => {
    if (currentScreen === 'createSchool') {
      return (
        <CreateSchool 
          onBack={handleNavigateBackToHR}
          onSchoolCreated={handleSchoolCreated}
        />
      );
    }

    switch (activeModule) {
      case '1': return <Dashboard onNavigateToCreateSchool={handleNavigateToCreateSchool} />;
      case '2': return <Students />;
      case '3': return <Attendance />;
      case '4': return <Students />;
      case '5': return <Students />;
      case '6': return <HR onNavigateToCreateSchool={handleNavigateToCreateSchool} />;
      case '7': return <Students />;
      case '8': return <Students />;
      case '9': return <Students />;
      default: return <Students />;
    }
  };

  const renderLogin = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <School size={42} color="#4f46e5" />
            </View>
            <Text style={styles.title}>EduConnect</Text>
            <Text style={styles.subtitle}>School Management Portal</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to continue to your account</Text>

            <View style={styles.inputContainer}>
              <User size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#4f46e5', '#6366f1']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>Sign In</Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAuthScreen('signup')} disabled={isLoading}>
              <Text style={styles.authLink}>Don't have an account? <Text style={styles.authLinkHighlight}>Sign Up</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  const renderSignup = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <School size={42} color="#4f46e5" />
            </View>
            <Text style={styles.title}>EduConnect</Text>
            <Text style={styles.subtitle}>Create Your Account</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign Up</Text>
            <Text style={styles.cardSubtitle}>Create a new administrator account</Text>

            <View style={styles.inputContainer}>
              <User size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#9ca3af"
                value={formData.displayName}
                onChangeText={(text) => handleInputChange('displayName', text)}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#4f46e5', '#6366f1']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>Create Account</Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAuthScreen('login')} disabled={isLoading}>
              <Text style={styles.authLink}>Already have an account? <Text style={styles.authLinkHighlight}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  const renderCreateSchool = () => (
    <CreateSchool 
      onBack={() => setAuthScreen('schools')}
      onSchoolCreated={() => {
        if (user) {
          fetchSchools(user.uid);
          setAuthScreen('schools');
        }
      }}
    />
  );

  const renderSchools = () => (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <School size={42} color="#4f46e5" />
        </View>
        <Text style={styles.title}>EduConnect</Text>
        <Text style={styles.subtitle}>Your Schools</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Schools</Text>
        {schools.length === 0 ? (
          <Text style={styles.cardSubtitle}>No schools found. Create one to get started!</Text>
        ) : (
          <FlatList
            data={schools}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.schoolItem}
                onPress={() => handleSelectSchool(item)}
              >
                <View style={styles.schoolIcon}>
                  <School size={24} color="#4f46e5" />
                </View>
                <View style={styles.schoolInfo}>
                  <Text style={styles.schoolName}>{item.name}</Text>
                  <Text style={styles.schoolDetails}>{item.level} - {item.district}</Text>
                </View>
                <ArrowRight size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          />
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setAuthScreen('createSchool')}
        >
          <LinearGradient
            colors={['#4f46e5', '#6366f1']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.actionButtonText}>Create New School</Text>
            <ArrowRight size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.authLink}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Show loading screen while checking auth status
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

  // Show auth screens if not logged in
  if (!isLoggedIn) {
    return (
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.85)', 'rgba(37, 99, 235, 0.90)']}
        style={styles.gradientOverlay}
      >
        <SafeAreaView style={[appStyles.container, isDarkMode && appStyles.darkContainer]}>
          <StatusBar barStyle="light-content" />
          {authScreen === 'login' && renderLogin()}
          {authScreen === 'signup' && renderSignup()}
          {authScreen === 'schools' && renderSchools()}
          {authScreen === 'createSchool' && renderCreateSchool()}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Show main app if logged in and school selected
  return (
    <SafeAreaView style={[appStyles.container, isDarkMode && appStyles.darkContainer]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <Header 
        title={selectedSchool?.name || "EduConnect"} 
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
        
        <View style={appStyles.mainContent}>
          {renderModule()}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  gradientOverlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingLeft: 15,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#1f2937',
  },
  eyeIcon: {
    padding: 15,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authLink: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  authLinkHighlight: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  schoolItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  schoolDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default App;