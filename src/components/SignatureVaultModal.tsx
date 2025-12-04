// src/components/SignatureVaultModal.tsx
// Modal for initial signature setup with secure PIN creation
import React, { useState, useRef, useEffect } from 'react';

interface SignatureVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: string, signaturePin: string) => Promise<boolean>;
  userRole?: string;
}

const SignatureVaultModal: React.FC<SignatureVaultModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userRole = 'supervisor',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signaturePin, setSignaturePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'signature' | 'pin'>('signature');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('signature');
      setSignaturePin('');
      setConfirmPin('');
      setError('');
      setHasSignature(false);
      clearCanvas();
    }
  }, [isOpen]);

  // Setup signature canvas
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // High DPI
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    let lastX = 0;
    let lastY = 0;

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof MouseEvent) {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      } else {
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      setHasSignature(true);
      setError('');
      const { x, y } = getCoordinates(e);
      lastX = x;
      lastY = y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
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
      setIsDrawing(false);
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
  }, [isOpen, isDrawing]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleNextStep = () => {
    if (!hasSignature) {
      setError('Please draw your signature before continuing');
      return;
    }

    setError('');
    setStep('pin');
  };

  const handleBack = () => {
    setStep('signature');
    setSignaturePin('');
    setConfirmPin('');
    setError('');
  };

  const validatePin = (): boolean => {
    if (!signaturePin) {
      setError('Please enter a signature PIN');
      return false;
    }

    if (signaturePin.length < 4) {
      setError('PIN must be at least 4 characters');
      return false;
    }

    if (signaturePin !== confirmPin) {
      setError('PINs do not match');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validatePin()) return;

    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      setError('Signature not found. Please go back and redraw.');
      return;
    }

    setSaving(true);
    setError('');

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
      const success = await onSave(signatureDataUrl, signaturePin);

      if (success) {
        onClose();
      } else {
        setError('Failed to save signature. Please try again.');
      }
    } catch (err) {
      console.error('Error saving signature:', err);
      setError('An error occurred while saving your signature.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">
            {step === 'signature' ? 'Setup Signature' : 'Create PIN'}
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            {step === 'signature'
              ? 'Step 1 of 2: Draw your signature'
              : 'Step 2 of 2: Set your signature PIN'}
          </p>
        </div>

        <div className="p-6">

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Signature */}
          {step === 'signature' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Draw Your Signature
                </label>
                <div className="relative border-2 border-gray-300 rounded-lg bg-white">
                  {!hasSignature && (
                    <div className="absolute top-2 left-2 text-xs text-gray-400 pointer-events-none">
                      Sign here
                    </div>
                  )}
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
            </div>
          )}

          {/* Step 2: PIN Setup */}
          {step === 'pin' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature PIN (4+ characters)
                </label>
                <input
                  type="password"
                  value={signaturePin}
                  onChange={(e) => {
                    setSignaturePin(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter PIN"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="new-password"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value);
                    setError('');
                  }}
                  placeholder="Re-enter PIN"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end mt-6 pt-6 border-t">
            <button
              onClick={step === 'signature' ? onClose : handleBack}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {step === 'signature' ? 'Cancel' : 'Back'}
            </button>

            {step === 'signature' ? (
              <button
                onClick={handleNextStep}
                disabled={!hasSignature}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !signaturePin || !confirmPin}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureVaultModal;
