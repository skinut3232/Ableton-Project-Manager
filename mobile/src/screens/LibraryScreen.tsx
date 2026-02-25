import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LibraryStackParamList } from '../navigation/types';
import { useProjects } from '../hooks/useProjects';
import { useLibraryStore } from '../stores/libraryStore';
import { SearchBar } from '../components/library/SearchBar';
import { FilterSheet } from '../components/library/FilterSheet';
import { ProjectCard } from '../components/library/ProjectCard';
import { ProjectListItem } from '../components/library/ProjectListItem';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';
import type { Project } from '../types';

type NavProp = NativeStackNavigationProp<LibraryStackParamList, 'Library'>;

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const [filterVisible, setFilterVisible] = useState(false);

  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const viewMode = useLibraryStore((s) => s.viewMode);
  const setViewMode = useLibraryStore((s) => s.setViewMode);
  const sortBy = useLibraryStore((s) => s.sortBy);
  const sortDir = useLibraryStore((s) => s.sortDir);
  const showArchived = useLibraryStore((s) => s.showArchived);
  const statusFilters = useLibraryStore((s) => s.statusFilters);
  const smartFilters = useLibraryStore((s) => s.smartFilters);

  const filters = useMemo(() => {
    const f: import('../types').ProjectFilters = {
      sort_by: sortBy,
      sort_dir: sortDir,
      show_archived: showArchived,
    };
    if (searchQuery.trim()) f.search_query = searchQuery.trim();
    if (statusFilters.length > 0) f.statuses = [...statusFilters];
    for (const sf of smartFilters) {
      if (!sf.active) continue;
      switch (sf.key) {
        case 'in_rotation': f.in_rotation = true; break;
        case 'top_rated': f.min_rating = 4; break;
        case 'last_7_days': f.updated_since_days = 7; break;
        case 'last_30_days': f.updated_since_days = 30; break;
        case 'near_done': f.statuses = [...(f.statuses || []), 'Mix', 'Master']; break;
      }
    }
    return f;
  }, [searchQuery, sortBy, sortDir, showArchived, statusFilters, smartFilters]);

  const { data: projects, isLoading, refetch, isRefetching } = useProjects(filters);

  const handleProjectPress = useCallback(
    (project: Project) => {
      navigation.navigate('ProjectDetail', {
        projectId: project.id,
        projectName: project.name,
      });
    },
    [navigation]
  );

  const renderGridItem = useCallback(
    ({ item }: { item: Project }) => (
      <ProjectCard project={item} onPress={() => handleProjectPress(item)} />
    ),
    [handleProjectPress]
  );

  const renderListItem = useCallback(
    ({ item }: { item: Project }) => (
      <ProjectListItem project={item} onPress={() => handleProjectPress(item)} />
    ),
    [handleProjectPress]
  );

  const activeFilterCount =
    statusFilters.length +
    smartFilters.filter((f) => f.active).length +
    (showArchived ? 1 : 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.count}>
          {projects?.length ?? 0} projects
        </Text>
      </View>

      {/* Search + Controls */}
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        </View>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterVisible(true)}
          >
            <Text style={styles.filterButtonText}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Text style={styles.viewToggleText}>
              {viewMode === 'grid' ? '\u2630' : '\u25A6'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Project List */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          message={searchQuery ? 'Try a different search term' : 'Sign in to see your projects'}
        />
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={projects}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          key="list"
          data={projects}
          renderItem={renderListItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <FilterSheet visible={filterVisible} onClose={() => setFilterVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  count: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  viewToggle: {
    padding: spacing.sm,
  },
  viewToggleText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  gridContent: {
    padding: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
});
