import React from 'react';
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/components/constants/theme';
import { Course } from '@/types/app';
import { START_HOUR, END_HOUR } from '@/constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WeeklyScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  courses: Course[];
  theme: 'light' | 'dark';
}

export const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({
  visible,
  onClose,
  courses,
  theme,
}) => {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const colWidth = (SCREEN_WIDTH - 40) / 7;
  const rowHeight = 50;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">课程总览</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={Colors[theme].icon} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekHeader}>
          {weekDays.map((day, index) => (
            <View key={index} style={{ width: colWidth, alignItems: 'center', paddingVertical: 8 }}>
              <ThemedText style={styles.weekDayText}>{day}</ThemedText>
            </View>
          ))}
        </View>

        <ScrollView>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 40 }}>
              {hours.map(h => (
                <View key={h} style={{ height: rowHeight, alignItems: 'center', justifyContent: 'flex-start' }}>
                  <ThemedText style={styles.hourText}>{h}:00</ThemedText>
                </View>
              ))}
            </View>

            <View style={{ flex: 1, position: 'relative', height: hours.length * rowHeight }}>
              {hours.map((h, i) => (
                <View key={i} style={[styles.gridLineH, { top: i * rowHeight, backgroundColor: Colors[theme].icon + '10' }]} />
              ))}
              
              {weekDays.map((_, i) => (
                <View key={i} style={[styles.gridLineV, { left: i * colWidth, backgroundColor: Colors[theme].icon + '10' }]} />
              ))}

              {courses.map((course) => {
                const [startH, startM] = course.start_time.split(':').map(Number);
                const [endH, endM] = course.end_time.split(':').map(Number);
                
                if (startH < START_HOUR) return null;

                const top = (startH - START_HOUR) * rowHeight + (startM / 60) * rowHeight;
                const height = ((endH * 60 + endM) - (startH * 60 + startM)) / 60 * rowHeight;
                const left = (course.day_of_week - 1) * colWidth;

                return (
                  <View 
                    key={course.id} 
                    style={[
                      styles.courseBlock,
                      {
                        top,
                        left: left + 2,
                        width: colWidth - 4,
                        height: height - 4,
                        backgroundColor: course.color || Colors[theme].tint,
                      }
                    ]}
                  >
                    <View style={styles.tape} />
                    <ThemedText style={styles.courseName} numberOfLines={2}>{course.name}</ThemedText>
                    {course.location && (
                      <ThemedText style={styles.courseLocation} numberOfLines={1}>
                        <Ionicons name="location-outline" size={8} color="#fff" /> {course.location}
                      </ThemedText>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10, alignItems: 'center' },
  weekHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)', marginLeft: 40 },
  weekDayText: { fontSize: 12, fontWeight: 'bold' },
  hourText: { fontSize: 10, opacity: 0.5, transform: [{ translateY: -6 }] },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1 },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  courseBlock: {
    position: 'absolute',
    borderRadius: 8,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible'
  },
  tape: {
    position: 'absolute',
    top: -5,
    width: 25,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ rotate: '-5deg' }],
    zIndex: 2,
  },
  courseName: { fontSize: 9, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  courseLocation: { fontSize: 8, color: '#fff', opacity: 0.9, textAlign: 'center', marginTop: 1 },
});
