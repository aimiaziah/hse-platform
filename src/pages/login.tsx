// src/pages/login.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { getMicrosoftAuthUrl } from '@/utils/microsoft-auth';

const LoginPage: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Default to Microsoft login as preferred method
  const [loginMethod, setLoginMethod] = useState<'pin' | 'microsoft'>('microsoft');
  const router = useRouter();

  // Initialize auth hook safely
  let authHook: any;
  try {
    authHook = useAuth();
  } catch (error) {
    console.error('Auth context not available:', error);
    authHook = null;
  }
  const { login, isAuthenticated } = authHook || { login: null, isAuthenticated: false };

  useEffect(() => {
    if (isAuthenticated && router && router.isReady) {
      // Prevent redirect loops
      const currentPath = router.pathname;
      if (currentPath === '/login') {
        router.replace('/');
      }
    }

    // Check for error message from OAuth callback
    if (router.isReady && router.query.error) {
      setError(decodeURIComponent(router.query.error as string));
    }

    // Check for success message
    if (router.isReady && router.query.login === 'success') {
      router.replace('/analytics');
    }
  }, [isAuthenticated, router]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!login) {
      setError('Authentication system not available');
      return;
    }
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const success = await login(pin);
      if (success && authHook?.user) {
        // All roles redirect to analytics (unified home page)
        await router.replace('/analytics');
      } else {
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = () => {
    try {
      const authUrl = getMicrosoftAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      setError('Microsoft login is not configured');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && pin.length === 4) {
        handleSubmit();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  // If auth is not available, show an error
  if (!authHook) {
    return (
      <>
        <Head>
          <title>Login - HSE Inspection System</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">System Error</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Authentication system is not properly configured. Please check your setup.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Login - HSE Inspection System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-blue-200 opacity-20 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-indigo-200 opacity-20 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-md relative z-10">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                Health, Safety & Environment Platform
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                {loginMethod === 'pin'
                  ? 'Enter 4-digit PIN to access'
                  : 'Sign in with your company Microsoft account'}
              </p>
            </div>

            {/* Login Method Tabs */}
            <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setLoginMethod('microsoft')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'microsoft'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Microsoft Account
              </button>
              <button
                onClick={() => setLoginMethod('pin')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  loginMethod === 'pin'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                PIN Login
              </button>
            </div>
            {/* Microsoft Login Section */}
            {loginMethod === 'microsoft' && (
              <div className="mb-6">
                <button
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 23 23">
                    <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  <span className="text-gray-700 font-medium">Sign in with Microsoft</span>
                </button>
                <p className="mt-3 text-xs text-gray-500 text-center">
                  Use your @theta-edge.com account to sign in
                </p>
              </div>
            )}

            {/* PIN Display */}
            {loginMethod === 'pin' && (
              <div className="flex justify-center mb-6">
                <div className="flex space-x-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all duration-200 ${
                        pin.length > index
                          ? 'border-gray-400 bg-gray-50 text-gray-800'
                          : 'border-gray-300 bg-white text-gray-400'
                      }`}
                    >
                      {pin.length > index ? '●' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}
            {/* Numeric Keypad (only show for PIN login) */}
            {loginMethod === 'pin' && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinInput(digit.toString())}
                    disabled={isLoading || pin.length >= 4}
                    className="h-14 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-lg text-xl font-semibold text-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 hover:border-gray-300"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isLoading || pin.length === 0}
                  className="h-14 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-lg text-gray-600 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border border-gray-200 hover:border-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handlePinInput('0')}
                  disabled={isLoading || pin.length >= 4}
                  className="h-14 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-lg text-xl font-semibold text-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 hover:border-gray-300"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || pin.length !== 4}
                  className="h-14 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}
            {/* Logo at the bottom of the card */}
            <div className="text-center border-t border-gray-200 pt-6 mt-6">
              <img
                src="/theta-logo.png"
                alt="Theta Logo"
                className="w-20 sm:w-24 h-auto object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
