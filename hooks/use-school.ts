import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { ChatMessage, sendToDeepSeek } from '@/utils/deepseek';

const STORAGE_KEY = 'school_bookmarks';
const DEFAULT_URL = 'https://www.icourse163.org/';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export function useSchool() {
  // 模式状态
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

  // DeepSeek Chat State
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  // 这里写死了一个 Key 作为示例
  const [apiKey, setApiKey] = useState('sk-e480d707fb3b4ad9ad30cc408905708d'); 

  // 1. 加载书签
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          setBookmarks(JSON.parse(jsonValue));
        } else {
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
    loadBookmarks();
  }, []);

  // 2. 书签操作
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

  // 3. 浏览器操作
  const handleGoBack = () => webViewRef.current && canGoBack && webViewRef.current.goBack();
  const handleGoForward = () => webViewRef.current && canGoForward && webViewRef.current.goForward();
  const handleReload = () => webViewRef.current && webViewRef.current.reload();
  const handleBrowserLoadUrl = () => openUrl(browserInputUrl);

  // 4. Chat 操作
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

  return {
    mode, setMode, bookmarks, modalVisible, setModalVisible,
    newTitle, setNewTitle, newUrl, setNewUrl, homeInputUrl, setHomeInputUrl,
    webViewRef, isLoading, setIsLoading, currentUrl, setCurrentUrl,
    browserInputUrl, setBrowserInputUrl, canGoBack, setCanGoBack, canGoForward, setCanGoForward,
    chatVisible, setChatVisible, messages, setMessages, inputMessage, setInputMessage,
    isChatLoading, apiKey, setApiKey,
    saveBookmark, deleteBookmark, openUrl, handleGoBack, handleGoForward, handleReload, handleBrowserLoadUrl, handleSend
  };
}
