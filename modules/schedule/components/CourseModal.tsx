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
import { Course } from '@/types/app';

interface CourseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  courseName: string;
  setCourseName: (t: string) => void;
  courseLocation: string;
  setCourseLocation: (l: string) => void;
  courseDay: number;
  setCourseDay: (d: number) => void;
  courseStartHour: number;
  courseStartMinute: number;
  courseEndHour: number;
  courseEndMinute: number;
  onOpenStartTimePicker: () => void;
  onOpenEndTimePicker: () => void;
  editingCourse: Course | null;
  theme: 'light' | 'dark';
}

export const CourseModal: React.FC<CourseModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  courseName,
  setCourseName,
  courseLocation,
  setCourseLocation,
  courseDay,
  setCourseDay,
  courseStartHour,
  courseStartMinute,
  courseEndHour,
  courseEndMinute,
  onOpenStartTimePicker,
  onOpenEndTimePicker,
  editingCourse,
  theme,
}) => {
  const placeholderColor = Colors[theme].text + '99';

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">{editingCourse ? '编辑课程' : '添加课程'}</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors[theme].icon} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>课程名称</ThemedText>
            <TextInput 
              style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
              value={courseName} 
              onChangeText={setCourseName}
              placeholder="例如：线性代数"
              placeholderTextColor={placeholderColor}
            />
            
            <ThemedText style={styles.label}>上课地点</ThemedText>
            <TextInput 
              style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
              value={courseLocation} 
              onChangeText={setCourseLocation}
              placeholder="例如：东区一教 504"
              placeholderTextColor={placeholderColor}
            />

            <ThemedText style={styles.label}>星期几 (1-7)</ThemedText>
            <View style={styles.weekSelectContainer}>
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <TouchableOpacity 
                  key={d} 
                  style={[styles.weekOption, courseDay === d && { backgroundColor: Colors[theme].tint, borderColor: Colors[theme].tint }]}
                  onPress={() => setCourseDay(d)}
                >
                  <ThemedText style={[styles.weekOptionText, courseDay === d && { color: '#fff' }]}>
                    {['一', '二', '三', '四', '五', '六', '日'][d-1]}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>开始时间</ThemedText>
                <TouchableOpacity 
                  style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                  onPress={onOpenStartTimePicker}
                >
                  <ThemedText style={{ textAlign: 'center' }}>
                    {String(courseStartHour).padStart(2, '0')}:{String(courseStartMinute).padStart(2, '0')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={{ width: 20 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>结束时间</ThemedText>
                <TouchableOpacity 
                  style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                  onPress={onOpenEndTimePicker}
                >
                  <ThemedText style={{ textAlign: 'center' }}>
                    {String(courseEndHour).padStart(2, '0')}:{String(courseEndMinute).padStart(2, '0')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: Colors[theme].tint }]} 
            onPress={onSave}
          >
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>保存课程</ThemedText>
          </TouchableOpacity>

          {editingCourse && (
            <TouchableOpacity 
              style={[styles.deleteButton]} 
              onPress={onDelete}
            >
              <ThemedText style={{ color: '#ff4444', fontWeight: 'bold' }}>删除课程</ThemedText>
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
  weekSelectContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  weekOption: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  weekOptionText: { fontSize: 14, fontWeight: 'bold' },
  rowInputs: { flexDirection: 'row', marginBottom: 15 },
  dateButton: { borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  saveButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  deleteButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#ff4444' },
});
