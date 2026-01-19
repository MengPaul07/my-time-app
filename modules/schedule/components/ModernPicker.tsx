import React from 'react';
import { Modal, TouchableOpacity, ScrollView, View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/components/constants/theme';

interface DatePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (year: number, month: number, day: number) => void;
  tempYear: number;
  setTempYear: (y: number) => void;
  tempMonth: number;
  setTempMonth: (m: number) => void;
  tempDay: number;
  setTempDay: (d: number) => void;
  theme: 'light' | 'dark';
}

export const ModernDatePicker: React.FC<DatePickerProps> = ({
  visible,
  onClose,
  onConfirm,
  tempYear,
  setTempYear,
  tempMonth,
  setTempMonth,
  tempDay,
  setTempDay,
  theme,
}) => {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(tempYear, tempMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Modal animationType="fade" transparent={true} visible={visible}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <ThemedView style={[styles.modalContent, { maxHeight: 400 }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">选择日期</ThemedText>
            <TouchableOpacity onPress={() => onConfirm(tempYear, tempMonth, tempDay)}>
              <ThemedText style={{ color: Colors[theme].tint, fontWeight: 'bold' }}>确定</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', height: 200 }}>
             <View style={styles.pickerCol}>
               <ThemedText style={styles.pickerHeader}>年</ThemedText>
               <ScrollView showsVerticalScrollIndicator={false}>
                 {years.map((y) => (
                   <TouchableOpacity key={y} style={[styles.pickerItem, tempYear === y && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempYear(y)}>
                     <ThemedText style={[styles.pickerItemText, tempYear === y && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{y}年</ThemedText>
                   </TouchableOpacity>
                 ))}
                 <View style={{ height: 100 }} />
               </ScrollView>
             </View>
             <View style={styles.pickerCol}>
               <ThemedText style={styles.pickerHeader}>月</ThemedText>
               <ScrollView showsVerticalScrollIndicator={false}>
                 {months.map((m) => (
                   <TouchableOpacity key={m} style={[styles.pickerItem, tempMonth === m && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempMonth(m)}>
                     <ThemedText style={[styles.pickerItemText, tempMonth === m && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{m}月</ThemedText>
                   </TouchableOpacity>
                 ))}
                 <View style={{ height: 100 }} />
               </ScrollView>
             </View>
             <View style={styles.pickerCol}>
               <ThemedText style={styles.pickerHeader}>日</ThemedText>
               <ScrollView showsVerticalScrollIndicator={false}>
                 {days.map((d) => (
                   <TouchableOpacity key={d} style={[styles.pickerItem, tempDay === d && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempDay(d)}>
                     <ThemedText style={[styles.pickerItemText, tempDay === d && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{d}日</ThemedText>
                   </TouchableOpacity>
                 ))}
                 <View style={{ height: 100 }} />
               </ScrollView>
             </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );
};

interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (hour: number, minute: number) => void;
  tempHour: number;
  setTempHour: (h: number) => void;
  tempMinute: number;
  setTempMinute: (m: number) => void;
  theme: 'light' | 'dark';
}

export const ModernTimePicker: React.FC<TimePickerProps> = ({
  visible,
  onClose,
  onConfirm,
  tempHour,
  setTempHour,
  tempMinute,
  setTempMinute,
  theme,
}) => {
  const hours = Array.from({ length: 18 }, (_, i) => 6 + i); // 6:00 to 23:00
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); 

  return (
    <Modal animationType="fade" transparent={true} visible={visible}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}><ThemedText>取消</ThemedText></TouchableOpacity>
            <ThemedText type="subtitle">选择时间</ThemedText>
            <TouchableOpacity onPress={() => onConfirm(tempHour, tempMinute)}>
              <ThemedText style={{ color: Colors[theme].tint, fontWeight: 'bold' }}>确定</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerColumnsContainer}>
             <View style={styles.pickerColumn}>
               <ScrollView showsVerticalScrollIndicator={false}>
                 {hours.map((h) => (
                   <TouchableOpacity key={h} style={[styles.pickerItem, tempHour === h && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempHour(h)}>
                     <ThemedText style={[styles.pickerItemText, tempHour === h && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{h}点</ThemedText>
                   </TouchableOpacity>
                 ))}
                 <View style={{ height: 100 }} />
               </ScrollView>
             </View>
             <View style={styles.pickerColumn}>
               <ScrollView showsVerticalScrollIndicator={false}>
                 {minutes.map((m) => (
                   <TouchableOpacity key={m} style={[styles.pickerItem, tempMinute === m && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempMinute(m)}>
                     <ThemedText style={[styles.pickerItemText, tempMinute === m && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{String(m).padStart(2, '0')}分</ThemedText>
                   </TouchableOpacity>
                 ))}
                 <View style={{ height: 100 }} />
               </ScrollView>
             </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', padding: 20, borderRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickerCol: { flex: 1 },
  pickerHeader: { textAlign: 'center', marginBottom: 10, fontWeight: 'bold' },
  pickerItem: { paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  pickerItemText: { fontSize: 16 },
  pickerColumnsContainer: { flexDirection: 'row', height: 200 },
  pickerColumn: { flex: 1 },
});
