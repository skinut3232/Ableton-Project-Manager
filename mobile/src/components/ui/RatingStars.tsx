import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../../lib/theme';

interface Props {
  rating: number | null;
  onRate?: (rating: number) => void;
  size?: number;
}

export function RatingStars({ rating, onRate, size = 16 }: Props) {
  const stars = [1, 2, 3, 4, 5];
  const current = rating ?? 0;

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const filled = star <= current;
        const StarComponent = onRate ? TouchableOpacity : View;
        return (
          <StarComponent
            key={star}
            onPress={onRate ? () => onRate(star === current ? 0 : star) : undefined}
            style={{ padding: 2 }}
          >
            <Text style={{ fontSize: size, color: filled ? '#eab308' : colors.border }}>
              {filled ? '\u2605' : '\u2606'}
            </Text>
          </StarComponent>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
