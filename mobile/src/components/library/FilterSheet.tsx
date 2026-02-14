import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { PROJECT_STATUSES, STATUS_COLORS, SORT_OPTIONS } from '../../lib/constants';
import { useLibraryStore } from '../../stores/libraryStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FilterSheet({ visible, onClose }: Props) {
  const statusFilters = useLibraryStore((s) => s.statusFilters);
  const setStatusFilters = useLibraryStore((s) => s.setStatusFilters);
  const sortBy = useLibraryStore((s) => s.sortBy);
  const setSortBy = useLibraryStore((s) => s.setSortBy);
  const sortDir = useLibraryStore((s) => s.sortDir);
  const setSortDir = useLibraryStore((s) => s.setSortDir);
  const showArchived = useLibraryStore((s) => s.showArchived);
  const setShowArchived = useLibraryStore((s) => s.setShowArchived);
  const smartFilters = useLibraryStore((s) => s.smartFilters);
  const toggleSmartFilter = useLibraryStore((s) => s.toggleSmartFilter);
  const resetFilters = useLibraryStore((s) => s.resetFilters);

  const toggleStatus = (status: string) => {
    if (statusFilters.includes(status)) {
      setStatusFilters(statusFilters.filter((s) => s !== status));
    } else {
      setStatusFilters([...statusFilters, status]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Smart Filters */}
            <Text style={styles.sectionTitle}>Quick Filters</Text>
            <View style={styles.chipRow}>
              {smartFilters.map((sf) => (
                <TouchableOpacity
                  key={sf.key}
                  style={[styles.chip, sf.active && styles.chipActive]}
                  onPress={() => toggleSmartFilter(sf.key)}
                >
                  <Text style={[styles.chipText, sf.active && styles.chipTextActive]}>
                    {sf.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Status Filter */}
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.chipRow}>
              {PROJECT_STATUSES.map((status) => {
                const active = statusFilters.includes(status);
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.chip,
                      active && { backgroundColor: STATUS_COLORS[status] + '30', borderColor: STATUS_COLORS[status] },
                    ]}
                    onPress={() => toggleStatus(status)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && { color: STATUS_COLORS[status] },
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sort */}
            <Text style={styles.sectionTitle}>Sort By</Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, sortBy === opt.value && styles.chipActive]}
                  onPress={() => setSortBy(opt.value)}
                >
                  <Text style={[styles.chipText, sortBy === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Direction */}
            <View style={styles.dirRow}>
              <TouchableOpacity
                style={[styles.chip, sortDir === 'desc' && styles.chipActive]}
                onPress={() => setSortDir('desc')}
              >
                <Text style={[styles.chipText, sortDir === 'desc' && styles.chipTextActive]}>
                  Descending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, sortDir === 'asc' && styles.chipActive]}
                onPress={() => setSortDir('asc')}
              >
                <Text style={[styles.chipText, sortDir === 'asc' && styles.chipTextActive]}>
                  Ascending
                </Text>
              </TouchableOpacity>
            </View>

            {/* Show Archived */}
            <TouchableOpacity
              style={[styles.chip, showArchived && styles.chipActive, { marginTop: spacing.lg }]}
              onPress={() => setShowArchived(!showArchived)}
            >
              <Text style={[styles.chipText, showArchived && styles.chipTextActive]}>
                Show Archived
              </Text>
            </TouchableOpacity>

            {/* Reset */}
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetText}>Reset All Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  closeText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  dirRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  resetButton: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  resetText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: '500',
  },
});
