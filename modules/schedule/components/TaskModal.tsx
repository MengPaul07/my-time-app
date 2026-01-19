import React from 'react';
import { 
  Modal, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/components/constants/theme';
import { Task } from '@/types/app';
import { PALETTE } from '@/constants/config';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  setTitle: (t: string) => void;
  description: string;
  setDescription: (d: string) => void;
  estimatedDuration: string;
  setEstimatedDuration: (ed: string) => void;
  startTime: Date | null;
  onOpenTimePicker: () => void;
  onOpenDatePicker: () => void;
  selectedColor: string;
  setSelectedColor: (c: string) => void;
  isDeadlineMode: boolean;
  editingTask: Task | null;
  theme: 'light' | 'dark';
  onDelete?: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  onSave,
  title,
  setTitle,
  description,
  setDescription,
  estimatedDuration,
  setEstimatedDuration,
  startTime,
  onOpenTimePicker,
  onOpenDatePicker,
  selectedColor,
  setSelectedColor,
  isDeadlineMode,
  editingTask,
  theme,
  onDelete,
}) => {
  const placeholderColor = Colors[theme].text + '99';

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">
              {editingTask ? '编辑' : '新建'}{isDeadlineMode ? '截止项' : '完成任务'}
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors[theme].icon} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>任务名称</ThemedText>
            <TextInput 
              style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
              value={title} 
              onChangeText={setTitle}
              placeholder="想完成什么？"
              placeholderTextColor={placeholderColor}
            />

            <ThemedText style={styles.label}>补充说明</ThemedText>
            <TextInput 
              style={[styles.input, { height: 80, color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
              value={description} 
              onChangeText={setDescription}
              multiline
              placeholder="可选..."
              placeholderTextColor={placeholderColor}
            />

            {!isDeadlineMode && (
              <>
                <ThemedText style={styles.label}>预计时长 (分钟)</ThemedText>
                <TextInput 
                  style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
                  value={estimatedDuration} 
                  onChangeText={setEstimatedDuration}
                  keyboardType="numeric"
                  placeholder="5 - 300"
                  placeholderTextColor={placeholderColor}
                />
              </>
            )}

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>开始日期</ThemedText>
                <TouchableOpacity 
                   style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                   onPress={onOpenDatePicker}
                >
                  <ThemedText>{startTime ? startTime.toLocaleDateString() : '选择日期'}</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={{ width: 20 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>{isDeadlineMode ? '截止时间' : '开始时间'}</ThemedText>
                <TouchableOpacity 
                  style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                  onPress={onOpenTimePicker}
                >
                  <ThemedText>{startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '点此修改'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {!isDeadlineMode && (
              <>
                <ThemedText style={styles.label}>标记颜色</ThemedText>
                <View style={styles.colorPalette}>
                  {PALETTE.map(c => (
                    <TouchableOpacity 
                      key={c} 
                      style={[styles.colorOption, { backgroundColor: c }, selectedColor === c && styles.selectedColor]} 
                      onPress={() => setSelectedColor(c)} 
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: Colors[theme].tint }]} 
            onPress={onSave}
          >
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>保存</ThemedText>
          </TouchableOpacity>

          {editingTask && onDelete && (
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: '#ff444415', marginTop: 10, borderWidth: 1, borderColor: '#ff4444' }]} 
              onPress={onDelete}
            >
              <ThemedText style={{ color: '#ff4444', fontWeight: 'bold' }}>删除</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    width: '100%', 
    padding: 24, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30,
    maxHeight: '90%'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginTop: 12, opacity: 0.6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  rowInputs: { flexDirection: 'row', marginBottom: 15 },
  dateButton: { borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 10 },
  colorOption: { width: 36, height: 36, borderRadius: 18 },
  selectedColor: { borderWidth: 3, borderColor: '#fff' },
  saveButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
});
