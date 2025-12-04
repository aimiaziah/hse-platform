// src/components/SignaturePinVerificationModal.tsx
// Modal for verifying signature PIN before using saved signature
import React, { useState, useEffect } from 'react';

interface SignaturePinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  userName?: string;
}

const SignaturePinVerificationModal: React.FC<SignaturePinVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  userName = 'User',
}) => {
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setAttempts(0);
    }
  }, [isOpen]);

  const handleVerify = async () => {
    if (!pin) {
      setError('Please enter your signature PIN');
      return;
    }

    if (attempts >= maxAttempts) {
      setError('Maximum attempts reached. Please try again later.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const isValid = await onVerify(pin);

      if (isValid) {
        // Success - modal will be closed by parent
        onClose();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= maxAttempts) {
          setError('Maximum attempts reached. Please contact your administrator.');
          setTimeout(() => {
            onClose();
          }, 3000);
        } else {
          setError(
            `Incorrect PIN. ${maxAttempts - newAttempts} attempt${maxAttempts - newAttempts !== 1 ? 's' : ''} remaining.`
          );
        }

        setPin('');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin && !verifying && attempts < maxAttempts) {
      handleVerify();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">Verify Signature</h2>
          <p className="text-sm text-blue-100 mt-1">Enter your signature PIN</p>
        </div>

        <div className="p-6">
          {/* User info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Signing as</p>
            <p className="text-sm font-semibold text-gray-900">{userName}</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* PIN Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyPress}
              placeholder="Enter PIN"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg tracking-wider"
              autoComplete="off"
              autoFocus
              disabled={verifying || attempts >= maxAttempts}
            />
            <p className="text-xs text-gray-500 mt-2">
              Attempt {attempts + 1} of {maxAttempts}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={verifying}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={verifying || !pin || attempts >= maxAttempts}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePinVerificationModal;
