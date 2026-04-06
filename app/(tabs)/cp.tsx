import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from 'react-i18next';
import {
	CP_SUB_RING_CIRCUMFERENCE,
	CP_SUB_RING_RADIUS,
	CP_SUB_RING_SIZE,
	CP_SUB_RING_STROKE,
	DIFFICULTY_ORDER,
	HEATMAP_GRID_GAP,
	HEATMAP_Y_AXIS_WIDTH,
	TAG_CALLOUT_HEIGHT,
	getDifficultyLabel,
	mapToBarData,
	moduleLevelThreshold,
	subLevelThreshold,
	useCompetitiveProgrammingScreen,
	withAlpha,
} from '@/modules/cp/screens/CompetitiveProgrammingScreen';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function CpTab() {
  const { t, i18n } = useTranslation();

	const {
		palette,
		chartWidth,
		cfHandle,
		cfUser,
		upcomingContests,
		contestSolveMap,
		selectedUpcomingIds,
		isAddingUpcoming,
		upcomingActionText,
		feedbackRecords,
		knowledgeModules,
		feedbackSource,
		setFeedbackSource,
		feedbackTitle,
		setFeedbackTitle,
		feedbackAlgorithms,
		setFeedbackAlgorithms,
		feedbackDifficulty,
		setFeedbackDifficulty,
		letLLMInferAlgorithms,
		setLetLLMInferAlgorithms,
		letLLMInferDifficulty,
		setLetLLMInferDifficulty,
		feedbackSolution,
		setFeedbackSolution,
		feedbackStatusText,
		isSubmittingFeedback,
		newSubPointName,
		setNewSubPointName,
		newSubPointModuleId,
		setNewSubPointModuleId,
		loading,
		errorText,
		addSubPoint,
		deleteSubPoint,
		submitProblemFeedback,
		toggleUpcomingSelection,
		addSelectedUpcomingToSchedule,
		currentRating,
		maxRating,
		cfAccepted,
		cfAttempted,
		totalKnowledgeExp,
		globalRank,
		ratingLineData,
		contributionHeatmap,
		heatmapCellSize,
		heatmapGridWidth,
		tagBoardWidth,
		recentContests,
		solvedProblems,
		globalDifficultyStats,
		topTagStats,
		tagPieData,
		tagCallouts,
		selectedUpcomingCount,
		getHeatColor,
		formatDuration,
		formatRemaining,
		subPointsByModule,
	} = useCompetitiveProgrammingScreen();

	return (
		<ThemedView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<ThemedText type="title" style={styles.title}>{t('cp.title')}</ThemedText>
				<ThemedText style={[styles.subtitle, { color: palette.icon }]}>{t('cp.subtitle')}</ThemedText>

				<View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<View style={styles.heroTopRow}>
						<ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.heroHandleText}>
							{cfUser?.handle || cfHandle || t('cp.handleUnset')}
						</ThemedText>
						<ThemedText style={[styles.heroMeta, { color: palette.icon }]} numberOfLines={1}>
							{cfUser?.rank ?? '-'} / {cfUser?.maxRank ?? '-'}
						</ThemedText>
					</View>

					<View style={[styles.globalRankBadge, { backgroundColor: withAlpha(globalRank.color, 0.14), borderColor: withAlpha(globalRank.color, 0.5) }]}>
						<ThemedText style={[styles.globalRankText, { color: globalRank.color }]}>{t('cp.globalRank', { name: globalRank.name })}</ThemedText>
					</View>

					<View style={styles.metricCompactRow}>
						<View style={[styles.metricCompactItem, { borderColor: palette.border, backgroundColor: palette.background }]}>
							<ThemedText style={[styles.metricCompactLabel, { color: palette.icon }]}>{t('cp.metric.current')}</ThemedText>
							<ThemedText type="defaultSemiBold" style={styles.metricCompactValue}>{currentRating ?? '-'}</ThemedText>
						</View>
						<View style={[styles.metricCompactItem, { borderColor: palette.border, backgroundColor: palette.background }]}>
							<ThemedText style={[styles.metricCompactLabel, { color: palette.icon }]}>{t('cp.metric.max')}</ThemedText>
							<ThemedText type="defaultSemiBold" style={styles.metricCompactValue}>{maxRating ?? '-'}</ThemedText>
						</View>
						<View style={[styles.metricCompactItem, { borderColor: palette.border, backgroundColor: palette.background }]}>
							<ThemedText style={[styles.metricCompactLabel, { color: palette.icon }]}>{t('cp.metric.ac')}</ThemedText>
							<ThemedText type="defaultSemiBold" style={styles.metricCompactValue}>{cfAccepted}/{cfAttempted}</ThemedText>
						</View>
						<View style={[styles.metricCompactItem, { borderColor: palette.border, backgroundColor: palette.background }]}>
							<ThemedText style={[styles.metricCompactLabel, { color: palette.icon }]}>{t('cp.metric.global')}</ThemedText>
							<ThemedText type="defaultSemiBold" style={styles.metricCompactValue}>{totalKnowledgeExp}</ThemedText>
						</View>
					</View>
				</View>

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.feedback.title')}</ThemedText>

					<TextInput
						value={feedbackSource}
						onChangeText={setFeedbackSource}
						placeholder={t('cp.feedback.sourcePlaceholder')}
						placeholderTextColor={palette.icon}
						style={[styles.feedbackInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
					/>

					<TextInput
						value={feedbackTitle}
						onChangeText={setFeedbackTitle}
						placeholder={t('cp.feedback.titlePlaceholder')}
						placeholderTextColor={palette.icon}
						style={[styles.feedbackInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
					/>

					<TextInput
						value={feedbackAlgorithms}
						onChangeText={setFeedbackAlgorithms}
						placeholder={t('cp.feedback.algoPlaceholder')}
						placeholderTextColor={palette.icon}
						style={[styles.feedbackInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
					/>

					<ThemedText style={{ color: palette.icon, fontSize: 12 }}>{t('cp.feedback.llmHint')}</ThemedText>

					<View style={styles.feedbackToggleRow}>
						<TouchableOpacity
							style={[
								styles.diffBtn,
								{
									borderColor: letLLMInferAlgorithms ? palette.tint : palette.border,
									backgroundColor: letLLMInferAlgorithms ? withAlpha(palette.tint, 0.12) : palette.background,
								},
							]}
							onPress={() => setLetLLMInferAlgorithms((prev) => !prev)}
						>
							<ThemedText style={{ fontSize: 12 }}>{letLLMInferAlgorithms ? t('cp.feedback.algoAuto') : t('cp.feedback.algoManual')}</ThemedText>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.diffBtn,
								{
									borderColor: letLLMInferDifficulty ? palette.tint : palette.border,
									backgroundColor: letLLMInferDifficulty ? withAlpha(palette.tint, 0.12) : palette.background,
								},
							]}
							onPress={() => setLetLLMInferDifficulty((prev) => !prev)}
						>
							<ThemedText style={{ fontSize: 12 }}>{letLLMInferDifficulty ? t('cp.feedback.diffAuto') : t('cp.feedback.diffManual')}</ThemedText>
						</TouchableOpacity>
					</View>

					{!letLLMInferAlgorithms ? (
						<ThemedText style={{ color: palette.icon, fontSize: 12 }}>{t('cp.feedback.algoOff')}</ThemedText>
					) : null}

					{!letLLMInferDifficulty ? (
						<>
							<ThemedText style={{ color: palette.icon, fontSize: 12 }}>{t('cp.feedback.diffTitle')}</ThemedText>
							<View style={styles.difficultyRow}>
							{DIFFICULTY_ORDER.map((item) => (
								<TouchableOpacity
									key={`diff-${item}`}
									style={[
										styles.diffBtn,
										{
											borderColor: feedbackDifficulty === item ? palette.tint : palette.border,
											backgroundColor: feedbackDifficulty === item ? withAlpha(palette.tint, 0.12) : palette.background,
										},
									]}
									onPress={() => setFeedbackDifficulty(item)}
								>
									<ThemedText style={{ fontSize: 11 }}>{getDifficultyLabel(item)}</ThemedText>
								</TouchableOpacity>
							))}
							</View>
						</>
					) : null}

					{!letLLMInferDifficulty && feedbackDifficulty === 'water' ? (
						<ThemedText style={{ color: palette.icon, fontSize: 12 }}>{t('cp.feedback.waterHint')}</ThemedText>
					) : null}

					<TextInput
						value={feedbackSolution}
						onChangeText={setFeedbackSolution}
						placeholder={t('cp.feedback.solutionPlaceholder')}
						placeholderTextColor={palette.icon}
						multiline
						style={[styles.feedbackTextarea, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
					/>

					<TouchableOpacity
						style={[styles.submitFeedbackBtn, { backgroundColor: isSubmittingFeedback ? palette.border : palette.tint }]}
						onPress={() => void submitProblemFeedback()}
						disabled={isSubmittingFeedback}
					>
						<ThemedText style={{ color: '#fff', fontWeight: '700' }}>{isSubmittingFeedback ? t('cp.feedback.submitting') : t('cp.feedback.submit')}</ThemedText>
					</TouchableOpacity>

					{feedbackStatusText ? <ThemedText style={{ color: palette.icon }}>{feedbackStatusText}</ThemedText> : null}
				</View>

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.knowledge.title')}</ThemedText>
					<ThemedText style={{ color: palette.icon, fontSize: 12, marginBottom: 8 }}>
						{t('cp.knowledge.hint')}
					</ThemedText>

					<View style={styles.modulePickRow}>
						{knowledgeModules.map((module) => (
							<TouchableOpacity
								key={`module-pick-${module.id}`}
								style={[
									styles.diffBtn,
									{
										borderColor: newSubPointModuleId === module.id ? palette.tint : palette.border,
										backgroundColor: newSubPointModuleId === module.id ? withAlpha(palette.tint, 0.12) : palette.background,
									},
								]}
								onPress={() => setNewSubPointModuleId(module.id)}
							>
								<ThemedText style={{ fontSize: 11 }}>{module.name}</ThemedText>
							</TouchableOpacity>
						))}
					</View>

					<View style={styles.knowledgeAddRow}>
						<TextInput
							value={newSubPointName}
							onChangeText={setNewSubPointName}
							placeholder={t('cp.knowledge.addPlaceholder')}
							placeholderTextColor={palette.icon}
							style={[styles.knowledgeInput, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
						/>
						<TouchableOpacity
							style={[styles.knowledgeAddBtn, { backgroundColor: newSubPointModuleId ? palette.tint : palette.border }]}
							onPress={() => void addSubPoint()}
							disabled={!newSubPointModuleId}
						>
							<ThemedText style={{ color: '#fff', fontWeight: '700' }}>{t('cp.knowledge.add')}</ThemedText>
						</TouchableOpacity>
					</View>

					{knowledgeModules
						.slice()
						.sort((a, b) => b.totalExp - a.totalExp)
						.map((module) => {
							const moduleSubs = subPointsByModule.get(module.id) ?? [];
							const moduleNeed = moduleLevelThreshold(module.level);
							const moduleProgress = moduleNeed > 0 ? Math.min(1, Math.max(0, module.exp / moduleNeed)) : 0;
							return (
								<View key={`module-${module.id}`} style={[styles.knowledgeItem, { borderColor: palette.border }]}> 
									<ThemedText type="defaultSemiBold" style={{ marginBottom: 4 }}>{module.name}</ThemedText>
									<View style={styles.knowledgeProgressMeta}>
										<ThemedText style={{ color: palette.icon }}>{t('cp.knowledge.moduleLevel', { level: module.level, exp: module.exp, need: moduleNeed })}</ThemedText>
										<ThemedText style={{ color: palette.icon, fontSize: 12 }}>{Math.round(moduleProgress * 100)}%</ThemedText>
									</View>
									<View style={[styles.knowledgeProgressTrack, { backgroundColor: withAlpha(palette.border, 0.45) }]}>
										<View
											style={[
												styles.knowledgeProgressFill,
												{
													width: `${moduleProgress * 100}%`,
													backgroundColor: palette.tint,
												},
											]}
										/>
									</View>

									<View style={styles.knowledgeSubGrid}>
										{moduleSubs.map((sub) => {
											const subNeed = subLevelThreshold(sub.level);
											const subProgress = subNeed > 0 ? Math.min(1, Math.max(0, sub.exp / subNeed)) : 0;
											const dashOffset = CP_SUB_RING_CIRCUMFERENCE * (1 - subProgress);
											return (
												<View key={`sub-${sub.id}`} style={[styles.knowledgeSubGaugeItem, { borderColor: palette.border, backgroundColor: palette.background }]}> 
													<TouchableOpacity
														style={[styles.knowledgeSubDeleteMiniBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
														onPress={() => void deleteSubPoint(sub.id)}
													>
														<ThemedText style={{ color: palette.icon, fontSize: 11, fontWeight: '700' }}>×</ThemedText>
													</TouchableOpacity>

													<View style={styles.knowledgeSubRingWrap}>
														<Svg width={CP_SUB_RING_SIZE} height={CP_SUB_RING_SIZE}>
															<Circle
																cx={CP_SUB_RING_SIZE / 2}
																cy={CP_SUB_RING_SIZE / 2}
																r={CP_SUB_RING_RADIUS}
																stroke={withAlpha(palette.border, 0.55)}
																strokeWidth={CP_SUB_RING_STROKE}
																fill="none"
															/>
															<Circle
																cx={CP_SUB_RING_SIZE / 2}
																cy={CP_SUB_RING_SIZE / 2}
																r={CP_SUB_RING_RADIUS}
																stroke={palette.tint}
																strokeWidth={CP_SUB_RING_STROKE}
																strokeLinecap="round"
																strokeDasharray={`${CP_SUB_RING_CIRCUMFERENCE} ${CP_SUB_RING_CIRCUMFERENCE}`}
																strokeDashoffset={dashOffset}
																fill="none"
																transform={`rotate(-90 ${CP_SUB_RING_SIZE / 2} ${CP_SUB_RING_SIZE / 2})`}
															/>
														</Svg>
														<View style={styles.knowledgeSubRingCenterLabel}>
															<ThemedText style={styles.knowledgeSubPercentText}>{Math.round(subProgress * 100)}%</ThemedText>
														</View>
													</View>

													<ThemedText numberOfLines={1} style={styles.knowledgeSubNameText}>{sub.name}</ThemedText>
													<ThemedText style={{ color: palette.icon, fontSize: 11 }}>{t('cp.knowledge.subLevel', { level: sub.level })}</ThemedText>
												</View>
											);
										})}
									</View>
								</View>
							);
						})}
				</View>

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.records.title')}</ThemedText>
					{feedbackRecords.length > 0 ? (
						feedbackRecords.slice(0, 8).map((item) => {
							const totalGain = Object.values(item.points || {}).reduce((sum, value) => sum + value, 0);
							return (
								<View key={`reason-${item.id}`} style={[styles.reasonItem, { borderColor: palette.border, backgroundColor: palette.background }]}> 
									<View style={styles.reasonHeaderRow}>
										<ThemedText type="defaultSemiBold" numberOfLines={1} style={{ flex: 1 }}>
											{item.title || t('cp.records.unnamed')}
										</ThemedText>
										<ThemedText style={{ color: palette.icon, fontSize: 12 }}>
											{getDifficultyLabel(item.difficulty)} · +{totalGain}
										</ThemedText>
									</View>

									<ThemedText style={{ color: palette.icon, fontSize: 12 }}>
										{t('cp.records.type', { type: item.problemType === 'new' ? t('cp.records.typeNew') : t('cp.records.typeOld') })}
										{item.source ? ` · ${t('cp.records.source', { source: item.source })}` : ''}
									</ThemedText>

									<ThemedText style={[styles.reasonText, { color: palette.text }]}>{t('cp.records.analysis', { reason: item.analysisReason || t('cp.records.analysisFallback') })}</ThemedText>
									<ThemedText style={[styles.reasonText, { color: palette.text }]}>{t('cp.records.points', { reason: item.pointReason || t('cp.records.pointsFallback') })}</ThemedText>
								</View>
							);
						})
					) : (
						<ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('cp.records.empty')}</ThemedText>
					)}
				</View>

				{!cfHandle ? (
					<View style={[styles.errorBox, { backgroundColor: palette.card, borderColor: palette.border }]}> 
						<ThemedText style={{ color: palette.text }}>{t('cp.handleMissing')}</ThemedText>
					</View>
				) : null}

				{loading ? (
					<View style={styles.loadingWrap}>
						<ActivityIndicator size="small" color={palette.tint} />
						<ThemedText style={{ color: palette.icon }}>{t('cp.loading')}</ThemedText>
					</View>
				) : null}

				{errorText ? (
					<View style={[styles.errorBox, { backgroundColor: palette.card, borderColor: palette.border }]}> 
						<ThemedText style={{ color: palette.text }}>{errorText}</ThemedText>
					</View>
				) : null}

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.ratingTitle')}</ThemedText>
					{ratingLineData.length > 0 ? (
						<ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
							<LineChart
								data={ratingLineData}
								width={Math.max(chartWidth, ratingLineData.length * 34)}
								color={palette.tint}
								thickness={3}
								dataPointsColor={palette.tint}
								hideRules
								yAxisThickness={0}
								xAxisThickness={0}
								yAxisTextStyle={{ color: palette.icon, fontSize: 10 }}
								xAxisLabelTextStyle={{ color: palette.icon, fontSize: 10 }}
								startFillColor={palette.tint}
								endFillColor={palette.tint}
								startOpacity={0.12}
								endOpacity={0.02}
								areaChart
								noOfSections={4}
							/>
						</ScrollView>
					) : (
						<ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('cp.ratingEmpty')}</ThemedText>
					)}
				</View>

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.heatmapTitle')}</ThemedText>
					<ThemedText style={{ color: palette.icon, marginBottom: 6 }}>
						{contributionHeatmap.startLabel} ~ {contributionHeatmap.endLabel} · {t('cp.heatmapTotal', { total: contributionHeatmap.total })}
					</ThemedText>
					{contributionHeatmap.weeks.length > 0 ? (
						<ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
							<View style={styles.heatmapBoard}>
								<View style={styles.heatmapMonthRow}>
									<View style={styles.heatmapYAxisSpace} />
									<View style={[styles.heatmapMonthCells, { width: heatmapGridWidth }]}> 
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
										<View style={[styles.heatmapCellsRow, { width: heatmapGridWidth }]}> 
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
						<ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('cp.heatmapEmpty')}</ThemedText>
					)}
				</View>

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.difficultyTitle')}</ThemedText>
					{globalDifficultyStats.length > 0 ? (
						<BarChart
							data={mapToBarData(globalDifficultyStats, palette.tint)}
							width={chartWidth}
							barWidth={22}
							spacing={12}
							roundedTop
							hideRules
							xAxisThickness={0}
							yAxisThickness={0}
							xAxisLabelTextStyle={{ color: palette.text, fontSize: 10 }}
							yAxisTextStyle={{ color: palette.text, fontSize: 10 }}
						/>
					) : (
						<ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('cp.difficultyEmpty')}</ThemedText>
					)}
				</View>

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.tagTitle')}</ThemedText>
					{topTagStats.length > 0 ? (
						<View style={styles.tagSectionColumn}>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
								<View style={[styles.tagCalloutBoard, { width: tagBoardWidth }]}> 
									<View
										style={[
											styles.tagDonutCenter,
											{
												left: (tagBoardWidth - 190) / 2,
												top: (TAG_CALLOUT_HEIGHT - 190) / 2,
											},
										]}
									>
										<PieChart
											donut
											radius={78}
											innerRadius={45}
											textColor={palette.text}
											data={tagPieData.slice(0, 8)}
											showText={false}
										/>
										<ThemedText type="defaultSemiBold" style={styles.tagCenterText}>{solvedProblems.length}</ThemedText>
										<ThemedText style={[styles.tagCenterSubText, { color: palette.icon }]}>{t('cp.solvedLabel')}</ThemedText>
									</View>

									{tagCallouts.map((item) => {
										return (
											<View key={item.key}>
												<View
													style={[
														styles.tagConnector,
														{
															left: item.lineLeft,
															top: item.lineTop,
															width: item.lineLength,
															backgroundColor: '#000000',
															transform: [{ rotate: `${item.lineAngle}deg` }],
														},
													]}
												/>
												<ThemedText
													numberOfLines={1}
													style={[
														styles.tagCalloutText,
														{
															color: palette.text,
															left: item.labelLeft,
															top: item.labelTop + item.nudgeY,
															width: item.labelWidth,
															textAlign: item.isRight ? 'left' : 'right',
														},
													]}
												>
													{item.text}
												</ThemedText>
											</View>
										);
									})}
								</View>
							</ScrollView>
						</View>
					) : (
						<ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('cp.tagEmpty')}</ThemedText>
					)}
				</View>

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.recentContests')}</ThemedText>
					{recentContests.length > 0 ? (
						recentContests.map((contest) => (
							<View key={`${contest.contestName}-${contest.ratingUpdateTimeSeconds}`} style={[styles.contestRow, { borderColor: palette.border }]}> 
								<View style={styles.contestMain}>
									<ThemedText type="defaultSemiBold" numberOfLines={1}>{contest.contestName}</ThemedText>
									<ThemedText style={{ color: palette.icon }}>
										{new Date(contest.ratingUpdateTimeSeconds * 1000).toLocaleDateString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US')}
									</ThemedText>
									<ThemedText style={{ color: palette.icon }}>
										{t('cp.contestCount', {
											solved: contestSolveMap[contest.contestId]?.solved ?? 0,
											total: contestSolveMap[contest.contestId]?.total ?? '?',
											attempted: contestSolveMap[contest.contestId]?.attempted ?? 0,
										})}
									</ThemedText>
								</View>
								<ThemedText type="defaultSemiBold">{contest.newRating}</ThemedText>
							</View>
						))
					) : (
						<ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('cp.recentEmpty')}</ThemedText>
					)}
				</View>

				<View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
					<View style={styles.upcomingHeaderRow}>
						<ThemedText type="subtitle" style={styles.cardTitle}>{t('cp.upcomingTitle')}</ThemedText>
						<TouchableOpacity
							style={[
								styles.upcomingAddBtn,
								{
									backgroundColor: selectedUpcomingCount > 0 && !isAddingUpcoming ? palette.tint : palette.border,
								},
							]}
							onPress={() => void addSelectedUpcomingToSchedule()}
							disabled={selectedUpcomingCount === 0 || isAddingUpcoming}
						>
							<ThemedText style={[styles.upcomingAddBtnText, { color: selectedUpcomingCount > 0 && !isAddingUpcoming ? '#fff' : palette.icon }]}>
								{isAddingUpcoming ? t('cp.upcomingAdding') : t('cp.upcomingAction', { count: selectedUpcomingCount })}
							</ThemedText>
						</TouchableOpacity>
					</View>
					{upcomingActionText ? (
						<ThemedText style={{ color: palette.icon, fontSize: 12 }}>{upcomingActionText}</ThemedText>
					) : null}
					{upcomingContests.length > 0 ? (
						upcomingContests.map((contest) => (
							<View key={`upcoming-${contest.id}`} style={[styles.contestRow, { borderColor: palette.border }]}> 
								<View style={styles.contestMain}>
									<ThemedText type="defaultSemiBold" numberOfLines={1}>{contest.name}</ThemedText>
									<ThemedText style={{ color: palette.icon }}>{t('cp.contestPlatform', { source: contest.source })}</ThemedText>
									<ThemedText style={{ color: palette.icon }}>
										{t('cp.contestStart', { time: contest.startTimeSeconds ? new Date(contest.startTimeSeconds * 1000).toLocaleString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US') : '-' })}
									</ThemedText>
									<ThemedText style={{ color: palette.icon }}>
										{t('cp.contestDuration', { duration: formatDuration(contest.durationSeconds), remaining: formatRemaining(contest.startTimeSeconds) })}
									</ThemedText>
								</View>
								<TouchableOpacity
									style={[
										styles.upcomingCheckBtn,
										selectedUpcomingIds[contest.id] && { borderColor: palette.tint, backgroundColor: `${palette.tint}22` },
									]}
									onPress={() => toggleUpcomingSelection(contest.id)}
								>
									<ThemedText style={{ color: selectedUpcomingIds[contest.id] ? palette.tint : palette.icon, fontSize: 12, fontWeight: '600' }}>
										{selectedUpcomingIds[contest.id] ? t('cp.upcomingSelected') : t('cp.upcomingSelect')}
									</ThemedText>
								</TouchableOpacity>
							</View>
						))
					) : (
						<ThemedText style={[styles.emptyText, { color: palette.icon }]}>{t('cp.upcomingEmpty')}</ThemedText>
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
	heroTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	heroHandleText: {
		flex: 1,
		fontSize: 15,
	},
	heroMeta: {
		fontSize: 12,
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
	upcomingHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		marginBottom: 2,
	},
	upcomingAddBtn: {
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	upcomingAddBtnText: {
		fontSize: 12,
		fontWeight: '600',
	},
	loadingWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	errorBox: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 10,
		marginBottom: 12,
	},
	emptyText: {
		marginVertical: 8,
	},
	contestRow: {
		borderWidth: 1,
		borderRadius: 10,
		padding: 10,
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	contestMain: {
		flex: 1,
		gap: 2,
	},
	upcomingCheckBtn: {
		borderWidth: 1,
		borderColor: 'rgba(120,120,120,0.35)',
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 6,
		alignSelf: 'center',
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
	feedbackInput: {
		borderWidth: 1,
		borderRadius: 10,
		minHeight: 40,
		paddingHorizontal: 11,
		paddingVertical: 8,
		fontSize: 13,
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
	knowledgeAddRow: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center',
	},
	knowledgeInput: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 10,
		minHeight: 40,
		paddingHorizontal: 11,
		fontSize: 13,
	},
	knowledgeAddBtn: {
		borderRadius: 10,
		paddingHorizontal: 12,
		minHeight: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	knowledgeItem: {
		borderWidth: 1,
		borderRadius: 10,
		padding: 10,
		gap: 4,
	},
	modulePickRow: {
		flexDirection: 'row',
		gap: 6,
		flexWrap: 'wrap',
	},
	knowledgeHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	knowledgeProgressMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	knowledgeProgressTrack: {
		width: '100%',
		height: 8,
		borderRadius: 999,
		overflow: 'hidden',
		marginTop: 4,
	},
	knowledgeProgressFill: {
		height: '100%',
		borderRadius: 999,
	},
	knowledgeDeleteBtn: {
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 5,
	},
	knowledgeSubItem: {
		borderWidth: 1,
		borderRadius: 10,
		padding: 8,
		gap: 4,
		marginTop: 6,
	},
	knowledgeSubGrid: {
		marginTop: 6,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	knowledgeSubGaugeItem: {
		width: '23%',
		minWidth: 78,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 6,
		paddingVertical: 8,
		alignItems: 'center',
		gap: 2,
		position: 'relative',
	},
	knowledgeSubDeleteMiniBtn: {
		position: 'absolute',
		top: 5,
		right: 5,
		width: 18,
		height: 18,
		borderWidth: 1,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	knowledgeSubRingWrap: {
		width: CP_SUB_RING_SIZE,
		height: CP_SUB_RING_SIZE,
		marginTop: 2,
		marginBottom: 2,
	},
	knowledgeSubRingCenterLabel: {
		position: 'absolute',
		left: 0,
		top: 0,
		width: CP_SUB_RING_SIZE,
		height: CP_SUB_RING_SIZE,
		alignItems: 'center',
		justifyContent: 'center',
	},
	knowledgeSubPercentText: {
		fontSize: 10,
		fontWeight: '700',
	},
	knowledgeSubNameText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '600',
	},
	knowledgeNameInput: {
		fontSize: 14,
		fontWeight: '600',
		paddingVertical: 0,
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
	tagSectionColumn: {
		flexDirection: 'column',
		alignItems: 'center',
		gap: 12,
	},
	tagCalloutBoard: {
		width: 320,
		height: TAG_CALLOUT_HEIGHT,
		position: 'relative',
	},
	tagDonutCenter: {
		width: 190,
		height: 190,
		position: 'absolute',
		left: 65,
		top: (TAG_CALLOUT_HEIGHT - 190) / 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tagCenterText: {
		position: 'absolute',
		fontSize: 18,
	},
	tagCenterSubText: {
		position: 'absolute',
		top: 102,
		fontSize: 11,
	},
	tagConnector: {
		position: 'absolute',
		height: 1.5,
		borderRadius: 1,
	},
	tagCalloutText: {
		position: 'absolute',
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '600',
	},
});
