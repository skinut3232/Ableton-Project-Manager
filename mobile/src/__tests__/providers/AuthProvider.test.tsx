import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, AuthContext } from '../../providers/AuthProvider';

// Mock supabase
const mockOnAuthStateChange = jest.fn();
const mockGetSession = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockFunctionsInvoke = jest.fn();
const mockGetSessionForDelete = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
  },
}));

// Consumer component that displays auth state
function AuthConsumer() {
  return (
    <AuthContext.Consumer>
      {(ctx) => (
        <>
          <Text testID="user">{ctx.user ? 'logged-in' : 'logged-out'}</Text>
          <Text testID="loading">{ctx.isLoading ? 'loading' : 'ready'}</Text>
          <Text testID="expired">{ctx.sessionExpired ? 'expired' : 'valid'}</Text>
        </>
      )}
    </AuthContext.Consumer>
  );
}

describe('AuthProvider', () => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;

    // Default: no session
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    // Capture the onAuthStateChange callback
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      authStateCallback = cb;
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    });
  });

  it('starts in loading state', () => {
    // Make getSession never resolve to keep loading
    mockGetSession.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    expect(getByTestId('loading').props.children).toBe('loading');
  });

  it('sets user when session exists', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('logged-in');
    });
  });

  it('sets user to null when no session', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('logged-out');
      expect(getByTestId('loading').props.children).toBe('ready');
    });
  });

  it('exposes signIn that calls supabase', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    let signInFn: any;
    const Consumer = () => (
      <AuthContext.Consumer>
        {(ctx) => {
          signInFn = ctx.signIn;
          return <Text>ok</Text>;
        }}
      </AuthContext.Consumer>
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(signInFn).toBeDefined());

    const result = await signInFn('test@test.com', 'pass123');
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'pass123',
    });
    expect(result.error).toBeNull();
  });

  it('returns error message from signIn failure', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    let signInFn: any;
    const Consumer = () => (
      <AuthContext.Consumer>
        {(ctx) => {
          signInFn = ctx.signIn;
          return <Text>ok</Text>;
        }}
      </AuthContext.Consumer>
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(signInFn).toBeDefined());

    const result = await signInFn('test@test.com', 'wrong');
    expect(result.error).toBe('Invalid login credentials');
  });

  it('exposes resetPassword that calls supabase', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    let resetFn: any;
    const Consumer = () => (
      <AuthContext.Consumer>
        {(ctx) => {
          resetFn = ctx.resetPassword;
          return <Text>ok</Text>;
        }}
      </AuthContext.Consumer>
    );

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(resetFn).toBeDefined());

    const result = await resetFn('test@test.com');
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@test.com');
    expect(result.error).toBeNull();
  });

  it('marks sessionExpired on unexpected SIGNED_OUT', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('ready');
    });

    // Simulate unexpected sign out (e.g., token expiry)
    act(() => {
      authStateCallback?.('SIGNED_OUT', null);
    });

    expect(getByTestId('expired').props.children).toBe('expired');
  });

  it('clears sessionExpired on SIGNED_IN', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('ready');
    });

    // Trigger session expiry
    act(() => {
      authStateCallback?.('SIGNED_OUT', null);
    });
    expect(getByTestId('expired').props.children).toBe('expired');

    // User signs back in
    act(() => {
      authStateCallback?.('SIGNED_IN', { user: { id: 'u1' } });
    });
    expect(getByTestId('expired').props.children).toBe('valid');
  });

  it('clears sessionExpired on TOKEN_REFRESHED', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('ready');
    });

    act(() => {
      authStateCallback?.('SIGNED_OUT', null);
    });
    expect(getByTestId('expired').props.children).toBe('expired');

    act(() => {
      authStateCallback?.('TOKEN_REFRESHED', { user: { id: 'u1' } });
    });
    expect(getByTestId('expired').props.children).toBe('valid');
  });
});
