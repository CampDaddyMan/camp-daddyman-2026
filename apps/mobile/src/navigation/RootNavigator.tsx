import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import WatchScreen from '../screens/WatchScreen';
import CreatorScreen from '../screens/CreatorScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ShopScreen from '../screens/ShopScreen';
import ProductScreen from '../screens/ProductScreen';
import SeriesScreen from '../screens/SeriesScreen';
import SeriesDetailScreen from '../screens/SeriesDetailScreen';
import AlbumsScreen from '../screens/AlbumsScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import PollsScreen from '../screens/PollsScreen';
import PartnersScreen from '../screens/PartnersScreen';
import LibraryScreen from '../screens/LibraryScreen';
import CartScreen from '../screens/CartScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MembershipScreen from '../screens/MembershipScreen';
import GiftScreen from '../screens/GiftScreen';
import EpisodePlayerScreen from '../screens/EpisodePlayerScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import WrappedScreen from '../screens/WrappedScreen';
import JourneyScreen from '../screens/JourneyScreen';
import HeaderActions from '../components/HeaderActions';

export type RootStackParamList = {
  Tabs: undefined;
  Watch: { id: string };
  Creator: { username: string };
  Login: undefined;
  Register: undefined;
  Shop: undefined;
  Product: { id: string };
  Series: undefined;
  SeriesDetail: { id: string };
  Albums: undefined;
  AlbumDetail: { id: string };
  Polls: undefined;
  Partners: undefined;
  Library: undefined;
  Cart: undefined;
  Dashboard: undefined;
  Membership: undefined;
  Gift: undefined;
  PlaylistDetail: { id: string; name: string };
  Wrapped: undefined;
  Journey: undefined;
  EpisodePlayer: {
    id?: string;
    title: string;
    type?: string;
    mediaUrl?: string;
    hlsUrl?: string;
    thumbnailUrl?: string;
    description?: string;
    seriesTitle?: string;
    episodeNumber?: number;
    seasonNumber?: number;
    nextEpisode?: {
      id?: string;
      title: string;
      type?: string;
      mediaUrl?: string;
      hlsUrl?: string;
      thumbnailUrl?: string;
      description?: string;
      seriesTitle?: string;
      episodeNumber?: number;
      seasonNumber?: number;
    };
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LogoTitle() {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={s.logoImg}
      resizeMode="contain"
    />
  );
}

export default function RootNavigator({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <Stack.Navigator
      initialRouteName={isLoggedIn ? 'Tabs' : 'Login'}
      screenOptions={{
        headerStyle: { backgroundColor: '#0d0d0d' },
        headerTintColor: '#f8c202',
        contentStyle: { backgroundColor: '#0d0d0d' },
        headerTitle: () => <LogoTitle />,
        headerRight: () => <HeaderActions />,
      }}
    >
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Watch" component={WatchScreen} />
          <Stack.Screen name="Creator" component={CreatorScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Product" component={ProductScreen} />
          <Stack.Screen name="Series" component={SeriesScreen} />
          <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
          <Stack.Screen name="Albums" component={AlbumsScreen} />
          <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
          <Stack.Screen name="Polls" component={PollsScreen} />
          <Stack.Screen name="Partners" component={PartnersScreen} />
          <Stack.Screen name="Library" component={LibraryScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Membership" component={MembershipScreen} />
          <Stack.Screen name="Gift" component={GiftScreen} />
          <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} options={({ route }) => ({ title: route.params.name })} />
          <Stack.Screen name="EpisodePlayer" component={EpisodePlayerScreen} />
          <Stack.Screen name="Wrapped" component={WrappedScreen} options={{ title: 'Wrapped' }} />
          <Stack.Screen name="Journey" component={JourneyScreen} options={{ title: 'Journey' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  logoImg: { height: 32, width: 140 },
});
