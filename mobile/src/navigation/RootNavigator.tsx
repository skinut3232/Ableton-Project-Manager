import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LibraryStack } from './LibraryStack';
import { NowPlayingScreen } from '../screens/NowPlayingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, fontSize } from '../lib/theme';
import type { RootTabParamList } from './types';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Library: '\u{1F3B5}',
    'Now Playing': '\u{1F50A}',
    Settings: '\u{2699}',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '\u{25CF}'}
    </Text>
  );
}

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStack}
        options={{
          title: 'Library',
          tabBarIcon: ({ focused }) => <TabIcon label="Library" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="NowPlayingTab"
        component={NowPlayingScreen}
        options={{
          title: 'Now Playing',
          tabBarIcon: ({ focused }) => <TabIcon label="Now Playing" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
