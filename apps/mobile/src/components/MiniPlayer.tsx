import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePlayer } from '../context/PlayerContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

const TAB_BAR_HEIGHT = 49;

function getCurrentRouteName(state: any): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index ?? 0];
  if (route?.state) return getCurrentRouteName(route.state);
  return route?.name;
}

export default function MiniPlayer() {
  const { track, isPlaying, position, duration, queue, pause, resume, stop, skipToNext } = usePlayer();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const currentRoute = useNavigationState(getCurrentRouteName);
  const onPlayerScreen = currentRoute === 'Watch' || currentRoute === 'EpisodePlayer';

  if (!track || onPlayerScreen) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={[styles.container, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
      </View>

      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate(track.routeName as any, track.routeParams)}
        activeOpacity={0.85}
      >
        {track.thumbnailUrl ? (
          <Image source={{ uri: track.thumbnailUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="musical-note" size={16} color="#f8c202" />
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.creator} numberOfLines={1}>{track.creatorName}</Text>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => isPlaying ? pause() : resume()}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#f8c202" />
        </TouchableOpacity>

        {queue.length > 0 && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={skipToNext}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <View>
              <Ionicons name="play-skip-forward" size={22} color="#f8c202" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{queue.length > 9 ? '9+' : queue.length}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={stop}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color="#555" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#141414',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    zIndex: 100,
    elevation: 10,
  },
  progressTrack: {
    height: 2,
    backgroundColor: '#2a2a2a',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#f8c202',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  thumbFallback: {
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  creator: {
    color: '#888',
    fontSize: 12,
  },
  iconBtn: {
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f8c202',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },
});
