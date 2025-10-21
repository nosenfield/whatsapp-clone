import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Hook to monitor network connectivity status
 * Returns current network state and updates when connectivity changes
 * 
 * Usage:
 * ```
 * const { isConnected, isInternetReachable } = useNetworkStatus();
 * if (!isConnected) {
 *   // Show offline UI
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Assume online initially
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    // Get initial network state
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });

      // Log network changes in dev mode
      if (__DEV__) {
        console.log('📡 Network status:', {
          connected: state.isConnected,
          reachable: state.isInternetReachable,
          type: state.type,
        });
      }
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
}

