import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';

type FocusFeedback = {
  visible: boolean;
  title: string;
  summary: string;
  learningDelta: number;
  energyDelta: number;
  fatigueDelta: number;
};

type FocusFeedbackCardProps = {
  focusFeedback: FocusFeedback;
  tintColor: string;
  onDismiss: () => void;
};

export function FocusFeedbackCard({ focusFeedback, tintColor, onDismiss }: FocusFeedbackCardProps) {
  const { t } = useTranslation();

  if (!focusFeedback.visible) {
    return null;
  }

  return (
    <View style={[styles.feedbackCard, { borderColor: `${tintColor}55`, backgroundColor: `${tintColor}12` }]}>
      <View style={styles.feedbackHeaderRow}>
        <ThemedText type="defaultSemiBold" style={styles.feedbackTitle}>{focusFeedback.title}</ThemedText>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <ThemedText style={{ opacity: 0.65 }}>{t('common.close')}</ThemedText>
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.feedbackSummary}>{focusFeedback.summary}</ThemedText>
      <View style={styles.feedbackMetricsRow}>
        <ThemedText style={styles.feedbackMetric}>{t('home.focusFeedback.learning')} {focusFeedback.learningDelta >= 0 ? '+' : ''}{focusFeedback.learningDelta}</ThemedText>
        <ThemedText style={styles.feedbackMetric}>{t('home.focusFeedback.energy')} {focusFeedback.energyDelta >= 0 ? '+' : ''}{focusFeedback.energyDelta}</ThemedText>
        <ThemedText style={styles.feedbackMetric}>{t('home.focusFeedback.fatigue')} {focusFeedback.fatigueDelta >= 0 ? '+' : ''}{focusFeedback.fatigueDelta}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedbackCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 4,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 14,
  },
  feedbackSummary: {
    fontSize: 12,
    opacity: 0.78,
  },
  feedbackMetricsRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 10,
  },
  feedbackMetric: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
});
