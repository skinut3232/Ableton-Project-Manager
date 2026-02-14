import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import type { ProjectTask, TaskCategory } from '../../types';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { TASK_CATEGORIES, TASK_CATEGORY_COLORS } from '../../lib/constants';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  projectId: number;
}

export function TasksList({ projectId }: Props) {
  const { data: tasks } = useTasks(projectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('Arrangement');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createTask.mutate({ projectId, title: newTitle.trim(), category: newCategory });
    setNewTitle('');
    setShowAddForm(false);
  };

  const handleToggle = (task: ProjectTask) => {
    updateTask.mutate({ id: task.id, projectId, done: !task.done });
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask.mutate({ id, projectId }) },
    ]);
  };

  // Group by category
  const grouped = TASK_CATEGORIES.reduce<Record<string, ProjectTask[]>>((acc, cat) => {
    const categoryTasks = (tasks ?? []).filter((t) => t.category === cat);
    if (categoryTasks.length > 0) acc[cat] = categoryTasks;
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      {/* Add button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddForm(!showAddForm)}
      >
        <Text style={styles.addButtonText}>+ Add Task</Text>
      </TouchableOpacity>

      {/* Add form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Task title..."
            placeholderTextColor={colors.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
          />
          <View style={styles.categoryRow}>
            {TASK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  newCategory === cat && {
                    backgroundColor: TASK_CATEGORY_COLORS[cat] + '30',
                    borderColor: TASK_CATEGORY_COLORS[cat],
                  },
                ]}
                onPress={() => setNewCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    newCategory === cat && { color: TASK_CATEGORY_COLORS[cat] },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
            <Text style={styles.submitText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Grouped tasks */}
      {Object.entries(grouped).map(([category, categoryTasks]) => (
        <View key={category} style={styles.group}>
          <View style={styles.groupHeader}>
            <View
              style={[
                styles.categoryDot,
                { backgroundColor: TASK_CATEGORY_COLORS[category as TaskCategory] },
              ]}
            />
            <Text style={styles.groupTitle}>{category}</Text>
            <Text style={styles.groupCount}>
              {categoryTasks.filter((t) => t.done).length}/{categoryTasks.length}
            </Text>
          </View>
          {categoryTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskItem}
              onPress={() => handleToggle(task)}
              onLongPress={() => handleDelete(task.id)}
            >
              <Text style={styles.checkbox}>
                {task.done ? '\u2611' : '\u2610'}
              </Text>
              <Text style={[styles.taskTitle, task.done && styles.taskDone]}>
                {task.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {(!tasks || tasks.length === 0) && !showAddForm && (
        <Text style={styles.emptyText}>No tasks yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  addForm: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  submitButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  submitText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  group: {
    gap: spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  groupCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  checkbox: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  taskTitle: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
});
