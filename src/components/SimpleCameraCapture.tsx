/* eslint-disable */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle2, Zap, ZapOff, X } from 'lucide-react';

export interface CapturedImage {
  dataUrl: string;
  timestamp: number;
}

interface SimpleCameraCaptureProps {
  onComplete: (images: CapturedImage[]) => void;
  onCancel: () => void;
  maxPhotos?: number;
}

const SimpleCameraCapture: React.FC<SimpleCameraCaptureProps> = ({
  onComplete,
  onCancel,
  maxPhotos = 5,
}) => {
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      let mediaStream: MediaStream | null = null;

      // Try back camera first (ideal for taking photos)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (envError) {
        // Fallback: try ANY available camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      if (!mediaStream) {
        throw new Error('Failed to get camera stream');
      }

      setStream(mediaStream);

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      const video = videoRef.current;
      video.srcObject = mediaStream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.muted = true;
      video.playsInline = true;

      // Wait for video to be ready
      const videoReady = new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;

        const checkReady = async () => {
          attempts++;
          if (video.readyState >= 2) {
            try {
              await video.play();
              resolve();
            } catch (playErr) {
              if (video.readyState >= 2) {
                resolve();
              } else {
                reject(playErr);
              }
            }
          } else if (attempts >= maxAttempts) {
            reject(new Error('Camera timeout'));
          } else {
            setTimeout(checkReady, 200);
          }
        };
        checkReady();
      });

      await videoReady;
      setIsCameraActive(true);
      setIsInitializing(false);
    } catch (err: any) {
      const errorMessage = err.message || 'Unable to access camera';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
      } else {
        setError(errorMessage);
      }
      setIsInitializing(false);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  }, [stream]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
    setIsInitializing(false);
    setTorchEnabled(false);
  }, [stream]);

  // Toggle flashlight/torch
  const toggleTorch = async () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities() as any;
          if (capabilities.torch) {
            await videoTrack.applyConstraints({
              advanced: [{ torch: !torchEnabled } as any],
            });
            setTorchEnabled(!torchEnabled);
          } else {
            alert('Flash/torch not supported on this device');
          }
        } catch (err) {
          console.error('Failed to toggle torch:', err);
        }
      }
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        alert('Camera not ready. Please wait a moment and try again.');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        if (dataUrl.length < 100) {
          alert('Failed to capture photo. Please try again.');
          return;
        }

        setCurrentPreview(dataUrl);
        setShowPreview(true);
      } else {
        alert('Failed to capture photo. Please try again.');
      }
    } else {
      alert('Camera not ready. Please try again.');
    }
  };

  // Confirm captured photo
  const confirmCapture = () => {
    if (currentPreview) {
      const newCapture: CapturedImage = {
        dataUrl: currentPreview,
        timestamp: Date.now(),
      };

      const allCaptures = [...capturedImages, newCapture];
      setCapturedImages(allCaptures);
      setShowPreview(false);
      setCurrentPreview(null);
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setShowPreview(false);
    setCurrentPreview(null);
  };

  // Delete a captured image
  const deleteImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Complete capture process
  const handleComplete = () => {
    if (capturedImages.length === 0) {
      alert('Please capture at least one photo');
      return;
    }
    stopCamera();
    onComplete(capturedImages);
  };

  // Cancel and cleanup
  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      stopCamera();
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canTakeMore = capturedImages.length < maxPhotos;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Capture Photos</h3>
          <p className="text-sm opacity-90">
            {capturedImages.length} / {maxPhotos} photos taken
          </p>
        </div>
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            isCameraActive && !showPreview ? 'block' : 'hidden'
          }`}
        />

        {isInitializing && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <Camera className="w-12 h-12 text-white mb-4 animate-pulse" />
            <p className="text-white">Initializing camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6">
            <Camera className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-white text-center mb-4">{error}</p>
            <button
              onClick={startCamera}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {showPreview && currentPreview && (
          <div className="absolute inset-0 flex flex-col bg-black">
            <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
              <img src={currentPreview} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
            <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex gap-4">
              <button
                onClick={retakePhoto}
                className="flex-1 bg-gray-700 text-white py-3 px-4 rounded-lg font-bold active:bg-gray-800"
              >
                Retake
              </button>
              <button
                onClick={confirmCapture}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-bold active:bg-green-700"
              >
                Use This Photo
              </button>
            </div>
          </div>
        )}

        {isCameraActive && !showPreview && (
          <>
            {/* Flash toggle - simplified */}
            <div className="absolute top-4 right-4">
              <button
                onClick={toggleTorch}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  torchEnabled ? 'bg-yellow-500 text-white' : 'bg-black/60 text-white'
                }`}
              >
                {torchEnabled ? 'Flash ON' : 'Flash OFF'}
              </button>
            </div>

            {/* Captured images preview */}
            {capturedImages.length > 0 && (
              <div className="absolute top-4 left-4 bg-black/60 rounded-lg p-3">
                <p className="text-white text-sm font-medium mb-2">Captured:</p>
                <div className="flex gap-2">
                  {capturedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={img.dataUrl}
                        alt={`Photo ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded-md border-2 border-white"
                      />
                      <button
                        onClick={() => deleteImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 pb-8 pt-6 bg-gradient-to-t from-black via-black/90 to-transparent">
              <div className="flex flex-col items-center gap-4 px-4">
                {/* Capture Button */}
                {canTakeMore && (
                  <button
                    onClick={capturePhoto}
                    className="bg-white rounded-full active:scale-95 shadow-2xl flex items-center justify-center transition-transform"
                    style={{ width: '80px', height: '80px' }}
                  >
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </button>
                )}

                {/* Submit Button */}
                {capturedImages.length > 0 && (
                  <button
                    onClick={handleComplete}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg w-full max-w-xs"
                  >
                    Submit {capturedImages.length} Photo{capturedImages.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SimpleCameraCapture;
