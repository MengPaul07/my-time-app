import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/components/constants/theme';
import { Task } from '@/types/app';
import { START_HOUR, END_HOUR, HOUR_HEIGHT } from '@/constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TimelineViewProps {
  selectedDate: Date;
  processedTimelineTasks: any[];
  processedDeadlines: any[];
  onEditTask: (task: Task) => void;
  timelineRef: React.RefObject<ScrollView | null>;
  theme: 'light' | 'dark';
}

const CurrentTimeLine = ({ selectedDate }: { selectedDate: Date }) => {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isToday = selectedDate.getDate() === now.getDate() && 
                  selectedDate.getMonth() === now.getMonth() && 
                  selectedDate.getFullYear() === now.getFullYear();

  if (!isToday) return null;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  if (currentHour < START_HOUR || currentHour > END_HOUR) return null;
  
  const top = (currentHour - START_HOUR) * HOUR_HEIGHT + (currentMinute / 60) * HOUR_HEIGHT;
  
  return (
    <View style={{ position: 'absolute', top, left: 65, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'red', marginLeft: -4 }} />
      <View style={{ flex: 1, height: 1, backgroundColor: 'red' }} />
    </View>
  );
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  selectedDate,
  processedTimelineTasks,
  processedDeadlines,
  onEditTask,
  timelineRef,
  theme,
}) => {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 2 }, (_, i) => START_HOUR + i);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.columnHeader, { borderBottomColor: Colors[theme].icon + '10', backgroundColor: Colors[theme].background }]}>
        <View style={[styles.columnLabel, { borderRightColor: Colors[theme].icon + '10', backgroundColor: Colors[theme].tint + '05' }]}>
          <ThemedText style={styles.labelText}>课程</ThemedText>
        </View>
        <View style={styles.columnLabel}>
          <ThemedText style={styles.labelText}>任务</ThemedText>
        </View>
      </View>

      <ScrollView 
        ref={timelineRef} 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.backgroundGrids}>
            <View style={[styles.gridCol, { borderRightColor: Colors[theme].icon + '10', backgroundColor: Colors[theme].tint + '05' }]} />
            <View style={styles.gridCol} />
          </View>

          {hours.map((hour) => (
            <View key={hour} style={{ height: HOUR_HEIGHT, position: 'relative' }}>
              <View style={[styles.row, { position: 'absolute', top: -10, height: 20, left: 0, right: 0 }]}>
                <ThemedText style={styles.hourText}>{hour}:00</ThemedText>
                <View style={[styles.line, { backgroundColor: Colors[theme].icon + '15' }]} />
              </View>
              <View style={[styles.row, { position: 'absolute', top: (HOUR_HEIGHT / 2) - 10, height: 20, left: 0, right: 0 }]}>
                <ThemedText style={[styles.hourText, { fontSize: 10, opacity: 0.2 }]}>{hour}:30</ThemedText>
                <View style={[styles.line, { backgroundColor: Colors[theme].icon + '08' }]} />
              </View>
            </View>
          ))}
          
          <CurrentTimeLine selectedDate={selectedDate} />

          {processedDeadlines.map((deadline) => (
            <TouchableOpacity
              key={deadline.id}
              onPress={() => onEditTask(deadline)}
              style={[styles.deadlineMarker, { top: deadline.top - 14 }]}
            >
              <View style={styles.deadlineIcon}>
                <Ionicons name="skull" size={20} color={theme === 'dark' ? '#fff' : '#000'} />
              </View>
              <View style={[styles.deadlineLine, { backgroundColor: theme === 'dark' ? '#fff' : '#000' }]}>
                 <View style={styles.deadlineLabel}>
                    <ThemedText style={[styles.deadlineTitle, { color: theme === 'dark' ? '#fff' : '#000' }]}>{deadline.title}</ThemedText>
                 </View>
              </View>
            </TouchableOpacity>
          ))}

          {processedTimelineTasks.map((task) => (
            <TouchableOpacity
              key={task.id} 
              onPress={() => onEditTask(task)}
              style={[styles.taskBlock, {
                top: task.layout.top,
                height: task.layout.height,
                left: 65 + (SCREEN_WIDTH - 85) * (task.layout.leftPercent / 100),
                width: (SCREEN_WIDTH - 85) * (task.layout.widthPercent / 100) - 4,
                zIndex: task.layout.zIndex || 1,
                backgroundColor: task.color ? task.color : (task.is_course ? Colors[theme].tint : (task.status === 'completed' ? '#f0f0f0' : Colors[theme].tint)),
              }, task.is_course ? styles.courseStyle : styles.taskStyle]}
            >
              {task.is_course && (
                <View style={styles.tape} />
              )}
              {!task.is_course && (
                <View style={styles.timelinePin}>
                  <Ionicons name="pin" size={22} color="#e74c3c" style={styles.pinShadow} />
                </View>
              )}
              <ThemedText style={styles.taskLabel} numberOfLines={1}>{task.title}</ThemedText>
              {task.layout.height > 40 && (
                <ThemedText style={styles.taskSubLabel} numberOfLines={1}>
                  {task.is_course ? task.location : `${Math.floor(task.estimated_duration / 60)}min`}
                </ThemedText>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 10, paddingBottom: 50 },
  columnHeader: { flexDirection: 'row', marginLeft: 65, borderBottomWidth: 1, zIndex: 5 },
  columnLabel: { flex: 1, paddingVertical: 8, borderRightWidth: 1 },
  labelText: { fontSize: 12, fontWeight: 'bold', opacity: 0.7, textAlign: 'center' },
  content: { position: 'relative' },
  backgroundGrids: { position: 'absolute', top: 0, bottom: 0, left: 65, right: 0, flexDirection: 'row' },
  gridCol: { flex: 1, borderRightWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  hourText: { width: 65, textAlign: 'center', fontSize: 12, opacity: 0.5 },
  line: { flex: 1, height: 1 },
  deadlineMarker: { position: 'absolute', left: 0, right: 0, height: 28, flexDirection: 'row', alignItems: 'center', zIndex: 1000 },
  deadlineIcon: { width: 65, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  deadlineLine: { position: 'absolute', left: 50, right: 0, height: 2, zIndex: 1 },
  deadlineLabel: { position: 'absolute', right: 10, bottom: 4 },
  deadlineTitle: { fontWeight: 'bold', fontSize: 12 },
  taskBlock: { position: 'absolute', borderRadius: 2, padding: 4 },
  courseStyle: { opacity: 0.9, elevation: 4 },
  taskStyle: { elevation: 8 },
  taskLabel: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  taskSubLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9 },
  tape: { 
    position: 'absolute', 
    top: -6, 
    left: '50%', 
    marginLeft: -15, 
    width: 30, 
    height: 10, 
    backgroundColor: 'rgba(255,255,255,0.5)', 
    transform: [{ rotate: '-2deg' }],
    zIndex: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  timelinePin: { position: 'absolute', top: -10, right: -5, zIndex: 10, transform: [{ rotate: '15deg' }] },
  pinShadow: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 }
});
