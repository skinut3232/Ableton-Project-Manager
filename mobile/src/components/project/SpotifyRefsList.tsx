import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useSpotifyReferences } from '../../hooks/useSpotifyRefs';
import { formatDurationMs } from '../../lib/utils';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  projectId: number;
}

export function SpotifyRefsList({ projectId }: Props) {
  const { data: refs } = useSpotifyReferences(projectId);

  if (!refs || refs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No Spotify references</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {refs.map((ref) => (
        <TouchableOpacity
          key={ref.id}
          style={styles.item}
          onPress={() => Linking.openURL(ref.spotify_url)}
        >
          {ref.album_art_url ? (
            <Image source={{ uri: ref.album_art_url }} style={styles.art} />
          ) : (
            <View style={[styles.art, styles.artPlaceholder]} />
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {ref.name}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {ref.artist_name}
            </Text>
            {ref.duration_ms && (
              <Text style={styles.duration}>
                {formatDurationMs(ref.duration_ms)}
              </Text>
            )}
          </View>
          <Text style={styles.spotifyIcon}>{'\u{1F3B5}'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
  },
  artPlaceholder: {
    backgroundColor: colors.surface,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  artist: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  duration: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  spotifyIcon: {
    fontSize: 16,
  },
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
