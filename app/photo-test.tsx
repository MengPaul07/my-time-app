import React, { useState } from 'react';
import { StyleSheet, View, Button, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { photoParser } from '@/modules/ai/services/photoParser';
import { AIParseResult } from '@/modules/ai/types';

export default function PhotoTestScreen() {
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ocr' | 'analyzing' | 'done'>('idle');
  const [result, setResult] = useState<AIParseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pickImage = async () => {
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaStatus !== 'granted') {
      Alert.alert(t('photoTest.permissionTitle'), t('photoTest.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 0.3,
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

      const parsedData = await photoParser.parseScheduleFromPhoto(uri, (s) => {
        setStatus(s);
      });

      setResult(parsedData);
      setStatus('done');
    } catch (err: any) {
      setErrorMsg(err.message || t('photoTest.parseFail'));
      setStatus('idle');
      Alert.alert(t('photoTest.errorTitle'), err.message || t('photoTest.parseFail'));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.header}>{t('photoTest.title')}</ThemedText>
        
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <ThemedText style={{ opacity: 0.5 }}>{t('photoTest.noPhoto')}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button title={status === 'idle' || status === 'done' ? t('photoTest.pickFromAlbum') : t('photoTest.processing')} onPress={pickImage} disabled={status === 'ocr' || status === 'analyzing'} />
        </View>
      </ScrollView>

      {status !== 'idle' && status !== 'done' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>
            {status === 'ocr' ? t('photoTest.ocring') : t('photoTest.analyzing')}
          </ThemedText>
        </View>
      )}

      {result && (
        <View style={styles.resultContainer}>
          <ThemedText type="subtitle">{t('photoTest.successTitle')}</ThemedText>
          <ThemedText style={styles.codeBlock}>{JSON.stringify(result, null, 2)}</ThemedText>
          <ThemedText style={styles.note}>{t('photoTest.note')}</ThemedText>
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
