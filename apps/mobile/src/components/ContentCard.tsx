import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH_HALF = (width - 44) / 2;
const CARD_WIDTH_FULL = width - 28;

const TYPE_LABEL: Record<string, string> = {
  FILM: 'Film',
  MUSIC: 'Music',
  PODCAST: 'Podcast',
  SPOKEN_WORD: 'Spoken Word',
};

const TYPE_ICON: Record<string, string> = {
  FILM: 'film-outline',
  MUSIC: 'musical-notes-outline',
  PODCAST: 'mic-outline',
  SPOKEN_WORD: 'chatbubble-outline',
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

export default function ContentCard({
  item,
  onPress,
  fullWidth = false,
}: {
  item: ContentItem;
  onPress: () => void;
  fullWidth?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!item.thumbnailUrl && !imgError;
  const cardW = fullWidth ? CARD_WIDTH_FULL : CARD_WIDTH_HALF;
  const iconSize = fullWidth ? 40 : 28;
  const titleSize = fullWidth ? 18 : 14;
  const creatorSize = fullWidth ? 14 : 12;

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardW }]}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityLabel={`${item.title} by ${item.creator?.displayName || item.creator?.username}. ${item.views.toLocaleString()} views. Tap to watch.`}
      accessibilityRole="button"
    >
      <View style={styles.thumb}>
        {showImage ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons
              name={(TYPE_ICON[item.type] ?? 'play-outline') as any}
              size={iconSize}
              color="#f8c202"
            />
          </View>
        )}

        <View style={styles.thumbScrim} pointerEvents="none" />

        {/* Duration badge */}
        {item.duration != null && (
          <View style={styles.durBadge}>
            <Text style={styles.durText}>{formatDuration(item.duration)}</Text>
          </View>
        )}

        {/* Type badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{TYPE_LABEL[item.type] ?? item.type}</Text>
        </View>

        {/* Play overlay — only on full-width */}
        {fullWidth && (
          <View style={styles.playOverlay} pointerEvents="none">
            <View style={styles.playCircle}>
              <Ionicons name="play" size={14} color="#000" style={{ paddingLeft: 2 }} />
            </View>
          </View>
        )}
      </View>

      <View style={[styles.meta, fullWidth && styles.metaFull]}>
        <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.45 }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.creator, { fontSize: creatorSize }]} numberOfLines={1}>
          {item.creator?.displayName || item.creator?.username || ''}
        </Text>
        <View style={styles.statsRow}>
          <Ionicons name="eye-outline" size={fullWidth ? 13 : 11} color="#555" />
          <Text style={[styles.views, fullWidth && styles.viewsFull]}>{item.views.toLocaleString()}</Text>
          {(item._count?.likes ?? 0) > 0 && (
            <>
              <Ionicons name="heart-outline" size={fullWidth ? 13 : 11} color="#555" style={{ marginLeft: 10 }} />
              <Text style={[styles.views, fullWidth && styles.viewsFull]}>
                {item._count!.likes.toLocaleString()}
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24 },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#141414',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
  },
  thumbScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'transparent',
  },
  durBadge: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  durText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(248,194,2,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(248,194,2,0.35)',
  },
  typeText: { color: '#f8c202', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(248,194,2,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f8c202',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  meta: { marginTop: 12, paddingHorizontal: 2 },
  metaFull: { paddingHorizontal: 4 },
  title: { color: '#f0f0f0', fontWeight: '700', marginBottom: 5 },
  creator: { color: '#777', fontWeight: '500', marginBottom: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  views: { color: '#555', fontSize: 11, fontWeight: '500' },
  viewsFull: { fontSize: 12 },
});
