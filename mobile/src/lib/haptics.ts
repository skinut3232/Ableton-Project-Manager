import * as Haptics from 'expo-haptics';

/** Light impact for minor interactions (play/pause, skip) */
export function lightTap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium impact for significant interactions (play/pause on now playing) */
export function mediumTap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Selection feedback for toggles and selections (star rating, filter chips) */
export function selectionTap() {
  Haptics.selectionAsync();
}
