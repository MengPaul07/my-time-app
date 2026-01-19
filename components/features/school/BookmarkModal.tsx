import React from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface BookmarkModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newUrl: string;
  setNewUrl: (val: string) => void;
  theme: 'light' | 'dark';
}

export const BookmarkModal: React.FC<BookmarkModalProps> = ({
  visible,
  onClose,
  onSave,
  newTitle,
  setNewTitle,
  newUrl,
  setNewUrl,
  theme,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText type="subtitle" style={{ marginBottom: 20 }}>添加书签</ThemedText>
          <TextInput
            style={[styles.modalInput, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]}
            placeholder="网站名称"
            placeholderTextColor={Colors[theme].icon}
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <TextInput
            style={[styles.modalInput, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]}
            placeholder="网址 (例如: bjtu.edu.cn)"
            placeholderTextColor={Colors[theme].icon}
            value={newUrl}
            onChangeText={setNewUrl}
            autoCapitalize="none"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={[styles.modalButton, { backgroundColor: Colors[theme].icon + '20' }]}>
              <ThemedText>取消</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSave} style={[styles.modalButton, { backgroundColor: Colors[theme].tint }]}>
              <ThemedText style={{ color: '#fff' }}>保存</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
});
