import React from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

interface SchoolHomeProps {
  bookmarks: Bookmark[];
  homeInputUrl: string;
  setHomeInputUrl: (url: string) => void;
  onOpenUrl: (url: string) => void;
  onAddBookmark: () => void;
  onOpenChat: () => void;
  onDeleteBookmark: (id: string) => void;
  theme: 'light' | 'dark';
}

export const SchoolHome: React.FC<SchoolHomeProps> = ({
  bookmarks,
  homeInputUrl,
  setHomeInputUrl,
  onOpenUrl,
  onAddBookmark,
  onOpenChat,
  onDeleteBookmark,
  theme,
}) => {
  return (
    <View style={styles.homeContainer}>
      <View style={styles.homeHeader}>
        <ThemedText type="subtitle" style={{ fontSize: 20 }}>常用网站</ThemedText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={onOpenChat} style={styles.addButton}>
            <IconSymbol name="bubble.left.fill" size={24} color={Colors[theme].tint} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAddBookmark} style={styles.addButton}>
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
          onSubmitEditing={() => onOpenUrl(homeInputUrl)}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => onOpenUrl(homeInputUrl)} style={styles.goButton}>
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
            onPress={() => onOpenUrl(item.url)}
            onLongPress={() => onDeleteBookmark(item.id)}
          >
            <View style={[styles.cardIcon, { backgroundColor: Colors[theme].tint + '20' }]}>
              <IconSymbol name="globe" size={24} color={Colors[theme].tint} />
            </View>
            <ThemedText style={styles.cardTitle} numberOfLines={1}>{item.title}</ThemedText>
            <ThemedText style={styles.cardUrl} numberOfLines={1}>{item.url}</ThemedText>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addButton: {
    padding: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  goButton: {
    marginLeft: 10,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  card: {
    flex: 1,
    margin: 5,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardUrl: {
    fontSize: 10,
    opacity: 0.5,
  },
});
