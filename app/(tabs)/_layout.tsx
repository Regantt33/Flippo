import { Colors } from '@/constants/Colors';
import { Translations } from '@/constants/Translations';
import { SettingsService } from '@/services/settings';
import Feather from '@expo/vector-icons/Feather';
import { Tabs, useFocusEffect } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
}) {
  return <Feather size={26} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const [lang, setLang] = React.useState<'it' | 'en' | 'fr' | 'es' | 'de'>('en');
  const t = Translations[lang] || Translations.en;

  useFocusEffect(React.useCallback(() => {
    SettingsService.getProfile().then(p => setLang(p.language));
  }, []));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.icon,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FEFBF8',
        },
        tabBarItemStyle: {
          // kept default
        },
        // Performance optimizations
        lazy: true, // Only render screens when they become active
        // Animation configuration for smooth transitions
        animation: 'shift', // Smooth slide animation between tabs
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t.tab_home,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="home"
              color={focused ? '#1C1C1E' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t.tab_inventory,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="package"
              color={focused ? '#1C1C1E' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="browser"
        options={{
          title: t.tab_hub,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="compass"
              color={focused ? '#1C1C1E' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tab_profile,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="user"
              color={focused ? '#1C1C1E' : color}
            />
          ),
        }}
      />
    </Tabs >
  );
}

const styles = StyleSheet.create({});
