import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useReferences } from '../../hooks/useReferences';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  projectId: number;
}

export function ReferencesList({ projectId }: Props) {
  const { data: refs } = useReferences(projectId);

  if (!refs || refs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No references</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {refs.map((ref) => (
        <TouchableOpacity
          key={ref.id}
          style={styles.item}
          onPress={() => Linking.openURL(ref.url)}
        >
          <Text style={styles.title} numberOfLines={1}>
            {ref.title || ref.url}
          </Text>
          <Text style={styles.url} numberOfLines={1}>
            {ref.url}
          </Text>
          {ref.notes ? (
            <Text style={styles.notes} numberOfLines={2}>
              {ref.notes}
            </Text>
          ) : null}
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
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 4,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  url: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  notes: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
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
