import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMarkers } from '../../hooks/useMarkers';
import { MARKER_TYPES } from '../../lib/constants';
import { formatTimestamp } from '../../lib/utils';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  projectId: number;
}

export function MarkersList({ projectId }: Props) {
  const { data: markers } = useMarkers(projectId);

  if (!markers || markers.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No markers</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {markers.map((marker) => {
        const typeInfo = MARKER_TYPES.find((t) => t.value === marker.type);
        return (
          <View key={marker.id} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: typeInfo?.color ?? colors.textMuted }]} />
            <Text style={styles.timestamp}>
              {formatTimestamp(marker.timestamp_seconds)}
            </Text>
            <Text style={styles.text} numberOfLines={2}>
              {marker.text}
            </Text>
          </View>
        );
      })}
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
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timestamp: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: 'monospace',
    minWidth: 40,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
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
