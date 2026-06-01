import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Linking,
} from 'react-native';
import { Image } from 'expo-image';

const { width: SW } = Dimensions.get('window');
const BANNER_HEIGHT = Math.round(SW * 0.5625); // 16:9

export interface BannerSlide {
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
  caption?: string | null;
}

interface Props {
  slides: BannerSlide[];
}

export default function CinematicBanner({ slides }: Props) {
  const [idx, setIdx] = useState(0);
  const fadeAnim      = useRef(new Animated.Value(1)).current;
  const idxRef        = useRef(0);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const n = slides.length;

  const crossFadeTo = useCallback((next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 450, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      idxRef.current = next;
      setIdx(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (n <= 1) return;
    timerRef.current = setInterval(() => {
      crossFadeTo((idxRef.current + 1) % n);
    }, 8000);
  }, [crossFadeTo, n]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  if (n === 0) return null;

  const slide = slides[idx];

  function handlePress() {
    if (slide.linkUrl) Linking.openURL(slide.linkUrl).catch(() => {});
  }

  function handleDot(i: number) {
    crossFadeTo(i);
    startTimer(); // reset auto-advance
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={slide.linkUrl ? 0.88 : 1}
        onPress={handlePress}
        disabled={!slide.linkUrl}
        style={styles.touch}
      >
        <Animated.View style={[styles.slide, { opacity: fadeAnim }]}>
          <Image
            source={{ uri: slide.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
          {/* Bottom fade overlay */}
          <View style={styles.bottomFade} pointerEvents="none" />

          {slide.caption ? (
            <View style={styles.captionWrap} pointerEvents="none">
              <Text style={styles.caption} numberOfLines={2}>{slide.caption}</Text>
            </View>
          ) : null}
        </Animated.View>
      </TouchableOpacity>

      {n > 1 && (
        <View style={styles.dots} pointerEvents="box-none">
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dot, i === idx && styles.dotActive]}
              onPress={() => handleDot(i)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SW,
    height: BANNER_HEIGHT,
    backgroundColor: '#111',
    marginBottom: 4,
  },
  touch: { flex: 1 },
  slide: { flex: 1, overflow: 'hidden', backgroundColor: '#111' },
  bottomFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: BANNER_HEIGHT * 0.4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  captionWrap: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 60,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f8c202',
  },
  caption: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#f8c202',
  },
});
