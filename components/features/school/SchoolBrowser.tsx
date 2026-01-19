import React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '@/components/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SchoolBrowserProps {
  webViewRef: React.RefObject<WebView | null>;
  currentUrl: string;
  browserInputUrl: string;
  setBrowserInputUrl: (url: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  setCanGoBack: (val: boolean) => void;
  setCanGoForward: (val: boolean) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onLoadUrl: () => void;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export const SchoolBrowser: React.FC<SchoolBrowserProps> = ({
  webViewRef,
  currentUrl,
  browserInputUrl,
  setBrowserInputUrl,
  isLoading,
  setIsLoading,
  canGoBack,
  canGoForward,
  setCanGoBack,
  setCanGoForward,
  onGoBack,
  onGoForward,
  onReload,
  onLoadUrl,
  onClose,
  theme,
}) => {
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { borderBottomColor: Colors[theme].icon + '30' }]}>
        <TouchableOpacity onPress={onClose} style={styles.navButton}>
          <IconSymbol name="house.fill" size={20} color={Colors[theme].text} />
        </TouchableOpacity>
        
        <View style={styles.navigationContainer}>
          <TouchableOpacity onPress={onGoBack} disabled={!canGoBack} style={[styles.navButton, !canGoBack && styles.disabledButton]}>
            <IconSymbol name="chevron.left" size={24} color={canGoBack ? Colors[theme].text : Colors[theme].icon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onGoForward} disabled={!canGoForward} style={[styles.navButton, !canGoForward && styles.disabledButton]}>
            <IconSymbol name="chevron.right" size={24} color={canGoForward ? Colors[theme].text : Colors[theme].icon} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.urlInputContainer, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon + '40' }]}>
          <TextInput
            style={[styles.urlInput, { color: Colors[theme].text }]}
            value={browserInputUrl}
            onChangeText={setBrowserInputUrl}
            onSubmitEditing={onLoadUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="输入网址"
            placeholderTextColor={Colors[theme].icon}
          />
        </View>

        <TouchableOpacity onPress={onReload} style={styles.navButton}>
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
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  urlInputContainer: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  urlInput: {
    fontSize: 14,
    height: '100%',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
