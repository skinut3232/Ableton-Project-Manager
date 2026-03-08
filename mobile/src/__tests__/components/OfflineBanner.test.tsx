import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBanner } from '../../components/ui/OfflineBanner';

// Mock dependencies
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Track the NetInfo listener callback so we can trigger state changes
let netInfoCallback: ((state: any) => void) | null = null;

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback: any) => {
    netInfoCallback = callback;
    return jest.fn(); // unsubscribe
  }),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    netInfoCallback = null;
  });

  it('renders without crashing', () => {
    const { getByText } = render(<OfflineBanner />);
    expect(getByText('No internet connection')).toBeTruthy();
  });

  it('displays the offline message text', () => {
    const { getByText } = render(<OfflineBanner />);
    expect(getByText('No internet connection')).toBeTruthy();
  });
});
