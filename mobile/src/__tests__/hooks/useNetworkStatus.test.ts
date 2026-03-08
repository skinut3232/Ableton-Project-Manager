import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';

// Variable name prefixed with `mock` to satisfy Jest's module factory scope rule
let mockListeners: Array<(state: any) => void> = [];

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback: any) => {
    mockListeners.push(callback);
    return () => {
      mockListeners = mockListeners.filter((l) => l !== callback);
    };
  }),
}));

import { useNetworkStatus } from '../../hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    mockListeners = [];
    jest.clearAllMocks();
  });

  it('returns connected by default', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });

  it('subscribes to NetInfo on mount', () => {
    renderHook(() => useNetworkStatus());
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('updates when network becomes unavailable', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      mockListeners.forEach((cb) => cb({ isConnected: false, isInternetReachable: false }));
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
  });

  it('updates when network becomes available again', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Go offline
    act(() => {
      mockListeners.forEach((cb) => cb({ isConnected: false, isInternetReachable: false }));
    });
    expect(result.current.isConnected).toBe(false);

    // Come back online
    act(() => {
      mockListeners.forEach((cb) => cb({ isConnected: true, isInternetReachable: true }));
    });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });

  it('handles null values from NetInfo gracefully', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      mockListeners.forEach((cb) => cb({ isConnected: null, isInternetReachable: null }));
    });

    // Defaults to true for null
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    expect(mockListeners).toHaveLength(1);
    unmount();
    expect(mockListeners).toHaveLength(0);
  });
});
