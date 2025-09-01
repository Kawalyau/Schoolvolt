import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Student, SchoolClass } from '../../../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { PlatformPicker, PlatformPickerItem } from './PlatformPicker';

interface StudentFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (studentData: Partial<Student>, photoUri?: string | null) => Promise<void>;
  editingStudent: Student | null;
  schoolClasses: SchoolClass[];
  isUploading: boolean;
}

const StudentForm: React.FC<StudentFormProps> = ({
  visible,
  onClose,
  onSave,
  editingStudent,
  schoolClasses,
  isUploading
}) => {
  const [firstName, setFirstName] = useState(editingStudent?.firstName || '');
  const [middleName, setMiddleName] = useState(editingStudent?.middleName || '');
  const [lastName, setLastName] = useState(editingStudent?.lastName || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(editingStudent?.gender || 'Male');
  const [dateOfBirth, setDateOfBirth] = useState<Date>(() => {
    if (editingStudent?.dateOfBirth instanceof Date) {
      return editingStudent.dateOfBirth;
    } else if (editingStudent?.dateOfBirth && typeof editingStudent.dateOfBirth === 'object' && 'toDate' in editingStudent.dateOfBirth) {
      // Handle Firebase Timestamp
      return (editingStudent.dateOfBirth as any).toDate();
    } else if (editingStudent?.dateOfBirth && typeof editingStudent.dateOfBirth === 'string') {
      return new Date(editingStudent.dateOfBirth);
    }
    return new Date();
  });
  const [classId, setClassId] = useState(editingStudent?.classId || '');
  const [studentRegistrationNumber, setStudentRegistrationNumber] = useState(editingStudent?.studentRegistrationNumber || '');
  const [guardianPhone, setGuardianPhone] = useState(editingStudent?.guardianPhone || '');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Graduated' | 'Withdrawn'>(editingStudent?.status || 'Active');
  const [photo, setPhoto] = useState<string | null>(editingStudent?.photoUrl || null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const handleImagePick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      
      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !classId || !studentRegistrationNumber) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }
    
    const studentData = {
      firstName,
      middleName: middleName || null,
      lastName,
      gender,
      dateOfBirth,
      classId,
      studentRegistrationNumber,
      guardianPhone: guardianPhone || null,
      status,
    };
    
    await onSave(studentData, photo);
  };

  const resetForm = () => {
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setGender('Male');
    setDateOfBirth(new Date());
    setClassId('');
    setStudentRegistrationNumber('');
    setGuardianPhone('');
    setStatus('Active');
    setPhoto(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>
            {editingStudent ? 'Edit Student' : 'Add New Student'}
          </Text>
          
          <ScrollView style={modalStyles.formScrollView}>
            {/* Photo Upload */}
            <TouchableOpacity 
              style={modalStyles.photoContainer}
              onPress={handleImagePick}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={modalStyles.photo} />
              ) : (
                <View style={modalStyles.photoPlaceholder}>
                  <Ionicons name="camera" size={32} color="#ccc" />
                  <Text>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Required Fields */}
            <TextInput
              placeholder="First Name *"
              style={modalStyles.input}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              placeholder="Middle Name"
              style={modalStyles.input}
              value={middleName}
              onChangeText={setMiddleName}
            />
            <TextInput
              placeholder="Last Name *"
              style={modalStyles.input}
              value={lastName}
              onChangeText={setLastName}
            />
            
            {/* Gender Picker */}
            <Text style={modalStyles.label}>Gender *</Text>
            <View style={modalStyles.pickerContainer}>
              <PlatformPicker
                selectedValue={gender}
                onValueChange={(value: string) => setGender(value as 'Male' | 'Female' | 'Other')}
              >
                <PlatformPickerItem label="Male" value="Male" />
                <PlatformPickerItem label="Female" value="Female" />
                <PlatformPickerItem label="Other" value="Other" />
              </PlatformPicker>
            </View>
            
            {/* Date of Birth */}
            <Text style={modalStyles.label}>Date of Birth *</Text>
            <TouchableOpacity 
              style={modalStyles.input}
              onPress={() => setDatePickerVisible(true)}
            >
              <Text>{dateOfBirth.toDateString()}</Text>
            </TouchableOpacity>
            
            {datePickerVisible && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setDatePickerVisible(false);
                  if (selectedDate) setDateOfBirth(selectedDate);
                }}
              />
            )}
            
            {/* Class Picker */}
            <Text style={modalStyles.label}>Class *</Text>
            <View style={modalStyles.pickerContainer}>
              <PlatformPicker
                selectedValue={classId}
                onValueChange={setClassId}
              >
                <PlatformPickerItem label="Select a class" value="" />
                {schoolClasses.map((schoolClass) => (
                  <PlatformPickerItem 
                    key={schoolClass.id} 
                    label={schoolClass.class} 
                    value={schoolClass.id} 
                  />
                ))}
              </PlatformPicker>
            </View>
            
            <TextInput
              placeholder="Registration Number *"
              style={modalStyles.input}
              value={studentRegistrationNumber}
              onChangeText={setStudentRegistrationNumber}
            />
            
            <TextInput
              placeholder="Guardian Phone"
              style={modalStyles.input}
              value={guardianPhone}
              onChangeText={setGuardianPhone}
              keyboardType="phone-pad"
            />
            
            {/* Status Picker */}
            <Text style={modalStyles.label}>Status *</Text>
            <View style={modalStyles.pickerContainer}>
              <PlatformPicker
                selectedValue={status}
                onValueChange={(value: string) => setStatus(value as 'Active' | 'Inactive' | 'Graduated' | 'Withdrawn')}
              >
                <PlatformPickerItem label="Active" value="Active" />
                <PlatformPickerItem label="Inactive" value="Inactive" />
                <PlatformPickerItem label="Graduated" value="Graduated" />
                <PlatformPickerItem label="Withdrawn" value="Withdrawn" />
              </PlatformPicker>
            </View>
          </ScrollView>

          <View style={modalStyles.buttonContainer}>
            <TouchableOpacity 
              style={[modalStyles.button, modalStyles.buttonClose]} 
              onPress={handleClose}
              disabled={isUploading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[modalStyles.button, modalStyles.buttonSave]} 
              onPress={handleSave}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  formScrollView: {
    width: '100%',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 15,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 5,
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSave: {
    backgroundColor: '#2196F3',
  },
  buttonClose: {
    backgroundColor: '#f44336',
  },
});

const styles = StyleSheet.create({
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default StudentForm;