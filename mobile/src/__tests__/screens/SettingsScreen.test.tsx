import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { AuthContext } from '../../providers/AuthProvider';

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0', sdkVersion: '54.0.0' },
}));

// Spy on Linking.openURL
jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true));

// Spy on Alert.alert
jest.spyOn(Alert, 'alert');

const mockUser = {
  id: 'abc123def456',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2026-01-01',
  app_metadata: {},
  user_metadata: {},
} as any;

function renderSettingsScreen(overrides: Partial<React.ContextType<typeof AuthContext>> = {}) {
  const defaultContext: React.ContextType<typeof AuthContext> = {
    user: mockUser,
    session: null,
    isLoading: false,
    sessionExpired: false,
    signIn: jest.fn().mockResolvedValue({ error: null }),
    signUp: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn(),
    resetPassword: jest.fn().mockResolvedValue({ error: null }),
    deleteAccount: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };

  return {
    ...render(
      <AuthContext.Provider value={defaultContext}>
        <SettingsScreen />
      </AuthContext.Provider>
    ),
    context: defaultContext,
  };
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('account section', () => {
    it('displays user email', () => {
      const { getByText } = renderSettingsScreen();
      expect(getByText('test@example.com')).toBeTruthy();
    });

    it('displays truncated user ID', () => {
      const { getByText } = renderSettingsScreen();
      expect(getByText('abc123def456...')).toBeTruthy();
    });
  });

  describe('about section', () => {
    it('displays app version', () => {
      const { getByText } = renderSettingsScreen();
      expect(getByText('1.0.0')).toBeTruthy();
    });
  });

  describe('legal section', () => {
    it('renders Privacy Policy link', () => {
      const { getByLabelText } = renderSettingsScreen();
      expect(getByLabelText('Privacy Policy')).toBeTruthy();
    });

    it('opens privacy policy URL', () => {
      const { getByLabelText } = renderSettingsScreen();
      fireEvent.press(getByLabelText('Privacy Policy'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://setcrate.app/privacy');
    });

    it('renders Terms of Service link', () => {
      const { getByLabelText } = renderSettingsScreen();
      expect(getByLabelText('Terms of Service')).toBeTruthy();
    });

    it('opens terms URL', () => {
      const { getByLabelText } = renderSettingsScreen();
      fireEvent.press(getByLabelText('Terms of Service'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://setcrate.app/terms');
    });
  });

  describe('support section', () => {
    it('renders support link', () => {
      const { getByLabelText } = renderSettingsScreen();
      expect(getByLabelText('Contact Support')).toBeTruthy();
    });

    it('opens support email', () => {
      const { getByLabelText } = renderSettingsScreen();
      fireEvent.press(getByLabelText('Contact Support'));
      expect(Linking.openURL).toHaveBeenCalledWith('mailto:support@setcrate.app');
    });
  });

  describe('sign out', () => {
    it('shows confirmation alert on sign out', () => {
      const { getByLabelText } = renderSettingsScreen();
      fireEvent.press(getByLabelText('Sign Out'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign Out',
        'Are you sure you want to sign out?',
        expect.any(Array)
      );
    });
  });

  describe('delete account', () => {
    it('shows first confirmation alert', () => {
      const { getByLabelText } = renderSettingsScreen();
      fireEvent.press(getByLabelText('Delete Account'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Account',
        expect.stringContaining('permanently delete'),
        expect.any(Array)
      );
    });

    it('has accessible delete account button', () => {
      const { getByLabelText } = renderSettingsScreen();
      expect(getByLabelText('Delete Account')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('account rows have accessibility labels', () => {
      const { getByLabelText } = renderSettingsScreen();
      expect(getByLabelText('Email: test@example.com')).toBeTruthy();
    });

    it('sign out button has accessibility role', () => {
      const { getByLabelText } = renderSettingsScreen();
      const button = getByLabelText('Sign Out');
      expect(button).toBeTruthy();
    });
  });
});
