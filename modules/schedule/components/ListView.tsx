import React from 'react';
import { FlatList, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/components/constants/theme';
import { Task } from '@/types/app';

interface ListViewProps {
  tasks: Task[];
  theme: 'light' | 'dark';
  onEditItem: (item: Task) => void;
  onToggleStatus: (task: Task) => void;
  onStartFocus: (task: Task) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  theme,
  onEditItem,
  onToggleStatus,
  onStartFocus,
}) => {
  const { t } = useTranslation();

  const formatRecurringDays = (days?: number[]) => {
    if (!days || days.length === 0) return '';
    const labels = t('weekdays.shortMonFirst', { returnObjects: true }) as string[];
    return ` · ${[...days].sort((a, b) => a - b).map(d => labels[d - 1]).join('/')}`;
  };

  const renderItem = ({ item }: { item: Task }) => {
    let timeDisplay = '';
    if (item.is_course && item.start_time && item.estimated_duration) {
      const start = new Date(item.start_time);
      const end = new Date(start.getTime() + item.estimated_duration * 1000);
      timeDisplay = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (item.start_time) {
      timeDisplay = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      timeDisplay = t('schedule.longTerm');
    }

    return (
      <ThemedView style={[
        styles.card, 
        { 
          backgroundColor: item.color ? item.color : (item.is_course ? Colors[theme].tint : Colors[theme].background),
          shadowColor: item.color || "#000",
          opacity: 0.95,
          ...(item.is_deadline ? { borderLeftWidth: 0 } : {})
        }
      ]}>
        {!item.is_course && !item.is_deadline && (
          <View style={styles.pin}>
            <Ionicons name="pin" size={24} color="#e74c3c" style={styles.pinShadow} />
          </View>
        )}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => onEditItem(item)}
          style={styles.taskInfo}
        >
          <ThemedText style={[
            styles.taskTitle, 
            { color: '#fff' },
            styles.textShadow,
            item.status === 'completed' && { textDecorationLine: 'line-through', opacity: 0.7 },
            item.is_deadline && { fontSize: 18, fontWeight: 'bold' }
          ]}>{item.title}</ThemedText>
          
          <View style={styles.metaRow}>
            {item.is_deadline ? (
              <View style={styles.deadlineTag}>
                <ThemedText style={styles.deadlineText}>
                  {t('schedule.deadline')}: {item.start_time ? new Date(item.start_time).toLocaleDateString() + ' ' + new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={[styles.metaText, { color: 'rgba(255,255,255,0.9)' }]}>
                {timeDisplay}
                {!item.is_course
                  ? item.location
                    ? ` · ${item.location}${item.estimated_duration ? ` · ${t('schedule.durationMinutes', { minutes: Math.max(1, Math.floor(item.estimated_duration / 60)) })}` : ''}`
                    : (item.estimated_duration ? ` · ${t('schedule.durationMinutes', { minutes: Math.max(1, Math.floor(item.estimated_duration / 60)) })}` : '')
                  : (item.location ? ` · ${item.location}` : '')}
                {!item.is_course ? formatRecurringDays(item.recurring_days) : ''}
              </ThemedText>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          {!item.is_course && !item.is_deadline && (
            <TouchableOpacity onPress={() => onToggleStatus(item)} style={styles.checkbox}>
              <Ionicons name={item.status === 'completed' ? "checkbox" : "square-outline"} size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {item.is_course && <Ionicons name="school" size={24} color="#fff" />}
          {item.is_deadline && <Ionicons name="skull" size={20} color="#fff" />}

          {!item.is_course && !item.is_deadline && item.status !== 'completed' && (
            <TouchableOpacity onPress={() => onStartFocus(item)} style={styles.playButton}>
              <Ionicons name="play-circle" size={32} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  };

  return (
    <FlatList
      data={tasks}
      renderItem={renderItem}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.listContent}
      ListFooterComponent={tasks.length > 0 ? (
        <ThemedText style={styles.footerText}>
          {t('schedule.listFooter')}
        </ThemedText>
      ) : null}
    />
  );
};

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 0,
  },
  pin: { position: 'absolute', top: -12, left: '50%', marginLeft: -12, zIndex: 10 },
  pinShadow: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  textShadow: { textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  deadlineTag: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  deadlineText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  metaText: { fontSize: 12, fontWeight: '500' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { padding: 4 },
  playButton: { padding: 4 },
  footerText: { textAlign: 'center', marginTop: 20, marginBottom: 20, fontSize: 12, opacity: 0.4 },
});
