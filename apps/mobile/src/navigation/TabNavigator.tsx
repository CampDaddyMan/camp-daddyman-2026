import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import BrowseScreen from '../screens/BrowseScreen';
import SearchScreen from '../screens/SearchScreen';
import LiveScreen from '../screens/LiveScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function LiveIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.liveWrap}>
      <View style={[styles.liveDot, focused && styles.liveDotActive]} />
      <Ionicons name="radio-outline" size={24} color={focused ? '#f8c202' : '#555'} />
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <AppHeader />,
        tabBarStyle: { backgroundColor: '#0d0d0d', borderTopColor: '#1a1a1a' },
        tabBarActiveTintColor: '#f8c202',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Browse"
        component={BrowseScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? '#f8c202' : '#555'} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={focused ? '#f8c202' : '#555'} />
          ),
        }}
      />
      <Tab.Screen
        name="Live"
        component={LiveScreen}
        options={{
          tabBarLabel: 'Live',
          tabBarIcon: ({ focused }) => <LiveIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={focused ? '#f8c202' : '#555'} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={focused ? '#f8c202' : '#555'} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  liveWrap: { alignItems: 'center', justifyContent: 'center' },
  liveDot: { position: 'absolute', top: 0, right: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: '#555' },
  liveDotActive: { backgroundColor: '#ef4444' },
});
