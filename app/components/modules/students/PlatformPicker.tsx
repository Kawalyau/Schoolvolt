import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform
} from 'react-native';

// Picker Item interface
export interface PickerItemProps {
  label: string;
  value: string;
}

// Picker interface
interface PickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
  style?: any;
}

// Platform-specific picker implementation
export const PlatformPicker: React.FC<PickerProps> = (props) => {
  if (Platform.OS === 'web') {
    return (
      <select 
        value={props.selectedValue} 
        onChange={(e) => props.onValueChange(e.target.value)}
        style={{ 
          height: 50, 
          borderColor: '#ddd', 
          borderWidth: 1, 
          borderRadius: 8, 
          padding: 10,
          width: '100%',
          ...props.style 
        }}
      >
        {props.children}
      </select>
    );
  }
  
  try {
    const NativePicker = require('@react-native-picker/picker').Picker;
    return <NativePicker {...props} />;
  } catch (error) {
    return (
      <View style={[styles.fallbackPicker, props.style]}>
        <Text>Picker not available</Text>
      </View>
    );
  }
};

// Platform-specific Item component
export const PlatformPickerItem: React.ComponentType<PickerItemProps> = (props) => {
  if (Platform.OS === 'web') {
    return <option value={props.value}>{props.label}</option>;
  }
  
  try {
    const NativePickerItem = require('@react-native-picker/picker').Picker.Item;
    return <NativePickerItem {...props} />;
  } catch (error) {
    return null;
  }
};

const styles = StyleSheet.create({
  fallbackPicker: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  }
});