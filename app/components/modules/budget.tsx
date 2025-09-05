import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Mock data for demonstration
const mockBudgetData = [
  { id: '1', category: 'Salaries', allocated: 50000, spent: 42000, period: 'Monthly' },
  { id: '2', category: 'Utilities', allocated: 5000, spent: 3800, period: 'Monthly' },
  { id: '3', category: 'Supplies', allocated: 3000, spent: 2500, period: 'Monthly' },
  { id: '4', category: 'Marketing', allocated: 8000, spent: 6500, period: 'Monthly' },
  { id: '5', category: 'Travel', allocated: 4000, spent: 5200, period: 'Monthly' },
];

const mockExpenses = [
  { id: '1', category: 'Salaries', amount: 12000, date: '2023-10-05', description: 'October payroll' },
  { id: '2', category: 'Utilities', amount: 1200, date: '2023-10-03', description: 'Electricity bill' },
  { id: '3', category: 'Supplies', amount: 800, date: '2023-10-02', description: 'Office supplies' },
  { id: '4', category: 'Marketing', amount: 2000, date: '2023-10-01', description: 'Social media ads' },
];

const BudgetManagementSystem = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [budgets, setBudgets] = useState(mockBudgetData);
  const [expenses, setExpenses] = useState(mockExpenses);
  const [newBudget, setNewBudget] = useState({
    name: '',
    period: 'Monthly',
    categories: [{ category: '', amount: '' }]
  });
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }),
    ]).start();
  }, [activeTab]);

  const calculateTotal = (type) => {
    return budgets.reduce((total, item) => total + item[type], 0);
  };

  const totalAllocated = calculateTotal('allocated');
  const totalSpent = calculateTotal('spent');
  const remainingBudget = totalAllocated - totalSpent;

  const renderDashboard = () => {
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView>
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Budget</Text>
              <Text style={styles.summaryValue}>${totalAllocated.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Spent</Text>
              <Text style={styles.summaryValue}>${totalSpent.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, remainingBudget < 0 && { color: '#ff4444' }]}>
                ${remainingBudget.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Budget Progress */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Overview</Text>
            {budgets.map((item) => {
              const percentage = (item.spent / item.allocated) * 100;
              return (
                <View key={item.id} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text style={styles.budgetCategory}>{item.category}</Text>
                    <Text style={styles.budgetAmount}>${item.spent.toLocaleString()} / ${item.allocated.toLocaleString()}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: percentage > 90 ? '#ff4444' : percentage > 75 ? '#ffbb33' : '#00C851'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.percentageText}>{percentage.toFixed(0)}%</Text>
                </View>
              );
            })}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setActiveTab('addExpense')}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setActiveTab('createBudget')}
              >
                <Ionicons name="document-text" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Create Budget</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Expenses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            {expenses.slice(0, 3).map((expense) => (
              <View key={expense.id} style={styles.expenseItem}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseCategory}>{expense.category}</Text>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseDate}>{expense.date}</Text>
                </View>
                <Text style={styles.expenseAmount}>${expense.amount.toLocaleString()}</Text>
              </View>
            ))}
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => setActiveTab('expenses')}
            >
              <Text style={styles.viewAllButtonText}>View All Expenses</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderCreateBudget = () => {
    const addCategory = () => {
      setNewBudget({
        ...newBudget,
        categories: [...newBudget.categories, { category: '', amount: '' }]
      });
    };

    const removeCategory = (index) => {
      if (newBudget.categories.length > 1) {
        const updated = [...newBudget.categories];
        updated.splice(index, 1);
        setNewBudget({ ...newBudget, categories: updated });
      }
    };

    const updateCategory = (index, field, value) => {
      const updated = [...newBudget.categories];
      updated[index][field] = value;
      setNewBudget({ ...newBudget, categories: updated });
    };

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView>
          <Text style={styles.headerTitle}>Budget Planning</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Budget Name</Text>
            <TextInput
              style={styles.input}
              value={newBudget.name}
              onChangeText={(text) => setNewBudget({...newBudget, name: text})}
              placeholder="e.g., Q4 2023 Budget"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Period</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity 
                style={[styles.radioButton, newBudget.period === 'Monthly' && styles.radioButtonActive]}
                onPress={() => setNewBudget({...newBudget, period: 'Monthly'})}
              >
                <Text style={newBudget.period === 'Monthly' ? styles.radioTextActive : styles.radioText}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.radioButton, newBudget.period === 'Quarterly' && styles.radioButtonActive]}
                onPress={() => setNewBudget({...newBudget, period: 'Quarterly'})}
              >
                <Text style={newBudget.period === 'Quarterly' ? styles.radioTextActive : styles.radioText}>Quarterly</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.radioButton, newBudget.period === 'Annual' && styles.radioButtonActive]}
                onPress={() => setNewBudget({...newBudget, period: 'Annual'})}
              >
                <Text style={newBudget.period === 'Annual' ? styles.radioTextActive : styles.radioText}>Annual</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Budget Categories</Text>
              <TouchableOpacity onPress={addCategory}>
                <Ionicons name="add-circle" size={24} color="#6200ee" />
              </TouchableOpacity>
            </View>
            
            {newBudget.categories.map((item, index) => (
              <View key={index} style={styles.categoryRow}>
                <TextInput
                  style={[styles.input, styles.categoryInput]}
                  value={item.category}
                  onChangeText={(text) => updateCategory(index, 'category', text)}
                  placeholder="Category name"
                />
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={item.amount}
                  onChangeText={(text) => updateCategory(index, 'amount', text)}
                  placeholder="Amount"
                  keyboardType="numeric"
                />
                {newBudget.categories.length > 1 && (
                  <TouchableOpacity onPress={() => removeCategory(index)}>
                    <Ionicons name="remove-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setActiveTab('dashboard')}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderAddExpense = () => {
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView>
          <Text style={styles.headerTitle}>Add Expense</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={newExpense.category}
              onChangeText={(text) => setNewExpense({...newExpense, category: text})}
              placeholder="e.g., Utilities, Supplies"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={newExpense.amount}
              onChangeText={(text) => setNewExpense({...newExpense, amount: text})}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={newExpense.date}
              onChangeText={(text) => setNewExpense({...newExpense, date: text})}
              placeholder="YYYY-MM-DD"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={newExpense.description}
              onChangeText={(text) => setNewExpense({...newExpense, description: text})}
              placeholder="Brief description of the expense"
            />
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setActiveTab('dashboard')}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderExpenses = () => {
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.headerTitle}>Expense Tracking</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setActiveTab('addExpense')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.expenseItem}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseCategory}>{item.category}</Text>
                <Text style={styles.expenseDescription}>{item.description}</Text>
                <Text style={styles.expenseDate}>{item.date}</Text>
              </View>
              <Text style={styles.expenseAmount}>${item.amount.toLocaleString()}</Text>
            </View>
          )}
        />
      </Animated.View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'createBudget':
        return renderCreateBudget();
      case 'addExpense':
        return renderAddExpense();
      case 'expenses':
        return renderExpenses();
      default:
        return renderDashboard();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {activeTab !== 'dashboard' && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => activeTab === 'expenses' ? setActiveTab('dashboard') : onBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {activeTab === 'dashboard' ? 'Budget Dashboard' : 
           activeTab === 'createBudget' ? 'Create Budget' :
           activeTab === 'addExpense' ? 'Add Expense' :
           activeTab === 'expenses' ? 'All Expenses' : 'Budget Management'}
        </Text>
        {activeTab === 'dashboard' && (
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'dashboard' && (
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
            onPress={() => setActiveTab('expenses')}
          >
            <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>Expenses</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6200ee',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 16,
    fontWeight: '500',
  },
  budgetAmount: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '500',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#666',
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6200ee',
    borderRadius: 8,
  },
  viewAllButtonText: {
    color: '#6200ee',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  radioGroup: {
    flexDirection: 'row',
  },
  radioButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f8f9fa',
  },
  radioButtonActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  radioText: {
    color: '#333',
  },
  radioTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInput: {
    flex: 2,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    marginRight: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#6200ee',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BudgetManagementSystemnpm install
;