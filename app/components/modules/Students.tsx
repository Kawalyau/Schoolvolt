import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Student, SchoolClass } from '../../types';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db as firestore, getSchoolId  } from '../../config/firebase';

// Import components
import StudentReports from './students/StudentReports';
import StudentForm from './students/StudentForm';
import StudentList from './students/StudentList';
import StudentFilters from './students/StudentFilters';

// Initialize Firebase Storage
const storage = getStorage();

const { width } = Dimensions.get('window');

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'reports'>('list');
  const [schoolId, setSchoolId] = useState<string | null>(null);



  // Load school ID on component mount
  useEffect(() => {
    const loadSchoolId = async () => {
      const id = await getSchoolId();
      setSchoolId(id);
    };
    
    loadSchoolId();
  }, []);

  const loadData = useCallback(() => {
    if (!schoolId) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    setIsLoading(true);

    const studentsQuery = query(
      collection(firestore, `schools/${schoolId}/students`),
      orderBy('lastName')
    );

    const unsubscribeStudents = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const studentData = snapshot.docs.map((doc) => {
          const data = doc.data();
          let dateOfBirth: Date | null = null;

          // Handle different dateOfBirth formats
          if (data.dateOfBirth instanceof Timestamp) {
            dateOfBirth = data.dateOfBirth.toDate();
          } else if (typeof data.dateOfBirth === 'string') {
            dateOfBirth = new Date(data.dateOfBirth); // Parse string to Date
            if (isNaN(dateOfBirth.getTime())) dateOfBirth = null; // Handle invalid dates
          } else if (data.dateOfBirth) {
            console.warn(`Unexpected dateOfBirth format for student ${doc.id}:`, data.dateOfBirth);
          }

          return {
            id: doc.id,
            ...data,
            dateOfBirth,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
          } as unknown as Student;
        });
        setStudents(studentData);
        setIsLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error fetching students:', error);
        Alert.alert('Error', 'Failed to load students');
        setIsLoading(false);
        setRefreshing(false);
      }
    );

    const classesQuery = query(collection(firestore, `schools/${schoolId}/schoolClasses`));
    const unsubscribeClasses = onSnapshot(
      classesQuery,
      (snapshot) => {
        setSchoolClasses(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as SchoolClass))
        );
      },
      (error) => {
        console.error('Error fetching classes:', error);
        Alert.alert('Error', 'Failed to load classes');
      }
    );

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
    };
  }, [schoolId]);

  useEffect(() => {
    const unsubscribe = loadData();
    return unsubscribe;
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const filteredStudents = useMemo(() => {
    let result = students;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(student => 
        student.firstName.toLowerCase().includes(query) ||
        student.middleName?.toLowerCase().includes(query) ||
        student.lastName.toLowerCase().includes(query) ||
        student.studentRegistrationNumber.toLowerCase().includes(query)
      );
    }
    
    // Apply class filter
    if (selectedClassFilter !== 'all') {
      result = result.filter(student => student.classId === selectedClassFilter);
    }
    
    return result;
  }, [students, searchQuery, selectedClassFilter]);

  const uploadImage = useCallback(async (uri: string, studentId: string): Promise<string> => {
    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `schools/${schoolId}/student_photos/${studentId}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [schoolId]);

  const handleSaveStudent = useCallback(async (studentData: Partial<Student>, photoUri?: string | null) => {
    try {
      if (!schoolId) {
        Alert.alert('Error', 'No school associated with your account');
        return;
      }

      let photoUrl = photoUri;
      
      // If a new photo was selected (and it's a local URI), upload it
      if (photoUri && photoUri.startsWith('file://')) {
        photoUrl = await uploadImage(photoUri, editingStudent?.id || 'new');
      }
      
      const finalStudentData = {
        ...studentData,
        schoolId,
        photoUrl: photoUrl || null,
        updatedAt: serverTimestamp(),
      };
      
      if (editingStudent) {
        // Update existing student
        const studentDocRef = doc(firestore, `schools/${schoolId}/students`, editingStudent.id);
        await updateDoc(studentDocRef, finalStudentData);
        Alert.alert('Success', 'Student updated successfully');
      } else {
        // Add new student
        const studentsRef = collection(firestore, `schools/${schoolId}/students`);
        await addDoc(studentsRef, {
          ...finalStudentData,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || 'unknown',
        });
        Alert.alert('Success', 'Student added successfully');
      }
      
      setModalVisible(false);
      setEditingStudent(null);
    } catch (error) {
      console.error('Error saving student:', error);
      Alert.alert('Error', 'Failed to save student');
    }
  }, [editingStudent, schoolId, uploadImage]);

  const handleOpenModal = useCallback((student: Student | null = null) => {
    setEditingStudent(student);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingStudent(null);
  }, []);

  if (!schoolId && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="school-outline" size={64} color="#6c757d" />
          <Text style={styles.errorText}>No School Associated</Text>
          <Text style={styles.errorSubtext}>
            You are not associated with any school. Please contact your administrator.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Student Management</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => handleOpenModal()}
          disabled={!schoolId}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Student</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'list' && styles.activeTab]} 
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
            Student List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]} 
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
      >
        {/* Search and Filter Section */}
        <View style={styles.filterContainer}>
          <StudentFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedClassFilter={selectedClassFilter}
            onClassFilterChange={setSelectedClassFilter}
            schoolClasses={schoolClasses}
          />
        </View>

        {activeTab === 'reports' ? (
          <StudentReports 
            students={filteredStudents} 
            schoolClasses={schoolClasses} 
          />
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                Showing {filteredStudents.length} of {students.length} students
                {selectedClassFilter !== 'all' ? ` in selected class` : ''}
              </Text>
            </View>

            {/* Students List */}
            <StudentList
              students={filteredStudents}
              schoolClasses={schoolClasses}
              isLoading={isLoading}
              onEditStudent={handleOpenModal} 
              schoolId={schoolId || ''}
            />
          </>
        )}
      </ScrollView>

      {/* Add/Edit Student Modal */}
      <StudentForm
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSaveStudent}
        editingStudent={editingStudent}
        schoolClasses={schoolClasses}
        isUploading={isUploading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#6c757d',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#4CAF50',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default Students;