import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../../screens/LoginScreen';
import { AuthContext } from '../../providers/AuthProvider';

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Helper to render LoginScreen with auth context
function renderLoginScreen(overrides: Partial<React.ContextType<typeof AuthContext>> = {}) {
  const defaultContext: React.ContextType<typeof AuthContext> = {
    user: null,
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
        <LoginScreen />
      </AuthContext.Provider>
    ),
    context: defaultContext,
  };
}

describe('LoginScreen', () => {
  describe('rendering', () => {
    it('renders sign in form by default', () => {
      const { getByText, getByPlaceholderText } = renderLoginScreen();
      expect(getByText('SetCrate')).toBeTruthy();
      expect(getByText('Sign in to your account')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
    });

    it('has accessible inputs', () => {
      const { getByLabelText } = renderLoginScreen();
      expect(getByLabelText('Email address')).toBeTruthy();
      expect(getByLabelText('Password')).toBeTruthy();
    });

    it('shows session expired warning when sessionExpired is true', () => {
      const { getByText } = renderLoginScreen({ sessionExpired: true });
      expect(getByText('Session expired, please sign in again')).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('shows error for empty email', async () => {
      const { getByLabelText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByLabelText('Password'), 'password123');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(getByText('Email is required')).toBeTruthy();
      });
    });

    it('shows error for invalid email format', async () => {
      const { getByLabelText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByLabelText('Email address'), 'notanemail');
      fireEvent.changeText(getByLabelText('Password'), 'password123');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(getByText('Enter a valid email address')).toBeTruthy();
      });
    });

    it('shows error for empty password', async () => {
      const { getByLabelText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(getByText('Password is required')).toBeTruthy();
      });
    });

    it('shows error for password less than 6 characters', async () => {
      const { getByLabelText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
      fireEvent.changeText(getByLabelText('Password'), '12345');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(getByText('Password must be at least 6 characters')).toBeTruthy();
      });
    });

    it('clears field errors on input change', async () => {
      const { getByLabelText, getByText, queryByText } = renderLoginScreen();

      // Trigger validation error
      fireEvent.press(getByText('Sign In'));
      await waitFor(() => {
        expect(getByText('Email is required')).toBeTruthy();
      });

      // Type in email to clear error
      fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
      expect(queryByText('Email is required')).toBeNull();
    });
  });

  describe('sign in / sign up', () => {
    it('calls signIn with valid credentials', async () => {
      const { getByLabelText, getByText, context } = renderLoginScreen();

      fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
      fireEvent.changeText(getByLabelText('Password'), 'password123');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(context.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('calls signUp when in sign up mode', async () => {
      const { getByLabelText, getByText, context } = renderLoginScreen();

      // Switch to sign up
      fireEvent.press(getByText("Don't have an account? Sign up"));
      expect(getByText('Create an account')).toBeTruthy();

      fireEvent.changeText(getByLabelText('Email address'), 'new@example.com');
      fireEvent.changeText(getByLabelText('Password'), 'password123');
      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(context.signUp).toHaveBeenCalledWith('new@example.com', 'password123');
      });
    });

    it('shows server error message', async () => {
      const signIn = jest.fn().mockResolvedValue({ error: 'Invalid credentials' });
      const { getByLabelText, getByText } = renderLoginScreen({ signIn });

      fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
      fireEvent.changeText(getByLabelText('Password'), 'wrongpass');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(getByText('Invalid credentials')).toBeTruthy();
      });
    });
  });

  describe('toggle sign in / sign up', () => {
    it('toggles between sign in and sign up modes', () => {
      const { getByText } = renderLoginScreen();

      expect(getByText('Sign in to your account')).toBeTruthy();
      fireEvent.press(getByText("Don't have an account? Sign up"));
      expect(getByText('Create an account')).toBeTruthy();
      fireEvent.press(getByText('Already have an account? Sign in'));
      expect(getByText('Sign in to your account')).toBeTruthy();
    });

    it('clears errors when toggling', async () => {
      const { getByText, queryByText } = renderLoginScreen();

      // Trigger validation error
      fireEvent.press(getByText('Sign In'));
      await waitFor(() => {
        expect(getByText('Email is required')).toBeTruthy();
      });

      // Toggle to sign up — errors should clear
      fireEvent.press(getByText("Don't have an account? Sign up"));
      expect(queryByText('Email is required')).toBeNull();
    });
  });

  describe('forgot password', () => {
    it('shows forgot password link only in sign in mode', () => {
      const { getByText, queryByText } = renderLoginScreen();

      expect(getByText('Forgot Password?')).toBeTruthy();

      // Switch to sign up
      fireEvent.press(getByText("Don't have an account? Sign up"));
      expect(queryByText('Forgot Password?')).toBeNull();
    });

    it('navigates to forgot password view', () => {
      const { getByText } = renderLoginScreen();

      fireEvent.press(getByText('Forgot Password?'));
      expect(getByText('Reset Password')).toBeTruthy();
      expect(getByText('Enter your email to receive a reset link.')).toBeTruthy();
    });

    it('calls resetPassword with email', async () => {
      const resetPassword = jest.fn().mockResolvedValue({ error: null });
      const { getByText, getByLabelText } = renderLoginScreen({ resetPassword });

      // Go to forgot password
      fireEvent.press(getByText('Forgot Password?'));

      fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
      fireEvent.press(getByText('Send Reset Link'));

      await waitFor(() => {
        expect(resetPassword).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('shows success message after sending reset', async () => {
      const resetPassword = jest.fn().mockResolvedValue({ error: null });
      const { getByText, getByLabelText } = renderLoginScreen({ resetPassword });

      fireEvent.press(getByText('Forgot Password?'));
      fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
      fireEvent.press(getByText('Send Reset Link'));

      await waitFor(() => {
        expect(getByText('Check your email for a password reset link.')).toBeTruthy();
      });
    });

    it('navigates back to sign in from forgot password', () => {
      const { getByText } = renderLoginScreen();

      fireEvent.press(getByText('Forgot Password?'));
      expect(getByText('Reset Password')).toBeTruthy();

      fireEvent.press(getByText('Back to Sign In'));
      expect(getByText('Sign in to your account')).toBeTruthy();
    });
  });
});
