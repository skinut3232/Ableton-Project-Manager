import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../../hooks/useNotes';
import { getRelativeTime } from '../../lib/utils';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  projectId: number;
}

export function NotesList({ projectId }: Props) {
  const { data: notes } = useNotes(projectId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (!newContent.trim()) return;
    createNote.mutate({ projectId, content: newContent.trim() });
    setNewContent('');
  };

  const handleSaveEdit = (id: number) => {
    if (!editText.trim()) return;
    updateNote.mutate({ id, projectId, content: editText.trim() });
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote.mutate({ id, projectId }) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Add note */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Add a note..."
          placeholderTextColor={colors.textMuted}
          value={newContent}
          onChangeText={setNewContent}
          multiline
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Notes list */}
      {notes?.map((note) => (
        <View key={note.id} style={styles.note}>
          {editingId === note.id ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
              />
              <TouchableOpacity onPress={() => handleSaveEdit(note.id)}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingId(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setEditingId(note.id);
                setEditText(note.content);
              }}
              onLongPress={() => handleDelete(note.id)}
            >
              <Text style={styles.noteContent}>{note.content}</Text>
              <Text style={styles.noteDate}>{getRelativeTime(note.created_at)}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {(!notes || notes.length === 0) && (
        <Text style={styles.emptyText}>No notes yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
    maxHeight: 100,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
  },
  note: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  noteContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  editRow: {
    gap: spacing.sm,
  },
  editInput: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 40,
  },
  saveText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
});
