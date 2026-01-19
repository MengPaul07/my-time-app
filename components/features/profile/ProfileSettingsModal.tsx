import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface ProfileSettingsModalProps {
  visible: boolean;
  onHide: () => void;
  onCheckUpdates: () => void;
  onSignOut: () => void;
  theme: 'light' | 'dark';
  isCheckingUpdate: boolean;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  visible,
  onHide,
  onCheckUpdates,
  onSignOut,
  theme,
  isCheckingUpdate,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onHide}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onHide}
      >
        <ThemedView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">设置</ThemedText>
            <TouchableOpacity onPress={onHide}>
              <Ionicons name="close" size={24} color={Colors[theme].icon} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: Colors[theme].icon + '20' }]}
            onPress={onCheckUpdates}
            disabled={isCheckingUpdate}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="cloud-download-outline" size={22} color={Colors[theme].text} />
              <ThemedText style={styles.settingItemText}>检查更新</ThemedText>
            </View>
            {isCheckingUpdate ? (
              <ActivityIndicator size="small" color={Colors[theme].tint} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={Colors[theme].icon} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomWidth: 0 }]}
            onPress={onSignOut}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="log-out-outline" size={22} color="#ff4444" />
              <ThemedText style={[styles.settingItemText, { color: '#ff4444' }]}>退出登录</ThemedText>
            </View>
          </TouchableOpacity>
        </ThemedView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
