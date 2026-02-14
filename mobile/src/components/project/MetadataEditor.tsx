import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import type { Project, ProjectStatus } from '../../types';
import { useUpdateProject } from '../../hooks/useProjects';
import { StatusBadge } from '../ui/StatusBadge';
import { RatingStars } from '../ui/RatingStars';
import { PROJECT_STATUSES, MUSICAL_KEYS } from '../../lib/constants';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Props {
  project: Project;
}

export function MetadataEditor({ project }: Props) {
  const updateProject = useUpdateProject();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showKeyPicker, setShowKeyPicker] = useState(false);
  const [bpmText, setBpmText] = useState(project.bpm?.toString() ?? '');
  const [genreText, setGenreText] = useState(project.genre_label ?? '');

  const save = (updates: Record<string, unknown>) => {
    updateProject.mutate({ id: project.id, ...updates } as any);
  };

  return (
    <View style={styles.container}>
      {/* Status */}
      <View style={styles.field}>
        <Text style={styles.label}>Status</Text>
        <TouchableOpacity onPress={() => setShowStatusPicker(!showStatusPicker)}>
          <StatusBadge status={project.status} />
        </TouchableOpacity>
        {showStatusPicker && (
          <View style={styles.pickerGrid}>
            {PROJECT_STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  save({ status: s });
                  setShowStatusPicker(false);
                }}
                style={styles.pickerItem}
              >
                <StatusBadge status={s} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Rating */}
      <View style={styles.field}>
        <Text style={styles.label}>Rating</Text>
        <RatingStars
          rating={project.rating}
          onRate={(r) => save({ rating: r || null })}
          size={22}
        />
      </View>

      {/* BPM */}
      <View style={styles.field}>
        <Text style={styles.label}>BPM</Text>
        <TextInput
          style={styles.input}
          value={bpmText}
          onChangeText={setBpmText}
          onBlur={() => {
            const num = parseFloat(bpmText);
            if (!isNaN(num) && num > 0) save({ bpm: num });
            else if (bpmText === '') save({ bpm: null });
          }}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Key */}
      <View style={styles.field}>
        <Text style={styles.label}>Key</Text>
        <TouchableOpacity onPress={() => setShowKeyPicker(!showKeyPicker)}>
          <Text style={styles.valueText}>
            {project.musical_key || '—'}
          </Text>
        </TouchableOpacity>
        {showKeyPicker && (
          <View style={styles.pickerGrid}>
            {MUSICAL_KEYS.filter(Boolean).map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => {
                  save({ musical_key: k });
                  setShowKeyPicker(false);
                }}
                style={styles.keyItem}
              >
                <Text style={[
                  styles.keyText,
                  project.musical_key === k && styles.keyTextActive,
                ]}>
                  {k}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Genre */}
      <View style={styles.field}>
        <Text style={styles.label}>Genre</Text>
        <TextInput
          style={styles.input}
          value={genreText}
          onChangeText={setGenreText}
          onBlur={() => save({ genre_label: genreText })}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Progress */}
      <View style={styles.field}>
        <Text style={styles.label}>Progress</Text>
        <Text style={styles.valueText}>
          {project.progress != null ? `${project.progress}%` : '—'}
        </Text>
      </View>

      {/* In Rotation */}
      <View style={styles.field}>
        <Text style={styles.label}>In Rotation</Text>
        <Switch
          value={project.in_rotation}
          onValueChange={(v) => save({ in_rotation: v })}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.text}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  pickerItem: {
    padding: spacing.xs,
  },
  keyItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  keyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  keyTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
