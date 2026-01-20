import React, { useState } from 'react';
import { StyleSheet, View, Button, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { photoParser } from '@/modules/ai/services/photoParser';
import { AIParseResult } from '@/modules/ai/types';

export default function PhotoTestScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ocr' | 'analyzing' | 'done'>('idle');
  const [result, setResult] = useState<AIParseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pickImage = async () => {
    // 1. 请求相册权限
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaStatus !== 'granted') {
      Alert.alert('需要权限', '请允许访问相册以测试照片解析');
      return;
    }

    // 2. 选择照片
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 0.3, // 降低质量以减少 Base64 体积，避免 Fetch 提交过大 Paylaod 失败
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      startParsing(uri);
    }
  };

  const startParsing = async (uri: string) => {
    try {
      setStatus('ocr');
      setResult(null);
      setErrorMsg(null);

      // 调用我们的照片解析服务
      const parsedData = await photoParser.parseScheduleFromPhoto(uri, (s) => {
        setStatus(s);
      });

      setResult(parsedData);
      setStatus('done');
    } catch (err: any) {
      setErrorMsg(err.message || '解析失败');
      setStatus('idle');
      Alert.alert('错误', err.message);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.header}>DeepSeek 照片解析测试</ThemedText>
        
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <ThemedText style={{ opacity: 0.5 }}>未选择照片</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button title={status === 'idle' || status === 'done' ? "从相册选择" : "正在处理..."} onPress={pickImage} disabled={status === 'ocr' || status === 'analyzing'} />
        </View>
      </ScrollView>

      {/* 状态指示 */}
      {status !== 'idle' && status !== 'done' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>
            {status === 'ocr' ? '正在识别文字 (模拟)...' : 'DeepSeek 正在思考...'}
          </ThemedText>
        </View>
      )}

      {/* 结果展示 */}
      {result && (
        <View style={styles.resultContainer}>
          <ThemedText type="subtitle">解析成功 (AI JSON):</ThemedText>
          <ThemedText style={styles.codeBlock}>{JSON.stringify(result, null, 2)}</ThemedText>
          <ThemedText style={styles.note}>注意：因为没有真实 OCR，这里使用的是预设的模拟文本。但 JSON 结构是由 DeepSeek 实时生成的。</ThemedText>
        </View>
      )}

      {errorMsg && (
        <View style={styles.errorContainer}>
          <ThemedText style={{color: 'red'}}>{errorMsg}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
    width: '100%',
  },
  loadingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  codeBlock: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 10,
  },
  note: {
    fontSize: 10, 
    opacity: 0.6,
    marginTop: 10,
    fontStyle: 'italic',
  },
  errorContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  }
});
