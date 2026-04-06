import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';

interface FloatingActionButtonProps {
  fabMenuVisible: boolean;
  setFabMenuVisible: (visible: boolean) => void;
  onAddCourse: () => void;
  onAddDeadline: () => void;
  onAddTask: () => void;
  onAiTask?: () => void;
  onImportSchedule?: () => void;
  isImporting?: boolean;
  theme: 'light' | 'dark';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  fabMenuVisible,
  setFabMenuVisible,
  onAddCourse,
  onAddDeadline,
  onAddTask,
  onAiTask,
  onImportSchedule,
  isImporting = false,
  theme,
}) => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      {/* FAB Menu Overlay & Items */}
      {fabMenuVisible && (
        <React.Fragment>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setFabMenuVisible(false)}
          >
             <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
          </TouchableOpacity>
          
          <View style={styles.fabMenuContainer}>
             {onImportSchedule && (
               <TouchableOpacity 
                 style={[styles.fabMenuItem, isImporting && { opacity: 0.5 }]} 
                 onPress={() => { 
                   if (isImporting) return;
                   setFabMenuVisible(false); 
                   onImportSchedule(); 
                 }}
                 disabled={isImporting}
               >
                  <ThemedText style={styles.fabMenuText}>
                    {isImporting ? t('schedule.fab.importing') : t('schedule.fab.importAi')}
                  </ThemedText>
                  <View style={[styles.fabMenuIcon, { backgroundColor: isImporting ? '#999' : '#5856D6' }]}>
                    <Ionicons name={isImporting ? "hourglass-outline" : "scan"} size={22} color="#fff" />
                  </View>
               </TouchableOpacity>
             )}

             {onAiTask && (
               <TouchableOpacity 
                 style={styles.fabMenuItem} 
                 onPress={() => { setFabMenuVisible(false); onAiTask(); }}
               >
                  <ThemedText style={styles.fabMenuText}>{t('schedule.fab.aiSchedule')}</ThemedText>
                  <View style={[styles.fabMenuIcon, { backgroundColor: '#AF52DE' }]}>
                    <Ionicons name="sparkles" size={22} color="#fff" />
                  </View>
               </TouchableOpacity>
             )}

             <TouchableOpacity 
               style={styles.fabMenuItem} 
               onPress={() => { setFabMenuVisible(false); onAddCourse(); }}
             >
                <ThemedText style={styles.fabMenuText}>{t('schedule.fab.addCourse')}</ThemedText>
                <View style={[styles.fabMenuIcon, { backgroundColor: '#FF9500' }]}>
                  <Ionicons name="school" size={22} color="#fff" />
                </View>
             </TouchableOpacity>

             <TouchableOpacity 
               style={styles.fabMenuItem} 
               onPress={() => { setFabMenuVisible(false); onAddDeadline(); }}
             >
                <ThemedText style={styles.fabMenuText}>{t('schedule.fab.addDeadline')}</ThemedText>
                <View style={[styles.fabMenuIcon, { backgroundColor: '#FF3B30' }]}>
                  <Ionicons name="skull" size={22} color="#fff" />
                </View>
             </TouchableOpacity>

             <TouchableOpacity 
               style={styles.fabMenuItem} 
               onPress={() => { setFabMenuVisible(false); onAddTask(); }}
             >
                <ThemedText style={styles.fabMenuText}>{t('schedule.fab.addTask')}</ThemedText>
                <View style={[styles.fabMenuIcon, { backgroundColor: Colors[theme].tint }]}>
                  <Ionicons name="checkbox" size={22} color="#fff" />
                </View>
             </TouchableOpacity>
          </View>
        </React.Fragment>
      )}

      {/* Main FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: fabMenuVisible ? Colors[theme].icon : Colors[theme].tint, zIndex: 110 }]} 
        onPress={() => setFabMenuVisible(!fabMenuVisible)}
        activeOpacity={0.8}
      >
        <Ionicons name={fabMenuVisible ? "close" : "add"} size={30} color="#fff" />
      </TouchableOpacity>
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 30, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 3 
  },
  fabMenuContainer: { 
    position: 'absolute', 
    bottom: 100, 
    right: 38, 
    alignItems: 'flex-end', 
    zIndex: 105, 
    gap: 16 
  },
  fabMenuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 5 
  },
  fabMenuText: { 
    marginRight: 12, 
    fontWeight: '600', 
    fontSize: 14, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4, 
    overflow: 'hidden', 
    color: '#333', 
    elevation: 2 
  },
  fabMenuIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 4, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 3.84 
  },
});
