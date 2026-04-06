import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { setLanguage } from '@/utils/i18n';

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
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('en') ? 'en' : 'zh';

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
            <ThemedText type="subtitle">{t('profile.settingsModal.title')}</ThemedText>
            <TouchableOpacity onPress={onHide}>
              <Ionicons name="close" size={24} color={Colors[theme].icon} />
            </TouchableOpacity>
          </View>

          <View style={[styles.settingItem, { borderBottomColor: Colors[theme].icon + '20' }]}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="language-outline" size={22} color={Colors[theme].text} />
              <ThemedText style={styles.settingItemText}>{t('profile.settingsModal.language')}</ThemedText>
            </View>
            <View style={styles.langSwitchWrap}>
              <TouchableOpacity
                style={[
                  styles.langBtn,
                  {
                    borderColor: currentLang === 'zh' ? Colors[theme].tint : Colors[theme].icon + '35',
                    backgroundColor: currentLang === 'zh' ? Colors[theme].tint + '1f' : 'transparent',
                  },
                ]}
                onPress={() => void setLanguage('zh')}
              >
                <ThemedText style={[styles.langBtnText, { color: currentLang === 'zh' ? Colors[theme].tint : Colors[theme].text }]}>中文</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langBtn,
                  {
                    borderColor: currentLang === 'en' ? Colors[theme].tint : Colors[theme].icon + '35',
                    backgroundColor: currentLang === 'en' ? Colors[theme].tint + '1f' : 'transparent',
                  },
                ]}
                onPress={() => void setLanguage('en')}
              >
                <ThemedText style={[styles.langBtnText, { color: currentLang === 'en' ? Colors[theme].tint : Colors[theme].text }]}>English</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: Colors[theme].icon + '20' }]}
            onPress={onCheckUpdates}
            disabled={isCheckingUpdate}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="cloud-download-outline" size={22} color={Colors[theme].text} />
              <ThemedText style={styles.settingItemText}>{t('profile.settingsModal.checkUpdates')}</ThemedText>
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
              <ThemedText style={[styles.settingItemText, { color: '#ff4444' }]}>{t('profile.settingsModal.signOut')}</ThemedText>
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
  langSwitchWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  langBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
