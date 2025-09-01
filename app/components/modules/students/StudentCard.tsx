import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Student } from '../../../types';

interface StudentCardProps {
  student: Student;
  className: string;
  onPress: () => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, className, onPress }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.listItem}>
        {student.photoUrl ? (
          <Image source={{ uri: student.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(student.firstName, student.lastName)}
            </Text>
          </View>
        )}
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle}>
            {student.firstName} {student.lastName}
          </Text>
          <Text style={styles.listItemSubtitle}>
            {student.studentRegistrationNumber} • {className}
          </Text>
          <Text style={styles.listItemStatus}>
            
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listItemSubtitle: {
    color: '#666',
    marginBottom: 2,
  },
  listItemStatus: {
    color: '#888',
    fontSize: 12,
  },
});

export default StudentCard;