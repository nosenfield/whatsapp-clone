// Mock Google Sign-In module
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn, isGoogleSignInAvailable } from '../../../src/services/firebase-auth';

describe('Google Sign-In Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should configure Google Sign-In successfully', async () => {
    // Mock GoogleSignin.configure
    const mockConfigure = jest.fn().mockResolvedValue(undefined);
    GoogleSignin.configure = mockConfigure;

    await configureGoogleSignIn();

    expect(mockConfigure).toHaveBeenCalledWith({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  });

  test('should handle Google Sign-In configuration error', async () => {
    // Mock GoogleSignin.configure to throw error
    const mockConfigure = jest.fn().mockRejectedValue(new Error('Configuration failed'));
    GoogleSignin.configure = mockConfigure;

    await expect(configureGoogleSignIn()).rejects.toThrow('Configuration failed');
  });

  test('should check Google Play Services availability', async () => {
    // Mock GoogleSignin.hasPlayServices
    const mockHasPlayServices = jest.fn().mockResolvedValue(true);
    GoogleSignin.hasPlayServices = mockHasPlayServices;

    const isAvailable = await isGoogleSignInAvailable();

    expect(isAvailable).toBe(true);
    expect(mockHasPlayServices).toHaveBeenCalled();
  });

  test('should handle Google Play Services unavailable', async () => {
    // Mock GoogleSignin.hasPlayServices to throw error
    const mockHasPlayServices = jest.fn().mockRejectedValue(new Error('Play Services not available'));
    GoogleSignin.hasPlayServices = mockHasPlayServices;

    const isAvailable = await isGoogleSignInAvailable();

    expect(isAvailable).toBe(false);
  });
});
