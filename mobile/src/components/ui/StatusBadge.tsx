import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ProjectStatus } from '../../types';
import { STATUS_COLORS, STATUS_BG_COLORS } from '../../lib/constants';
import { fontSize, borderRadius, spacing } from '../../lib/theme';

interface Props {
  status: ProjectStatus;
  small?: boolean;
}

export function StatusBadge({ status, small }: Props) {
  return (
    <View style={[
      styles.badge,
      { backgroundColor: STATUS_BG_COLORS[status] },
      small && styles.badgeSmall,
    ]}>
      <Text style={[
        styles.text,
        { color: STATUS_COLORS[status] },
        small && styles.textSmall,
      ]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 9,
  },
});
