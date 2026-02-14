import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSessions } from '../../hooks/useSessions';
import { formatDuration, formatDate } from '../../lib/utils';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  projectId: number;
}

export function SessionsList({ projectId }: Props) {
  const { data: sessions } = useSessions(projectId);

  if (!sessions || sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No sessions recorded</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sessions.map((session) => (
        <View key={session.id} style={styles.item}>
          <View style={styles.header}>
            <Text style={styles.date}>
              {formatDate(session.started_at)}
            </Text>
            <Text style={styles.duration}>
              {session.duration_seconds
                ? formatDuration(session.duration_seconds)
                : 'In progress'}
            </Text>
          </View>
          {session.note ? (
            <Text style={styles.note} numberOfLines={2}>
              {session.note}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  item: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  duration: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
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
