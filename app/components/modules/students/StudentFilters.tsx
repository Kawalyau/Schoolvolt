import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet
} from 'react-native';
import { SchoolClass } from '../../../types';
import { PlatformPicker, PlatformPickerItem } from './PlatformPicker';

interface StudentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedClassFilter: string;
  onClassFilterChange: (classId: string) => void;
  schoolClasses: SchoolClass[];
}

const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedClassFilter,
  onClassFilterChange,
  schoolClasses
}) => {
  return (
    <View style={styles.container}>
      {/* Search Input */}
      <TextInput
        placeholder="Search by name or registration number..."
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={onSearchChange}
      />
      
      {/* Class Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Class:</Text>
        <View style={styles.pickerContainer}>
          <PlatformPicker
            selectedValue={selectedClassFilter}
            onValueChange={onClassFilterChange}
            style={styles.picker}
          >
            <PlatformPickerItem label="All Classes" value="all" />
            {schoolClasses.map((schoolClass) => (
              <PlatformPickerItem 
                key={schoolClass.id} 
                label={schoolClass.class} 
                value={schoolClass.id} 
              />
            ))}
          </PlatformPicker>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    marginRight: 10,
    fontWeight: '600',
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 40,
  },
});

export default StudentFilters;