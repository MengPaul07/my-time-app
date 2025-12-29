import { StyleSheet, TouchableOpacity, FlatList, TextInput, View, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/utils/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTaskContext } from '@/contexts/TaskContext';
import { CustomAlert } from '@/components/ui/custom-alert';
import { Toast } from '@/components/ui/toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_duration?: number; // 单位：秒
  actual_duration: number;
  start_time?: string;
}

// 时间轴配置
const HOUR_HEIGHT = 70; // 每小时的高度
const START_HOUR = 6;   // 起始时间 6:00
const END_HOUR = 23;    // 结束时间 23:00 (只让选到23点，显示到24点)

export default function ScheduleScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastConfig({ visible: true, message, type });
  };

  const closeToast = () => {
    setToastConfig({ visible: false, message: '', type: 'info' });
  };

  const { setCurrentTask } = useTaskContext();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // Alert Config
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [] as any[],
  });

  const showAlert = (title: string, message: string, buttons: any[] = []) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : [{ text: '确定', style: 'default', onPress: closeAlert }],
    });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Time Picker State
  const [tempHour, setTempHour] = useState(START_HOUR);
  const [tempMinute, setTempMinute] = useState(0);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      showToast('加载任务失败', 'error');
    } else {
      setTasks(data || []);
    }
    setIsLoading(false);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setEstimatedDuration('');
    setStartTime(null);
    const nowHour = new Date().getHours();
    // 限制默认时间在合法范围内
    setTempHour(nowHour < START_HOUR ? START_HOUR : (nowHour > END_HOUR ? END_HOUR : nowHour));
    setTempMinute(0);
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setEstimatedDuration(task.estimated_duration ? (task.estimated_duration / 60).toString() : '');
    
    if (task.start_time) {
      const date = new Date(task.start_time);
      setStartTime(date);
      setTempHour(date.getHours());
      setTempMinute(date.getMinutes());
    } else {
      setStartTime(null);
      setTempHour(START_HOUR);
      setTempMinute(0);
    }
    
    setModalVisible(true);
  };

  // --- 重构后的更美观的时间选择器 ---
  const renderModernTimePicker = () => {
    // 生成小时数组 (6 - 23)
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    // 生成分钟数组 (0, 5, 10... 这样选起来更快，或者0-59都可以，这里用每5分钟一个间隔体验更好)
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); 

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isPickerVisible}
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.pickerOverlay} 
          activeOpacity={1} 
          onPress={() => setIsPickerVisible(false)}
        >
          <ThemedView style={styles.modernPickerContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.modernPickerHeader}>
              <TouchableOpacity onPress={() => setIsPickerVisible(false)}>
                <ThemedText style={{ color: Colors[theme].icon }}>取消</ThemedText>
              </TouchableOpacity>
              <ThemedText type="subtitle">选择时间</ThemedText>
              <TouchableOpacity onPress={() => {
                 const now = new Date();
                 const newDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), tempHour, tempMinute);
                 setStartTime(newDate);
                 setIsPickerVisible(false);
              }}>
                <ThemedText style={{ color: Colors[theme].tint, fontWeight: 'bold' }}>确定</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerColumnsContainer}>
              {/* 小时列 */}
              <View style={styles.pickerColumn}>
                <ThemedText style={styles.pickerColumnLabel}>时</ThemedText>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {hours.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.pickerItem,
                        tempHour === h && { backgroundColor: Colors[theme].tint + '20', borderRadius: 8 }
                      ]}
                      onPress={() => setTempHour(h)}
                    >
                      <ThemedText style={[
                        styles.pickerItemText, 
                        tempHour === h && { color: Colors[theme].tint, fontWeight: 'bold', fontSize: 20 }
                      ]}>
                        {h}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: 100 }} /> 
                </ScrollView>
              </View>

              {/* 分隔线 */}
              <View style={{ width: 1, backgroundColor: Colors[theme].icon, opacity: 0.1, height: '80%' }} />

              {/* 分钟列 */}
              <View style={styles.pickerColumn}>
                <ThemedText style={styles.pickerColumnLabel}>分</ThemedText>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {minutes.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.pickerItem,
                        tempMinute === m && { backgroundColor: Colors[theme].tint + '20', borderRadius: 8 }
                      ]}
                      onPress={() => setTempMinute(m)}
                    >
                      <ThemedText style={[
                        styles.pickerItemText,
                        tempMinute === m && { color: Colors[theme].tint, fontWeight: 'bold', fontSize: 20 }
                      ]}>
                        {String(m).padStart(2, '0')}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                   {/* 补充单个分钟的微调，如果用户需要精确到1分钟，可以在这里加，或者保持5分钟间隔更清爽 */}
                   <View style={{ height: 100 }} />
                </ScrollView>
              </View>
            </View>
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    );
  };

  const handleSaveTask = async () => {
    if (!title.trim()) {
      showAlert('提示', '请输入任务名称');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showAlert('提示', '请先登录');
      return;
    }

    let durationInSeconds = null;
    if (estimatedDuration) {
      const minutes = parseInt(estimatedDuration);
      if (isNaN(minutes) || minutes < 1) {
        showAlert('提示', '请输入有效的预计时间');
        return;
      }
      durationInSeconds = minutes * 60;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      estimated_duration: durationInSeconds,
      start_time: startTime ? startTime.toISOString() : null,
    };

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id);

      if (error) {
        showAlert('更新失败', error.message);
      } else {
        setModalVisible(false);
        fetchTasks();
        showToast('任务已更新', 'success');
      }
    } else {
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          ...taskData,
          status: 'pending',
        });

      if (error) {
        showAlert('添加失败', error.message);
      } else {
        setModalVisible(false);
        fetchTasks();
        showToast('任务已创建', 'success');
      }
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);
    if (!error) fetchTasks();
  };

  const deleteTask = async (id: number) => {
    showAlert('确认删除', '确定要删除这个任务吗？', [
      { text: '取消', style: 'cancel', onPress: closeAlert },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('tasks').delete().eq('id', id);
          if (!error) {
            fetchTasks();
            showToast('任务已删除', 'success');
          }
          closeAlert();
        },
      },
    ]);
  };

  const startFocus = (task: Task) => {
    setCurrentTask(task);
    router.push('/(tabs)');
  };

  // --- 重叠算法核心逻辑 ---
  const processedTimelineTasks = useMemo(() => {
    // 1. 筛选出有开始时间和持续时间的有效任务
    const validTasks = tasks.filter(t => t.start_time && t.estimated_duration);
    
    // 2. 将它们转换为布局对象，包括 top, height, startMin, endMin
    const layoutTasks = validTasks.map(task => {
        const start = new Date(task.start_time!);
        const startHour = start.getHours();
        const startMinTotal = startHour * 60 + start.getMinutes();
        
        // 过滤掉不在显示范围 (6:00 - 24:00) 的任务
        if (startHour < START_HOUR) return null;

        const durationMin = Math.floor(task.estimated_duration! / 60);
        const endMinTotal = startMinTotal + durationMin;

        // Top 计算：相对于 START_HOUR 的偏移
        const top = (startHour - START_HOUR) * HOUR_HEIGHT + (start.getMinutes() / 60) * HOUR_HEIGHT;
        const height = Math.max((task.estimated_duration! / 3600) * HOUR_HEIGHT, 30); // 最小高度

        return {
            ...task,
            startMinTotal,
            endMinTotal,
            layout: { top, height, widthPercent: 100, leftPercent: 0 } // 初始占满
        };
    }).filter((t): t is NonNullable<typeof t> => t !== null);

    // 3. 计算重叠 (碰撞检测)
    // 这是一个简化版的 "列填充" 算法
    // 我们遍历所有任务，查看它与哪些任务重叠
    const clusters: typeof layoutTasks[] = [];
    
    // 简单按开始时间排序
    layoutTasks.sort((a, b) => a.startMinTotal - b.startMinTotal);

    for (let i = 0; i < layoutTasks.length; i++) {
        const current = layoutTasks[i];
        let placed = false;
        
        // 尝试放入现有的重叠组 (Cluster)
        for (const cluster of clusters) {
            // 如果当前任务与该组中任何一个任务重叠，则加入该组
            const overlap = cluster.some(other => 
                (current.startMinTotal < other.endMinTotal && current.endMinTotal > other.startMinTotal)
            );
            
            if (overlap) {
                cluster.push(current);
                placed = true;
                break;
            }
        }
        
        // 如果没有重叠，创建新组
        if (!placed) {
            clusters.push([current]);
        }
    }

    // 4. 计算每个组内的宽度和位置
    clusters.forEach(cluster => {
        const widthPercent = 100 / cluster.length;
        cluster.forEach((task, index) => {
            task.layout.widthPercent = widthPercent;
            task.layout.leftPercent = index * widthPercent;
        });
    });

    return layoutTasks;
  }, [tasks]);


  const renderListItem = ({ item }: { item: Task }) => (
    <ThemedView style={[styles.card, { borderColor: Colors[theme].icon }]}>
      <TouchableOpacity onPress={() => toggleTaskStatus(item)} style={styles.checkbox}>
        <Ionicons 
          name={item.status === 'completed' ? "checkbox" : "square-outline"} 
          size={24} 
          color={item.status === 'completed' ? Colors[theme].tint : Colors[theme].icon} 
        />
      </TouchableOpacity>
      
      <View style={styles.taskInfo}>
        <ThemedText style={[
          styles.taskTitle, 
          item.status === 'completed' && { textDecorationLine: 'line-through', opacity: 0.5 }
        ]}>
          {item.title}
        </ThemedText>
        <View style={styles.metaContainer}>
           <ThemedText style={styles.durationText}>
              {item.start_time ? new Date(item.start_time).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}) : '无时间'} 
              {item.estimated_duration ? ` • ${Math.floor(item.estimated_duration / 60)} 分钟` : ''}
           </ThemedText>
        </View>
      </View>

      {item.status !== 'completed' && (
        <TouchableOpacity onPress={() => startFocus(item)} style={styles.actionButton}>
          <Ionicons name="play-circle" size={28} color={Colors[theme].tint} />
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
        <Ionicons name="create-outline" size={20} color={Colors[theme].icon} />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.actionButton}>
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </ThemedView>
  );

  const renderTimeline = () => {
    // 渲染刻度线 [6 ... 24]
    const hours = Array.from({ length: END_HOUR - START_HOUR + 2 }, (_, i) => START_HOUR + i);

    return (
      <ScrollView 
        style={styles.timelineContainer} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineContent}>
          {/* A. 背景网格 */}
          {hours.map((hour) => (
            <View key={hour} style={[styles.timelineRow, { height: HOUR_HEIGHT }]}>
              <ThemedText style={styles.timelineHourText}>
                {hour}:00
              </ThemedText>
              <View style={[styles.timelineLine, { backgroundColor: Colors[theme].icon, opacity: 0.1 }]} />
            </View>
          ))}

          {/* B. 任务块 (使用计算好的 processedTimelineTasks) */}
          {processedTimelineTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const { top, height, widthPercent, leftPercent } = task.layout;
            
            // 计算实际样式宽度: (屏幕宽 - 左侧时间栏宽 - 右padding) * 百分比
            const availableWidth = SCREEN_WIDTH - 65 - 20; // 65是左边距，20是右边距
            const itemWidth = (availableWidth * widthPercent) / 100 - 4; // -4 留一点缝隙
            const itemLeft = 65 + (availableWidth * leftPercent) / 100;

            return (
              <TouchableOpacity
                key={task.id}
                onPress={() => openEditModal(task)}
                activeOpacity={0.8}
                style={[
                  styles.timelineTaskBlock,
                  {
                    top: top,
                    height: height,
                    left: itemLeft,
                    width: itemWidth,
                    backgroundColor: isCompleted ? '#E0F2F1' : Colors[theme].tint + '15', // 背景色更淡
                    borderLeftColor: isCompleted ? '#4CAF50' : Colors[theme].tint, // 左侧加粗线条
                    borderColor: Colors[theme].icon + '30',
                    borderWidth: 1,
                    borderLeftWidth: 4, // 覆盖上面的
                  }
                ]}
              >
                <View style={styles.timelineTaskContent}>
                  <ThemedText numberOfLines={1} style={[styles.timelineTaskTitle, { color: Colors[theme].text }]}>
                    {task.title}
                  </ThemedText>
                  
                  {height > 35 && (
                    <ThemedText style={[styles.timelineTaskTime, { color: Colors[theme].text, opacity: 0.6 }]}>
                       {new Date(task.start_time!).getHours()}:{String(new Date(task.start_time!).getMinutes()).padStart(2, '0')}
                    </ThemedText>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type as 'success' | 'error' | 'info'}
        onHide={closeToast}
      />

      <View style={styles.headerContainer}>
        <ThemedText type="title">日程管理</ThemedText>
        <TouchableOpacity
          style={[styles.switchViewButton, { backgroundColor: Colors[theme].tint + '15' }]} // 浅色背景
          onPress={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
        >
          <Ionicons name={viewMode === 'list' ? "calendar" : "list"} size={18} color={Colors[theme].tint} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors[theme].tint} style={{ marginTop: 20 }} />
      ) : viewMode === 'list' ? (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderListItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>今天没有任务，休息一下？</ThemedText>
          }
        />
      ) : (
        renderTimeline()
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: Colors[theme].tint }]} 
        onPress={openCreateModal}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{editingTask ? '编辑' : '新建'}</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color={Colors[theme].icon} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.label}>任务</ThemedText>
              <TextInput
                style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]}
                placeholder="例如：健身、阅读"
                placeholderTextColor={Colors[theme].icon}
                value={title}
                onChangeText={setTitle}
                autoFocus={!editingTask}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.label}>时长 (分)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]}
                    placeholder="45"
                    placeholderTextColor={Colors[theme].icon}
                    value={estimatedDuration}
                    onChangeText={setEstimatedDuration}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 15 }} />
                <View style={{ flex: 1.5 }}>
                   <ThemedText style={styles.label}>开始时间</ThemedText>
                   <TouchableOpacity 
                    style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                    onPress={() => setIsPickerVisible(true)}
                  >
                    <Ionicons name="time-outline" size={18} color={Colors[theme].icon} style={{ marginRight: 8 }} />
                    <ThemedText 
                      numberOfLines={1}
                      style={{ color: startTime ? Colors[theme].text : Colors[theme].icon, fontSize: 15 }}
                    >
                      {startTime ? `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2,'0')}` : '点击选择'}
                    </ThemedText>
                    {startTime && (
                      <TouchableOpacity onPress={() => setStartTime(null)} style={{ marginLeft: 'auto' }}>
                        <Ionicons name="close-circle" size={16} color={Colors[theme].icon} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <ThemedText style={styles.label}>备注</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]}
                placeholder="添加详细描述..."
                placeholderTextColor={Colors[theme].icon}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: Colors[theme].tint }]} 
              onPress={handleSaveTask}
            >
              <ThemedText style={styles.saveButtonText}>保存</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      {renderModernTimePicker()}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    padding: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaContainer: {
    marginTop: 4,
  },
  durationText: {
    fontSize: 12,
    opacity: 0.6,
  },
  actionButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    opacity: 0.5,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 100,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalBody: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    opacity: 0.6,
    fontWeight: '500',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchViewButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modern Picker Styles
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modernPickerContainer: {
    height: 400,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    backgroundColor: '#fff', // 这里你需要根据主题动态调整
  },
  modernPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  pickerColumnsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerColumnLabel: {
    fontSize: 14,
    opacity: 0.5,
    marginBottom: 10,
  },
  pickerItem: {
    paddingVertical: 12,
    width: 80,
    alignItems: 'center',
    marginBottom: 4,
  },
  pickerItemText: {
    fontSize: 18,
    opacity: 0.8,
  },

  // Timeline Styles
  timelineContainer: {
    flex: 1,
  },
  timelineContent: {
    position: 'relative',
    paddingRight: 20,
    marginBottom: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineHourText: {
    width: 65,
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.4,
    transform: [{ translateY: -8 }],
  },
  timelineLine: {
    flex: 1,
    height: 1,
  },
  timelineTaskBlock: {
    position: 'absolute',
    borderRadius: 6,
    padding: 4,
    paddingLeft: 8,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  timelineTaskContent: {
    flex: 1,
  },
  timelineTaskTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelineTaskTime: {
    fontSize: 10,
    marginTop: 0,
  },
});