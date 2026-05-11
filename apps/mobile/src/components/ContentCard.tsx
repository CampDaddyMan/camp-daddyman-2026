import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

const TYPE_EMOJI: Record<string, string> = {
  FILM: '🎬', MUSIC: '🎵', PODCAST: '🎙️', SPOKEN_WORD: '📖',
};

export interface ContentItem {
  id: string;
  title: string;
  type: string;
  thumbnailUrl?: string;
  views: number;
  duration?: number;
  creator: { username: string; displayName?: string };
  _count?: { likes: number; comments: number };
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function ContentCard({ item, onPress }: { item: ContentItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.thumb}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Text style={styles.thumbEmoji}>{TYPE_EMOJI[item.type] ?? '🎵'}</Text>
        )}
        {item.duration != null && (
          <View style={styles.durBadge}>
            <Text style={styles.durText}>{formatDuration(item.duration)}</Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.creator} numberOfLines={1}>
          {item.creator.displayName || item.creator.username}
        </Text>
        <Text style={styles.views}>{item.views.toLocaleString()} views</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, marginBottom: 16 },
  thumb: {
    width: '100%', aspectRatio: 16 / 9,
    backgroundColor: '#1e1e2e', borderRadius: 10, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbEmoji: { fontSize: 32 },
  durBadge: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  durText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  meta: { marginTop: 6, paddingHorizontal: 2 },
  title: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  creator: { color: '#a0a0b0', fontSize: 11, marginTop: 2 },
  views: { color: '#6b6b80', fontSize: 11, marginTop: 1 },
});
