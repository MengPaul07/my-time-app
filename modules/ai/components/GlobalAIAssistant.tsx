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
import { useGlobalAI } from '../hooks/use-global-ai';

const SPRITE_SIZE = 50;

export const GlobalAIAssistant = () => {
  const theme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  
  // Position for the floating sprite
  const pan = useRef(new Animated.ValueXY({ x: 20, y: insets.top + 100 })).current;
  const [isDragging, setIsDragging] = useState(false);

  // AI Logic Hook (We'll create this next)
  const { messages, sendMessage, isThinking } = useGlobalAI();
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (expanded) {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }
  }, [messages, expanded]);

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
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: Colors[theme].icon }]}>
              <View style={styles.headerTitleRow}>
                 <Ionicons name="sparkles" size={20} color={Colors[theme].tint} style={{marginRight: 8}} />
                 <ThemedText type="subtitle">AI 助理</ThemedText>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors[theme].text} />
              </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <ScrollView 
                ref={scrollViewRef}
                style={styles.msgsArea}
                contentContainerStyle={{ padding: 15, gap: 10 }}
            >
                {/* Intro Message */}
                {messages.length === 0 && (
                    <View style={styles.emptyState}>
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
                                ? { alignSelf: 'flex-end', backgroundColor: Colors[theme].tint }
                                : { alignSelf: 'flex-start', backgroundColor: theme === 'dark' ? '#333' : '#E5E5EA' }
                        ]}
                    >
                        <Text style={{ color: msg.role === 'user' ? '#fff' : Colors[theme].text }}>
                            {msg.content}
                        </Text>
                    </View>
                ))}

                {isThinking && (
                     <View style={[styles.msgBubble, { alignSelf: 'flex-start', backgroundColor: theme === 'dark' ? '#333' : '#E5E5EA' }]}>
                        <ActivityIndicator size="small" color={Colors[theme].text} />
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
                    returnKeyType="send"
                />
                <TouchableOpacity 
                    onPress={handleSend}
                    style={[styles.sendBtn, { backgroundColor: inputText.trim() ? Colors[theme].tint : '#ccc' }]}
                    disabled={!inputText.trim()}
                >
                    <Ionicons name="arrow-up" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    justifyContent: 'flex-end', // Chat pops up from bottom? Or centered? Let's do dialog style.
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  chatWindow: {
    width: '100%',
    maxHeight: '80%',
    minHeight: '40%',
    borderRadius: 20,
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
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center'
  },
  closeBtn: {
      padding: 5
  },
  msgsArea: {
      flex: 1,
  },
  msgBubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
  },
  emptyState: {
      marginTop: 20,
      paddingHorizontal: 20
  },
  inputArea: {
      padding: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
  },
  input: {
      flex: 1,
      height: 40,
      borderRadius: 20,
      paddingHorizontal: 15,
  },
  sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
  }
});
