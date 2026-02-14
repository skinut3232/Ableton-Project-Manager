import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import type { Tag } from '../../types';
import { useAllTags, useCreateTag, useAddTagToProject, useRemoveTagFromProject } from '../../hooks/useTags';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  projectId: number;
  tags: Tag[];
}

export function TagEditor({ projectId, tags }: Props) {
  const { data: allTags } = useAllTags();
  const createTag = useCreateTag();
  const addTag = useAddTagToProject();
  const removeTag = useRemoveTagFromProject();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const projectTagIds = new Set(tags.map((t) => t.id));
  const availableTags = (allTags ?? []).filter(
    (t) => !projectTagIds.has(t.id) && t.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleAddTag = async (tagId: number) => {
    addTag.mutate({ projectId, tagId });
    setPickerVisible(false);
    setSearchText('');
  };

  const handleCreateAndAdd = async () => {
    if (!searchText.trim()) return;
    const tag = await createTag.mutateAsync(searchText.trim());
    addTag.mutate({ projectId, tagId: tag.id });
    setPickerVisible(false);
    setSearchText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        {tags.map((tag) => (
          <View key={tag.id} style={styles.chip}>
            <Text style={styles.chipText}>{tag.name}</Text>
            <TouchableOpacity
              onPress={() => removeTag.mutate({ projectId, tagId: tag.id })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.removeText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addChip}
          onPress={() => setPickerVisible(true)}
        >
          <Text style={styles.addChipText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Tag</Text>
              <TouchableOpacity onPress={() => { setPickerVisible(false); setSearchText(''); }}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search or create tag..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            <FlatList
              data={availableTags}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tagRow}
                  onPress={() => handleAddTag(item.id)}
                >
                  <Text style={styles.tagRowText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                searchText.trim() && !allTags?.some((t) => t.name.toLowerCase() === searchText.trim().toLowerCase()) ? (
                  <TouchableOpacity style={styles.createRow} onPress={handleCreateAndAdd}>
                    <Text style={styles.createText}>
                      Create "{searchText.trim()}"
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>No tags found</Text>
              }
              style={styles.tagList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  removeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  addChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  closeText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.inputBg,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagList: {
    paddingHorizontal: spacing.lg,
  },
  tagRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tagRowText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  createRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  createText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
});
