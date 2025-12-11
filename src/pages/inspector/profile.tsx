// src/pages/inspector/profile.tsx - Inspector Profile & Settings
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

const InspectorProfile: React.FC = () => {
  const { user, updateSignatureWithPin } = useAuth();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [signaturePin, setSignaturePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPinFields, setShowPinFields] = useState(false);

  // Setup signature canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size ONLY ONCE
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // High DPI
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    let isCurrentlyDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof MouseEvent) {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isCurrentlyDrawing = true;
      setHasSignature(true);
      const { x, y } = getCoordinates(e);
      lastX = x;
      lastY = y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isCurrentlyDrawing) return;
      e.preventDefault();

      const { x, y } = getCoordinates(e);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastX = x;
      lastY = y;
    };

    const stopDrawing = () => {
      isCurrentlyDrawing = false;
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, []); // Empty dependency array - only run once!

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        setShowPinFields(false);
      }
    }
  };

  const handleNext = () => {
    if (!hasSignature) {
      setMessage({ type: 'error', text: 'Please draw your signature first' });
      return;
    }
    setShowPinFields(true);
    setMessage(null);
  };

  const handleSave = async () => {
    // Check if signature is already locked
    if (user?.signatureCreatedAt) {
      setMessage({
        type: 'error',
        text: 'Your signature PIN is already set and locked. Contact an administrator to reset it.',
      });
      return;
    }

    if (!signaturePin) {
      setMessage({ type: 'error', text: 'Please enter a PIN' });
      return;
    }

    if (signaturePin.length < 4) {
      setMessage({ type: 'error', text: 'PIN must be at least 4 characters' });
      return;
    }

    if (signaturePin !== confirmPin) {
      setMessage({ type: 'error', text: 'PINs do not match' });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      setMessage({ type: 'error', text: 'Please draw your signature' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Create a new canvas with white background to prevent black transparency in Excel
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        // Fill with white background
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the signature on top of white background
        tempCtx.drawImage(canvas, 0, 0);
      }

      const signatureDataUrl = tempCanvas.toDataURL('image/png');
      const success = await updateSignatureWithPin(signatureDataUrl, signaturePin);

      if (success) {
        setMessage({ type: 'success', text: 'Signature and PIN saved successfully!' });
        clearCanvas();
        setSignaturePin('');
        setConfirmPin('');
        setShowPinFields(false);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to save signature. Your PIN may already be set. Contact administrator.',
        });
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving your signature.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="inspector">
      <InspectorLayout title="Profile & Settings">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile</h1>
            <p className="text-gray-600">Manage your profile and signature</p>
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <div className="px-4 py-2 bg-gray-50 rounded-lg border text-gray-900">
                  {user?.name || 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="px-4 py-2 bg-gray-50 rounded-lg border">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                    {user?.role || 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="px-4 py-2 bg-gray-50 rounded-lg border">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Signature Setup */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Signature Setup</h2>
            <p className="text-sm text-gray-600 mb-4">
              {user?.signatureCreatedAt
                ? 'Your signature is already set up and locked for security.'
                : 'Draw your signature and set a PIN for signing inspection forms.'}
            </p>

            {user?.signatureCreatedAt && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">✓ Signature Configured</p>
                <p className="text-xs text-blue-600 mt-1">
                  For security reasons, signature PIN can only be set once. Contact an administrator to reset.
                </p>
              </div>
            )}

            {/* Step 1: Draw Signature */}
            {!user?.signatureCreatedAt && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Draw Your Signature
                  </label>
                  <div className="relative border-2 border-gray-300 rounded-lg bg-white">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-48 touch-none cursor-crosshair"
                      style={{ touchAction: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      disabled={!hasSignature}
                      className="absolute top-2 right-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>
                  </div>
                </div>

              {/* Step 2: PIN Fields (shown after drawing) */}
              {showPinFields && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Signature PIN (4+ characters)
                    </label>
                    <input
                      type="password"
                      value={signaturePin}
                      onChange={(e) => setSignaturePin(e.target.value)}
                      placeholder="Enter PIN"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm PIN
                    </label>
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="Re-enter PIN"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!showPinFields ? (
                    <button
                      onClick={handleNext}
                      disabled={!hasSignature}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowPinFields(false)}
                        disabled={saving}
                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving || !signaturePin || !confirmPin}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default InspectorProfile;
