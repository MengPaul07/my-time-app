import React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';

interface ProfileHeaderProps {
  session: any;
  profile: any;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  username: string;
  setUsername: (val: string) => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  onSave: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  session,
  profile,
  isEditing,
  setIsEditing,
  username,
  setUsername,
  isLoading,
  theme,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.card, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: Colors[theme].tint }]}>
          <ThemedText style={[styles.avatarText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
            {profile?.username ? profile.username[0].toUpperCase() : (session?.user?.email?.[0].toUpperCase() || '?')}
          </ThemedText>
        </View>
      </View>

      <View style={styles.userInfo}>
        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.usernameInput, { color: Colors[theme].text, borderColor: Colors[theme].tint }]}
              placeholder={t('profile.usernamePlaceholder')}
              placeholderTextColor={Colors[theme].icon}
              value={username}
              onChangeText={setUsername}
              maxLength={20}
              editable={!isLoading}
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: Colors[theme].tint }]}
                onPress={onSave}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} size="small" /> : <ThemedText style={[styles.smallButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>{t('common.save')}</ThemedText>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: Colors[theme].icon, opacity: 0.5 }]}
                onPress={() => {
                  setIsEditing(false);
                  setUsername(profile?.username || '');
                }}
                disabled={isLoading}
              >
                <ThemedText style={styles.smallButtonText}>{t('common.cancel')}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <ThemedText type="subtitle" style={styles.usernameText}>
              {profile?.username || t('profile.usernameNotSet')}
            </ThemedText>
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editIcon}>
              <ThemedText style={{ color: Colors[theme].tint, fontSize: 14 }}>{t('profile.editProfile')}</ThemedText>
            </TouchableOpacity>
          </View>
        )}
        <ThemedText style={styles.emailText}>{session?.user?.email || t('profile.notLoggedIn')}</ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 14,
    opacity: 0.6,
  },
  editIcon: {
    padding: 4,
  },
  editForm: {
    gap: 8,
  },
  usernameInput: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 4,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
