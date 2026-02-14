import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioStore } from '../stores/audioStore';
import { togglePlayPause, seekTo, skipForward, skipBackward } from '../lib/audioPlayer';
import { CoverImage } from '../components/ui/CoverImage';
import { extractFilename, formatDuration } from '../lib/utils';
import { colors, spacing, fontSize } from '../lib/theme';

export function NowPlayingScreen() {
  const insets = useSafeAreaInsets();
  const currentBounce = useAudioStore((s) => s.currentBounce);
  const currentProject = useAudioStore((s) => s.currentProject);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const positionMs = useAudioStore((s) => s.positionMs);
  const durationMs = useAudioStore((s) => s.durationMs);

  if (!currentBounce || !currentProject) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'\u{1F50A}'}</Text>
          <Text style={styles.emptyTitle}>Nothing Playing</Text>
          <Text style={styles.emptySubtitle}>
            Select a bounce from a project to start listening
          </Text>
        </View>
      </View>
    );
  }

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const [barWidth, setBarWidth] = useState(0);

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  const handleSeekFromTouch = useCallback((e: GestureResponderEvent) => {
    if (barWidth <= 0 || durationMs <= 0) return;
    const locationX = e.nativeEvent.locationX;
    const fraction = Math.max(0, Math.min(1, locationX / barWidth));
    const newMs = fraction * durationMs;
    useAudioStore.getState().setPosition(newMs);
    seekTo(newMs);
  }, [barWidth, durationMs]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Large Cover */}
        <View style={styles.coverContainer}>
          <CoverImage
            coverUrl={currentProject.cover_url}
            projectId={currentProject.id}
            size={280}
          />
        </View>

        {/* Track Info */}
        <Text style={styles.bounceName} numberOfLines={1}>
          {extractFilename(currentBounce.bounce_path)}
        </Text>
        <Text style={styles.projectName} numberOfLines={1}>
          {currentProject.name}
        </Text>

        {/* Progress */}
        <View style={styles.sliderContainer}>
          <View
            style={styles.progressBarTouchArea}
            onLayout={onBarLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleSeekFromTouch}
            onResponderMove={handleSeekFromTouch}
          >
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
            </View>
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {formatDuration(positionMs / 1000)}
            </Text>
            <Text style={styles.timeText}>
              {formatDuration(durationMs / 1000)}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => skipBackward(30000)}
          >
            <Text style={styles.skipText}>-30s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => skipBackward(10000)}
          >
            <Text style={styles.skipText}>-10s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Text style={styles.playText}>
              {isPlaying ? '\u23F8' : '\u25B6'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => skipForward(10000)}
          >
            <Text style={styles.skipText}>+10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => skipForward(30000)}
          >
            <Text style={styles.skipText}>+30s</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  coverContainer: {
    marginBottom: spacing.xxxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bounceName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  projectName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sliderContainer: {
    width: '100%',
    marginTop: spacing.xxl,
  },
  progressBarTouchArea: {
    paddingVertical: 16,
    justifyContent: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xxxl,
  },
  skipButton: {
    padding: spacing.md,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playText: {
    fontSize: 24,
    color: colors.text,
  },
});
