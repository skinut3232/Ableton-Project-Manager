import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Project } from '../../types';
import { CoverImage } from '../ui/CoverImage';
import { StatusBadge } from '../ui/StatusBadge';
import { RatingStars } from '../ui/RatingStars';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  project: Project;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <CoverImage coverUrl={project.cover_url} projectId={project.id} size={cardImageSize} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {project.name}
        </Text>
        <StatusBadge status={project.status} small />
        <View style={styles.meta}>
          {project.bpm ? (
            <Text style={styles.metaText}>{project.bpm} BPM</Text>
          ) : null}
          {project.musical_key ? (
            <Text style={styles.metaText}>{project.musical_key}</Text>
          ) : null}
        </View>
        {(project.rating ?? 0) > 0 && (
          <RatingStars rating={project.rating} size={12} />
        )}
        {project.tags && project.tags.length > 0 && (
          <View style={styles.tagRow}>
            {project.tags.slice(0, 3).map((tag) => (
              <View key={tag.id} style={styles.tag}>
                <Text style={styles.tagText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const cardImageSize = 140;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    margin: spacing.xs,
  },
  info: {
    padding: spacing.sm,
    gap: 4,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
