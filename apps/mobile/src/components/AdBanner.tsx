import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import api from '../lib/api';

interface Ad {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string;
  partner: { name: string };
}

interface Props {
  location: string;
}

export default function AdBanner({ location }: Props) {
  const [ad, setAd]           = useState<Ad | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    api.get(`/partners/serve/${encodeURIComponent(location)}`)
      .then(({ data }) => setAd(data.ad ?? null))
      .catch(() => {});
  }, [location]);

  if (!ad) return null;

  async function handlePress() {
    if (!ad) return;
    try { await api.post(`/partners/ads/${ad.id}/click`); } catch {}
    Linking.openURL(ad.linkUrl).catch(() => {});
  }

  const showImage = !!ad.imageUrl && !imgError;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.adLabel}>
        <Text style={styles.adLabelText}>AD</Text>
      </View>

      {showImage ? (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: ad.imageUrl! }}
            style={styles.image}
            contentFit="cover"
            onError={() => setImgError(true)}
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageTitle} numberOfLines={2}>{ad.title}</Text>
            <Text style={styles.imageSponsor}>Sponsored by {ad.partner.name}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={2}>{ad.title}</Text>
          {ad.body ? <Text style={styles.body} numberOfLines={2}>{ad.body}</Text> : null}
          <Text style={styles.sponsor}>Sponsored by {ad.partner.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#282828',
    backgroundColor: '#111',
  },
  adLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  adLabelText: { color: '#888', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', aspectRatio: 16 / 5 },
  imageOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  imageTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  imageSponsor: { color: '#aaa', fontSize: 10, marginTop: 2 },
  textWrap: { padding: 14 },
  title: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  body: { color: '#aaa', fontSize: 12, lineHeight: 17, marginBottom: 4 },
  sponsor: { color: '#666', fontSize: 10 },
});
