import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import BrowseScreen from '../screens/BrowseScreen';
import SearchScreen from '../screens/SearchScreen';
import FeedScreen from '../screens/FeedScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f0f17', borderBottomColor: '#1e1e2e', borderBottomWidth: 1 },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', color: '#a78bfa' },
        tabBarStyle: { backgroundColor: '#0f0f17', borderTopColor: '#1e1e2e' },
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tab.Screen
        name="Browse" component={BrowseScreen}
        options={{ title: 'Camp DaddyMan', tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Search" component={SearchScreen}
        options={{ tabBarIcon: ({ focused }) => <Icon emoji="🔍" focused={focused} /> }}
      />
      <Tab.Screen
        name="Feed" component={FeedScreen}
        options={{ title: 'Following', tabBarIcon: ({ focused }) => <Icon emoji="📡" focused={focused} /> }}
      />
      <Tab.Screen
        name="Notifications" component={NotificationsScreen}
        options={{ tabBarIcon: ({ focused }) => <Icon emoji="🔔" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <Icon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
