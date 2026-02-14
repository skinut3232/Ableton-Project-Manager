import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Bounce, Project } from '../../types';
import { useBounces } from '../../hooks/useBounces';
import { useAudioStore } from '../../stores/audioStore';
import { playBounce } from '../../lib/audioPlayer';
import { formatDuration, extractFilename, getRelativeTime } from '../../lib/utils';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  projectId: number;
  project: Project;
}

export function BouncesList({ projectId, project }: Props) {
  const { data: bounces } = useBounces(projectId);
  const currentBounce = useAudioStore((s) => s.currentBounce);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  if (!bounces || bounces.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No bounces</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {bounces.map((bounce) => {
        const isCurrent = currentBounce?.id === bounce.id;
        const canPlay = !!bounce.mp3_url;

        return (
          <TouchableOpacity
            key={bounce.id}
            style={[styles.item, isCurrent && styles.itemActive]}
            onPress={() => canPlay && playBounce(bounce, project)}
            disabled={!canPlay}
            activeOpacity={canPlay ? 0.7 : 1}
          >
            <View style={styles.playIcon}>
              <Text style={[styles.playText, !canPlay && styles.disabledText]}>
                {isCurrent && isPlaying ? '\u23F8' : '\u25B6'}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, !canPlay && styles.disabledText]} numberOfLines={1}>
                {extractFilename(bounce.bounce_path)}
              </Text>
              <View style={styles.meta}>
                {bounce.duration_seconds && (
                  <Text style={styles.metaText}>
                    {formatDuration(bounce.duration_seconds)}
                  </Text>
                )}
                <Text style={styles.metaText}>
                  {getRelativeTime(bounce.modified_time)}
                </Text>
                {!canPlay && (
                  <Text style={styles.noMp3}>No MP3</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  itemActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  playIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playText: {
    fontSize: 14,
    color: colors.primary,
  },
  disabledText: {
    color: colors.textMuted,
    opacity: 0.5,
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
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  noMp3: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontStyle: 'italic',
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
