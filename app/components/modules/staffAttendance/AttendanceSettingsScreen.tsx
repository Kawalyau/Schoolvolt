// AttendanceSettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  FlatList,
  Platform
} from 'react-native';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  X,
  Clock,
  Calendar,
  User,
  Key,
  CheckCircle
} from 'lucide-react-native';

interface AttendanceSettingsProps {
  onBack: () => void;
}

interface StaffMember {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  contact: string;
}

interface EmployeeSettings {
  id: string;
  staffId: string;
  name: string;
  type: 'full-time' | 'part-time';
  lateTime: string;
  signInTime: string;
  signOutTime: string;
  workDays: string[];
  pin: string;
}

interface GeneralSettings {
  lateTime: string;
  offDays: string[];
  schoolId: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AttendanceSettingsScreen: React.FC<AttendanceSettingsProps> = ({ onBack }) => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    lateTime: '09:00',
    offDays: [],
    schoolId: ''
  });
  
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [employees, setEmployees] = useState<EmployeeSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerField, setTimePickerField] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get school ID from user document
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const schoolId = userData.schoolId;
        
        if (schoolId) {
          // Get general settings
          const settingsDoc = await getDoc(doc(db, 'schools', schoolId, 'settings', 'attendance'));
          if (settingsDoc.exists()) {
            setGeneralSettings({
              ...settingsDoc.data(),
              schoolId
            } as GeneralSettings);
          } else {
            setGeneralSettings(prev => ({ ...prev, schoolId }));
          }

          // Get staff members
          const staffSnapshot = await getDocs(
            collection(db, 'schools', schoolId, 'staff')
          );
          
          const staffData: StaffMember[] = [];
          staffSnapshot.forEach(doc => {
            staffData.push({ id: doc.id, ...doc.data() } as StaffMember);
          });
          
          setStaffMembers(staffData);

          // Get employee settings
          const employeesSnapshot = await getDocs(
            collection(db, 'schools', schoolId, 'attendanceEmployees')
          );
          
          const employeesData: EmployeeSettings[] = [];
          employeesSnapshot.forEach(doc => {
            employeesData.push({ id: doc.id, ...doc.data() } as EmployeeSettings);
          });
          
          setEmployees(employeesData);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveGeneralSettings = async () => {
    try {
      setSaving(true);
      await setDoc(
        doc(db, 'schools', generalSettings.schoolId, 'settings', 'attendance'),
        {
          lateTime: generalSettings.lateTime,
          offDays: generalSettings.offDays,
          updatedAt: new Date()
        },
        { merge: true }
      );
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveEmployeeSettings = async (employee: EmployeeSettings) => {
    try {
      setSaving(true);
      
      // Validate part-time employees have work days selected
      if (employee.type === 'part-time' && (!employee.workDays || employee.workDays.length === 0)) {
        Alert.alert('Error', 'Part-time employees must have at least one work day selected');
        setSaving(false);
        return;
      }
      
      // Validate PIN is 4 digits
      if (!employee.pin || employee.pin.length !== 4 || isNaN(Number(employee.pin))) {
        Alert.alert('Error', 'PIN must be a 4-digit number');
        setSaving(false);
        return;
      }

      await setDoc(
        doc(db, 'schools', generalSettings.schoolId, 'attendanceEmployees', employee.staffId),
        {
          staffId: employee.staffId,
          name: employee.name,
          type: employee.type,
          lateTime: employee.lateTime,
          signInTime: employee.signInTime,
          signOutTime: employee.signOutTime,
          workDays: employee.workDays || [],
          pin: employee.pin,
          updatedAt: new Date()
        },
        { merge: true }
      );

      // Update local state
      setEmployees(prev => 
        prev.some(emp => emp.staffId === employee.staffId) 
          ? prev.map(emp => emp.staffId === employee.staffId ? employee : emp)
          : [...prev, employee]
      );
      
      setShowEmployeeModal(false);
      Alert.alert('Success', 'Employee settings saved successfully');
    } catch (error) {
      console.error('Error saving employee settings:', error);
      Alert.alert('Error', 'Failed to save employee settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const timeString = selectedDate.toTimeString().substring(0, 5);
      
      if (timePickerField === 'general') {
        setGeneralSettings(prev => ({ ...prev, lateTime: timeString }));
      } else if (editingEmployee) {
        setEditingEmployee(prev => ({
          ...prev!,
          [timePickerField]: timeString
        }));
      }
    }
  };

  const toggleOffDay = (day: string) => {
    setGeneralSettings(prev => ({
      ...prev,
      offDays: prev.offDays.includes(day)
        ? prev.offDays.filter(d => d !== day)
        : [...prev.offDays, day]
    }));
  };

  const toggleWorkDay = (day: string) => {
    if (!editingEmployee) return;
    
    setEditingEmployee(prev => ({
      ...prev!,
      workDays: prev!.workDays.includes(day)
        ? prev!.workDays.filter(d => d !== day)
        : [...prev!.workDays, day]
    }));
  };

  const openTimePicker = (field: string, currentTime: string) => {
    const [hours, minutes] = currentTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    setSelectedTime(date);
    setTimePickerField(field);
    setShowTimePicker(true);
  };

  const getEmployeeForStaff = (staffId: string) => {
    return employees.find(emp => emp.staffId === staffId);
  };

  const renderStaffItem = ({ item }: { item: StaffMember }) => {
    const employeeSettings = getEmployeeForStaff(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.staffItem}
        onPress={() => {
          if (employeeSettings) {
            setEditingEmployee(employeeSettings);
          } else {
            setEditingEmployee({
              id: '', // This will be generated by Firestore
              staffId: item.id,
              name: item.name,
              type: 'full-time',
              lateTime: '09:00',
              signInTime: '08:00',
              signOutTime: '17:00',
              workDays: DAYS_OF_WEEK.slice(0, 5), // Default to weekdays
              pin: Math.floor(1000 + Math.random() * 9000).toString() // Generate random 4-digit PIN
            });
          }
          setShowEmployeeModal(true);
        }}
      >
        <View style={styles.staffInfo}>
          <User size={20} color="#4f46e5" />
          <View>
            <Text style={styles.staffName}>{item.name}</Text>
            <Text style={styles.staffPosition}>{item.position} • {item.department}</Text>
          </View>
        </View>
        
        <View style={styles.staffStatus}>
          {employeeSettings ? (
            <>
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.configuredText}>Configured</Text>
              <Text style={styles.employeeType}>{employeeSettings.type}</Text>
            </>
          ) : (
            <Text style={styles.notConfiguredText}>Not Configured</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Settings</Text>
        <TouchableOpacity onPress={saveGeneralSettings} disabled={saving}>
          <Save size={24} color={saving ? '#9ca3af' : '#4f46e5'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Late Time Threshold</Text>
            <TouchableOpacity 
              style={styles.timeInput}
              onPress={() => openTimePicker('general', generalSettings.lateTime)}
            >
              <Clock size={20} color="#4f46e5" />
              <Text style={styles.timeText}>{generalSettings.lateTime}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Organization Off Days</Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    generalSettings.offDays.includes(day) && styles.dayButtonSelected
                  ]}
                  onPress={() => toggleOffDay(day)}
                >
                  <Text style={[
                    styles.dayText,
                    generalSettings.offDays.includes(day) && styles.dayTextSelected
                  ]}>
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Staff Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Staff Attendance Settings</Text>
          </View>

          {staffMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No staff members found.</Text>
              <Text style={styles.emptyStateSubtext}>
                Add staff members in the Staff section to configure their attendance settings.
              </Text>
            </View>
          ) : (
            <FlatList
              data={staffMembers}
              renderItem={renderStaffItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Employee Settings Modal */}
      <Modal
        visible={showEmployeeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmployeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEmployee?.staffId ? 'Attendance Settings' : 'Add Attendance Settings'}
              </Text>
              <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {editingEmployee && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Staff Member</Text>
                  <Text style={styles.staffNameDisplay}>{editingEmployee.name}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Employment Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editingEmployee.type}
                      onValueChange={(value) => setEditingEmployee({
                        ...editingEmployee, 
                        type: value as 'full-time' | 'part-time'
                      })}
                    >
                      <Picker.Item label="Full Time" value="full-time" />
                      <Picker.Item label="Part Time" value="part-time" />
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sign In Time</Text>
                  <TouchableOpacity 
                    style={styles.timeInput}
                    onPress={() => openTimePicker('signInTime', editingEmployee.signInTime)}
                  >
                    <Clock size={20} color="#4f46e5" />
                    <Text style={styles.timeText}>{editingEmployee.signInTime}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sign Out Time</Text>
                  <TouchableOpacity 
                    style={styles.timeInput}
                    onPress={() => openTimePicker('signOutTime', editingEmployee.signOutTime)}
                  >
                    <Clock size={20} color="#4f46e5" />
                    <Text style={styles.timeText}>{editingEmployee.signOutTime}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Late Time Threshold</Text>
                  <TouchableOpacity 
                    style={styles.timeInput}
                    onPress={() => openTimePicker('lateTime', editingEmployee.lateTime)}
                  >
                    <Clock size={20} color="#4f46e5" />
                    <Text style={styles.timeText}>{editingEmployee.lateTime}</Text>
                  </TouchableOpacity>
                </View>

                {editingEmployee.type === 'part-time' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Work Days (Part-time only)</Text>
                    <View style={styles.daysContainer}>
                      {DAYS_OF_WEEK.map(day => (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayButton,
                            editingEmployee.workDays.includes(day) && styles.dayButtonSelected
                          ]}
                          onPress={() => toggleWorkDay(day)}
                        >
                          <Text style={[
                            styles.dayText,
                            editingEmployee.workDays.includes(day) && styles.dayTextSelected
                          ]}>
                            {day.substring(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>4-Digit PIN (for clocking in/out)</Text>
                  <TextInput
                    style={styles.input}
                    value={editingEmployee.pin}
                    onChangeText={(text) => setEditingEmployee({...editingEmployee, pin: text})}
                    placeholder="1234"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => saveEmployeeSettings(editingEmployee)}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#4f46e5',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    minWidth: 50,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#4f46e5',
  },
  dayText: {
    color: '#374151',
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
  },
  staffItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  staffInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  staffPosition: {
    fontSize: 14,
    color: '#6b7280',
  },
  staffStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  configuredText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  notConfiguredText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  employeeType: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  staffNameDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  pickerContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default AttendanceSettingsScreen;