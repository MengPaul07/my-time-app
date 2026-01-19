import React from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SchoolChatModuleProps {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  inputMessage: string;
  setInputMessage: (msg: string) => void;
  isChatLoading: boolean;
  onSend: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  theme: 'light' | 'dark';
}

export const SchoolChatModule: React.FC<SchoolChatModuleProps> = ({
  visible,
  onClose,
  messages,
  inputMessage,
  setInputMessage,
  isChatLoading,
  onSend,
  apiKey,
  setApiKey,
  theme,
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={{ flex: 1, paddingTop: 20 }}>
        <View style={styles.chatHeader}>
          <ThemedText type="subtitle">DeepSeek AI 学习助手</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark.circle.fill" size={30} color={Colors[theme].icon} />
          </TouchableOpacity>
        </View>

        {!apiKey && (
          <View style={styles.apiKeyContainer}>
            <TextInput
              style={[styles.apiKeyInput, { color: Colors[theme].text, borderColor: Colors[theme].icon }]}
              placeholder="请输入 DeepSeek API Key"
              placeholderTextColor={Colors[theme].icon}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
            />
          </View>
        )}

        <FlatList
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.chatList}
          renderItem={({ item }) => (
            <View style={[
              styles.messageBubble,
              item.role === 'user' ? styles.userBubble : styles.assistantBubble,
              { backgroundColor: item.role === 'user' ? Colors[theme].tint : Colors[theme].icon + '20' }
            ]}>
              <ThemedText style={{ color: item.role === 'user' ? '#fff' : Colors[theme].text }}>
                {item.content}
              </ThemedText>
            </View>
          )}
        />

        {isChatLoading && (
          <View style={styles.chatLoading}>
            <ActivityIndicator size="small" color={Colors[theme].tint} />
            <ThemedText style={{ marginLeft: 10, fontSize: 12, opacity: 0.6 }}>思考中...</ThemedText>
          </View>
        )}

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.inputContainer, { borderTopColor: Colors[theme].icon + '20', backgroundColor: Colors[theme].background }]}>
            <TextInput
              style={[styles.chatInput, { color: Colors[theme].text, backgroundColor: Colors[theme].icon + '10' }]}
              placeholder="问问助手关于学习的问题..."
              placeholderTextColor={Colors[theme].icon}
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
            />
            <TouchableOpacity 
              onPress={onSend} 
              disabled={isChatLoading || !inputMessage.trim()}
              style={styles.sendButton}
            >
              {isChatLoading ? (
                <ActivityIndicator color={Colors[theme].tint} size="small" />
              ) : (
                <IconSymbol name="arrow.up.circle.fill" size={32} color={Colors[theme].tint} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeButton: {
    padding: 5,
  },
  chatList: {
    padding: 20,
    gap: 15,
    paddingBottom: 40,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  chatLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 35 : 15,
    gap: 10,
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    marginBottom: 2,
  },
  apiKeyContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  apiKeyInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
});
