// components/students/StudentReports.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Student, SchoolClass } from '../../../types';
import { shareAsync } from 'expo-sharing';
import { printToFileAsync } from 'expo-print';

interface StudentReportsProps {
  students: Student[];
  schoolClasses: SchoolClass[];
  selectedStudents?: string[];
}

interface FilterOptions {
  classIds: string[];
  statuses: string[];
  genders: string[];
  activeOnly: boolean;
}

const StudentReports: React.FC<StudentReportsProps> = ({
  students,
  schoolClasses,
  selectedStudents = []
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    classIds: [],
    statuses: [],
    genders: [],
    activeOnly: false
  });

  // Get unique statuses and genders for filter options
  const statusOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.status)));
  }, [students]);

  const genderOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.gender).filter(Boolean)));
  }, [students]);

  // Apply filters to students
  const studentsToExport = useMemo(() => {
    let filteredStudents = selectedStudents.length > 0 
      ? students.filter(student => selectedStudents.includes(student.id))
      : [...students];

    // Apply class filter
    if (filterOptions.classIds.length > 0) {
      filteredStudents = filteredStudents.filter(student => 
        filterOptions.classIds.includes(student.classId)
      );
    }

    // Apply status filter
    if (filterOptions.statuses.length > 0) {
      filteredStudents = filteredStudents.filter(student => 
        filterOptions.statuses.includes(student.status)
      );
    }

    // Apply gender filter
    if (filterOptions.genders.length > 0) {
      filteredStudents = filteredStudents.filter(student => 
        filterOptions.genders.includes(student.gender)
      );
    }

    // Apply active only filter
    if (filterOptions.activeOnly) {
      filteredStudents = filteredStudents.filter(student => 
        student.status === 'Active'
      );
    }

    return filteredStudents;
  }, [students, selectedStudents, filterOptions]);

  const getClassName = (classId: string) => {
    const schoolClass = schoolClasses.find(c => c.id === classId);
    return schoolClass ? schoolClass.class : 'N/A';
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString();
    }
    
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    }
    
    return 'N/A';
  };

  const toggleClassFilter = (classId: string) => {
    setFilterOptions(prev => {
      const newClassIds = prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId];
      
      return { ...prev, classIds: newClassIds };
    });
  };

  const toggleStatusFilter = (status: string) => {
    setFilterOptions(prev => {
      const newStatuses = prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status];
      
      return { ...prev, statuses: newStatuses };
    });
  };

  const toggleGenderFilter = (gender: string) => {
    setFilterOptions(prev => {
      const newGenders = prev.genders.includes(gender)
        ? prev.genders.filter(g => g !== gender)
        : [...prev.genders, gender];
      
      return { ...prev, genders: newGenders };
    });
  };

  const toggleActiveOnly = () => {
    setFilterOptions(prev => ({
      ...prev,
      activeOnly: !prev.activeOnly
    }));
  };

  const clearFilters = () => {
    setFilterOptions({
      classIds: [],
      statuses: [],
      genders: [],
      activeOnly: false
    });
  };

  const generatePDF = async () => {
    if (studentsToExport.length === 0) {
      Alert.alert('No Students', 'There are no students matching your filters');
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert('Info', 'PDF export is only available on mobile devices');
      return;
    }

    try {
      const html = generateHTMLContent();
      const { uri } = await printToFileAsync({ html });
      
      await shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  const generateHTMLContent = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Students Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007BFF;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #007BFF;
            margin: 0;
          }
          .header .subtitle {
            color: #666;
            font-size: 16px;
          }
          .summary {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .student-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .student-table th {
            background-color: #007BFF;
            color: white;
            padding: 12px;
            text-align: left;
          }
          .student-table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
          }
          .student-table tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .status-active {
            color: #28a745;
            font-weight: bold;
          }
          .status-inactive {
            color: #dc3545;
            font-weight: bold;
          }
          .status-graduated {
            color: #6f42c1;
            font-weight: bold;
          }
          .status-withdrawn {
            color: #fd7e14;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Students Detailed Report</h1>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="summary">
          <h2>Report Summary</h2>
          <div class="summary-item">
            <span>Total Students:</span>
            <span>${studentsToExport.length}</span>
          </div>
          <div class="summary-item">
            <span>Active Students:</span>
            <span>${studentsToExport.filter(s => s.status === 'Active').length}</span>
          </div>
          <div class="summary-item">
            <span>Inactive Students:</span>
            <span>${studentsToExport.filter(s => s.status === 'Inactive').length}</span>
          </div>
          <div class="summary-item">
            <span>Graduated Students:</span>
            <span>${studentsToExport.filter(s => s.status === 'Graduated').length}</span>
          </div>
          <div class="summary-item">
            <span>Withdrawn Students:</span>
            <span>${studentsToExport.filter(s => s.status === 'Withdrawn').length}</span>
          </div>
        </div>
        
        <h2>Student Details</h2>
        <table class="student-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Registration #</th>
              <th>Class</th>
              <th>Gender</th>
              <th>Date of Birth</th>
              <th>Guardian Phone</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${studentsToExport.map(student => `
              <tr>
                <td>${student.id.substring(0, 8)}...</td>
                <td>${student.firstName} ${student.middleName || ''} ${student.lastName}</td>
                <td>${student.studentRegistrationNumber}</td>
                <td>${getClassName(student.classId)}</td>
                <td>${student.gender}</td>
                <td>${formatDate(student.dateOfBirth)}</td>
                <td>${student.guardianPhone || 'N/A'}</td>
                <td class="status-${student.status.toLowerCase()}">${student.status}</td>
                <td>${formatDate(student.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated by School Management System • ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter-outline" size={20} color="#007AFF" />
          <Text style={styles.filterButtonText}>Filters</Text>
          {(filterOptions.classIds.length > 0 || 
            filterOptions.statuses.length > 0 || 
            filterOptions.genders.length > 0 ||
            filterOptions.activeOnly) && (
            <View style={styles.filterIndicator} />
          )}
        </TouchableOpacity>
        
        <Text style={styles.resultCount}>
          {studentsToExport.length} student{studentsToExport.length !== 1 ? 's' : ''} match
        </Text>
      </View>

      <TouchableOpacity 
        style={[
          styles.exportButton,
          studentsToExport.length === 0 && styles.exportButtonDisabled
        ]}
        onPress={generatePDF}
        disabled={studentsToExport.length === 0}
      >
        <Ionicons name="download-outline" size={20} color="#fff" />
        <Text style={styles.exportButtonText}>
          Export Students Report
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Students</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersContainer}>
              {/* Class Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Class</Text>
                <View style={styles.filterOptions}>
                  {schoolClasses.map(schoolClass => (
                    <TouchableOpacity
                      key={schoolClass.id}
                      style={[
                        styles.filterOption,
                        filterOptions.classIds.includes(schoolClass.id) && styles.filterOptionSelected
                      ]}
                      onPress={() => toggleClassFilter(schoolClass.id)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filterOptions.classIds.includes(schoolClass.id) && styles.filterOptionTextSelected
                      ]}>
                        {schoolClass.class}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterOptions}>
                  {statusOptions.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        filterOptions.statuses.includes(status) && styles.filterOptionSelected
                      ]}
                      onPress={() => toggleStatusFilter(status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filterOptions.statuses.includes(status) && styles.filterOptionTextSelected
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Gender Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Gender</Text>
                <View style={styles.filterOptions}>
                  {genderOptions.map(gender => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.filterOption,
                        filterOptions.genders.includes(gender) && styles.filterOptionSelected
                      ]}
                      onPress={() => toggleGenderFilter(gender)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filterOptions.genders.includes(gender) && styles.filterOptionTextSelected
                      ]}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Active Only Filter */}
              <View style={styles.filterSection}>
                <View style={styles.switchFilter}>
                  <Text style={styles.switchFilterText}>Active Students Only</Text>
                  <Switch
                    value={filterOptions.activeOnly}
                    onValueChange={toggleActiveOnly}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={filterOptions.activeOnly ? '#007AFF' : '#f4f3f4'}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
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
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: 'relative',
  },
  filterButtonText: {
    marginLeft: 6,
    color: '#007AFF',
    fontWeight: '500',
  },
  filterIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  resultCount: {
    color: '#666',
    fontSize: 14,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filtersContainer: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  filterOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    color: '#333',
  },
  filterOptionTextSelected: {
    color: 'white',
  },
  switchFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchFilterText: {
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  clearButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default StudentReports;