import React from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/components/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ModernTimePicker } from '@/modules/schedule/components/ModernPicker';
import { useHealthScreen } from '@/modules/health/hooks/use-health-screen';
import { getLocaleForDate } from '@/utils/i18n';

export default function HealthTab() {
  const { t, i18n } = useTranslation();
  const locale = getLocaleForDate(i18n.language);
  const {
    colorScheme,
    isDark,
    symptomOptions,
    sleepTime,
    wakeUpTime,
    breakfast,
    lunch,
    dinner,
    wakeRefreshScore,
    subjectiveEnergy,
    subjectiveMood,
    subjectiveFocus,
    selectedSymptoms,
    courseSelfRatings,
    formVisible,
    setFormVisible,
    pickerVisible,
    setPickerVisible,
    tempHour,
    setTempHour,
    tempMinute,
    setTempMinute,
    aiAdvice,
    selectedHistoryPointIndex,
    setSelectedHistoryPointIndex,
    loading,
    isRecordLoading,
    dateKey,
    checklistItems,
    autoScheduleProgress,
    completedCourseItems,
    panelOverallScore,
    panelBodyScore,
    panelEnergyScore,
    panelStressScore,
    panelFatigueScore,
    panelLearningState,
    learningRingColor,
    ecgColor,
    ecgPoints,
    ecgScanHeadX,
    ecgTrailPoints,
    historyChart,
    sectionSurfaceStyle,
    handleAnalyze,
    openTimePicker,
    applyPickedTime,
    clearMealTime,
    setCourseSelfStar,
    setCourseSelfReason,
    toggleSymptom,
    setWakeRefreshScore,
    setSubjectiveEnergy,
    setSubjectiveMood,
    setSubjectiveFocus,
  } = useHealthScreen();

  const renderTimeRow = (label: string, value: string, field: 'sleepTime' | 'wakeUpTime' | 'breakfast' | 'lunch' | 'dinner', required = false) => (
    <View style={styles.inputRow}>
      <ThemedText style={styles.inputLabel}>{label}{required ? ' *' : ''}</ThemedText>
      <TouchableOpacity
        style={[styles.timePickerButton, { borderColor: isDark ? '#333' : '#ccc' }]}
        onPress={() => openTimePicker(field, value)}
      >
        <ThemedText style={styles.timePickerText}>{value || t('health.selectTime')}</ThemedText>
      </TouchableOpacity>
      {(field === 'breakfast' || field === 'lunch' || field === 'dinner') && !!value && (
        <TouchableOpacity onPress={() => clearMealTime(field)} style={styles.clearButton}>
          <ThemedText style={styles.clearButtonText}>{t('health.clear')}</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMetricBar = (label: string, value: number, fillColor: string) => (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <ThemedText style={styles.metricLabel}>{label}</ThemedText>
        <ThemedText style={styles.metricValue}>{value}</ThemedText>
      </View>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );

  const renderScoreSelector = (
    label: string,
    value: number,
    onChange: (score: number) => void,
    helper?: string
  ) => (
    <View style={styles.formBlock}>
      <ThemedText style={styles.formLabel}>{label}</ThemedText>
      {helper ? <ThemedText style={styles.formHelper}>{helper}</ThemedText> : null}
      <View style={styles.optionRowWrap}>
        {[0, 2, 4, 6, 8, 10].map((score) => {
          const active = value === score;
          return (
            <TouchableOpacity
              key={`${label}_${score}`}
              style={[styles.optionChip, active && { borderColor: Colors[colorScheme].tint, backgroundColor: `${Colors[colorScheme].tint}22` }]}
              onPress={() => onChange(score)}
            >
              <ThemedText style={[styles.optionChipText, active && { color: Colors[colorScheme].tint }]}>{score}</ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <ThemedText type="title" style={styles.pageTitle}>{t('health.title')}</ThemedText>
              <ThemedText style={styles.subtitle}>{t('health.subtitle')}</ThemedText>
            </View>
            <TouchableOpacity style={[styles.formToggleBtn, { borderColor: Colors[colorScheme].tint }]} onPress={() => setFormVisible(true)}>
              <IconSymbol name="plus" size={18} color={Colors[colorScheme].tint} />
              <ThemedText style={[styles.formToggleText, { color: Colors[colorScheme].tint }]}>{t('health.fill')}</ThemedText>
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.dateHint}>{t('health.dateHint', { date: dateKey })}</ThemedText>
          {isRecordLoading ? <ThemedText style={styles.loadingHint}>{t('health.loadingToday')}</ThemedText> : null}
        </View>

        <ThemedView style={styles.statusPanelCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>{t('health.panelSurvival')}</ThemedText>

          <View style={styles.statusTopRow}>
            <View style={styles.ringWrap}>
              <Svg width={120} height={120}>
                <Circle cx={60} cy={60} r={46} stroke={Colors[colorScheme].text} strokeOpacity={0.15} strokeWidth={10} fill="none" />
                <Circle
                  cx={60}
                  cy={60}
                  stroke={ecgColor}
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={(2 * Math.PI * 46) * (1 - panelOverallScore / 100)}
                  transform="rotate(-90 60 60)"
                />
              </Svg>
              <View style={styles.ringCenterText}>
                <ThemedText style={styles.ringScore}>{panelOverallScore}</ThemedText>
                <ThemedText style={styles.ringLabel}>{t('health.overall')}</ThemedText>
              </View>
            </View>

            <View style={styles.metricGroup}>
              {renderMetricBar(t('health.body'), panelBodyScore, ecgColor)}
              {renderMetricBar(t('health.energy'), panelEnergyScore, '#4c78b3')}
              {renderMetricBar(t('health.stress'), panelStressScore, '#b8942e')}
              {renderMetricBar(t('health.fatigue'), panelFatigueScore, '#b45757')}
            </View>
          </View>

          <View style={styles.ecgCard}>
            <Svg width={280} height={70}>
              <Line x1={ecgScanHeadX} y1={4} x2={ecgScanHeadX} y2={66} stroke={ecgColor} strokeOpacity={0.22} strokeWidth={1.6} />
              <Polyline
                points={ecgPoints.map((point) => `${point.x},${point.y.toFixed(1)}`).join(' ')}
                fill="none"
                stroke={ecgColor}
                strokeOpacity={0.26}
                strokeWidth={1.2}
              />
              <Polyline
                points={ecgTrailPoints.map((point) => `${point.x},${point.y.toFixed(1)}`).join(' ')}
                fill="none"
                stroke={ecgColor}
                strokeWidth={2.8}
              />
            </Svg>
            <ThemedText style={[styles.ecgWarnText, { color: ecgColor }]}> {panelBodyScore <= 30 ? t('health.bodyWarningDanger') : panelBodyScore <= 60 ? t('health.bodyWarningTired') : t('health.bodyWarningGood')} </ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.statusPanelCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>{t('health.panelLearning')}</ThemedText>

          <View style={styles.statusTopRow}>
            <View style={styles.ringWrap}>
              <Svg width={120} height={120}>
                <Circle cx={60} cy={60} r={46} stroke={Colors[colorScheme].text} strokeOpacity={0.15} strokeWidth={10} fill="none" />
                <Circle
                  cx={60}
                  cy={60}
                  r={46}
                  stroke={learningRingColor}
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={(2 * Math.PI * 46) * (1 - panelLearningState.overall / 100)}
                  transform="rotate(-90 60 60)"
                />
              </Svg>
              <View style={styles.ringCenterText}>
                <ThemedText style={styles.ringScore}>{panelLearningState.overall}</ThemedText>
                <ThemedText style={styles.ringLabel}>{t('health.learningOverall')}</ThemedText>
              </View>
            </View>

            <View style={styles.metricGroup}>
              {renderMetricBar(t('health.learningCourse'), panelLearningState.courseStudy, '#5a8fd8')}
              {renderMetricBar(t('health.learningAcm'), panelLearningState.acmStudy, '#4f8f7d')}
              {renderMetricBar(t('health.learningProject'), panelLearningState.projectStudy, '#8b78c9')}
              {renderMetricBar(t('health.learningEnglish'), panelLearningState.englishStudy, '#b27a4d')}
              {renderMetricBar(t('health.learningResearch'), panelLearningState.researchStudy, '#b45757')}
            </View>
          </View>

          <ThemedText style={[styles.learningHintText, { color: learningRingColor }]}>{t('health.learningHint')}</ThemedText>
        </ThemedView>

        <TouchableOpacity
          style={[styles.analyzeButton, { backgroundColor: Colors[colorScheme].tint }]}
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.analyzeButtonText}>{t('health.analyze')}</ThemedText>
          )}
        </TouchableOpacity>

        {aiAdvice && !aiAdvice.error && (
          <ThemedView style={styles.card}>
            <View style={styles.adviceSection}>
              <ThemedText style={styles.adviceSubtitle}>{t('health.analysis')}</ThemedText>
              <ThemedText style={styles.adviceText}>{aiAdvice.mental_state_analysis}</ThemedText>
            </View>

            {!!aiAdvice.key_factors?.length && (
              <View style={styles.adviceSection}>
                <ThemedText style={styles.adviceSubtitle}>{t('health.keyFactors')}</ThemedText>
                {aiAdvice.key_factors.map((factor: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <ThemedText style={styles.bullet}>•</ThemedText>
                    <ThemedText style={[styles.adviceText, { flex: 1 }]}>{factor}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {!!aiAdvice.learning_state_analysis && (
              <View style={styles.adviceSection}>
                <ThemedText style={styles.adviceSubtitle}>{t('health.learningAnalysis')}</ThemedText>
                <ThemedText style={styles.adviceText}>{aiAdvice.learning_state_analysis}</ThemedText>
              </View>
            )}

            {!!aiAdvice.learning_score_reasoning?.length && (
              <View style={styles.adviceSection}>
                <ThemedText style={styles.adviceSubtitle}>{t('health.learningReason')}</ThemedText>
                {aiAdvice.learning_score_reasoning.map((reason: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <ThemedText style={styles.bullet}>•</ThemedText>
                    <ThemedText style={[styles.adviceText, { flex: 1 }]}>{reason}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {!!aiAdvice.self_rating_objective_analysis && (
              <View style={styles.adviceSection}>
                <ThemedText style={styles.adviceSubtitle}>{t('health.selfRatingAnalysis')}</ThemedText>
                <ThemedText style={styles.adviceText}>{aiAdvice.self_rating_objective_analysis}</ThemedText>
              </View>
            )}

            <View style={styles.adviceSection}>
              <ThemedText style={styles.adviceSubtitle}>{t('health.recoveryAdvice')}</ThemedText>
              {aiAdvice.immediate_advice?.map((a: string, idx: number) => (
                <View key={idx} style={styles.bulletRow}>
                  <ThemedText style={styles.bullet}>•</ThemedText>
                  <ThemedText style={[styles.adviceText, { flex: 1 }]}>{a}</ThemedText>
                </View>
              ))}
            </View>
          </ThemedView>
        )}

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>{t('health.historyTitle')}</ThemedText>
          {historyChart ? (
            <View style={styles.historyChartWrap}>
              <View style={styles.historyLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <ThemedText style={styles.legendText}>{t('health.historySurvival')}</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <ThemedText style={styles.legendText}>{t('health.historyLearning')}</ThemedText>
                </View>
              </View>

              <Svg width={historyChart.width} height={historyChart.height}>
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = historyChart.padding.top + (1 - tick / 100) * historyChart.plotHeight;
                  return (
                    <React.Fragment key={`y_${tick}`}>
                      <Line
                        x1={historyChart.padding.left}
                        y1={y}
                        x2={historyChart.width - historyChart.padding.right}
                        y2={y}
                        stroke={isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.2)'}
                        strokeWidth={1}
                      />
                      <SvgText x={10} y={y + 4} fontSize={10} fill={isDark ? '#94a3b8' : '#64748b'}>{tick}</SvgText>
                    </React.Fragment>
                  );
                })}

                {historyChart.points.map((_, index) => {
                  const x = historyChart.padding.left + (historyChart.points.length <= 1 ? 0 : (index / (historyChart.points.length - 1)) * historyChart.plotWidth);
                  return (
                    <Line
                      key={`x_${index}`}
                      x1={x}
                      y1={historyChart.padding.top}
                      x2={x}
                      y2={historyChart.height - historyChart.padding.bottom}
                      stroke={isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.12)'}
                      strokeWidth={1}
                    />
                  );
                })}

                <Line
                  x1={historyChart.padding.left}
                  y1={historyChart.height - historyChart.padding.bottom}
                  x2={historyChart.width - historyChart.padding.right}
                  y2={historyChart.height - historyChart.padding.bottom}
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  strokeWidth={1.2}
                />
                <Line
                  x1={historyChart.padding.left}
                  y1={historyChart.padding.top}
                  x2={historyChart.padding.left}
                  y2={historyChart.height - historyChart.padding.bottom}
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  strokeWidth={1.2}
                />

                <Polyline points={historyChart.survivalPolyline} fill="none" stroke="#3B82F6" strokeWidth={2.5} />
                <Polyline points={historyChart.learningPolyline} fill="none" stroke="#10B981" strokeWidth={2.5} />

                {historyChart.points.map((item, index) => {
                  const selected = selectedHistoryPointIndex === index;
                  return (
                    <React.Fragment key={`point_${item.capturedAt}`}>
                      <Circle
                        cx={historyChart.survival[index].x}
                        cy={historyChart.survival[index].y}
                        r={selected ? 5 : 4}
                        fill="#3B82F6"
                        onPress={() => setSelectedHistoryPointIndex(index)}
                      />
                      <Circle
                        cx={historyChart.learning[index].x}
                        cy={historyChart.learning[index].y}
                        r={selected ? 5 : 4}
                        fill="#10B981"
                        onPress={() => setSelectedHistoryPointIndex(index)}
                      />
                    </React.Fragment>
                  );
                })}

                {historyChart.points.length > 0 && (
                  <>
                    <SvgText
                      x={historyChart.padding.left}
                      y={historyChart.height - 8}
                      fontSize={10}
                      fill={isDark ? '#94a3b8' : '#64748b'}
                    >
                      {new Date(historyChart.points[0].capturedAt).toLocaleDateString(locale, { month: '2-digit', day: '2-digit' })}
                    </SvgText>
                    <SvgText
                      x={historyChart.width - historyChart.padding.right - 34}
                      y={historyChart.height - 8}
                      fontSize={10}
                      fill={isDark ? '#94a3b8' : '#64748b'}
                    >
                      {new Date(historyChart.points[historyChart.points.length - 1].capturedAt).toLocaleDateString(locale, { month: '2-digit', day: '2-digit' })}
                    </SvgText>
                  </>
                )}
              </Svg>

              {selectedHistoryPointIndex !== null && historyChart.points[selectedHistoryPointIndex] && (
                <View style={styles.historyReasonBox}>
                  {(() => {
                    const item = historyChart.points[selectedHistoryPointIndex];
                    const prev = selectedHistoryPointIndex > 0 ? historyChart.points[selectedHistoryPointIndex - 1] : null;
                    const deltaSurvival = prev ? item.overallScore - prev.overallScore : 0;
                    const currentLearning = item.learningOverallScore ?? 0;
                    const prevLearning = prev?.learningOverallScore ?? 0;
                    const deltaLearning = prev ? currentLearning - prevLearning : 0;
                    return (
                      <>
                        <ThemedText style={styles.historyDate}>
                          {item.date} {new Date(item.capturedAt).toLocaleTimeString(locale, { hour12: false })}
                        </ThemedText>
                        <ThemedText style={styles.historyScore}>
                          {t('health.historySurvival')} {item.overallScore}（{deltaSurvival >= 0 ? '+' : ''}{deltaSurvival}） / {t('health.historyLearning')} {currentLearning}（{deltaLearning >= 0 ? '+' : ''}{deltaLearning}）
                        </ThemedText>
                        <ThemedText style={styles.historyReasonText}>
                          {t('health.historyReason', { reason: item.analysis || t('health.historyReasonFallback') })}
                        </ThemedText>
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
          ) : (
            <ThemedText style={styles.emptyText}>{t('health.historyEmpty')}</ThemedText>
          )}
        </ThemedView>

        {aiAdvice?.error && (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorText}>{aiAdvice.error}</ThemedText>
            <TouchableOpacity style={[styles.retryButton, { borderColor: Colors[colorScheme].tint }]} onPress={handleAnalyze}>
              <ThemedText style={[styles.retryText, { color: Colors[colorScheme].tint }]}>{t('health.retry')}</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={formVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <ThemedText type="subtitle">{t('health.formTitle')}</ThemedText>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <IconSymbol name="xmark.circle.fill" size={22} color={Colors[colorScheme].text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalHandle} />

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>{t('health.sectionSleep')}</ThemedText>
                {renderTimeRow(t('health.sleepTime'), sleepTime, 'sleepTime', true)}
                {renderTimeRow(t('health.wakeTime'), wakeUpTime, 'wakeUpTime', true)}
                {renderScoreSelector(t('health.wakeScore'), wakeRefreshScore, setWakeRefreshScore, t('health.wakeHint'))}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>{t('health.sectionNutrition')}</ThemedText>
                {renderTimeRow(t('health.breakfast'), breakfast, 'breakfast')}
                {renderTimeRow(t('health.lunch'), lunch, 'lunch')}
                {renderTimeRow(t('health.dinner'), dinner, 'dinner')}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>{t('health.sectionSubjective')}</ThemedText>
                {renderScoreSelector(t('health.subjectiveEnergy'), subjectiveEnergy, setSubjectiveEnergy)}
                {renderScoreSelector(t('health.subjectiveMood'), subjectiveMood, setSubjectiveMood)}
                {renderScoreSelector(t('health.subjectiveFocus'), subjectiveFocus, setSubjectiveFocus)}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>{t('health.sectionSchedule')}</ThemedText>
                {checklistItems.length === 0 ? (
                  <ThemedText style={styles.emptyText}>{t('health.scheduleEmpty')}</ThemedText>
                ) : (
                  <View style={styles.checkboxGroup}>
                    <ThemedText style={styles.formHelper}>{t('health.scheduleHint')}</ThemedText>
                    {checklistItems.map((item) => {
                      const checked = autoScheduleProgress.completed.some(
                        (entry) => `${entry.sourceType}_${entry.title}_${entry.timeLabel}` === `${item.sourceType}_${item.title}_${item.timeLabel}`
                      );
                      return (
                        <View key={item.id} style={styles.checkItem}>
                          <IconSymbol name={checked ? 'checkmark.circle.fill' : 'circle'} size={22} color={checked ? Colors[colorScheme].tint : Colors[colorScheme].text} />
                          <ThemedText style={[styles.checkText, checked && styles.checkedText]}>
                            [{item.sourceType === 'course' ? t('health.itemCourse') : t('health.itemTask')}] {item.title} · {item.timeLabel}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>{t('health.sectionCourseReview')}</ThemedText>
                {completedCourseItems.length === 0 ? (
                  <ThemedText style={styles.emptyText}>{t('health.courseReviewEmpty')}</ThemedText>
                ) : (
                  <View style={styles.courseRatingGroup}>
                    {completedCourseItems.map((course) => {
                      const courseKey = `${course.title}_${course.timeLabel}`;
                      const rating = courseSelfRatings[courseKey] || { stars: 0, reason: '' };
                      return (
                        <View key={course.id} style={styles.courseRatingItem}>
                          <ThemedText style={styles.courseRatingTitle}>{course.title} · {course.timeLabel}</ThemedText>
                          <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((star) => {
                              const active = rating.stars >= star;
                              return (
                                <TouchableOpacity key={`${course.id}_star_${star}`} onPress={() => setCourseSelfStar(courseKey, star)} style={styles.starBtn}>
                                  <ThemedText style={[styles.starText, { color: active ? Colors[colorScheme].tint : (isDark ? '#6B7280' : '#9CA3AF') }]}>★</ThemedText>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <TextInput
                            value={rating.reason}
                            onChangeText={(text) => setCourseSelfReason(courseKey, text)}
                            placeholder={t('health.courseReviewReason')}
                            placeholderTextColor={isDark ? '#7A7A7A' : '#9A9A9A'}
                            multiline
                            style={[styles.courseReasonInput, { borderColor: isDark ? '#334155' : '#D1D5DB', color: Colors[colorScheme].text }]}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>{t('health.sectionSymptoms')}</ThemedText>
                <View style={styles.symptomsContainer}>
                  {symptomOptions.map((symptom) => {
                    const selected = selectedSymptoms.includes(symptom);
                    return (
                      <TouchableOpacity
                        key={symptom}
                        style={[styles.symptomPill, selected && { backgroundColor: Colors[colorScheme].tint, borderColor: Colors[colorScheme].tint }]}
                        onPress={() => toggleSymptom(symptom)}
                      >
                        <ThemedText style={[styles.symptomText, selected && { color: '#fff' }]}>{t(`health.symptoms.${symptom}`)}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      <ModernTimePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={applyPickedTime}
        tempHour={tempHour}
        setTempHour={setTempHour}
        tempMinute={tempMinute}
        setTempMinute={setTempMinute}
        theme={colorScheme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { marginBottom: 24, marginTop: 10 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 4 },
  dateHint: { fontSize: 12, opacity: 0.7, marginTop: 6 },
  loadingHint: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  formToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formToggleText: { fontSize: 13, fontWeight: '600' },
  card: { padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { marginBottom: 16, fontSize: 17, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  inputLabel: { width: 112, fontSize: 14, fontWeight: '500' },
  formBlock: { marginBottom: 14 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  formHelper: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  optionRowWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  optionChip: {
    width: '31%',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.35)',
    alignItems: 'center',
  },
  optionChipText: { fontSize: 13, fontWeight: '600' },
  timePickerButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timePickerText: { fontSize: 14 },
  clearButton: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6 },
  clearButtonText: { fontSize: 12, opacity: 0.8 },
  emptyText: { fontSize: 14, opacity: 0.5, fontStyle: 'italic' },
  checkboxGroup: { rowGap: 10 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.2)',
  },
  checkText: { fontSize: 14, flex: 1 },
  checkedText: { opacity: 0.5, textDecorationLine: 'line-through' },
  courseRatingGroup: { rowGap: 12 },
  courseRatingItem: {
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  courseRatingTitle: { fontSize: 14, fontWeight: '600' },
  starRow: { flexDirection: 'row', gap: 8 },
  starBtn: { paddingVertical: 2, paddingHorizontal: 2 },
  starText: { fontSize: 24, lineHeight: 28 },
  courseReasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  symptomsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  symptomPill: {
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  symptomText: { fontSize: 14, fontWeight: '500' },
  analyzeButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 24 },
  analyzeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statusPanelCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  statusTopRow: { flexDirection: 'row', gap: 14 },
  ringWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ringCenterText: { position: 'absolute', alignItems: 'center' },
  ringScore: { fontSize: 22, fontWeight: '700' },
  ringLabel: { fontSize: 12, opacity: 0.7 },
  metricGroup: { flex: 1, justifyContent: 'space-between' },
  metricRow: { marginBottom: 8 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metricLabel: { fontSize: 12, opacity: 0.85 },
  metricValue: { fontSize: 12, fontWeight: '700' },
  metricTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  metricFill: { height: '100%', borderRadius: 999 },
  ecgCard: { marginVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', padding: 10, alignItems: 'center' },
  ecgWarnText: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  learningHintText: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  adviceSection: { marginBottom: 16 },
  adviceSubtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  adviceText: { fontSize: 15, lineHeight: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bullet: { fontSize: 18, lineHeight: 22, marginRight: 8 },
  historyDate: { fontSize: 12, opacity: 0.75, marginBottom: 3 },
  historyScore: { fontSize: 13 },
  historyChartWrap: { gap: 8 },
  historyLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, opacity: 0.78 },
  historyReasonBox: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  historyReasonText: { fontSize: 13, lineHeight: 20 },
  errorBox: { marginTop: 10, alignItems: 'center', gap: 10 },
  errorText: { color: '#d93025', textAlign: 'center' },
  retryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '84%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: 'rgba(120,120,120,0.35)',
    marginBottom: 12,
  },
  modalContent: { paddingBottom: 30, rowGap: 12 },
  formSection: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, letterSpacing: 0.2 },
});
