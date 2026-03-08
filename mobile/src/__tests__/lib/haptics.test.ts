import * as Haptics from 'expo-haptics';
import { lightTap, mediumTap, selectionTap } from '../../lib/haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
}));

describe('haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lightTap', () => {
    it('triggers light impact feedback', () => {
      lightTap();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('mediumTap', () => {
    it('triggers medium impact feedback', () => {
      mediumTap();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectionTap', () => {
    it('triggers selection feedback', () => {
      selectionTap();
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });
  });
});
