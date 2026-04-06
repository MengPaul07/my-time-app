import React from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';

type QuickCreateTaskModalProps = {
  visible: boolean;
  theme: 'light' | 'dark';
  colors: {
    background: string;
    text: string;
    tint: string;
  };
  quickTaskTitle: string;
  quickTaskMinutes: string;
  quickCreateError: string;
  isQuickCreating: boolean;
  onChangeTitle: (value: string) => void;
  onChangeMinutes: (value: string) => void;
  onClose: () => void;
  onCreateAndStart: () => void;
};

export function QuickCreateTaskModal({
  visible,
  theme,
  colors,
  quickTaskTitle,
  quickTaskMinutes,
  quickCreateError,
  isQuickCreating,
  onChangeTitle,
  onChangeMinutes,
  onClose,
  onCreateAndStart,
}: QuickCreateTaskModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalMask}>
        <View style={[styles.quickModalCard, { backgroundColor: colors.background }]}>
          <ThemedText type="subtitle" style={styles.quickModalTitle}>{t('home.quickCreate.title')}</ThemedText>
          <ThemedText style={[styles.quickModalHint, { color: colors.text }]}>{t('home.quickCreate.hint')}</ThemedText>

          <TextInput
            value={quickTaskTitle}
            onChangeText={onChangeTitle}
            placeholder={t('home.quickCreate.placeholderTitle')}
            placeholderTextColor={theme === 'dark' ? '#6B7280' : '#9CA3AF'}
            style={[
              styles.quickInput,
              {
                borderColor: theme === 'dark' ? '#374151' : '#D1D5DB',
                color: colors.text,
                backgroundColor: theme === 'dark' ? '#111827' : '#F8FAFC',
              },
            ]}
          />

          <TextInput
            value={quickTaskMinutes}
            onChangeText={onChangeMinutes}
            keyboardType="number-pad"
            placeholder={t('home.quickCreate.placeholderMinutes')}
            placeholderTextColor={theme === 'dark' ? '#6B7280' : '#9CA3AF'}
            style={[
              styles.quickInput,
              {
                borderColor: theme === 'dark' ? '#374151' : '#D1D5DB',
                color: colors.text,
                backgroundColor: theme === 'dark' ? '#111827' : '#F8FAFC',
              },
            ]}
          />

          {!!quickCreateError && <ThemedText style={styles.quickErrorText}>{quickCreateError}</ThemedText>}

          <View style={styles.quickModalActions}>
            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnGhost, { borderColor: theme === 'dark' ? '#4B5563' : '#CBD5E1' }]}
              onPress={onClose}
              disabled={isQuickCreating}
            >
              <ThemedText>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: colors.tint }]}
              onPress={onCreateAndStart}
              disabled={isQuickCreating}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{isQuickCreating ? t('home.quickCreate.creating') : t('home.quickCreate.createAndStart')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  quickModalCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  quickModalTitle: {
    fontSize: 18,
  },
  quickModalHint: {
    opacity: 0.75,
    fontSize: 13,
    marginBottom: 2,
  },
  quickInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  quickErrorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  quickModalActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnGhost: {
    borderWidth: 1,
  },
});
