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
import { useTranslation } from 'react-i18next';
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
  location: string;
  setLocation: (l: string) => void;
  estimatedDuration: string;
  setEstimatedDuration: (ed: string) => void;
  startTime: Date | null;
  onOpenTimePicker: () => void;
  onOpenDatePicker: () => void;
  selectedColor: string;
  setSelectedColor: (c: string) => void;
  isDeadlineMode: boolean;
  isRecurring: boolean;
  setIsRecurring: (v: boolean) => void;
  recurringDays: number[];
  setRecurringDays: (days: number[]) => void;
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
  location,
  setLocation,
  estimatedDuration,
  setEstimatedDuration,
  startTime,
  onOpenTimePicker,
  onOpenDatePicker,
  selectedColor,
  setSelectedColor,
  isDeadlineMode,
  isRecurring,
  setIsRecurring,
  recurringDays,
  setRecurringDays,
  editingTask,
  theme,
  onDelete,
}) => {
  const { t } = useTranslation();
  const placeholderColor = Colors[theme].text + '99';
  const weekdayLabels = t('weekdays.shortMonFirst', { returnObjects: true }) as string[];
  const weekDays = [1, 2, 3, 4, 5, 6, 7].map((value, index) => ({ label: weekdayLabels[index], value }));

  const toggleRecurringDay = (day: number) => {
    if (recurringDays.includes(day)) {
      setRecurringDays(recurringDays.filter(d => d !== day));
      return;
    }
    setRecurringDays([...recurringDays, day].sort((a, b) => a - b));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">
              {editingTask ? t('schedule.task.editTitle') : t('schedule.task.createTitle')}
              {isDeadlineMode ? t('schedule.task.deadline') : t('schedule.task.complete')}
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors[theme].icon} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>{t('schedule.task.name')}</ThemedText>
            <TextInput 
              style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
              value={title} 
              onChangeText={setTitle}
              placeholder={t('schedule.task.placeholderName')}
              placeholderTextColor={placeholderColor}
            />

            <ThemedText style={styles.label}>{t('schedule.task.desc')}</ThemedText>
            <TextInput 
              style={[styles.input, { height: 80, color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
              value={description} 
              onChangeText={setDescription}
              multiline
              placeholder={t('schedule.task.placeholderDesc')}
              placeholderTextColor={placeholderColor}
            />

            <ThemedText style={styles.label}>{t('schedule.task.location')}</ThemedText>
            <TextInput
              style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]}
              value={location}
              onChangeText={setLocation}
              placeholder={t('schedule.task.placeholderLocation')}
              placeholderTextColor={placeholderColor}
            />

            {!isDeadlineMode && (
              <>
                <ThemedText style={styles.label}>{t('schedule.task.duration')}</ThemedText>
                <TextInput 
                  style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
                  value={estimatedDuration} 
                  onChangeText={setEstimatedDuration}
                  keyboardType="numeric"
                  placeholder={t('schedule.task.placeholderDuration')}
                  placeholderTextColor={placeholderColor}
                />
              </>
            )}

            {!isDeadlineMode && (
              <>
                <ThemedText style={styles.label}>{t('schedule.task.recurring')}</ThemedText>
                <TouchableOpacity
                  style={[
                    styles.recurringToggle,
                    { borderColor: Colors[theme].icon + '40', backgroundColor: isRecurring ? Colors[theme].tint + '15' : 'transparent' }
                  ]}
                  onPress={() => setIsRecurring(!isRecurring)}
                >
                  <Ionicons
                    name={isRecurring ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isRecurring ? Colors[theme].tint : Colors[theme].icon}
                  />
                  <ThemedText style={styles.recurringText}>{t('schedule.task.recurringSet')}</ThemedText>
                </TouchableOpacity>

                {isRecurring && (
                  <View style={styles.weekdayWrap}>
                    {weekDays.map(day => {
                      const selected = recurringDays.includes(day.value);
                      return (
                        <TouchableOpacity
                          key={day.value}
                          style={[
                            styles.weekdayChip,
                            {
                              borderColor: selected ? Colors[theme].tint : Colors[theme].icon + '40',
                              backgroundColor: selected ? Colors[theme].tint : 'transparent',
                            },
                          ]}
                          onPress={() => toggleRecurringDay(day.value)}
                        >
                          <ThemedText style={{ color: selected ? '#fff' : Colors[theme].text, fontWeight: '600' }}>
                            {day.label}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>{t('common.date')}</ThemedText>
                <TouchableOpacity 
                   style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                   onPress={onOpenDatePicker}
                >
                  <ThemedText>{startTime ? startTime.toLocaleDateString() : t('schedule.selectDate')}</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={{ width: 20 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>{isDeadlineMode ? t('schedule.deadline') : t('common.start')}</ThemedText>
                <TouchableOpacity 
                  style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                  onPress={onOpenTimePicker}
                >
                  <ThemedText>{startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('schedule.changeTime')}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {!isDeadlineMode && (
              <>
                <ThemedText style={styles.label}>{t('schedule.task.color')}</ThemedText>
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
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>{t('common.save')}</ThemedText>
          </TouchableOpacity>

          {editingTask && onDelete && (
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: '#ff444415', marginTop: 10, borderWidth: 1, borderColor: '#ff4444' }]} 
              onPress={onDelete}
            >
              <ThemedText style={{ color: '#ff4444', fontWeight: 'bold' }}>{t('common.delete')}</ThemedText>
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
  recurringToggle: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurringText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  weekdayWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekdayChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 10 },
  colorOption: { width: 36, height: 36, borderRadius: 18 },
  selectedColor: { borderWidth: 3, borderColor: '#fff' },
  saveButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
});
