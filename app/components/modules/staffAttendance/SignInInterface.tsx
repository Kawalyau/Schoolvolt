import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface SignInInterfaceProps {
  onBack: () => void;
}

interface Employee {
  id: string;
  staffId: string;
  name: string;
  position: string;
  type: 'full-time' | 'part-time';
  lateTime: string;
  signInTime: string;
  signOutTime: string;
  workDays: string[];
  pin: string;
}

const SignInInterface: React.FC<SignInInterfaceProps> = ({ onBack }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | ''>('');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    fetchSchoolId();
  }, []);

  const showAlert = (type: 'success' | 'error' | 'info', title: string, text: string) => {
    setMessageType(type);
    setMessage(text);
    setShowMessage(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowMessage(false);
    }, 3000);
  };

  const fetchSchoolId = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setSchoolId(userData.schoolId);
      }
    } catch (error) {
      console.error('Error fetching school ID:', error);
      showAlert('error', 'Error', 'Failed to load configuration');
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const clearPin = () => {
    setPin('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const verifyPin = async (inputPin: string) => {
    try {
      setLoading(true);
      
      if (!schoolId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showAlert('error', 'Error', 'School not configured');
        setPin('');
        return;
      }

      const employeesRef = collection(db, 'schools', schoolId, 'attendanceEmployees');
      const q = query(employeesRef, where('pin', '==', inputPin));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showAlert('error', 'Invalid PIN', 'Please try again');
        setPin('');
        return;
      }

      const employeeData = querySnapshot.docs[0].data() as Employee;
      const employee = {
        id: querySnapshot.docs[0].id,
        ...employeeData
      };

      // Check if already signed in today
      const today = new Date().toISOString().split('T')[0];
      const attendanceRef = collection(db, 'schools', schoolId, 'attendance');
      const attendanceQuery = query(
        attendanceRef, 
        where('staffId', '==', employee.staffId),
        where('date', '==', today)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      if (!attendanceSnapshot.empty) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showAlert('info', 'Already Signed In', `${employee.name}, you've already signed in today`);
        setPin('');
        return;
      }

      // Validate work days for part-time employees
      if (employee.type === 'part-time') {
        const today = new Date().toLocaleString('en-US', { weekday: 'long' });
        if (!employee.workDays.includes(today)) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showAlert('error', 'Invalid Sign-In', 'You are not scheduled to work today');
          setPin('');
          return;
        }
      }

      // Record attendance
      await recordAttendance(employee, inputPin);
      
      // Show success feedback
      showAlert(
        'success', 
        'Success', 
        `Welcome, ${employee.name}! Signed in successfully at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-dismiss after 3 seconds and reset
      setTimeout(() => {
        setPin('');
      }, 3000);
      
    } catch (error) {
      console.error('Error verifying PIN:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('error', 'Error', 'Failed to verify PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const recordAttendance = async (employee: Employee, pin: string) => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().substring(0, 5);
      
      // Check if late
      const [lateHours, lateMinutes] = employee.lateTime.split(':').map(Number);
      const isLate = now.getHours() > lateHours || 
                    (now.getHours() === lateHours && now.getMinutes() > lateMinutes);
      
      const status = isLate ? 'late' : 'present';
      
      await addDoc(collection(db, 'schools', schoolId, 'attendance'), {
        staffId: employee.staffId,
        staffName: employee.name,
        pin: pin,
        date: dateStr,
        time: timeStr,
        status: status,
        timestamp: serverTimestamp(),
        type: employee.type
      });
    } catch (error) {
      console.error('Error recording attendance:', error);
      showAlert('error', 'Error', 'Failed to record attendance');
    }
  };

  const renderNumpad = () => (
    <View style={styles.numpad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
        <TouchableOpacity
          key={num}
          style={styles.numButton}
          onPress={() => handlePinInput(num.toString())}
          disabled={pin.length >= 4 || loading}
        >
          <Text style={styles.numText}>{num}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.numButton} onPress={clearPin} disabled={loading}>
        <Text style={styles.numText}>⌫</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPinDots = () => (
    <View style={styles.pinContainer}>
      {[0, 1, 2, 3].map(index => (
        <View
          key={index}
          style={[
            styles.pinDot,
            index < pin.length && styles.pinDotFilled
          ]}
        />
      ))}
    </View>
  );

  const getMessageStyle = () => {
    switch (messageType) {
      case 'success':
        return [styles.message, styles.successMessage];
      case 'error':
        return [styles.message, styles.errorMessage];
      case 'info':
        return [styles.message, styles.infoMessage];
      default:
        return [styles.message];
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <X size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Sign In</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.instructionText}>
            Enter your 4-digit PIN to sign in
          </Text>
        </View>

        {renderPinDots()}

        {showMessage && (
          <View style={getMessageStyle()}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        {renderNumpad()}

        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  pinDotFilled: {
    backgroundColor: '#4f46e5',
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 300,
  },
  numButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4f46e5',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#4f46e5',
    fontWeight: '600',
  },
  message: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  infoMessage: {
    backgroundColor: '#dbeafe',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default SignInInterface;