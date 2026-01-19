import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { SchoolHome } from '@/components/features/school/SchoolHome';
import { SchoolBrowser } from '@/components/features/school/SchoolBrowser';
import { SchoolChatModule } from '@/components/features/school/SchoolChatModule';
import { BookmarkModal } from '@/components/features/school/BookmarkModal';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 导入逻辑钩子
import { useSchool } from '@/hooks/use-school';

export default function SchoolScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // 使用逻辑钩子
  const {
    mode, setMode, bookmarks, modalVisible, setModalVisible,
    newTitle, setNewTitle, newUrl, setNewUrl, homeInputUrl, setHomeInputUrl,
    webViewRef, isLoading, setIsLoading, currentUrl,
    browserInputUrl, setBrowserInputUrl, canGoBack, setCanGoBack, canGoForward, setCanGoForward,
    chatVisible, setChatVisible, messages, inputMessage, setInputMessage,
    isChatLoading, apiKey, setApiKey,
    saveBookmark, deleteBookmark, openUrl, handleGoBack, handleGoForward, handleReload, handleBrowserLoadUrl, handleSend
  } = useSchool();

  return (
    <ThemedView style={{ flex: 1 }}>
      {mode === 'home' ? (
        <SchoolHome
          bookmarks={bookmarks}
          homeInputUrl={homeInputUrl}
          setHomeInputUrl={setHomeInputUrl}
          onOpenUrl={openUrl}
          onAddBookmark={() => setModalVisible(true)}
          onOpenChat={() => setChatVisible(true)}
          onDeleteBookmark={deleteBookmark}
          theme={theme}
        />
      ) : (
        <SchoolBrowser
          webViewRef={webViewRef}
          currentUrl={currentUrl}
          browserInputUrl={browserInputUrl}
          setBrowserInputUrl={setBrowserInputUrl}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          setCanGoBack={setCanGoBack}
          setCanGoForward={setCanGoForward}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onReload={handleReload}
          onLoadUrl={handleBrowserLoadUrl}
          onClose={() => setMode('home')}
          theme={theme}
        />
      )}

      <BookmarkModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={saveBookmark}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newUrl={newUrl}
        setNewUrl={setNewUrl}
        theme={theme}
      />

      <SchoolChatModule
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        messages={messages}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        isChatLoading={isChatLoading}
        onSend={handleSend}
        apiKey={apiKey}
        setApiKey={setApiKey}
        theme={theme}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
