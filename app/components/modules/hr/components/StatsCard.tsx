import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';

interface StatsCardProps {
  icon: LucideIcon;
    value: string | number;
      label: string;
        colors: string[];
        }

        const StatsCard: React.FC<StatsCardProps> = ({ icon: Icon, value, label, colors }) => {
          return (
              <View style={styles.card}>
                    <LinearGradient colors={colors} style={styles.gradient}>
                            <Icon size={24} color="#fff" />
                                  </LinearGradient>
                                        <Text style={styles.value}>{value}</Text>
                                              <Text style={styles.label}>{label}</Text>
                                                  </View>
                                                    );
                                                    };

                                                    const styles = StyleSheet.create({
                                                      card: {
                                                          width: (Dimensions.get('window').width - 48) / 2 - 6,
                                                              backgroundColor: '#fff',
                                                                  borderRadius: 16,
                                                                      padding: 16,
                                                                          alignItems: 'center',
                                                                              shadowColor: '#000',
                                                                                  shadowOffset: { width: 0, height: 2 },
                                                                                      shadowOpacity: 0.1,
                                                                                          shadowRadius: 4,
                                                                                              elevation: 3,
                                                                                                },
                                                                                                  gradient: {
                                                                                                      width: 48,
                                                                                                          height: 48,
                                                                                                              borderRadius: 24,
                                                                                                                  justifyContent: 'center',
                                                                                                                      alignItems: 'center',
                                                                                                                          marginBottom: 12,
                                                                                                                            },
                                                                                                                              value: {
                                                                                                                                  fontSize: 20,
                                                                                                                                      fontWeight: 'bold',
                                                                                                                                          color: '#1f2937',
                                                                                                                                              marginBottom: 4,
                                                                                                                                                },
                                                                                                                                                  label: {
                                                                                                                                                      fontSize: 12,
                                                                                                                                                          color: '#6b7280',
                                                                                                                                                              textAlign: 'center',
                                                                                                                                                                },
                                                                                                                                                                });

                                                                                                                                                                export default StatsCard;