import React from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_ORDER,
  HEATMAP_GRID_GAP,
  HEATMAP_Y_AXIS_WIDTH,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  RING_SIZE,
  RING_STROKE,
  SKILL_LABELS,
  useEnglishScreen,
  type SkillModuleId,
} from '@/modules/english/screens/EnglishLearningScreen';

export default function EnglishTab() {
  const { t } = useTranslation();
  const {
    palette,
    records,
    modules,
    selectedItemIds,
    setSelectedItemIds,
    noteInput,
    setNoteInput,
    letLLMInferSkills,
    setLetLLMInferSkills,
    letLLMInferDifficulty,
    setLetLLMInferDifficulty,
    manualDifficulty,
    setManualDifficulty,
    manualSkills,
    setManualSkills,
    statusText,
    isSubmitting,
    selectableItems,
    selectedCount,
    totalKnowledgeExp,
    globalRank,
    contributionHeatmap,
    heatmapCellSize,
    heatmapGridWidth,
    getHeatColor,
    submitSelectedPractice,
  } = useEnglishScreen();

  const getSkillLabel = (skill: SkillModuleId) => t(`english.skill.${skill}`);
  const getDifficultyLabel = (difficulty: keyof typeof DIFFICULTY_LABELS) => t(`english.difficulty.${difficulty}`);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>{t('english.title')}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.icon }]}>{t('english.subtitle')}</ThemedText>

        <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.globalRankBadge, { backgroundColor: `${globalRank.color}24`, borderColor: `${globalRank.color}80` }]}>
            <ThemedText style={[styles.globalRankText, { color: globalRank.color }]}>
              {t('english.rank', { name: globalRank.name })}
            </ThemedText>
          </View>

          <View style={styles.metricCompactRow}>
            <View style={[styles.metricCompactItem, { borderColor: palette.border, backgroundColor: palette.background }]}
            >
              <ThemedText style={[styles.metricCompactLabel, { color: palette.icon }]}>{t('english.metric.records')}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.metricCompactValue}>{records.length}</ThemedText>
            </View>
            <View style={[styles.metricCompactItem, { borderColor: palette.border, backgroundColor: palette.background }]}>
              <ThemedText style={[styles.metricCompactLabel, { color: palette.icon }]}>{t('english.metric.selected')}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.metricCompactValue}>{selectedCount}</ThemedText>
            </View>
            <View style={[styles.metricCompactItem, { borderColor: palette.border, backgroundColor: palette.background }]}>
              <ThemedText style={[styles.metricCompactLabel, { color: palette.icon }]}>{t('english.metric.global')}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.metricCompactValue}>{totalKnowledgeExp}</ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>{t('english.feedback.title')}</ThemedText>
          <ThemedText style={{ color: palette.icon, fontSize: 12 }}>{t('english.feedback.hint')}</ThemedText>

          <View style={styles.feedbackToggleRow}>
            <TouchableOpacity
              style={[
                styles.diffBtn,
                {
                  borderColor: letLLMInferSkills ? palette.tint : palette.border,
                  backgroundColor: letLLMInferSkills ? `${palette.tint}1f` : palette.background,
                },
              ]}
              onPress={() => setLetLLMInferSkills((prev) => !prev)}
            >
              <ThemedText style={{ fontSize: 12 }}>{letLLMInferSkills ? t('english.feedback.skillAuto') : t('english.feedback.skillManual')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.diffBtn,
                {
                  borderColor: letLLMInferDifficulty ? palette.tint : palette.border,
                  backgroundColor: letLLMInferDifficulty ? `${palette.tint}1f` : palette.background,
                },
              ]}
              onPress={() => setLetLLMInferDifficulty((prev) => !prev)}
            >
              <ThemedText style={{ fontSize: 12 }}>{letLLMInferDifficulty ? t('english.feedback.difficultyAuto') : t('english.feedback.difficultyManual')}</ThemedText>
            </TouchableOpacity>
          </View>

          {!letLLMInferDifficulty ? (
            <View style={styles.difficultyRow}>
              {DIFFICULTY_ORDER.map((item) => (
                <TouchableOpacity
                  key={`en-diff-${item}`}
                  style={[
                    styles.diffBtn,
                    {
                      borderColor: manualDifficulty === item ? palette.tint : palette.border,
                      backgroundColor: manualDifficulty === item ? `${palette.tint}1f` : palette.background,
                    },
                  ]}
                  onPress={() => setManualDifficulty(item)}
                >
                  <ThemedText style={{ fontSize: 11 }}>{getDifficultyLabel(item)}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {!letLLMInferSkills ? (
            <View style={styles.difficultyRow}>
              {(Object.keys(SKILL_LABELS) as SkillModuleId[]).map((skill) => (
                <TouchableOpacity
                  key={`skill-${skill}`}
                  style={[
                    styles.diffBtn,
                    {
                      borderColor: manualSkills[skill] ? palette.tint : palette.border,
                      backgroundColor: manualSkills[skill] ? `${palette.tint}1f` : palette.background,
                    },
                  ]}
                  onPress={() =>
                    setManualSkills((prev) => ({
                      ...prev,
                      [skill]: !prev[skill],
                    }))
                  }
                >
                  <ThemedText style={{ fontSize: 11 }}>{getSkillLabel(skill)}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <TextInput
            value={noteInput}
            onChangeText={setNoteInput}
            placeholder={t('english.feedback.notePlaceholder')}
            placeholderTextColor={palette.icon}
            multiline
            style={[styles.feedbackTextarea, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
          />

          <View style={styles.selectionList}>
            {selectableItems.length > 0 ? (
              selectableItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.selectionRow,
                    {
                      borderColor: selectedItemIds[item.id] ? palette.tint : palette.border,
                      backgroundColor: selectedItemIds[item.id] ? `${palette.tint}1a` : palette.background,
                    },
                  ]}
                  onPress={() =>
                    setSelectedItemIds((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{item.title}</ThemedText>
                    <ThemedText style={{ color: palette.icon, fontSize: 12 }}>
                      {item.type === 'task' ? t('english.feedback.itemTask') : t('english.feedback.itemCourse')} · {item.detail}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: selectedItemIds[item.id] ? palette.tint : palette.icon, fontSize: 12, fontWeight: '700' }}>
                    {selectedItemIds[item.id] ? t('english.feedback.selected') : t('english.feedback.select')}
                  </ThemedText>
                </TouchableOpacity>
              ))
            ) : (
              <ThemedText style={{ color: palette.icon, fontSize: 12 }}>{t('english.feedback.emptySelectable')}</ThemedText>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitFeedbackBtn, { backgroundColor: isSubmitting ? palette.border : palette.tint }]}
            onPress={() => void submitSelectedPractice()}
            disabled={isSubmitting}
          >
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
              {isSubmitting ? t('english.feedback.submitting') : t('english.feedback.submit')}
            </ThemedText>
          </TouchableOpacity>

          {statusText ? <ThemedText style={{ color: palette.icon }}>{statusText}</ThemedText> : null}
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>{t('english.module.title')}</ThemedText>
          <View style={styles.ringGrid}>
            {modules
              .slice()
              .sort((a, b) => b.totalExp - a.totalExp)
              .map((module) => {
                const need = module.totalExp >= 0 ? 160 + (module.level - 1) * 70 : 0;
                const progress = need > 0 ? Math.min(1, Math.max(0, module.exp / need)) : 0;
                const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
                return (
                  <View
                    key={module.id}
                    style={[
                      styles.ringItem,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.background,
                      },
                    ]}
                  >
                    <View style={styles.ringWrap}>
                      <Svg width={RING_SIZE} height={RING_SIZE}>
                        <Circle
                          cx={RING_SIZE / 2}
                          cy={RING_SIZE / 2}
                          r={RING_RADIUS}
                          stroke={`${palette.border}8c`}
                          strokeWidth={RING_STROKE}
                          fill="none"
                        />
                        <Circle
                          cx={RING_SIZE / 2}
                          cy={RING_SIZE / 2}
                          r={RING_RADIUS}
                          stroke={palette.tint}
                          strokeWidth={RING_STROKE}
                          strokeLinecap="round"
                          strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                          strokeDashoffset={dashOffset}
                          fill="none"
                          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                        />
                      </Svg>
                      <View style={styles.ringCenterLabel}>
                        <ThemedText type="defaultSemiBold" style={styles.ringPercentText}>{Math.round(progress * 100)}%</ThemedText>
                      </View>
                    </View>

                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{getSkillLabel(module.id)}</ThemedText>
                    <ThemedText style={[styles.ringMetaText, { color: palette.icon }]}>Lv.{module.level}</ThemedText>
                  </View>
                );
              })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>{t('english.heatmap.title')}</ThemedText>
          <ThemedText style={{ color: palette.icon, marginBottom: 6 }}>
            {contributionHeatmap.startLabel} ~ {contributionHeatmap.endLabel} · {t('english.heatmap.total', { total: contributionHeatmap.total })}
          </ThemedText>
          {contributionHeatmap.weeks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
              <View style={styles.heatmapBoard}>
                <View style={styles.heatmapMonthRow}>
                  <View style={styles.heatmapYAxisSpace} />
                  <View style={[styles.heatmapMonthCells, { width: heatmapGridWidth }]}
                  >
                    {contributionHeatmap.monthSpans.map((item, index) => (
                      <View
                        key={`month-span-${index}`}
                        style={{
                          width: item.weeks * heatmapCellSize + Math.max(0, item.weeks - 1) * HEATMAP_GRID_GAP,
                          justifyContent: 'flex-start',
                        }}
                      >
                        <ThemedText style={[styles.heatmapMonthLabel, { color: palette.icon }]} numberOfLines={1}>
                          {item.label}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>

                {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
                  <View key={`weekday-${weekday}`} style={styles.heatmapRow}>
                    <ThemedText style={[styles.heatmapLabel, { color: palette.icon }]}> {weekday === 1 ? t('english.weekdayShort.mon') : weekday === 3 ? t('english.weekdayShort.wed') : weekday === 5 ? t('english.weekdayShort.fri') : ''} </ThemedText>
                    <View style={[styles.heatmapCellsRow, { width: heatmapGridWidth }]}
                    >
                      {contributionHeatmap.weeks.map((week, weekIndex) => {
                        const count = week.counts[weekday] ?? 0;
                        return (
                          <View
                            key={`cell-${weekday}-${weekIndex}`}
                            style={[
                              styles.heatCell,
                              {
                                width: heatmapCellSize,
                                height: heatmapCellSize,
                                backgroundColor: getHeatColor(count),
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('english.heatmap.empty')}</ThemedText>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>{t('english.records.title')}</ThemedText>
          {records.length > 0 ? (
            records.slice(0, 10).map((record) => {
              const totalGain = Object.values(record.points || {}).reduce((sum, value) => sum + value, 0);
              return (
                <View key={record.id} style={[styles.reasonItem, { borderColor: palette.border, backgroundColor: palette.background }]}
                >
                  <View style={styles.reasonHeaderRow}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ flex: 1 }}>
                      {record.selectedItemTitles.join('、') || t('english.records.unnamed')}
                    </ThemedText>
                    <ThemedText style={{ color: palette.icon, fontSize: 12 }}>
                      {getDifficultyLabel(record.difficulty)} · +{totalGain}
                    </ThemedText>
                  </View>

                  <ThemedText style={{ color: palette.icon, fontSize: 12 }}>
                    {t('english.records.skills')}: {record.skills.map((id) => getSkillLabel(id)).join(' / ')}
                  </ThemedText>
                  <ThemedText style={[styles.reasonText, { color: palette.text }]}>
                    {t('english.records.analysis')}: {record.analysisReason || t('english.records.analysisFallback')}
                  </ThemedText>
                  <ThemedText style={[styles.reasonText, { color: palette.text }]}>
                    {t('english.records.points')}: {record.pointReason || t('english.records.pointsFallback')}
                  </ThemedText>
                </View>
              );
            })
          ) : (
            <ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('english.records.empty')}</ThemedText>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingTop: 56,
    paddingBottom: 38,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  globalRankBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  globalRankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricCompactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCompactItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricCompactLabel: {
    fontSize: 10,
    marginBottom: 1,
  },
  metricCompactValue: {
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  cardTitle: {
    marginBottom: 4,
  },
  emptyText: {
    marginVertical: 8,
  },
  feedbackTextarea: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 80,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  feedbackToggleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  diffBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  submitFeedbackBtn: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  selectionList: {
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  selectionRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ringGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  ringItem: {
    width: '31%',
    minWidth: 98,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: 4,
  },
  ringCenterLabel: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercentText: {
    fontSize: 12,
  },
  ringMetaText: {
    fontSize: 11,
    lineHeight: 15,
  },
  reasonItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  reasonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 18,
  },
  heatmapBoard: {
    gap: HEATMAP_GRID_GAP,
    paddingBottom: 2,
  },
  heatmapMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heatmapYAxisSpace: {
    width: HEATMAP_Y_AXIS_WIDTH,
  },
  heatmapMonthCells: {
    flexDirection: 'row',
    gap: HEATMAP_GRID_GAP,
  },
  heatmapMonthLabel: {
    fontSize: 11,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEATMAP_GRID_GAP,
  },
  heatmapLabel: {
    width: HEATMAP_Y_AXIS_WIDTH,
    fontSize: 12,
  },
  heatmapCellsRow: {
    flexDirection: 'row',
    gap: HEATMAP_GRID_GAP,
  },
  heatCell: {
    width: 12,
    height: 12,
    borderRadius: 1,
    borderWidth: 0,
  },
});
