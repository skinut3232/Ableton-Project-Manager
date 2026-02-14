import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../../lib/theme';

interface Props {
  coverUrl: string | null | undefined;
  projectId: number;
  size: number;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function CoverImage({ coverUrl, projectId, size }: Props) {
  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={[styles.image, { width: size, height: size }]}
      />
    );
  }

  const hue = (projectId * 137) % 360;
  const bgColor = hslToHex(hue, 50, 20);

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, backgroundColor: bgColor },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  fallback: {
    borderRadius: borderRadius.md,
  },
});
