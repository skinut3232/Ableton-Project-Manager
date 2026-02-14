import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LibraryStackParamList } from '../navigation/types';
import { useProjectDetail } from '../hooks/useProjects';
import { CoverImage } from '../components/ui/CoverImage';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RatingStars } from '../components/ui/RatingStars';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { MetadataEditor } from '../components/project/MetadataEditor';
import { TagEditor } from '../components/project/TagEditor';
import { BouncesList } from '../components/project/BouncesList';
import { NotesList } from '../components/project/NotesList';
import { TasksList } from '../components/project/TasksList';
import { MarkersList } from '../components/project/MarkersList';
import { SessionsList } from '../components/project/SessionsList';
import { ReferencesList } from '../components/project/ReferencesList';
import { SpotifyRefsList } from '../components/project/SpotifyRefsList';
import { getRelativeTime } from '../lib/utils';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';

type Props = NativeStackScreenProps<LibraryStackParamList, 'ProjectDetail'>;

type SectionKey = 'metadata' | 'tags' | 'bounces' | 'notes' | 'tasks' | 'markers' | 'sessions' | 'references' | 'spotify';

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: 'metadata', title: 'Details' },
  { key: 'tags', title: 'Tags' },
  { key: 'bounces', title: 'Bounces' },
  { key: 'notes', title: 'Notes' },
  { key: 'tasks', title: 'Tasks' },
  { key: 'markers', title: 'Markers' },
  { key: 'sessions', title: 'Sessions' },
  { key: 'references', title: 'References' },
  { key: 'spotify', title: 'Spotify' },
];

export function ProjectDetailScreen({ route }: Props) {
  const { projectId } = route.params;
  const { data: project, isLoading } = useProjectDetail(projectId);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['metadata', 'tags', 'bounces'])
  );

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading || !project) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <CoverImage coverUrl={project.cover_url} projectId={project.id} size={120} />
        <View style={styles.headerInfo}>
          <Text style={styles.projectName}>{project.name}</Text>
          <StatusBadge status={project.status} />
          <RatingStars rating={project.rating} size={16} />
          {project.progress != null && (
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${project.progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{project.progress}%</Text>
            </View>
          )}
          <Text style={styles.lastWorked}>
            Last worked: {getRelativeTime(project.last_worked_on)}
          </Text>
        </View>
      </View>

      {/* Collapsible Sections */}
      {SECTIONS.map(({ key, title }) => (
        <View key={key} style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(key)}
          >
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionArrow}>
              {expandedSections.has(key) ? '\u25B2' : '\u25BC'}
            </Text>
          </TouchableOpacity>
          {expandedSections.has(key) && (
            <View style={styles.sectionContent}>
              {key === 'metadata' && <MetadataEditor project={project} />}
              {key === 'tags' && <TagEditor projectId={project.id} tags={project.tags ?? []} />}
              {key === 'bounces' && <BouncesList projectId={project.id} project={project} />}
              {key === 'notes' && <NotesList projectId={project.id} />}
              {key === 'tasks' && <TasksList projectId={project.id} />}
              {key === 'markers' && <MarkersList projectId={project.id} />}
              {key === 'sessions' && <SessionsList projectId={project.id} />}
              {key === 'references' && <ReferencesList projectId={project.id} />}
              {key === 'spotify' && <SpotifyRefsList projectId={project.id} />}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 3,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  projectName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  lastWorked: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  sectionArrow: {
    fontSize: 10,
    color: colors.textMuted,
  },
  sectionContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
