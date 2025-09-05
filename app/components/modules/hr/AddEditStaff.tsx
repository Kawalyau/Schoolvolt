import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../../config/firebase';
import { StaffMember } from '../../../types';
import { LinearGradient } from 'expo-linear-gradient';
import { UserPlus, ArrowLeft, X, Upload, CheckCircle, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { getDocs, query, where } from 'firebase/firestore';

interface AddEditStaffProps {
  schoolId: string;
  staff?: StaffMember;
  onSave: () => void;
  onCancel: () => void;
  onBack: () => void;
}

const AddEditStaff: React.FC<AddEditStaffProps> = ({
  schoolId,
  staff,
  onSave,
  onCancel,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    department: '',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    contact: '',
    email: '',
    ninNumber: '',
    photo: '',
    idAttachment: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string | null>(schoolId);

  // Function to fetch school ID
  const checkSchoolId = async (): Promise<string | null> => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return null;
      }

      // Find user in users collection to get school ID
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Alert.alert('Error', 'User data not found');
        return null;
      }

      const userData = querySnapshot.docs[0].data();
      return userData.schoolId || null;
      
    } catch (error) {
      console.error('Error checking school ID:', error);
      Alert.alert('Error', 'Failed to fetch school information');
      return null;
    }
  };

  useEffect(() => {
    // If schoolId prop is not provided, try to fetch it
    const fetchSchoolId = async () => {
      if (!schoolId) {
        const fetchedSchoolId = await checkSchoolId();
        setResolvedSchoolId(fetchedSchoolId);
      } else {
        setResolvedSchoolId(schoolId);
      }
    };

    fetchSchoolId();
  }, [schoolId]);

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name || '',
        position: staff.position || '',
        department: staff.department || '',
        salary: staff.salary?.toString() || '',
        joinDate: staff.joinDate || new Date().toISOString().split('T')[0],
        contact: staff.contact || '',
        email: staff.email || '',
        ninNumber: staff.ninNumber || '',
        photo: staff.photo || '',
        idAttachment: staff.idAttachment || '',
      });
    }
  }, [staff]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.position.trim()) newErrors.position = 'Position is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.salary.trim()) newErrors.salary = 'Salary is required';
    if (isNaN(parseFloat(formData.salary))) newErrors.salary = 'Salary must be a valid number';
    if (!formData.ninNumber.trim()) newErrors.ninNumber = 'NIN Number is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photo library.');
        return false;
      }
    }
    return true;
  };

  const handleImagePick = async (field: 'photo' | 'idAttachment') => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'photo' ? [1, 1] : undefined,
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      setLoading(true);
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileName = `${field}-${Date.now()}.${result.assets[0].type?.split('/')[1] || 'jpg'}`;
        const storageRef = ref(storage, `schools/${resolvedSchoolId}/staff/${fileName}`);

        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        setFormData((prev) => ({ ...prev, [field]: downloadURL }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Image upload error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to upload image');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    if (!resolvedSchoolId) {
      Alert.alert('Error', 'School information not available. Please try again.');
      return;
    }

    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      const staffData = {
        name: formData.name.trim(),
        position: formData.position.trim(),
        department: formData.department.trim(),
        salary: parseFloat(formData.salary),
        joinDate: formData.joinDate,
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        ninNumber: formData.ninNumber.trim(),
        photo: formData.photo,
        idAttachment: formData.idAttachment,
        updatedAt: serverTimestamp(),
      };

      if (staff) {
        // Update existing staff
        await setDoc(doc(db, 'schools', resolvedSchoolId, 'staff', staff.id), staffData);
      } else {
        // Add new staff - Fixed collection reference
        await addDoc(collection(db, 'schools', resolvedSchoolId, 'staff'), {
          ...staffData,
          createdAt: serverTimestamp(),
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error('Error saving staff:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      if (error.code === 'invalid-argument') {
        Alert.alert('Error', 'Invalid data format. Please check your inputs.');
      } else if (error.code === 'permission-denied') {
        Alert.alert('Error', 'You do not have permission to perform this action.');
      } else {
        Alert.alert('Error', 'Failed to save staff member. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = (addAnother: boolean) => {
    setSuccessModalVisible(false);
    if (addAnother) {
      setFormData({
        name: '',
        position: '',
        department: '',
        salary: '',
        joinDate: new Date().toISOString().split('T')[0],
        contact: '',
        email: '',
        ninNumber: '',
        photo: '',
        idAttachment: '',
      });
      setErrors({});
    } else {
      onSave();
    }
  };

  const handleCancel = () => {
    const hasChanges = Object.values(formData).some(value => value !== '');
    
    if (hasChanges && !staff) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  if (!resolvedSchoolId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#4f46e5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </Text>
        </View>
        <View style={styles.centeredMessage}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.messageText}>Loading school information...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} disabled={loading} style={styles.backButton}>
          <ArrowLeft size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
        </Text>
        <TouchableOpacity onPress={handleCancel} disabled={loading} style={styles.closeButton}>
          <X size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter full name"
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Position *</Text>
            <TextInput
              style={[styles.input, errors.position && styles.inputError]}
              value={formData.position}
              onChangeText={(text) => handleInputChange('position', text)}
              placeholder="Enter position"
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
            {errors.position ? <Text style={styles.errorText}>{errors.position}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Department *</Text>
            <TextInput
              style={[styles.input, errors.department && styles.inputError]}
              value={formData.department}
              onChangeText={(text) => handleInputChange('department', text)}
              placeholder="Enter department"
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
            {errors.department ? <Text style={styles.errorText}>{errors.department}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Salary ($) *</Text>
            <TextInput
              style={[styles.input, errors.salary && styles.inputError]}
              value={formData.salary}
              onChangeText={(text) => handleInputChange('salary', text)}
              placeholder="Enter salary"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              editable={!loading}
            />
            {errors.salary ? <Text style={styles.errorText}>{errors.salary}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>NIN Number *</Text>
            <TextInput
              style={[styles.input, errors.ninNumber && styles.inputError]}
              value={formData.ninNumber}
              onChangeText={(text) => handleInputChange('ninNumber', text)}
              placeholder="Enter NIN number"
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
            {errors.ninNumber ? <Text style={styles.errorText}>{errors.ninNumber}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              placeholder="Enter email address"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={formData.contact}
              onChangeText={(text) => handleInputChange('contact', text)}
              placeholder="Enter contact number"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Join Date</Text>
            <TextInput
              style={styles.input}
              value={formData.joinDate}
              onChangeText={(text) => handleInputChange('joinDate', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Photo</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleImagePick('photo')}
              disabled={loading}
            >
              <Upload size={20} color="#4f46e5" />
              <Text style={styles.uploadButtonText}>
                {formData.photo ? 'Photo Uploaded' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>
            {formData.photo && (
              <Text style={styles.uploadedFileText}>Uploaded</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ID Attachment</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleImagePick('idAttachment')}
              disabled={loading}
            >
              <Upload size={20} color="#4f46e5" />
              <Text style={styles.uploadButtonText}>
                {formData.idAttachment ? 'ID Uploaded' : 'Upload ID Attachment'}
              </Text>
            </TouchableOpacity>
            {formData.idAttachment && (
              <Text style={styles.uploadedFileText}>Uploaded</Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading}
            >
              <LinearGradient
                colors={['#e5e7eb', '#d1d5db']}
                style={styles.gradientButton}
              >
                <X size={20} color="#374151" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              <LinearGradient
                colors={['#4f46e5', '#6366f1']}
                style={styles.gradientButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <UserPlus size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {staff ? 'Update Staff' : 'Add Staff'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => handleSuccessModalClose(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <CheckCircle size={48} color="#10b981" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>
              {staff ? 'Staff Updated' : 'Staff Added'}
            </Text>
            <Text style={styles.modalText}>
              Staff member {staff ? 'updated' : 'added'} successfully!
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSuccessModalClose(true)}
              >
                <LinearGradient
                  colors={['#f59e0b', '#fbbf24']}
                  style={styles.gradientButton}
                >
                  <Text style={styles.modalButtonText}>Add Another</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSuccessModalClose(false)}
              >
                <LinearGradient
                  colors={['#4f46e5', '#6366f1']}
                  style={styles.gradientButton}
                >
                  <Text style={styles.modalButtonText}>Return to Dashboard</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <XCircle size={48} color="#ef4444" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Discard Changes?</Text>
            <Text style={styles.modalText}>
              You have unsaved changes. Are you sure you want to discard them?
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowCancelConfirm(false)}
              >
                <LinearGradient
                  colors={['#e5e7eb', '#d1d5db']}
                  style={styles.gradientButton}
                >
                  <Text style={styles.cancelModalButtonText}>Keep Editing</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmCancelButton]}
                onPress={confirmCancel}
              >
                <LinearGradient
                  colors={['#ef4444', '#f87171']}
                  style={styles.gradientButton}
                >
                  <Text style={styles.modalButtonText}>Discard</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 5,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#4f46e5',
    marginLeft: 10,
  },
  uploadedFileText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelModalButton: {
    flex: 1,
  },
  confirmCancelButton: {
    flex: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default AddEditStaff;