import { useMemo, useState } from 'react';
import i18n from '@/utils/i18n';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { useTimerStore } from '@/modules/timer/store/useTimerStore';
import { Task } from '@/types/app';

type UseHomeScreenControllerProps = {
  isSessionActive: boolean;
  isActive: boolean;
  timeLeft: number;
  currentTask: Task | null;
  toggleTimer: () => void;
};

export const formatTimerText = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function useHomeScreenController({
  isSessionActive,
  isActive,
  timeLeft,
  currentTask,
  toggleTimer,
}: UseHomeScreenControllerProps) {
  const [createTaskModalVisible, setCreateTaskModalVisible] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskMinutes, setQuickTaskMinutes] = useState('25');
  const [quickCreateError, setQuickCreateError] = useState('');
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  const addTask = useTaskStore((state) => state.addTask);
  const { session } = useUserStore();
  const setCurrentTask = useTimerStore((state) => state.setCurrentTask);

  const canStartWithoutPrompt = useMemo(() => {
    if (isSessionActive || isActive) {
      return true;
    }
    return !!currentTask;
  }, [isSessionActive, isActive, currentTask]);

  const inheritedSliderMinutes = useMemo(() => {
    const minutes = Math.round(timeLeft / 60);
    return Math.max(5, Number.isFinite(minutes) ? minutes : 25);
  }, [timeLeft]);

  const openQuickCreateModal = () => {
    setCreateTaskModalVisible(true);
    setQuickTaskMinutes(String(inheritedSliderMinutes));
    setQuickCreateError('');
  };

  const closeQuickCreateModal = () => {
    setCreateTaskModalVisible(false);
  };

  const handleToggleTimer = () => {
    if (!canStartWithoutPrompt) {
      openQuickCreateModal();
      return;
    }
    toggleTimer();
  };

  const handleCreateTaskAndStart = async () => {
    const title = quickTaskTitle.trim();
    const minutes = Math.max(1, Number.parseInt(quickTaskMinutes || String(inheritedSliderMinutes), 10) || inheritedSliderMinutes);

    if (!title) {
      setQuickCreateError(i18n.t('home.quickCreate.errorMissingTitle'));
      return;
    }

    setIsQuickCreating(true);
    setQuickCreateError('');

    try {
      const startIso = new Date().toISOString();
      await addTask(
        {
          title,
          description: i18n.t('home.quickCreate.createdFromFocus'),
          start_time: startIso,
          estimated_duration: Math.max(5, minutes) * 60,
          is_deadline: false,
          color: '#AF52DE',
        },
        session?.user?.id || null
      );

      const latestTasks = useTaskStore.getState().tasks;
      const createdTask =
        latestTasks.find((task) => task.title === title && task.start_time === startIso) || latestTasks[0] || null;

      if (!createdTask) {
        setQuickCreateError(i18n.t('home.quickCreate.errorNotFound'));
        return;
      }

      setCurrentTask(createdTask);
      setCreateTaskModalVisible(false);
      setQuickTaskTitle('');
      setQuickTaskMinutes(String(inheritedSliderMinutes));
      toggleTimer();
    } catch (error) {
      console.error('Quick create focus task failed:', error);
      setQuickCreateError(i18n.t('home.quickCreate.errorCreateFail'));
    } finally {
      setIsQuickCreating(false);
    }
  };

  return {
    createTaskModalVisible,
    quickTaskTitle,
    quickTaskMinutes,
    quickCreateError,
    isQuickCreating,
    setQuickTaskTitle,
    setQuickTaskMinutes,
    closeQuickCreateModal,
    handleToggleTimer,
    handleCreateTaskAndStart,
  };
}
