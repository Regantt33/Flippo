import { Colors } from '@/constants/Colors';
import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
}) {
  return <Feather size={26} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
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
        }
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
    </Tabs >
  );
}

const styles = StyleSheet.create({});
