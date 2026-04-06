import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
  Text,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/components/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { ModernTimePicker } from '@/modules/schedule/components/ModernPicker';
import { useGlobalAI } from '../hooks/use-global-ai';
import { useGlobalAIStore } from '../store/useGlobalAIStore';

const SPRITE_SIZE = 50;

export const GlobalAIAssistant = () => {
  const theme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  
  // Use global store for expanded state
  const { isExpanded: expanded, setExpanded } = useGlobalAIStore();
  
  // Position for the floating sprite
  const pan = useRef(new Animated.ValueXY({ x: 20, y: insets.top + 100 })).current;
  const [isDragging, setIsDragging] = useState(false);

  // AI Logic Hook (We'll create this next)
  const {
    messages,
    sendMessage,
    isThinking,
    pendingAction,
    pendingCount,
    pendingActionLabel,
    pendingActionDetails,
    confirmPendingAction,
    skipPendingAction,
    schedulingBackgroundSettings,
    updateSchedulingBackgroundField,
    addPreferredLocation,
    removePreferredLocation,
    setSchedulingMode,
    goals,
    createGoal,
    deleteGoal,
    saveSchedulingBackgroundSettings,
    isSavingSchedulingBackground,
    reloadSchedulingBackgroundSettings,
    reloadGoals,
  } = useGlobalAI();
  const [inputText, setInputText] = useState('');
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [backgroundStatusText, setBackgroundStatusText] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [locationTimeInput, setLocationTimeInput] = useState('');
  const [locationFeatureInput, setLocationFeatureInput] = useState('');
  const [goalTitleInput, setGoalTitleInput] = useState('');
  const [goalExpectation, setGoalExpectation] = useState<'low' | 'medium' | 'high'>('medium');
  const [goalTargetTime, setGoalTargetTime] = useState('10:00');
  const [goalStatusText, setGoalStatusText] = useState('');
  const [goalTimePickerVisible, setGoalTimePickerVisible] = useState(false);
  const [goalTempHour, setGoalTempHour] = useState(10);
  const [goalTempMinute, setGoalTempMinute] = useState(0);
  const [isMealPickerVisible, setIsMealPickerVisible] = useState(false);
  const [mealPickerTarget, setMealPickerTarget] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
  const [mealTempHour, setMealTempHour] = useState(8);
  const [mealTempMinute, setMealTempMinute] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const parseTime = (value?: string) => {
    const [h, m] = (value || '08:00').split(':').map((item) => Number(item));
    return {
      hour: Number.isFinite(h) ? h : 8,
      minute: Number.isFinite(m) ? m : 0,
    };
  };

  const openMealTimePicker = (target: 'breakfast' | 'lunch' | 'dinner') => {
    setMealPickerTarget(target);
    const source =
      target === 'breakfast'
        ? schedulingBackgroundSettings.breakfastTime
        : target === 'lunch'
        ? schedulingBackgroundSettings.lunchTime
        : schedulingBackgroundSettings.dinnerTime;
    const parsed = parseTime(source);
    setMealTempHour(parsed.hour);
    setMealTempMinute(parsed.minute);
    setIsMealPickerVisible(true);
  };

  // PanResponder for dragging the sprite
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
        pan.setValue({ x: 0, y: 0 });
        setIsDragging(true);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setIsDragging(false);
        // Optional: Snap to edge logic here
      }
    })
  ).current;

  const handlePressSprite = () => {
    if (!isDragging) {
      setExpanded(true);
    }
  };

  const handleClose = () => {
    setExpanded(false);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  const openBackgroundModal = async () => {
    setBackgroundStatusText('');
    await reloadSchedulingBackgroundSettings();
    setShowBackgroundModal(true);
  };

  const handleSaveBackground = async () => {
    const ok = await saveSchedulingBackgroundSettings();
    setBackgroundStatusText(ok ? '已保存排程背景设置' : '保存失败，请重试');
    if (ok) {
      setTimeout(() => {
        setShowBackgroundModal(false);
      }, 300);
    }
  };

  const handleAddPreferredLocation = () => {
    const ok = addPreferredLocation({
      name: locationInput,
      availableTimeDetail: locationTimeInput,
      locationFeatures: locationFeatureInput,
    });
    if (ok) {
      setLocationInput('');
      setLocationTimeInput('');
      setLocationFeatureInput('');
      setBackgroundStatusText('地点记录已加入');
      return;
    }
    setBackgroundStatusText('请输入地点名称，且不要重复');
  };

  const openGoalsModal = async () => {
    setGoalStatusText('');
    setGoalTitleInput('');
    setGoalExpectation('medium');
    setGoalTargetTime('10:00');
    await reloadGoals();
    setShowGoalsModal(true);
  };

  const openGoalTimePicker = () => {
    const [h, m] = goalTargetTime.split(':').map((item) => Number(item));
    setGoalTempHour(Number.isFinite(h) ? h : 10);
    setGoalTempMinute(Number.isFinite(m) ? m : 0);
    setGoalTimePickerVisible(true);
  };

  const handleCreateGoal = async () => {
    const ok = await createGoal({ title: goalTitleInput, targetTime: goalTargetTime, expectation: goalExpectation });
    setGoalStatusText(ok ? '目标已创建' : '创建失败，请重试');
    if (ok) {
      setGoalTitleInput('');
      await reloadGoals();
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const ok = await deleteGoal(goalId);
    setGoalStatusText(ok ? '目标已删除' : '删除失败，请重试');
    if (ok) {
      await reloadGoals();
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (expanded) {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }
  }, [messages, expanded, isThinking, pendingCount]);

  // Sprite View
  if (!expanded) {
    return (
      <Animated.View
        style={[
          styles.spriteContainer,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePressSprite}
          style={[styles.sprite, { backgroundColor: Colors[theme].tint }]}
        >
           <Ionicons name="sparkles" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Expanded Chat Modal View
  return (
    <Modal
      visible={expanded}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint={theme} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={[styles.chatWindow, { backgroundColor: Colors[theme].background }]}> 
            <View style={[styles.dragHandle, { backgroundColor: theme === 'dark' ? '#4B5563' : '#CBD5E1' }]} />
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: Colors[theme].icon }]}>
              <View style={styles.headerTitleRow}>
                 <Ionicons name="sparkles" size={20} color={Colors[theme].tint} style={{marginRight: 8}} />
                 <View>
                   <ThemedText type="subtitle">AI 助理</ThemedText>
                   <ThemedText style={styles.headerHint}>日程建议会逐条确认后再执行</ThemedText>
                 </View>
              </View>
              <View style={styles.headerActionRow}>
                <TouchableOpacity onPress={() => void openGoalsModal()} style={styles.headerIconBtn}>
                  <Ionicons name="flag-outline" size={20} color={Colors[theme].text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void openBackgroundModal()} style={styles.headerIconBtn}>
                  <Ionicons name="options-outline" size={20} color={Colors[theme].text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Colors[theme].text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.strategyRow, { borderBottomColor: Colors[theme].icon }]}> 
              <ThemedText style={[styles.innerHintText, { color: Colors[theme].icon }]}>数据源已固定为全量输入（状态面板 / CP成长 / 英语成长 / 目标层）。</ThemedText>
            </View>

            <View style={[styles.strategyRow, { borderBottomColor: Colors[theme].icon }]}> 
              <ThemedText style={[styles.strategyLabel, { color: Colors[theme].icon }]}>排程策略</ThemedText>
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[
                    styles.modeChip,
                    {
                      borderColor: schedulingBackgroundSettings.schedulingMode === 'full_day' ? Colors[theme].tint : Colors[theme].border,
                      backgroundColor: schedulingBackgroundSettings.schedulingMode === 'full_day' ? `${Colors[theme].tint}22` : 'transparent',
                    },
                  ]}
                  onPress={() => void setSchedulingMode('full_day')}
                >
                  <ThemedText style={styles.modeChipText}>排满全天</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeChip,
                    {
                      borderColor: schedulingBackgroundSettings.schedulingMode === 'full_week' ? Colors[theme].tint : Colors[theme].border,
                      backgroundColor: schedulingBackgroundSettings.schedulingMode === 'full_week' ? `${Colors[theme].tint}22` : 'transparent',
                    },
                  ]}
                  onPress={() => void setSchedulingMode('full_week')}
                >
                  <ThemedText style={styles.modeChipText}>排满全周</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeChip,
                    {
                      borderColor: schedulingBackgroundSettings.schedulingMode === 'current_decision' ? Colors[theme].tint : Colors[theme].border,
                      backgroundColor: schedulingBackgroundSettings.schedulingMode === 'current_decision' ? `${Colors[theme].tint}22` : 'transparent',
                    },
                  ]}
                  onPress={() => void setSchedulingMode('current_decision')}
                >
                  <ThemedText style={styles.modeChipText}>只做当前决策</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeChip,
                    {
                      borderColor: schedulingBackgroundSettings.schedulingMode === 'custom' ? Colors[theme].tint : Colors[theme].border,
                      backgroundColor: schedulingBackgroundSettings.schedulingMode === 'custom' ? `${Colors[theme].tint}22` : 'transparent',
                    },
                  ]}
                  onPress={() => void setSchedulingMode('custom')}
                >
                  <ThemedText style={styles.modeChipText}>自定义</ThemedText>
                </TouchableOpacity>
              </View>
              <ThemedText style={[styles.innerHintText, { color: Colors[theme].icon }]}>排满全天/全周时会降低对“当前状态”的侧重；只做当前决策时会提高状态侧重。</ThemedText>
              {schedulingBackgroundSettings.schedulingMode === 'custom' ? (
                <TextInput
                  value={schedulingBackgroundSettings.customModeInstruction}
                  onChangeText={(text) => updateSchedulingBackgroundField('customModeInstruction', text)}
                  placeholder="自定义策略说明"
                  placeholderTextColor={Colors[theme].icon}
                  style={[
                    styles.customStrategyInput,
                    { borderColor: Colors[theme].border, color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
                  ]}
                />
              ) : null}
            </View>

            {/* Chat Area */}
            <ScrollView 
                ref={scrollViewRef}
                style={styles.msgsArea}
                contentContainerStyle={{ padding: 15, gap: 10 }}
            >
                {/* Intro Message */}
                {messages.length === 0 && (
                  <View style={[styles.emptyState, { backgroundColor: theme === 'dark' ? '#1F2937' : '#EEF2FF' }]}>
                         <ThemedText style={{textAlign: 'center', opacity: 0.6}}>
                             我是你的日程助理。你可以让我帮你「添加明天的会议」、「删除刚才的任务」或「查询今天的安排」。
                         </ThemedText>
                    </View>
                )}

                {messages.map((msg, idx) => (
                    <View 
                        key={idx} 
                        style={[
                          styles.msgBubble,
                            msg.role === 'user' 
                            ? { alignSelf: 'flex-end', backgroundColor: Colors[theme].tint, borderBottomRightRadius: 6 }
                            : { alignSelf: 'flex-start', backgroundColor: theme === 'dark' ? '#2F2F32' : '#ECECF2', borderBottomLeftRadius: 6 }
                        ]}
                    >
                        <Text style={[styles.msgText, { color: msg.role === 'user' ? '#fff' : Colors[theme].text }]}>
                            {msg.content}
                        </Text>
                    </View>
                ))}

                {isThinking && (
                       <View style={[styles.msgBubble, { alignSelf: 'flex-start', backgroundColor: theme === 'dark' ? '#2F2F32' : '#ECECF2', borderBottomLeftRadius: 6 }]}>
                        <View style={styles.thinkingRow}>
                          <ActivityIndicator size="small" color={Colors[theme].text} />
                          <ThemedText style={styles.thinkingText}>思考中...</ThemedText>
                        </View>
                    </View>
                )}

                {pendingAction && (
                  <View style={[styles.pendingCard, { backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7', borderColor: Colors[theme].icon }]}>
                    <ThemedText type="defaultSemiBold">待确认排程（剩余 {pendingCount} 条）</ThemedText>
                    <ThemedText style={styles.pendingLabel}>{pendingActionLabel}</ThemedText>
                    <View style={styles.pendingDetailsGroup}>
                      {pendingActionDetails.map((line, idx) => (
                        <ThemedText key={`pending_detail_${idx}`} style={styles.pendingDetailText}>• {line}</ThemedText>
                      ))}
                    </View>
                    <View style={styles.pendingActionsRow}>
                      <TouchableOpacity
                        onPress={skipPendingAction}
                        style={[styles.pendingBtn, styles.skipBtn, { borderColor: Colors[theme].icon }]}
                      >
                        <Text style={{ color: Colors[theme].text }}>跳过本条</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={confirmPendingAction}
                        style={[styles.pendingBtn, styles.confirmBtn, { backgroundColor: Colors[theme].tint }]}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>确认执行</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputArea, { borderTopColor: Colors[theme].icon }]}>
                <TextInput
                    style={[styles.input, { 
                        color: Colors[theme].text, 
                        backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' 
                    }]}
                    placeholder="输入指令..."
                    placeholderTextColor={Colors[theme].icon}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSend}
                multiline
                maxLength={400}
                    returnKeyType="send"
                />
                <TouchableOpacity 
                    onPress={handleSend}
                style={[styles.sendBtn, { backgroundColor: inputText.trim() ? Colors[theme].tint : '#A1A1AA' }]}
                    disabled={!inputText.trim()}
                >
                    <Ionicons name="arrow-up" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        <Modal
          visible={showBackgroundModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBackgroundModal(false)}
        >
          <View style={styles.innerModalOverlay}>
            <View style={[styles.innerModalCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].border }]}> 
              <View style={styles.innerModalHeader}>
                <ThemedText type="defaultSemiBold">排程层：AI 背景设置</ThemedText>
                <TouchableOpacity onPress={() => setShowBackgroundModal(false)} style={styles.headerIconBtn}>
                  <Ionicons name="close" size={20} color={Colors[theme].text} />
                </TouchableOpacity>
              </View>

              <ThemedText style={[styles.strategyLabel, { color: Colors[theme].icon }]}>地点（可长期记录）</ThemedText>
              <View style={styles.locationInputRow}>
                <TextInput
                  value={locationInput}
                  onChangeText={setLocationInput}
                  placeholder="地点名称（例如：图书馆 4F 东区）"
                  placeholderTextColor={Colors[theme].icon}
                  style={[
                    styles.locationInput,
                    { borderColor: Colors[theme].border, color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
                  ]}
                />
              </View>
              <View style={styles.locationInputRow}>
                <TextInput
                  value={locationTimeInput}
                  onChangeText={setLocationTimeInput}
                  placeholder="可用时间（例如：工作日 9:00-11:30）"
                  placeholderTextColor={Colors[theme].icon}
                  style={[
                    styles.locationInput,
                    { borderColor: Colors[theme].border, color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
                  ]}
                />
              </View>
              <View style={styles.locationInputRow}>
                <TextInput
                  value={locationFeatureInput}
                  onChangeText={setLocationFeatureInput}
                  placeholder="地点特点（例如：安静/有电源/可讨论）"
                  placeholderTextColor={Colors[theme].icon}
                  style={[
                    styles.locationInput,
                    { borderColor: Colors[theme].border, color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
                  ]}
                />
                <TouchableOpacity style={[styles.locationAddBtn, { backgroundColor: Colors[theme].tint }]} onPress={handleAddPreferredLocation}>
                  <ThemedText style={styles.saveBackgroundBtnText}>添加</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.locationListWrap}>
                {schedulingBackgroundSettings.locationRecords.length > 0 ? (
                  schedulingBackgroundSettings.locationRecords.map((item) => (
                    <View key={`pref-location-${item.id}`} style={[styles.locationCard, { borderColor: Colors[theme].border, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' }]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{item.name}</ThemedText>
                        <ThemedText style={{ fontSize: 11, color: Colors[theme].icon }}>时间：{item.availableTimeDetail || '未填写'}</ThemedText>
                        <ThemedText style={{ fontSize: 11, color: Colors[theme].icon }}>特点：{item.locationFeatures || '未填写'}</ThemedText>
                      </View>
                      <TouchableOpacity onPress={() => removePreferredLocation(item.id)} style={styles.locationDeleteBtn}>
                        <Ionicons name="close" size={14} color={Colors[theme].icon} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <ThemedText style={{ color: Colors[theme].icon, fontSize: 12 }}>暂无地点，添加后会长期保存</ThemedText>
                )}
              </View>

              <View style={styles.mealTimeRow}>
                <TouchableOpacity style={[styles.mealTimeBtn, { borderColor: Colors[theme].border }]} onPress={() => openMealTimePicker('breakfast')}>
                  <ThemedText style={styles.mealTimeLabel}>早餐</ThemedText>
                  <ThemedText>{schedulingBackgroundSettings.breakfastTime}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mealTimeBtn, { borderColor: Colors[theme].border }]} onPress={() => openMealTimePicker('lunch')}>
                  <ThemedText style={styles.mealTimeLabel}>午餐</ThemedText>
                  <ThemedText>{schedulingBackgroundSettings.lunchTime}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mealTimeBtn, { borderColor: Colors[theme].border }]} onPress={() => openMealTimePicker('dinner')}>
                  <ThemedText style={styles.mealTimeLabel}>晚餐</ThemedText>
                  <ThemedText>{schedulingBackgroundSettings.dinnerTime}</ThemedText>
                </TouchableOpacity>
              </View>

              <TextInput
                value={schedulingBackgroundSettings.hardConstraints}
                onChangeText={(text) => updateSchedulingBackgroundField('hardConstraints', text)}
                placeholder="强硬约束"
                placeholderTextColor={Colors[theme].icon}
                multiline
                style={[
                  styles.backgroundInput,
                  { borderColor: Colors[theme].border, color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
                ]}
              />

              <TextInput
                value={schedulingBackgroundSettings.allowTaskDuringCourseNames}
                onChangeText={(text) => updateSchedulingBackgroundField('allowTaskDuringCourseNames', text)}
                placeholder="允许上课中安排任务的课程（逗号/换行分隔，例如：形势与政策, 大学体育）"
                placeholderTextColor={Colors[theme].icon}
                multiline
                style={[
                  styles.backgroundInput,
                  { borderColor: Colors[theme].border, color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
                ]}
              />
              <ThemedText style={{ color: Colors[theme].icon, fontSize: 12 }}>
                仅白名单课程允许上课时安排任务，且会优先要求教室/图书馆等学习环境。
              </ThemedText>

              <TouchableOpacity
                style={[styles.saveBackgroundBtn, { backgroundColor: Colors[theme].tint }]}
                onPress={() => void handleSaveBackground()}
                disabled={isSavingSchedulingBackground}
              >
                <ThemedText style={styles.saveBackgroundBtnText}>{isSavingSchedulingBackground ? '保存中...' : '保存设置'}</ThemedText>
              </TouchableOpacity>
              {backgroundStatusText ? <ThemedText style={{ color: Colors[theme].icon, fontSize: 12 }}>{backgroundStatusText}</ThemedText> : null}
            </View>
          </View>
        </Modal>

        <Modal
          visible={showGoalsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGoalsModal(false)}
        >
          <View style={styles.innerModalOverlay}>
            <View style={[styles.innerModalCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].border }]}> 
              <View style={styles.innerModalHeader}>
                <ThemedText type="defaultSemiBold">目标层</ThemedText>
                <TouchableOpacity onPress={() => setShowGoalsModal(false)} style={styles.headerIconBtn}>
                  <Ionicons name="close" size={20} color={Colors[theme].text} />
                </TouchableOpacity>
              </View>

              <TextInput
                value={goalTitleInput}
                onChangeText={setGoalTitleInput}
                placeholder="目标内容（例如：今晚完成图论复盘）"
                placeholderTextColor={Colors[theme].icon}
                style={[styles.goalInput, { borderColor: Colors[theme].border, color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' }]}
              />

              <View style={styles.goalCreateRow}>
                <TouchableOpacity style={[styles.goalTimeBtn, { borderColor: Colors[theme].border }]} onPress={openGoalTimePicker}>
                  <ThemedText style={{ fontSize: 12 }}>时间 {goalTargetTime}</ThemedText>
                </TouchableOpacity>
                <View style={styles.goalExpectationRow}>
                  {(['low', 'medium', 'high'] as Array<'low' | 'medium' | 'high'>).map((level) => (
                    <TouchableOpacity
                      key={`goal-level-${level}`}
                      style={[
                        styles.goalChip,
                        {
                          borderColor: goalExpectation === level ? Colors[theme].tint : Colors[theme].border,
                          backgroundColor: goalExpectation === level ? `${Colors[theme].tint}22` : 'transparent',
                        },
                      ]}
                      onPress={() => setGoalExpectation(level)}
                    >
                      <ThemedText style={{ fontSize: 12 }}>{level === 'low' ? '低' : level === 'high' ? '高' : '中'}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={[styles.saveBackgroundBtn, { backgroundColor: Colors[theme].tint }]} onPress={() => void handleCreateGoal()}>
                <ThemedText style={styles.saveBackgroundBtnText}>创建目标</ThemedText>
              </TouchableOpacity>

              <ScrollView style={styles.goalListArea}>
                {goals.length > 0 ? (
                  goals.map((goal) => (
                    <View key={goal.id} style={[styles.goalItem, { borderColor: Colors[theme].border, backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7' }]}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="defaultSemiBold" numberOfLines={1}>{goal.title}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: Colors[theme].icon }}>
                          {goal.targetTime} · 期望 {goal.expectation === 'low' ? '低' : goal.expectation === 'high' ? '高' : '中'}
                        </ThemedText>
                      </View>
                      <TouchableOpacity style={[styles.goalDeleteBtn, { borderColor: Colors[theme].border }]} onPress={() => void handleDeleteGoal(goal.id)}>
                        <ThemedText style={{ fontSize: 12 }}>删除</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <ThemedText style={{ color: Colors[theme].icon, fontSize: 12 }}>暂无目标，先创建一条</ThemedText>
                )}
              </ScrollView>

              {goalStatusText ? <ThemedText style={{ color: Colors[theme].icon, fontSize: 12 }}>{goalStatusText}</ThemedText> : null}
            </View>
          </View>
        </Modal>

        <ModernTimePicker
          visible={isMealPickerVisible}
          onClose={() => setIsMealPickerVisible(false)}
          onConfirm={(h, m) => {
            const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            if (mealPickerTarget === 'breakfast') updateSchedulingBackgroundField('breakfastTime', value);
            else if (mealPickerTarget === 'lunch') updateSchedulingBackgroundField('lunchTime', value);
            else updateSchedulingBackgroundField('dinnerTime', value);
            setIsMealPickerVisible(false);
          }}
          tempHour={mealTempHour}
          setTempHour={setMealTempHour}
          tempMinute={mealTempMinute}
          setTempMinute={setMealTempMinute}
          theme={theme}
        />

        <ModernTimePicker
          visible={goalTimePickerVisible}
          onClose={() => setGoalTimePickerVisible(false)}
          onConfirm={(h, m) => {
            setGoalTargetTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            setGoalTimePickerVisible(false);
          }}
          tempHour={goalTempHour}
          setTempHour={setGoalTempHour}
          tempMinute={goalTempMinute}
          setTempMinute={setGoalTempMinute}
          theme={theme}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  spriteContainer: {
    position: 'absolute',
    zIndex: 9999, // High z-index to float on top
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sprite: {
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    borderRadius: SPRITE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  chatWindow: {
    width: '100%',
    height: '84%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
    dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
    },
  headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center'
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: 12,
  },
    headerHint: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 2,
    },
    strategyRow: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 8,
    },
    strategyLabel: {
      fontSize: 12,
    },
  closeBtn: {
      padding: 6,
      borderRadius: 12,
  },
  innerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  innerModalCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    maxHeight: '78%',
    gap: 8,
  },
  innerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  innerHintText: {
    fontSize: 12,
    marginTop: 2,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  goalCreateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  goalTimeBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goalExpectationRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  goalChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goalListArea: {
    maxHeight: 180,
  },
  goalItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalDeleteBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  customStrategyInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  backgroundInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  locationInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  locationAddBtn: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
  },
  locationListWrap: {
    flexDirection: 'column',
    gap: 8,
  },
  locationCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationDeleteBtn: {
    padding: 2,
  },
  mealTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTimeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  mealTimeLabel: {
    fontSize: 11,
    opacity: 0.75,
  },
  saveBackgroundBtn: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  saveBackgroundBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  msgsArea: {
      flex: 1,
  },
  msgBubble: {
      maxWidth: '86%',
      padding: 12,
      borderRadius: 16,
  },
    msgText: {
      fontSize: 14,
      lineHeight: 20,
    },
    thinkingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    thinkingText: {
      fontSize: 13,
      opacity: 0.75,
    },
  emptyState: {
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
  },
  inputArea: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 18 : 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10
  },
  input: {
      flex: 1,
      minHeight: 42,
      maxHeight: 96,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
  },
    pendingCard: {
      marginTop: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 14,
      padding: 12,
      gap: 8,
      alignSelf: 'stretch',
    },
    pendingLabel: {
      opacity: 0.85,
      fontWeight: '600',
    },
    pendingDetailsGroup: {
      gap: 4,
    },
    pendingDetailText: {
      fontSize: 13,
      opacity: 0.9,
    },
    pendingActionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    pendingBtn: {
      flex: 1,
      height: 38,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    skipBtn: {
      borderWidth: StyleSheet.hairlineWidth,
    },
    confirmBtn: {},
  sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
  }
});
