import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
}) {
  return <Feather size={26} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1C1C1E', // Nero (Richiesto)
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        // RIMOZIONE TOTALE DI tabBarStyle per stabilità assoluta
        // Nessun backgroundColor, nessun border, nulla. Default di sistema.
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
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
          title: 'Inventario',
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
          title: 'Hub',
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
          title: 'Profilo',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="user"
              color={focused ? '#1C1C1E' : color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
