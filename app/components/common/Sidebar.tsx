import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Module } from '../../types';
import { styles } from '../../styles';

interface SidebarProps {
  modules: Module[];
  activeModule: string;
  setActiveModule: (id: string) => void;
  isDarkMode: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  modules, 
  activeModule, 
  setActiveModule, 
  isDarkMode 
}) => {
  return (
    <View style={styles.sidebar}>
      {modules.map(module => (
        <TouchableOpacity
          key={module.id}
          style={[
            styles.moduleButton,
            activeModule === module.id && styles.activeModuleButton
          ]}
          onPress={() => setActiveModule(module.id)}
        >
          <MaterialIcons 
            name={module.icon as any} 
            size={24} 
            color={activeModule === module.id ? '#fff' : module.color} 
          />
          <Text 
            style={[
              styles.moduleText,
              activeModule === module.id && styles.activeModuleText,
              isDarkMode && styles.darkText
            ]}
          >
            {module.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default Sidebar;