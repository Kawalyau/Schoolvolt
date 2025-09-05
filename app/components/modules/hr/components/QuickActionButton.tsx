import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';

interface QuickActionButtonProps {
  icon: LucideIcon;
    label: string;
      onPress: () => void;
        colors: string[];
        }

        const QuickActionButton: React.FC<QuickActionButtonProps> = ({ 
          icon: Icon, 
            label, 
              onPress, 
                colors 
                }) => {
                  return (
                      <TouchableOpacity style={styles.button} onPress={onPress}>
                            <LinearGradient colors={colors} style={styles.gradient}>
                                    <Icon size={24} color="#fff" />
                                          </LinearGradient>
                                                <Text style={styles.label}>{label}</Text>
                                                    </TouchableOpacity>
                                                      );
                                                      };

                                                      const styles = StyleSheet.create({
                                                        button: {
                                                            width: (Dimensions.get('window').width - 48) / 2 - 6,
                                                                alignItems: 'center',
                                                                  },
                                                                    gradient: {
                                                                        width: 60,
                                                                            height: 60,
                                                                                borderRadius: 16,
                                                                                    justifyContent: 'center',
                                                                                        alignItems: 'center',
                                                                                            marginBottom: 8,
                                                                                              },
                                                                                                label: {
                                                                                                    fontSize: 14,
                                                                                                        fontWeight: '500',
                                                                                                            color: '#374151',
                                                                                                                textAlign: 'center',
                                                                                                                  },
                                                                                                                  });

                                                                                                                  export default QuickActionButton;