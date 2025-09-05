import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ChevronRight, Plus, Edit3, Trash2 } from 'lucide-react-native';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { StaffMember } from '../../../types';
interface StaffListProps {
  schoolId: string;
  onAddStaff: () => void;
  onEditStaff: (staff: StaffMember) => void;
  onViewStaff: (staff: StaffMember) => void;
}

const StaffList: React.FC<StaffListProps> = ({ 
  schoolId, 
  onAddStaff, 
  onEditStaff, 
  onViewStaff 
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;

    const staffRef = collection(db, 'schools', schoolId, 'staff');
    const unsubscribe = onSnapshot(staffRef, (snapshot) => {
      const staffData: StaffMember[] = [];
      snapshot.forEach((doc) => {
        staffData.push({ id: doc.id, ...doc.data() } as StaffMember);
      });
      setStaff(staffData);
      setLoading(false);
    });

    return unsubscribe;
  }, [schoolId]);

  const handleDeleteStaff = async (staffId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'schools', schoolId, 'staff', staffId));
            } catch (error) {
              console.error('Error deleting staff:', error);
              Alert.alert('Error', 'Failed to delete staff member');
            }
          },
        },
      ]
    );
  };

  const renderStaffItem = ({ item }: { item: StaffMember }) => (
    <TouchableOpacity 
      style={styles.staffItem} 
      onPress={() => onViewStaff(item)}
    >
      <View style={styles.staffAvatar}>
        <Text style={styles.avatarText}>
          {item.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </Text>
      </View>
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{item.name}</Text>
        <Text style={styles.staffPosition}>{item.position}</Text>
      </View>
      <View style={styles.staffDetails}>
        <Text style={styles.staffDepartment}>{item.department}</Text>
        <Text style={styles.staffSalary}>${item.salary?.toLocaleString()}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => onEditStaff(item)}
          style={styles.actionButton}
        >
          <Edit3 size={18} color="#4f46e5" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDeleteStaff(item.id)}
          style={styles.actionButton}
        >
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
      <ChevronRight size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff Members</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddStaff}>
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        renderItem={renderStaffItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No staff members found</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={onAddStaff}>
              <Text style={styles.addFirstButtonText}>Add First Staff</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  staffPosition: {
    fontSize: 14,
    color: '#6b7280',
  },
  staffDetails: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  staffDepartment: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  staffSalary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  actions: {
    flexDirection: 'row',
    marginRight: 12,
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  addFirstButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default StaffList;