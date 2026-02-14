import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Project } from '../../types';
import { CoverImage } from '../ui/CoverImage';
import { StatusBadge } from '../ui/StatusBadge';
import { getRelativeTime } from '../../lib/utils';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  project: Project;
  onPress: () => void;
}

export function ProjectListItem({ project, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <CoverImage coverUrl={project.cover_url} projectId={project.id} size={40} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {project.name}
        </Text>
        <View style={styles.meta}>
          <StatusBadge status={project.status} small />
          {project.bpm ? (
            <Text style={styles.metaText}>{project.bpm} BPM</Text>
          ) : null}
          <Text style={styles.metaText}>
            {getRelativeTime(project.last_worked_on)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
