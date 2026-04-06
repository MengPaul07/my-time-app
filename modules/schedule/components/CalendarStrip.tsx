import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/components/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface CalendarStripProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  setShowDatePicker: (show: boolean) => void;
  theme: 'light' | 'dark';
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  selectedDate,
  setSelectedDate,
  setShowDatePicker,
  theme,
}) => {
  const { t } = useTranslation();
  const [dayAnchor, setDayAnchor] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDayAnchor((prev) => {
        const now = new Date();
        const changed =
          prev.getFullYear() !== now.getFullYear() ||
          prev.getMonth() !== now.getMonth() ||
          prev.getDate() !== now.getDate();
        return changed ? now : prev;
      });
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const dates = useMemo(() => {
    const arr = [];
    const today = dayAnchor;
    for (let i = -3; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [dayAnchor]);

  const weekDays = t('weekdays.short', { returnObjects: true }) as string[];

  return (
    <ThemedView style={[styles.container, { borderBottomColor: Colors[theme].icon + '20' }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
          <ThemedText type="subtitle" style={{ fontSize: 18 }}>
            {t('calendar.monthYear', { year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1 })}
          </ThemedText>
          <Ionicons name="chevron-down" size={16} color={Colors[theme].text} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setSelectedDate(new Date())}
          style={[styles.todayButton, { backgroundColor: Colors[theme].tint + '15' }]}
        >
          <ThemedText style={{ color: Colors[theme].tint, fontWeight: 'bold', fontSize: 12 }}>{t('common.today')}</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {dates.map((date, index) => {
          const now = dayAnchor;
          const isSelected = date.getDate() === selectedDate.getDate() &&
                            date.getMonth() === selectedDate.getMonth() &&
                            date.getFullYear() === selectedDate.getFullYear();
          const isToday = date.getDate() === now.getDate() &&
                          date.getMonth() === now.getMonth() &&
                          date.getFullYear() === now.getFullYear();
          
          return (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedDate(date)}
              style={[
                styles.dateCard,
                isSelected && { backgroundColor: Colors[theme].tint, borderColor: Colors[theme].tint }
              ]}
            >
              <ThemedText style={[
                styles.weekDay,
                { color: isSelected ? '#fff' : Colors[theme].icon },
                isToday && !isSelected && { color: Colors[theme].tint, fontWeight: 'bold' }
              ]}>
                {weekDays[date.getDay()]}
              </ThemedText>
              <ThemedText style={[
                styles.dayNumber,
                { color: isSelected ? '#fff' : Colors[theme].text }
              ]}>
                {date.getDate()}
              </ThemedText>
              {isToday && !isSelected && (
                <View style={[styles.todayDot, { backgroundColor: Colors[theme].tint }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  dateCard: {
    width: 45,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  weekDay: {
    fontSize: 12,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 6,
  },
});
