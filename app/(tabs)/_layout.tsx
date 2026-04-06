import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/components/constants/theme';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SHOW_STANDING_TAB = false;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: (props) => {
          // Hide tab if href is null
          if (props.href === null) {
            return null;
          }
          return <HapticTab {...props} />;
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.focus'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t('tabs.schedule'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="standing"
        options={{
          title: t('tabs.leaderboard'),
          href: SHOW_STANDING_TAB ? '/standing' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: t('tabs.health'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cp"
        options={{
          title: t('tabs.cp'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chevron.left.forwardslash.chevron.right" color={color} />,
        }}
      />
      <Tabs.Screen
        name="english"
        options={{
          title: t('tabs.english'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
