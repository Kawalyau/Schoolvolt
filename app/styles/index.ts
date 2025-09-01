import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  levelOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
    headerIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#f0f0ff',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 15,
    },
    inputContainerFocused: {
      borderColor: '#4f46e5',
      backgroundColor: '#fff',
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
      transform: [{ scale: 1.01 }],
    },
    pickerContainer: {
      marginBottom: 25,
    },
    pickerLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 10,
    },
  
    levelOptionSelected: {
      backgroundColor: '#4f46e5',
      borderColor: '#4f46e5',
    },
    levelOptionText: {
      color: '#6b7280',
      fontWeight: '500',
    },
    levelOptionTextSelected: {
      color: '#fff',
    },
    backButton: {
      alignItems: 'center',
      marginTop: 15,
    },
    progressContainer: {
      marginTop: 30,
      alignItems: 'center',
    },
    progressBar: {
      width: 100,
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      width: '100%',
      height: '100%',
      backgroundColor: '#fff',
      borderRadius: 2,
    },
    progressText: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 12,
    },
  
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkText: {
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4e54c8',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 80,
    borderRightWidth: 1,
    borderRightColor: '#eaeaea',
    paddingVertical: 16,
  },
  moduleButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  activeModuleButton: {
    backgroundColor: '#4e54c8',
  },
  moduleText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  activeModuleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statCard: {
    width: (width - 64) / 2 - 8,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
  },
  dashboardSection: {
    marginTop: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#888',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4e54c8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4e54c8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  financeSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  financeTitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  financeAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  financeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financeStat: {
    alignItems: 'center',
  },
  financeStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  financeStatLabel: {
    fontSize: 14,
    color: '#888',
  },
  examSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  examSummaryItem: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 64) / 3 - 8,
    shadowColor: '##000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  examSummaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  examSummaryLabel: {
    fontSize: 12,
    color: '#888',
  },
  examButton: {
    backgroundColor: '#4e54c8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  examButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attendancePercentage: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#4e54c8',
    marginBottom: 4,
  },
  attendanceLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  attendanceStat: {
    alignItems: 'center',
  },
  attendanceStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  attendanceStatLabel: {
    fontSize: 14,
    color: '#888',
  },
  todayAttendance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attendancePill: {
    backgroundColor: '#4e54c820',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  attendancePillText: {
    color: '#4e54c8',
    fontWeight: '600',
  },
  timetableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timetableTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  timetableActions: {
    flexDirection: 'row',
  },
  timetableActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  timetable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timetableRow: {
    flexDirection: 'row',
  },
  timetableHeaderCell: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eaeaea',
  },
  timetableHeaderText: {
    fontWeight: '600',
  },
  timetableTimeCell: {
    width: 60,
    padding: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eaeaea',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  timetableTimeText: {
    fontSize: 12,
  },
  timetableCell: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eaeaea',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  timetableSubject: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  timetableRoom: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  popularBooks: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  bookCard: {
    width: 120,
    marginRight: 16,
  },
  bookImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#888',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  attendanceStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    padding: 4,
    borderRadius: 4,
  },
  presentStatus: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  absentStatus: {
    backgroundColor: '#F44336',
    color: '#fff',
  },
  lateStatus: {
    backgroundColor: '#FF9800',
    color: '#fff',
  },
  excusedStatus: {
    backgroundColor: '#9E9E9E',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  attendanceItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  attendancePicker: {
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
   
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // Space between buttons
  },
  
  notificationButton: {
    padding: 8,
  },
  
});