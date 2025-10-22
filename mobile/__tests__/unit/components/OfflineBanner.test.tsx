/**
 * Component test for OfflineBanner
 * Tests the offline indicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from '../../../src/components/OfflineBanner';

// Mock the network hook
jest.mock('../../../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render nothing when online', () => {
    // Mock online state
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    const { toJSON } = render(<OfflineBanner />);
    
    // Should render null (nothing shown)
    expect(toJSON()).toBeNull();
  });

  test('should show banner when offline', () => {
    // Mock offline state
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    render(<OfflineBanner />);
    
    // Should show offline message
    expect(screen.getByText('No internet connection')).toBeTruthy();
  });

  test('should show banner when connected but no internet', () => {
    // Mock connected but no internet
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: false,
      type: 'wifi',
    });

    render(<OfflineBanner />);
    
    // Should still show offline message
    expect(screen.getByText('No internet connection')).toBeTruthy();
  });
});
