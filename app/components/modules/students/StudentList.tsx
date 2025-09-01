import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Share,
  Dimensions,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Student, SchoolClass, AppTimestamp } from '../../../types';
import StudentCard from './StudentCard';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';

interface StudentListProps {
  students: Student[];
  schoolClasses: SchoolClass[];
  isLoading: boolean;
  onEditStudent: (student: Student) => void;
}

const { width, height } = Dimensions.get('window');
const SCHOOL_ID = 'izNUR8Cw0zUCGzcoGy2J';

const StudentList: React.FC<StudentListProps> = ({
  students,
  schoolClasses,
  isLoading,
  onEditStudent,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'delete' | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const getClassName = (classId: string) => {
    const schoolClass = schoolClasses.find(c => c.id === classId);
    return schoolClass ? schoolClass.class : 'N/A';
  };

  const handleAction = (student: Student, action: 'view' | 'edit' | 'delete') => {
    setSelectedStudent(student);
    setModalType(action);
    setError(null);
    if (action === 'edit') {
      setEditForm({
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        classId: student.classId,
        studentRegistrationNumber: student.studentRegistrationNumber,
        guardianPhone: student.guardianPhone,
        status: student.status,
      });
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedStudent) {
      setError('No student selected. Please try again.');
      return;
    }
    setError(null);
    try {
      const studentRef = doc(db, `schools/${SCHOOL_ID}/students/${selectedStudent.id}`);
      await updateDoc(studentRef, {
        ...editForm,
        updatedAt: new Date().toISOString() as AppTimestamp,
      });
      setModalType(null);
      setSelectedStudent(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to update student. Please check your connection and try again.');
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) {
      setError('No student selected. Please try again.');
      return;
    }
    setError(null);
    try {
      const studentRef = doc(db, `schools/${SCHOOL_ID}/students/${selectedStudent.id}`);
      await deleteDoc(studentRef);
      setModalType(null);
      setSelectedStudent(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to delete student. Please check your connection and try again.');
    }
  };

  const handleExport = async () => {
    if (!selectedStudent) {
      setError('No student selected. Please try again.');
      return;
    }
    try {
      const message = `
Student Details:
ID: ${selectedStudent.id}
Full Name: ${selectedStudent.firstName} ${selectedStudent.middleName || ''} ${selectedStudent.lastName}
Gender: ${selectedStudent.gender}
Date of Birth: ${selectedStudent.dateOfBirth}
Class: ${getClassName(selectedStudent.classId)}
Registration Number: ${selectedStudent.studentRegistrationNumber}
Guardian Phone: ${selectedStudent.guardianPhone || 'N/A'}
Photo URL: ${selectedStudent.photoUrl || 'N/A'}
Status: ${selectedStudent.status}
Fee Balance: ${selectedStudent.feeBalance || 0}
Created At: ${selectedStudent.createdAt}
Updated At: ${selectedStudent.updatedAt}
Created By: ${selectedStudent.createdBy}
      `.trim();

      await Share.share({ message });
    } catch (err) {
      setError((err as Error).message || 'Failed to export student details');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEditForm({ ...editForm, dateOfBirth: selectedDate.toISOString().split('T')[0] as AppTimestamp });
    }
  };

  const renderStudentItem = ({ item }: { item: Student }) => (
    <View style={styles.cardContainer}>
      <StudentCard 
        student={item} 
        className={getClassName(item.classId)} 
        onPress={() => handleAction(item, 'view')} 
      />
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleAction(item, 'view')}
        >
          <Ionicons name="eye" size={16} color="#fff" />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleAction(item, 'edit')}
        >
          <Ionicons name="create" size={16} color="#fff" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleAction(item, 'delete')}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  if (students.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={64} color="#CCCCCC" />
        <Text style={styles.emptyStateText}>No students found</Text>
        <Text style={styles.emptyStateSubtext}>Add a student to get started</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={students}
        keyExtractor={item => item.id}
        renderItem={renderStudentItem}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={() => setRefreshing(false)}
      />
      
      <Modal
        visible={modalType !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalType(null)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={20} color="#D32F2F" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              
              {modalType === 'view' && selectedStudent && (
                <>
                  <Text style={styles.modalTitle}>Student Details</Text>
                  {selectedStudent.photoUrl && (
                    <Image
                      source={{ uri: selectedStudent.photoUrl }}
                      style={styles.photo}
                    />
                  )}
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={16} color="#4A90E2" />
                    <Text style={styles.detailText}>
                      {`${selectedStudent.firstName} ${selectedStudent.middleName || ''} ${selectedStudent.lastName}`}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="male-female" size={16} color="#4A90E2" />
                    <Text style={styles.detailText}>{selectedStudent.gender}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="school" size={16} color="#4A90E2" />
                    <Text style={styles.detailText}>{getClassName(selectedStudent.classId)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="id-card" size={16} color="#4A90E2" />
                    <Text style={styles.detailText}>{selectedStudent.studentRegistrationNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={16} color="#4A90E2" />
                    <Text style={styles.detailText}>{selectedStudent.guardianPhone || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="stats-chart" size={16} color="#4A90E2" />
                    <Text style={styles.detailText}>{selectedStudent.status}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={16} color="#4A90E2" />
                    <Text style={styles.detailText}>Fee Balance: {selectedStudent.feeBalance || 0}</Text>
                  </View>
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
                      <Ionicons name="share" size={16} color="#fff" />
                      <Text style={styles.buttonText}>Export</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={() => setModalType(null)}
                    >
                      <Text style={styles.secondaryButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              {modalType === 'edit' && selectedStudent && (
                <>
                  <Text style={styles.modalTitle}>Edit Student</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={16} color="#4A90E2" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={editForm.firstName}
                      onChangeText={text => setEditForm({ ...editForm, firstName: text })}
                      placeholder="First Name"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={16} color="#4A90E2" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={editForm.middleName || ''}
                      onChangeText={text => setEditForm({ ...editForm, middleName: text })}
                      placeholder="Middle Name (optional)"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={16} color="#4A90E2" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={editForm.lastName}
                      onChangeText={text => setEditForm({ ...editForm, lastName: text })}
                      placeholder="Last Name"
                    />
                  </View>
                  
                  <View style={styles.pickerContainer}>
                    <Ionicons name="male-female" size={16} color="#4A90E2" style={styles.pickerIcon} />
                    <Picker
                      selectedValue={editForm.gender}
                      onValueChange={(value) => setEditForm({ ...editForm, gender: value as 'Male' | 'Female' | 'Other' })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Gender" value="" />
                      <Picker.Item label="Male" value="Male" />
                      <Picker.Item label="Female" value="Female" />
                      <Picker.Item label="Other" value="Other" />
                    </Picker>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="calendar" size={16} color="#4A90E2" style={styles.inputIcon} />
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker(true)}
                    >
                      
                      
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={editForm.dateOfBirth ? new Date(editForm.dateOfBirth as string) : new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                      />
                    )}
                  </View>
                  
                  <View style={styles.pickerContainer}>
                    <Ionicons name="school" size={16} color="#4A90E2" style={styles.pickerIcon} />
                    <Picker
                      selectedValue={editForm.classId}
                      onValueChange={(value) => setEditForm({ ...editForm, classId: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Class" value="" />
                      {schoolClasses.map((cls) => (
                        <Picker.Item key={cls.id} label={cls.class} value={cls.id} />
                      ))}
                    </Picker>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="id-card" size={16} color="#4A90E2" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={editForm.studentRegistrationNumber}
                      onChangeText={text => setEditForm({ ...editForm, studentRegistrationNumber: text })}
                      placeholder="Registration Number"
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Ionicons name="call" size={16} color="#4A90E2" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={editForm.guardianPhone || ''}
                      onChangeText={text => setEditForm({ ...editForm, guardianPhone: text })}
                      placeholder="Guardian Phone (optional)"
                      keyboardType="phone-pad"
                    />
                  </View>
                  
                  <View style={styles.pickerContainer}>
                    <Ionicons name="stats-chart" size={16} color="#4A90E2" style={styles.pickerIcon} />
                    <Picker
                      selectedValue={editForm.status}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value as 'Active' | 'Inactive' | 'Graduated' | 'Withdrawn' })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Status" value="" />
                      <Picker.Item label="Active" value="Active" />
                      <Picker.Item label="Inactive" value="Inactive" />
                      <Picker.Item label="Graduated" value="Graduated" />
                      <Picker.Item label="Withdrawn" value="Withdrawn" />
                    </Picker>
                  </View>
                  
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleEditSubmit}>
                      <Text style={styles.buttonText}>Save Changes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={() => setModalType(null)}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              {modalType === 'delete' && selectedStudent && (
                <>
                  <View style={styles.deleteIconContainer}>
                    <Ionicons name="warning" size={48} color="#FF3B30" />
                  </View>
                  <Text style={styles.modalTitle}>Confirm Delete</Text>
                  <Text style={styles.deleteText}>
                    Are you sure you want to delete {selectedStudent.firstName} {selectedStudent.lastName}?
                    This action cannot be undone.
                  </Text>
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={() => setModalType(null)}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#4A90E2',
  },
  editButton: {
    backgroundColor: '#34C759',
  },
  
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: height * 0.8,
    position: 'relative',
  },
  modalScrollContent: {
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2C3E50',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#34495E',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#E0E6ED',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  pickerIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 8,
    fontSize: 14,
  },
  deleteIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteText: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 20,
  },
});

export default StudentList;