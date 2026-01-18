import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatMessage, sendToDeepSeek } from '@/utils/deepseek';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const DEFAULT_URL = 'https://www.icourse163.org/';
const STORAGE_KEY = 'school_bookmarks';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export default function SchoolScreen() {
  // 模式状态: 'home' | 'browser'
  const [mode, setMode] = useState<'home' | 'browser'>('home');
  
  // 书签相关状态
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [homeInputUrl, setHomeInputUrl] = useState('');

  // WebView 相关状态
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL);
  const [browserInputUrl, setBrowserInputUrl] = useState(DEFAULT_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const insets = useSafeAreaInsets();

  // DeepSeek Chat State
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  // TODO: Replace with your actual API Key or load from secure storage
  const [apiKey, setApiKey] = useState('sk-e480d707fb3b4ad9ad30cc408905708d'); 

  const handleSend = async () => {
    if (!inputMessage.trim()) return;
    if (!apiKey.trim()) {
      Alert.alert('提示', '请先设置 API Key');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: inputMessage };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const response = await sendToDeepSeek(newMessages, apiKey);
      setMessages([...newMessages, response]);
    } catch (error) {
      Alert.alert('错误', '无法连接到 DeepSeek API');
    } finally {
      setIsChatLoading(false);
    }
  };

  // 初始化加载书签
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        setBookmarks(JSON.parse(jsonValue));
      } else {
        // 默认书签
        const defaults: Bookmark[] = [
          { id: '1', title: '中国大学MOOC', url: 'https://www.icourse163.org/', icon: 'school' },
          { id: '2', title: '学信网', url: 'https://www.chsi.com.cn/', icon: 'laptop' },
        ];
        setBookmarks(defaults);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      }
    } catch (e) {
      console.error('Failed to load bookmarks', e);
    }
  };

  const saveBookmark = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      Alert.alert('提示', '请输入标题和网址');
      return;
    }
    
    let formattedUrl = newUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      url: formattedUrl,
      icon: 'globe'
    };

    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBookmarks));
    
    setModalVisible(false);
    setNewTitle('');
    setNewUrl('');
  };

  const deleteBookmark = async (id: string) => {
    Alert.alert('删除书签', '确定要删除这个书签吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
          const updated = bookmarks.filter(b => b.id !== id);
          setBookmarks(updated);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }}
    ]);
  };

  const openUrl = (url: string) => {
    let formattedUrl = url;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    setCurrentUrl(formattedUrl);
    setBrowserInputUrl(formattedUrl);
    setMode('browser');
  };

  // --- WebView 操作 ---
  const handleGoBack = () => webViewRef.current && canGoBack && webViewRef.current.goBack();
  const handleGoForward = () => webViewRef.current && canGoForward && webViewRef.current.goForward();
  const handleReload = () => webViewRef.current && webViewRef.current.reload();
  
  const handleBrowserLoadUrl = () => {
    openUrl(browserInputUrl);
  };

  // --- 渲染主页 ---
  const renderHome = () => (
    <View style={styles.homeContainer}>
      <View style={styles.homeHeader}>
        <ThemedText type="subtitle" style={{ fontSize: 20 }}>常用网站</ThemedText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => setChatVisible(true)} style={styles.addButton}>
            <IconSymbol name="bubble.left.fill" size={24} color={Colors[theme].tint} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <IconSymbol name="plus" size={24} color={Colors[theme].tint} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchBox, { backgroundColor: Colors[theme].icon + '15' }]}>
        <TextInput
          style={[styles.searchInput, { color: Colors[theme].text }]}
          placeholder="输入网址直接访问..."
          placeholderTextColor={Colors[theme].icon}
          value={homeInputUrl}
          onChangeText={setHomeInputUrl}
          onSubmitEditing={() => openUrl(homeInputUrl)}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => openUrl(homeInputUrl)} style={styles.goButton}>
          <IconSymbol name="arrow.right.circle.fill" size={28} color={Colors[theme].tint} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon + '30' }]}
            onPress={() => openUrl(item.url)}
            onLongPress={() => deleteBookmark(item.id)}
          >
            <View style={[styles.cardIcon, { backgroundColor: Colors[theme].tint + '20' }]}>
              <IconSymbol name="globe" size={24} color={Colors[theme].tint} />
            </View>
            <ThemedText style={styles.cardTitle} numberOfLines={1}>{item.title}</ThemedText>
            <ThemedText style={styles.cardUrl} numberOfLines={1}>{item.url}</ThemedText>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
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
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalButton, { backgroundColor: Colors[theme].icon + '20' }]}>
                <ThemedText>取消</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBookmark} style={[styles.modalButton, { backgroundColor: Colors[theme].tint }]}>
                <ThemedText style={{ color: '#fff' }}>保存</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );

  // --- 渲染浏览器 ---
  const renderBrowser = () => (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { borderBottomColor: Colors[theme].icon + '30' }]}>
        <TouchableOpacity onPress={() => setMode('home')} style={styles.navButton}>
          <IconSymbol name="house.fill" size={20} color={Colors[theme].text} />
        </TouchableOpacity>
        
        <View style={styles.navigationContainer}>
          <TouchableOpacity onPress={handleGoBack} disabled={!canGoBack} style={[styles.navButton, !canGoBack && styles.disabledButton]}>
            <IconSymbol name="chevron.left" size={24} color={canGoBack ? Colors[theme].text : Colors[theme].icon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleGoForward} disabled={!canGoForward} style={[styles.navButton, !canGoForward && styles.disabledButton]}>
            <IconSymbol name="chevron.right" size={24} color={canGoForward ? Colors[theme].text : Colors[theme].icon} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.urlInputContainer, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon + '40' }]}>
          <TextInput
            style={[styles.urlInput, { color: Colors[theme].text }]}
            value={browserInputUrl}
            onChangeText={setBrowserInputUrl}
            onSubmitEditing={handleBrowserLoadUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="输入网址"
            placeholderTextColor={Colors[theme].icon}
          />
        </View>

        <TouchableOpacity onPress={handleReload} style={styles.navButton}>
          <IconSymbol name="arrow.counterclockwise" size={20} color={Colors[theme].text} />
        </TouchableOpacity>
      </View>

      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
            setBrowserInputUrl(navState.url);
          }}
          style={{ flex: 1, backgroundColor: Colors[theme].background }}
        />
        {isLoading && (
          <View style={[styles.loadingContainer, { backgroundColor: Colors[theme].background }]}>
            <ActivityIndicator size="large" color={Colors[theme].tint} />
          </View>
        )}
      </View>
    </View>
  );

  const renderChat = () => (
    <Modal visible={chatVisible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={{ flex: 1, paddingTop: 20 }}>
        <View style={styles.chatHeader}>
          <ThemedText type="subtitle">AI 学习助手</ThemedText>
          <TouchableOpacity onPress={() => setChatVisible(false)} style={styles.closeButton}>
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

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
          <View style={[styles.inputContainer, { borderTopColor: Colors[theme].icon + '30', backgroundColor: Colors[theme].background }]}>
            <TextInput
              style={[styles.chatInput, { color: Colors[theme].text, backgroundColor: Colors[theme].icon + '15' }]}
              placeholder="问点什么..."
              placeholderTextColor={Colors[theme].icon}
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
            />
            <TouchableOpacity onPress={handleSend} disabled={isChatLoading} style={styles.sendButton}>
              {isChatLoading ? (
                <ActivityIndicator color={Colors[theme].tint} />
              ) : (
                <IconSymbol name="arrow.up.circle.fill" size={32} color={Colors[theme].tint} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ThemedView>
    </Modal>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: 60 }]}>
      {mode === 'home' ? renderHome() : renderBrowser()}
      {renderChat()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Home Styles
  homeContainer: { flex: 1, padding: 20 },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addButton: { padding: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 16, marginRight: 10 },
  goButton: { padding: 4 },
  gridContainer: { gap: 15 },
  card: { flex: 1, margin: 5, padding: 15, borderRadius: 16, borderWidth: 1, alignItems: 'center', minWidth: '45%' },
  cardIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  cardUrl: { fontSize: 10, opacity: 0.5 },
  
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', padding: 20, borderRadius: 20, backgroundColor: '#fff' },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },

  // Browser Styles
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  navigationContainer: { flexDirection: 'row' },
  navButton: { padding: 8 },
  disabledButton: { opacity: 0.3 },
  urlInputContainer: { flex: 1, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, height: 36, justifyContent: 'center' },
  urlInput: { fontSize: 14, padding: 0 },
  webViewContainer: { flex: 1, position: 'relative' },
  loadingContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },

  // Chat Styles
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
  closeButton: { padding: 5 },
  chatList: { padding: 20, gap: 15, paddingBottom: 40 },
  messageBubble: { padding: 12, borderRadius: 16, maxWidth: '80%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'flex-end', gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  chatInput: { flex: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, fontSize: 16 },
  sendButton: { padding: 5, marginBottom: 2 },
  apiKeyContainer: { padding: 20, paddingBottom: 0 },
  apiKeyInput: { borderWidth: 1, borderRadius: 10, padding: 12 },
});
