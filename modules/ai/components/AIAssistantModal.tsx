import React, { useState } from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/components/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAIScheduler } from '../hooks/use-ai-scheduler';
import { AIScheduleSuggestion } from '../types';

interface AIAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskConfirmed: (date?: Date) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ visible, onClose, onTaskConfirmed }) => {
  const theme = useColorScheme() ?? 'light';
  const iconColor = Colors[theme].tint;
  const backgroundColor = Colors[theme].background;
  const textColor = Colors[theme].text;

  const [input, setInput] = useState('');
  const { isAnalyzing, suggestions, error, analyzeInput, clearSuggestion, confirmSuggestion } = useAIScheduler();

  const handleSend = () => {
    if (!input.trim()) return;
    analyzeInput(input);
  };

  const handleConfirm = async () => {
    try {
      await confirmSuggestion(); 
      // 提取第一个任务日期以便跳转
      const taskDate = (suggestions && suggestions[0]?.startTime) ? new Date(suggestions[0].startTime) : undefined;
      
      setInput('');
      clearSuggestion();
      onTaskConfirmed(taskDate);
      onClose();
    } catch (e) {
      // 错误已经由 confirmSuggestion 设置在 error state 中
    }
  };

  const handleCancelPrediction = () => {
    clearSuggestion();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={theme}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={[styles.content, { backgroundColor }]}>
            <View style={styles.header}>
              <ThemedText type="subtitle">✨ AI 智能排程助手</ThemedText>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            {!suggestions || suggestions.length === 0 ? (
              // --- 输入模式 ---
              <View style={styles.inputMode}>
                <ThemedText style={{ marginBottom: 12, opacity: 0.7 }}>
                  告诉我你想做什么？比如："明天复习微积分和线性代数";或者，为我制定明天约会的具体事宜（最好有开始的时间和持续时间哦）
                </ThemedText>
                
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: Colors[theme].icon, backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7' }]}
                  placeholder="输入你的计划..."
                  placeholderTextColor={Colors[theme].icon}
                  multiline
                  value={input}
                  onChangeText={setInput}
                  autoFocus
                />

                <TouchableOpacity 
                  style={[styles.sendButton, { backgroundColor: iconColor, opacity: isAnalyzing ? 0.7 : 1 }]}
                  onPress={handleSend}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.sendButtonText}>开始分析</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // --- 确认模式 ---
              <ScrollView style={styles.resultMode}>
                <ThemedText style={{marginBottom: 10, opacity: 0.6}}>
                    AI为您规划了 {suggestions.length} 个操作：
                </ThemedText>
                
                {suggestions.map((suggestion, index) => {
                  const actionText = suggestion.action === 'update' ? '修改' : suggestion.action === 'delete' ? '删除' : '新建';
                  const typeText = suggestion.targetType === 'course' ? '课程' : '任务';
                  return (
                    <View key={index} style={[styles.suggestionCard, { borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 }]}>
                      <View style={styles.row}>
                        <ThemedText type="defaultSemiBold" style={{color: suggestion.action === 'delete' ? '#FF3B30' : suggestion.action === 'update' ? '#007AFF' : undefined}}>
                           [{actionText}{typeText}]
                        </ThemedText>
                        <ThemedText style={styles.value} numberOfLines={1}>
                            {suggestion.title || suggestion.originalTitle}
                        </ThemedText>
                      </View>
                      
                      {suggestion.action !== 'delete' && (
                        <>
                          {suggestion.description && (
                            <View style={styles.row}>
                              <ThemedText type="defaultSemiBold">描述:</ThemedText>
                              <ThemedText style={styles.value}>{suggestion.description}</ThemedText>
                            </View>
                          )}

                          <View style={styles.row}>
                            <ThemedText type="defaultSemiBold">时间:</ThemedText>
                            <ThemedText style={styles.value}>
                              {suggestion.startTime ? new Date(suggestion.startTime).toLocaleString() : '浮动'}
                            </ThemedText>
                          </View>

                          <View style={styles.row}>
                            <ThemedText type="defaultSemiBold">时长:</ThemedText>
                            <ThemedText style={styles.value}>{suggestion.estimatedDuration} 分钟</ThemedText>
                          </View>
                        </>
                      )}
                      
                      {suggestion.action === 'update' && (
                         <ThemedText style={{fontSize: 12, opacity: 0.5, marginTop: 4}}>
                            将修改原项目 "{suggestion.originalTitle}"
                         </ThemedText>
                      )}
                    </View>
                  );
                })}

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancelPrediction}>
                    <ThemedText style={{ color: '#FF3B30' }}>重新修改</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: iconColor }]} onPress={handleConfirm}>
                    <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>全部确认 ({suggestions.length})</ThemedText>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  inputMode: {
    gap: 15,
  },
  input: {
    height: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  sendButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultMode: {
    maxHeight: 400,
  },
  suggestionCard: {
    gap: 12,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  value: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
}); 