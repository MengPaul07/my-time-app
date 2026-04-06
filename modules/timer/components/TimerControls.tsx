import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface TimerControlsProps {
  theme: 'light' | 'dark';
  isActive: boolean;
  timeLeft: number;
  totalDuration: number;
  toggleTimer: () => void;
  handleEndSession: () => void;
  resetTimer: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  theme,
  isActive,
  timeLeft,
  totalDuration,
  toggleTimer,
  handleEndSession,
  resetTimer,
}) => {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.controlsContainer}>
      <TouchableOpacity
        style={[styles.button, styles.mainButton, { backgroundColor: Colors[theme].tint }]}
        onPress={toggleTimer}
      >
        <IconSymbol
          name={isActive ? 'pause.fill' : 'play.fill'}
          size={32}
          color="#FFFFFF"
        />
        <ThemedText style={styles.buttonText}>
          {isActive ? t('timer.pause') : (timeLeft < totalDuration ? t('timer.resume') : t('timer.startFocus'))}
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton, { borderColor: Colors[theme].icon }]} 
        onPress={timeLeft < totalDuration ? handleEndSession : resetTimer}
      >
        <IconSymbol name={timeLeft < totalDuration ? "stop.fill" : "arrow.counterclockwise"} size={24} color={Colors[theme].text} />
        <ThemedText style={[styles.secondaryButtonText, { color: Colors[theme].text }]}>
          {timeLeft < totalDuration ? t('timer.end') : t('timer.reset')}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    gap: 12,
  },
  mainButton: {
    width: '80%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryButton: {
    width: '50%',
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    fontSize: 16,
  },
});
