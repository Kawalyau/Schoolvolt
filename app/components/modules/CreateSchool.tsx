import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { 
  School, 
  MapPin, 
  BookOpen,
  ArrowLeft,
  CheckCircle,
  Upload,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp, where, getDocs, query, updateDoc } from 'firebase/firestore';
import { db, auth, storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { styles as appStyles } from '../../styles';

const { width } = Dimensions.get('window');

interface CreateSchoolProps {
  onBack: () => void;
  onSchoolCreated: () => void;
}

const CreateSchool: React.FC<CreateSchoolProps> = ({ onBack, onSchoolCreated }) => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSchoolName, setCreatedSchoolName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    level: 'Primary' as 'Primary' | 'Secondary' | 'Combined' | 'Other',
    district: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    establishedYear: '',
    motto: '',
    principalName: '',
    totalStudents: '',
    totalTeachers: '',
  });

  const schoolLevels = [
    { value: 'Primary', label: 'Primary School', icon: '📚' },
    { value: 'Secondary', label: 'Secondary School', icon: '🎓' },
    { value: 'Combined', label: 'Combined School', icon: '🏫' },
    { value: 'Other', label: 'Other Institution', icon: '🔬' },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to upload school logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `school-logos/${auth.currentUser?.uid}-${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleCreateSchool = async () => {
    if (!formData.name || !formData.district || !formData.address) {
      Alert.alert('Missing Information', 'Please fill in all required fields (Name, District, and Address).');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Authentication Error', 'You must be logged in to create a school.');
      return;
    }

    setLoading(true);
    try {
      let logoUrl = '';
      
      // Upload image if selected
      if (image) {
        logoUrl = await uploadImage(image);
      }

      // Create school document
      const schoolData = {
        name: formData.name.trim(),
        level: formData.level,
        district: formData.district.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        establishedYear: formData.establishedYear ? parseInt(formData.establishedYear) : null,
        motto: formData.motto.trim() || null,
        principalName: formData.principalName.trim() || null,
        totalStudents: formData.totalStudents ? parseInt(formData.totalStudents) : null,
        totalTeachers: formData.totalTeachers ? parseInt(formData.totalTeachers) : null,
        logoUrl: logoUrl || null,
        adminUids: [auth.currentUser.uid],
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const schoolRef = await addDoc(collection(db, 'schools'), schoolData);

      // Add user to school's users subcollection
      await addDoc(collection(db, 'schools', schoolRef.id, 'users'), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || 'School Admin',
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update user document with school ID
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('uid', '==', auth.currentUser.uid));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          schoolId: schoolRef.id,
          updatedAt: serverTimestamp(),
        });
      }

      // Show success modal and set school name
      setCreatedSchoolName(formData.name.trim());
      setShowSuccessModal(true);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        onSchoolCreated();
      }, 3000);

    } catch (error: any) {
      console.error('Error creating school:', error);
      Alert.alert('Error', 'Failed to create school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    onSchoolCreated();
  };

  const renderFormSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSuccessModal = () => (
    <Modal visible={showSuccessModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.successModalContent}>
          <View style={styles.successIconContainer}>
            <View style={styles.successCheckCircle}>
              <Check size={48} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.successTitle}>School Created Successfully!</Text>
          <Text style={styles.successMessage}>
            {createdSchoolName} has been created and you are now the administrator.
          </Text>
          
          <Text style={styles.successSubtext}>
            You will be redirected to the dashboard in a moment...
          </Text>

          <TouchableOpacity 
            style={styles.successButton}
            onPress={handleCloseSuccessModal}
          >
            <Text style={styles.successButtonText}>Go to Dashboard Now</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleCloseSuccessModal}
          >
            <X size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#4f46e5" />
          </TouchableOpacity>
          <Text style={styles.title}>Create New School</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* School Logo Upload */}
        {renderFormSection('School Logo', (
          <View style={styles.logoSection}>
            <TouchableOpacity 
              style={styles.logoUpload}
              onPress={pickImage}
              disabled={loading}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <ImageIcon size={32} color="#9ca3af" />
                  <Text style={styles.logoText}>Upload Logo</Text>
                </View>
              )}
              <View style={styles.uploadOverlay}>
                <Upload size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.logoHint}>Recommended: 500×500px, PNG or JPG</Text>
          </View>
        ))}

        {/* Basic Information */}
        {renderFormSection('Basic Information', (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>School Name *</Text>
              <View style={styles.inputContainer}>
                <School size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter school name"
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>School Level *</Text>
              <View style={styles.levelGrid}>
                {schoolLevels.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.levelButton,
                      formData.level === level.value && styles.levelButtonSelected
                    ]}
                    onPress={() => handleInputChange('level', level.value)}
                    disabled={loading}
                  >
                    <Text style={styles.levelEmoji}>{level.icon}</Text>
                    <Text style={[
                      styles.levelText,
                      formData.level === level.value && styles.levelTextSelected
                    ]}>
                      {level.label}
                    </Text>
                    {formData.level === level.value && (
                      <CheckCircle size={16} color="#4f46e5" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>District *</Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter district"
                  value={formData.district}
                  onChangeText={(text) => handleInputChange('district', text)}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Full school address"
                  value={formData.address}
                  onChangeText={(text) => handleInputChange('address', text)}
                  multiline
                  numberOfLines={2}
                  editable={!loading}
                />
              </View>
            </View>
          </>
        ))}

        {/* Contact Information */}
        {renderFormSection('Contact Information', (
          <>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="school@example.com"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                placeholder="https://school.edu"
                value={formData.website}
                onChangeText={(text) => handleInputChange('website', text)}
                keyboardType="url"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </>
        ))}

        {/* Additional Information */}
        {renderFormSection('Additional Information', (
          <>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Established Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1990"
                  value={formData.establishedYear}
                  onChangeText={(text) => handleInputChange('establishedYear', text)}
                  keyboardType="numeric"
                  maxLength={4}
                  editable={!loading}
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>School Motto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Learn, Grow, Succeed"
                  value={formData.motto}
                  onChangeText={(text) => handleInputChange('motto', text)}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Principal's Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Principal Name"
                  value={formData.principalName}
                  onChangeText={(text) => handleInputChange('principalName', text)}
                  editable={!loading}
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Total Students</Text>
                <TextInput
                  style={styles.input}
                  placeholder="500"
                  value={formData.totalStudents}
                  onChangeText={(text) => handleInputChange('totalStudents', text)}
                  keyboardType='numeric'
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Teachers</Text>
              <TextInput
                style={styles.input}
                placeholder="25"
                value={formData.totalTeachers}
                onChangeText={(text) => handleInputChange('totalTeachers', text)}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </>
        ))}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateSchool}
          disabled={loading}
        >
          <LinearGradient
            colors={['#4f46e5', '#6366f1']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <School size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create School</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.requiredHint}>* Required fields</Text>
      </ScrollView>

      {/* Success Modal */}
      {renderSuccessModal()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  logoText: {
    marginTop: 8,
    color: '#9ca3af',
    fontSize: 12,
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelButton: {
    flex: 1,
    minWidth: (width - 80) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  levelButtonSelected: {
    backgroundColor: '#f1f5f9',
    borderColor: '#4f46e5',
  },
  levelEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  levelText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  levelTextSelected: {
    color: '#4f46e5',
  },
  checkIcon: {
    marginLeft: 4,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  requiredHint: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successCheckCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  successSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  successButton: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
});

export default CreateSchool;