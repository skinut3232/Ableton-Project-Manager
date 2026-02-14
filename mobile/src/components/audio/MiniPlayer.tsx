import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAudioStore } from '../../stores/audioStore';
import { togglePlayPause } from '../../lib/audioPlayer';
import { CoverImage } from '../ui/CoverImage';
import { extractFilename, formatDuration } from '../../lib/utils';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

export function MiniPlayer() {
  const currentBounce = useAudioStore((s) => s.currentBounce);
  const currentProject = useAudioStore((s) => s.currentProject);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const positionMs = useAudioStore((s) => s.positionMs);
  const durationMs = useAudioStore((s) => s.durationMs);
  const navigation = useNavigation<any>();

  if (!currentBounce || !currentProject) return null;

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('NowPlayingTab')}
      activeOpacity={0.9}
    >
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.content}>
        <CoverImage
          coverUrl={currentProject.cover_url}
          projectId={currentProject.id}
          size={32}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {extractFilename(currentBounce.bounce_path)}
          </Text>
          <Text style={styles.project} numberOfLines={1}>
            {currentProject.name}
          </Text>
        </View>
        <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
          <Text style={styles.playText}>
            {isPlaying ? '\u23F8' : '\u25B6'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.surfaceLight,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
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
  project: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playText: {
    fontSize: 14,
    color: colors.text,
  },
});
